-- Add yield tracking columns to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS calculated_yield_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS balance_at_transaction DECIMAL(15,2) DEFAULT 0;

-- Add comment to explain these columns
COMMENT ON COLUMN transactions.calculated_yield_amount IS 'The yield/interest amount calculated for this transaction (only for Interés/Rendimiento transactions)';
COMMENT ON COLUMN transactions.balance_at_transaction IS 'The total balance of the payment method at the moment this interest transaction was recorded';
