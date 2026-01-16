-- Add calculated_yield column to savings_transactions table
ALTER TABLE savings_transactions 
ADD COLUMN IF NOT EXISTS calculated_yield DECIMAL(10, 4) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS balance_after_transaction DECIMAL(15, 2) DEFAULT 0.0;

-- Add comments explaining the columns
COMMENT ON COLUMN savings_transactions.calculated_yield IS 'For interest transactions: calculated as (interest_amount / previous_balance) * 100. For deposits/withdrawals: 0.0';
COMMENT ON COLUMN savings_transactions.balance_after_transaction IS 'The account balance after this transaction is applied';
