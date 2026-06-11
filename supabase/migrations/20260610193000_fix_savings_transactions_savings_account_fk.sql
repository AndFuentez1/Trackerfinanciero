-- Fix savings_transactions.savings_account_id foreign key to reference payment_methods and allow null values
ALTER TABLE public.savings_transactions
  ALTER COLUMN savings_account_id DROP NOT NULL;

ALTER TABLE public.savings_transactions
  DROP CONSTRAINT IF EXISTS savings_transactions_savings_account_id_fkey;

ALTER TABLE public.savings_transactions
  ADD CONSTRAINT savings_transactions_savings_account_id_fkey
  FOREIGN KEY (savings_account_id)
  REFERENCES public.payment_methods(id)
  ON DELETE SET NULL;
