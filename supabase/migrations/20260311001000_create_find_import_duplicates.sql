-- Migration: create_find_import_duplicates
-- Date: 2026-03-11
-- Description: Find duplicate imports against transactions using date, amount, and account.

CREATE OR REPLACE FUNCTION public.find_import_duplicates(
    p_user_id UUID,
    p_rows JSONB
)
RETURNS TABLE(row_index INTEGER)
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH normalized_input AS (
        SELECT 
            i.row_index,
            i.date::DATE as date,
            ROUND(i.amount::numeric, 2) as amount,
            i.type as tx_type,
            -- Normalización Ultra-Robusta: 
            -- 1. Quitar prefijos comunes (Concepto, Descripcion, etc)
            -- 2. Quitar acentos (TRANSLATE)
            -- 3. Quitar todo lo que no sea alfanumérico (regexp_replace)
            regexp_replace(
                LOWER(TRANSLATE(
                    REGEXP_REPLACE(i.description, '^([Dd]escripci[óo]n|[Dd]escription|[Cc]oncepto|[Dd]etalle|[Mm]emo):[\s]*', '', 'i'),
                    'áéíóúÁÉÍÓÚüÜñÑàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛäëïöüÄËÏÖÜçÇ', 
                    'aeiouAEIOUuUnNaeiouAEIOUaeiouAEIOUaeiouAEIOUcC')), 
                '[^a-z0-9]', '', 'g'
            ) as norm_desc,
            i.payment_method_id
        FROM jsonb_to_recordset(p_rows) AS i(
            row_index INTEGER,
            date TEXT,
            amount NUMERIC,
            description TEXT,
            type TEXT,
            payment_method_id UUID
        )
    )
    SELECT ni.row_index
    FROM normalized_input ni
    WHERE EXISTS (
        SELECT 1 
        FROM public.transactions t
        WHERE t.user_id = p_user_id
          AND t.date::DATE = ni.date
          AND t.type = ni.tx_type
          -- Tolerancia de 0.01 para evitar fallos por precisión de punto flotante
          AND ABS(ROUND(t.amount::numeric, 2) - ni.amount) < 0.01
          -- Comparación de Cuenta (si viene en el Excel o ya está mapeada)
          AND (
              (ni.payment_method_id IS NULL AND t.payment_method_id IS NULL) OR
              (ni.payment_method_id = t.payment_method_id)
          )
          -- Aplicamos la misma limpieza profunda a los datos existentes en la BD
          AND regexp_replace(
                LOWER(TRANSLATE(
                    REGEXP_REPLACE(t.description, '^([Dd]escripci[óo]n|[Dd]escription|[Cc]oncepto|[Dd]etalle|[Mm]emo):[\s]*', '', 'i'),
                    'áéíóúÁÉÍÓÚüÜñÑàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛäëïöüÄËÏÖÜçÇ', 
                    'aeiouAEIOUuUnNaeiouAEIOUaeiouAEIOUaeiouAEIOUcC')), 
                '[^a-z0-9]', '', 'g'
            ) = ni.norm_desc
    );
END;
$$;
