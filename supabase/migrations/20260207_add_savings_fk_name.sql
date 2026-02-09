-- Add explicit foreign key constraint name for savings_transactions -> savings_accounts
-- This ensures PostgREST can find the relationship for joins

-- First, drop the existing unnamed foreign key constraint
ALTER TABLE public.savings_transactions
DROP CONSTRAINT IF EXISTS savings_transactions_savings_account_id_fkey;

-- Re-add the foreign key with an explicit name
ALTER TABLE public.savings_transactions
ADD CONSTRAINT savings_transactions_savings_account_id_fkey
FOREIGN KEY (savings_account_id)
REFERENCES public.savings_accounts(id)
ON DELETE CASCADE;

-- Verify the constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'savings_transactions_savings_account_id_fkey'
    AND table_name = 'savings_transactions'
  ) THEN
    RAISE EXCEPTION 'Foreign key constraint was not created successfully';
  END IF;
END $$;
