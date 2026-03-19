-- Migration: update_mark_staging_duplicates
-- Date: 2026-03-11
-- Description: Align duplicate detection with "same date, amount, and account" rule.

CREATE OR REPLACE FUNCTION public.mark_staging_duplicates(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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
            AND t.date = s.date
            AND t.amount = s.amount
            AND (
                (s.payment_method_id IS NOT NULL AND t.payment_method_id = s.payment_method_id)
                OR (s.payment_method_id IS NULL AND t.payment_method_id IS NULL AND LOWER(t.description) = LOWER(s.description))
            )
      );
END;
$$;
