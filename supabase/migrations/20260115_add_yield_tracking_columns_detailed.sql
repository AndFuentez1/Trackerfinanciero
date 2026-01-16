-- ============================================================================
-- YIELD TRACKING IMPLEMENTATION - DATABASE SETUP
-- ============================================================================
-- This migration adds two new columns to track precise yield calculations
-- for savings and investment accounts.
--
-- Purpose: Store calculated yield amounts and the account balance at the time
--          the yield was recorded, enabling precise performance tracking.
-- ============================================================================

-- Step 1: Add the new columns to the transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS calculated_yield_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS balance_at_transaction DECIMAL(15,2) DEFAULT 0;

-- Step 2: Add helpful comments for developers
COMMENT ON COLUMN transactions.calculated_yield_amount IS 
'The yield/interest amount calculated for this transaction. Only populated for "Interés"/"Rendimiento" transactions. NULL for regular deposits/withdrawals.';

COMMENT ON COLUMN transactions.balance_at_transaction IS 
'The total accumulated balance of the payment method at the moment this interest transaction was recorded. Used to calculate ROI and track performance.';

-- Step 3: Verify the columns exist and are correctly typed
-- Run this query to verify:
-- SELECT column_name, data_type, column_default FROM information_schema.columns 
-- WHERE table_name = 'transactions' AND column_name IN ('calculated_yield_amount', 'balance_at_transaction');

-- ============================================================================
-- COLUMN SPECIFICATIONS
-- ============================================================================

-- Column: calculated_yield_amount
-- Type: DECIMAL(15,2)
-- Default: 0
-- Nullable: Yes (can be NULL)
-- Usage: Stores the interest/yield amount for yield transactions
-- Examples:
--   - Value: 150000.00 (for interest transaction of $150,000)
--   - Value: NULL (for deposit transactions)
--   - Value: NULL (for withdrawal transactions)

-- Column: balance_at_transaction
-- Type: DECIMAL(15,2)
-- Default: 0
-- Nullable: Yes (can be NULL)
-- Usage: Stores the account balance at the moment of yield recording
-- Examples:
--   - Value: 5000000.00 (account had $5M when $150K interest was recorded)
--   - Value: NULL (for non-interest transactions)
--   - Value: 8150000.00 (account had $8.15M when next $245K interest was recorded)

-- ============================================================================
-- DATA INTEGRITY RULES
-- ============================================================================

-- Rule 1: calculated_yield_amount should only be populated for yield transactions
-- - Trigger detection: WHERE category = 'Rendimientos' OR description ILIKE '%rendimiento%'
-- - Non-yield transactions: Leave NULL

-- Rule 2: balance_at_transaction should only be populated for yield transactions
-- - Calculated as: SUM(income + transfer_in - expense - transfer_out) for previous transactions
-- - Non-yield transactions: Leave NULL

-- Rule 3: Both columns should be NULL together
-- - If calculated_yield_amount is NOT NULL, then balance_at_transaction must NOT NULL
-- - If calculated_yield_amount is NULL, then balance_at_transaction must NULL

-- ============================================================================
-- CALCULATION LOGIC (Application Layer)
-- ============================================================================

-- When a yield transaction is added:

-- 1. Detect if it's a yield transaction:
--    IF description ILIKE '%interés%' OR description ILIKE '%rendimiento%' THEN
--      is_yield = true
--    END IF

-- 2. If is_yield = true, calculate balance:
--    SELECT SUM(
--      CASE 
--        WHEN type IN ('income', 'transfer_in') THEN amount
--        WHEN type IN ('expense', 'transfer_out') THEN -amount
--        ELSE 0
--      END
--    ) as balance_at_transaction
--    FROM transactions
--    WHERE payment_method_id = <current_pm_id>
--      AND date < <current_transaction_date>
--      AND user_id = <current_user_id>

-- 3. Store results:
--    INSERT INTO transactions (
--      ...,
--      calculated_yield_amount,
--      balance_at_transaction,
--      ...
--    ) VALUES (
--      ...,
--      <transaction.amount>,
--      <balance_at_transaction>,
--      ...
--    )

