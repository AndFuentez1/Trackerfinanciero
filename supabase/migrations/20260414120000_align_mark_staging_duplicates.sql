-- Alinea mark_staging_duplicates con find_import_duplicates (misma normalización de descripción,
-- tolerancia de monto y criterio de cuenta/tipo).

CREATE OR REPLACE FUNCTION public.mark_staging_duplicates(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.excel_import_staging s
  SET is_duplicate = true
  WHERE s.user_id = p_user_id
    AND s.status = 'pending'
    AND EXISTS (
      SELECT 1
      FROM public.transactions t
      WHERE t.user_id = p_user_id
        AND t.date::DATE = s.date::DATE
        AND t.type = s.type
        AND ABS(ROUND(t.amount::numeric, 2) - ROUND(s.amount::numeric, 2)) < 0.01
        AND (
          (s.payment_method_id IS NULL AND t.payment_method_id IS NULL)
          OR (s.payment_method_id IS NOT NULL AND s.payment_method_id = t.payment_method_id)
        )
        AND regexp_replace(
              LOWER(TRANSLATE(
                REGEXP_REPLACE(
                  COALESCE(t.description, ''),
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
            )
            = regexp_replace(
                LOWER(TRANSLATE(
                  REGEXP_REPLACE(
                    COALESCE(s.description, ''),
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
              )
    );
END;
$$;
