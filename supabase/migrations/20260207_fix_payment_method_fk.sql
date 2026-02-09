-- Fix transactions.payment_method_id foreign key to allow safe deletion
-- This allows payment methods to be deleted while preserving historical transactions

ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_payment_method_id_fkey;

ALTER TABLE transactions 
ADD CONSTRAINT transactions_payment_method_id_fkey 
FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) 
ON DELETE SET NULL;

COMMENT ON CONSTRAINT transactions_payment_method_id_fkey ON transactions IS 
'Preserves historical transactions when payment method is deleted by setting payment_method_id to NULL';
