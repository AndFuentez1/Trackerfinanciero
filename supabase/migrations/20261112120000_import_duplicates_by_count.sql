-- Migration: import_duplicates_by_count
-- Date: 2026-11-12
-- Description: Duplicados de importación por conteo (multiconjunto) en lugar de EXISTS.
--   Antes: si existía UNA transacción igual (fecha, tipo, monto, cuenta, descripción), TODAS las filas
--   iguales del archivo se marcaban como duplicadas → dos compras idénticas el mismo día perdían la segunda.
--   Ahora: la k-ésima fila idéntica del archivo es duplicada solo si ya hay >= k transacciones iguales.
--   Re-subir el mismo archivo sigue sin agregar nada; un archivo con una compra repetida nueva sí la agrega.

CREATE OR REPLACE FUNCTION public.normalize_import_description(p_description TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT regexp_replace(
    LOWER(TRANSLATE(
      REGEXP_REPLACE(
        COALESCE(p_description, ''),
        '^([Dd]escripci[óo]n|[Dd]escription|[Cc]oncepto|[Dd]etalle|[Mm]emo):[\s]*',
        '',
        'i'
      ),
      'áéíóúÁÉÍÓÚüÜñÑàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛäëïöüÄËÏÖÜçÇ',
      'aeiouAEIOUuUnNaeiouAEIOUaeiouAEIOUaeiouAEIOUcC'
    )),
    '[^a-z0-9]',
    '',
    'g'
  );
$$;

CREATE OR REPLACE FUNCTION public.find_import_duplicates(
    p_user_id UUID,
    p_rows JSONB
)
RETURNS TABLE(row_index INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'No autorizado';
    END IF;

    RETURN QUERY
    WITH normalized_input AS (
        SELECT
            i.row_index AS idx,
            i.date::DATE AS d,
            ROUND(i.amount::numeric, 2) AS amt,
            i.type AS tx_type,
            public.normalize_import_description(i.description) AS norm_desc,
            i.payment_method_id AS pm_id
        FROM jsonb_to_recordset(p_rows) AS i(
            row_index INTEGER,
            date TEXT,
            amount NUMERIC,
            description TEXT,
            type TEXT,
            payment_method_id UUID
        )
    ),
    ranked AS (
        SELECT ni.*,
               ROW_NUMBER() OVER (
                   PARTITION BY ni.d, ni.amt, ni.tx_type, ni.pm_id, ni.norm_desc
                   ORDER BY ni.idx
               ) AS rn
        FROM normalized_input ni
    ),
    groups AS (
        SELECT DISTINCT r.d, r.amt, r.tx_type, r.pm_id, r.norm_desc FROM ranked r
    ),
    existing AS (
        SELECT g.*,
               (SELECT COUNT(*)
                  FROM public.transactions t
                 WHERE t.user_id = p_user_id
                   AND t.date::DATE = g.d
                   AND t.type = g.tx_type
                   AND ABS(ROUND(t.amount::numeric, 2) - g.amt) < 0.01
                   AND t.payment_method_id IS NOT DISTINCT FROM g.pm_id
                   AND public.normalize_import_description(t.description) = g.norm_desc
               ) AS cnt
        FROM groups g
    )
    SELECT r.idx
    FROM ranked r
    JOIN existing e
      ON e.d = r.d
     AND e.amt = r.amt
     AND e.tx_type IS NOT DISTINCT FROM r.tx_type
     AND e.pm_id IS NOT DISTINCT FROM r.pm_id
     AND e.norm_desc = r.norm_desc
    WHERE r.rn <= e.cnt;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_staging_duplicates(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  WITH ranked AS (
    SELECT s.id,
           s.date::DATE AS d,
           ROUND(s.amount::numeric, 2) AS amt,
           s.type AS tx_type,
           s.payment_method_id AS pm_id,
           public.normalize_import_description(s.description) AS norm_desc,
           ROW_NUMBER() OVER (
             PARTITION BY s.date::DATE, ROUND(s.amount::numeric, 2), s.type, s.payment_method_id,
                          public.normalize_import_description(s.description)
             ORDER BY s.created_at, s.id
           ) AS rn
    FROM public.excel_import_staging s
    WHERE s.user_id = p_user_id
      AND s.status = 'pending'
  ),
  flagged AS (
    SELECT r.id,
           r.rn <= (
             SELECT COUNT(*)
               FROM public.transactions t
              WHERE t.user_id = p_user_id
                AND t.date::DATE = r.d
                AND t.type IS NOT DISTINCT FROM r.tx_type
                AND ABS(ROUND(t.amount::numeric, 2) - r.amt) < 0.01
                AND t.payment_method_id IS NOT DISTINCT FROM r.pm_id
                AND public.normalize_import_description(t.description) = r.norm_desc
           ) AS dup
    FROM ranked r
  )
  UPDATE public.excel_import_staging s
     SET is_duplicate = f.dup
    FROM flagged f
   WHERE s.id = f.id
     AND s.is_duplicate IS DISTINCT FROM f.dup;
END;
$$;

GRANT EXECUTE ON FUNCTION public.normalize_import_description(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_import_duplicates(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_staging_duplicates(UUID) TO authenticated;