-- ============================================================================
-- PERFORMANCE CONSIDERATIONS
-- ============================================================================

-- Index Recommendation for Queries:
-- CREATE INDEX idx_transactions_yield_lookup 
-- ON transactions(payment_method_id, date, user_id) 
-- WHERE calculated_yield_amount IS NOT NULL;

-- Why: Speeds up lookups when calculating balance_at_transaction

-- Query Performance:
-- - Calculating balance for a single account: O(n) where n = transaction count
-- - Database indexes on (payment_method_id, date) make this efficient
-- - Aggregate functions are optimized at DB level

-- ============================================================================
-- REPORTING QUERIES
-- ============================================================================

-- Query 1: Total Yields by Account
SELECT 
  pm.id,
  pm.name,
  SUM(t.calculated_yield_amount) as total_yield,
  COUNT(CASE WHEN t.calculated_yield_amount IS NOT NULL THEN 1 END) as yield_count,
  AVG(t.calculated_yield_amount) as avg_yield
FROM transactions t
JOIN payment_methods pm ON t.payment_method_id = pm.id
WHERE t.calculated_yield_amount IS NOT NULL
  AND t.user_id = 'user_123'
GROUP BY pm.id, pm.name
ORDER BY total_yield DESC;

-- Query 2: Yield Performance Over Time
SELECT 
  DATE_TRUNC('month', t.date) as month,
  SUM(t.calculated_yield_amount) as monthly_yield,
  AVG(t.balance_at_transaction) as avg_balance_at_yield
FROM transactions t
WHERE t.calculated_yield_amount IS NOT NULL
  AND t.user_id = 'user_123'
GROUP BY DATE_TRUNC('month', t.date)
ORDER BY month DESC;

-- Query 3: ROI Calculation per Yield Transaction
SELECT 
  t.id,
  t.date,
  t.description,
  t.calculated_yield_amount,
  t.balance_at_transaction,
  ROUND((t.calculated_yield_amount / NULLIF(t.balance_at_transaction, 0) * 100)::NUMERIC, 2) as roi_percent
FROM transactions t
WHERE t.calculated_yield_amount IS NOT NULL
  AND t.user_id = 'user_123'
  AND t.payment_method_id = 'savings_123'
ORDER BY t.date;

-- Query 4: Compound Growth Tracking
WITH yield_data AS (
  SELECT 
    t.date,
    t.amount as yield_amount,
    t.balance_at_transaction,
    (t.calculated_yield_amount / NULLIF(t.balance_at_transaction, 0)) as yield_rate,
    SUM(t.calculated_yield_amount) OVER (
      PARTITION BY t.payment_method_id 
      ORDER BY t.date
    ) as cumulative_yield
  FROM transactions t
  WHERE t.calculated_yield_amount IS NOT NULL
    AND t.payment_method_id = 'savings_123'
)
SELECT 
  date,
  yield_amount,
  balance_at_transaction,
  ROUND((yield_rate * 100)::NUMERIC, 2) as yield_rate_percent,
  cumulative_yield
FROM yield_data
ORDER BY date;

-- ============================================================================
-- MIGRATION VERIFICATION
-- ============================================================================

-- After running this migration, verify:

-- 1. Columns exist:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
  AND column_name IN ('calculated_yield_amount', 'balance_at_transaction');

-- Expected output:
-- column_name                 | data_type
-- ----------------------------|----------
-- calculated_yield_amount     | numeric
-- balance_at_transaction      | numeric

-- 2. Default values work:
INSERT INTO transactions (
  user_id, type, category, amount, description, date, payment_method_id
) VALUES (
  'test_user', 'income', 'Test', 100, 'Test transaction', '2024-01-01', null
);

SELECT calculated_yield_amount, balance_at_transaction 
FROM transactions 
WHERE description = 'Test transaction';

-- Expected: Both should be 0 (default value)

-- 3. Clean up test data:
DELETE FROM transactions WHERE description = 'Test transaction';

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- To revert this migration:
-- ALTER TABLE transactions 
-- DROP COLUMN IF EXISTS calculated_yield_amount,
-- DROP COLUMN IF EXISTS balance_at_transaction;
