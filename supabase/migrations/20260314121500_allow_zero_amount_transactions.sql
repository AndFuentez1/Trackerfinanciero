-- Allow zero amounts for error-placeholder transactions
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_amount_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_amount_check
  CHECK (amount >= 0);
