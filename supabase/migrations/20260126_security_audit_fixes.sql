-- ============================================================================
-- DATABASE SECURITY AUDIT - CRITICAL FIXES
-- ============================================================================
-- Generated: 2026-01-26
-- Purpose: Fix critical issues identified in pre-production security audit
-- Status: REQUIRED BEFORE PRODUCTION DEPLOYMENT
--
-- This migration addresses:
-- 1. CRITICAL: Missing foreign key constraints (BLOCKER)
-- 2. HIGH: Subscription schema fields
-- 3. HIGH: Performance indexes
-- 4. RECOMMENDED: Standardize monetary types
-- ============================================================================

-- ============================================================================
-- SECTION 1: CRITICAL - Foreign Key Constraints (BLOCKER)
-- ============================================================================
-- Issue: transactions.category_id and budgets.category_id lack ON DELETE rules
-- Risk: Orphaned records, data integrity violations, broken historical data
-- Impact: HIGH - Can cause data corruption

-- Fix transactions.category_id foreign key
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_category_id_fkey;

ALTER TABLE transactions 
ADD CONSTRAINT transactions_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES categories(id) 
ON DELETE SET NULL;

COMMENT ON CONSTRAINT transactions_category_id_fkey ON transactions IS 
'Preserves historical transactions when category is deleted by setting category_id to NULL';

-- Fix budgets.category_id foreign key
ALTER TABLE budgets 
DROP CONSTRAINT IF EXISTS budgets_category_id_fkey;

ALTER TABLE budgets 
ADD CONSTRAINT budgets_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES categories(id) 
ON DELETE RESTRICT;

COMMENT ON CONSTRAINT budgets_category_id_fkey ON budgets IS 
'Prevents category deletion if active budgets exist. User must reassign or delete budgets first.';

-- ============================================================================
-- SECTION 2: HIGH PRIORITY - Subscription Schema Fields
-- ============================================================================
-- Issue: Frontend uses subscription fields not present in database schema
-- Risk: Feature incomplete, data loss, runtime errors
-- Impact: MEDIUM - Feature won't work correctly

ALTER TABLE future_expenses
ADD COLUMN IF NOT EXISTS is_subscription BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS frequency TEXT,
ADD COLUMN IF NOT EXISTS payment_day INTEGER,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Add constraints for subscription fields
ALTER TABLE future_expenses
DROP CONSTRAINT IF EXISTS check_frequency_values,
ADD CONSTRAINT check_frequency_values 
CHECK (frequency IS NULL OR frequency IN ('monthly', 'bimonthly', 'quarterly', 'semiannual', 'yearly'));

ALTER TABLE future_expenses
DROP CONSTRAINT IF EXISTS check_payment_day_range,
ADD CONSTRAINT check_payment_day_range 
CHECK (payment_day IS NULL OR (payment_day BETWEEN 1 AND 31));

ALTER TABLE future_expenses
DROP CONSTRAINT IF EXISTS check_subscription_dates,
ADD CONSTRAINT check_subscription_dates 
CHECK (
    (is_subscription = FALSE) OR 
    (is_subscription = TRUE AND start_date IS NOT NULL AND (end_date IS NULL OR end_date >= start_date))
);

-- Add comments
COMMENT ON COLUMN future_expenses.is_subscription IS 'TRUE if this is a recurring subscription, FALSE for one-time future expense';
COMMENT ON COLUMN future_expenses.frequency IS 'Recurrence frequency: monthly, bimonthly, quarterly, semiannual, yearly';
COMMENT ON COLUMN future_expenses.payment_day IS 'Day of month for subscription payment (1-31)';
COMMENT ON COLUMN future_expenses.start_date IS 'Subscription start date';
COMMENT ON COLUMN future_expenses.end_date IS 'Subscription end date (NULL for indefinite)';

-- ============================================================================
-- SECTION 3: HIGH PRIORITY - Performance Indexes
-- ============================================================================
-- Issue: Missing indexes on frequently queried columns
-- Risk: Performance degradation with large datasets
-- Impact: MEDIUM - Slow queries, poor user experience

-- Indexes on user_id (RLS filter column - CRITICAL)
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_accounts_user_id ON savings_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_transactions_user_id ON savings_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_future_expenses_user_id ON future_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_invoices_user_id ON pending_invoices(user_id);

-- Indexes on date columns (range queries)
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_future_expenses_payment_date ON future_expenses(payment_date);

-- Indexes on foreign keys (joins)
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method_id ON transactions(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_savings_transactions_account_id ON savings_transactions(savings_account_id);

-- Composite index for common query pattern (user + date range)
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);

-- ============================================================================
-- SECTION 4: RECOMMENDED - Standardize Monetary Types
-- ============================================================================
-- Issue: Inconsistent use of NUMERIC vs DECIMAL(12,2)
-- Risk: Maintenance complexity, potential precision issues
-- Impact: LOW - Code clarity and consistency

-- Standardize payment_methods
ALTER TABLE payment_methods 
ALTER COLUMN balance TYPE NUMERIC(12,2) USING balance::NUMERIC(12,2);

ALTER TABLE payment_methods 
ALTER COLUMN credit_limit TYPE NUMERIC(12,2) USING credit_limit::NUMERIC(12,2);

-- Standardize savings_accounts
ALTER TABLE savings_accounts 
ALTER COLUMN balance TYPE NUMERIC(12,2) USING balance::NUMERIC(12,2);

-- Interest rate uses different precision (percentage)
ALTER TABLE savings_accounts 
ALTER COLUMN interest_rate TYPE NUMERIC(5,4) USING interest_rate::NUMERIC(5,4);

-- Standardize savings_transactions
ALTER TABLE savings_transactions 
ALTER COLUMN amount TYPE NUMERIC(12,2) USING amount::NUMERIC(12,2);

-- Standardize future_expenses
ALTER TABLE future_expenses 
ALTER COLUMN amount TYPE NUMERIC(12,2) USING amount::NUMERIC(12,2);

-- Standardize pending_invoices
ALTER TABLE pending_invoices 
ALTER COLUMN amount TYPE NUMERIC(12,2) USING amount::NUMERIC(12,2);

-- Add comments documenting precision
COMMENT ON COLUMN payment_methods.balance IS 'Current balance. NUMERIC(12,2) = up to 999,999,999,999.99';
COMMENT ON COLUMN savings_accounts.interest_rate IS 'Annual interest rate as decimal. NUMERIC(5,4) = up to 9.9999 (999.99%)';

-- ============================================================================
-- SECTION 5: VERIFICATION QUERIES
-- ============================================================================
-- Run these queries after migration to verify success

-- Verify foreign key constraints
DO $$
BEGIN
    -- Check transactions FK
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'transactions_category_id_fkey' 
        AND confdeltype = 'n' -- SET NULL
    ) THEN
        RAISE EXCEPTION 'transactions_category_id_fkey not properly configured';
    END IF;

    -- Check budgets FK
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'budgets_category_id_fkey' 
        AND confdeltype = 'r' -- RESTRICT
    ) THEN
        RAISE EXCEPTION 'budgets_category_id_fkey not properly configured';
    END IF;

    RAISE NOTICE 'Foreign key constraints verified successfully';
END $$;

-- Verify subscription columns exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'future_expenses' 
        AND column_name = 'is_subscription'
    ) THEN
        RAISE EXCEPTION 'Subscription columns not added to future_expenses';
    END IF;

    RAISE NOTICE 'Subscription schema verified successfully';
END $$;

-- Verify indexes exist
DO $$
DECLARE
    missing_indexes TEXT[];
BEGIN
    SELECT ARRAY_AGG(idx_name) INTO missing_indexes
    FROM (
        VALUES 
            ('idx_transactions_user_id'),
            ('idx_transactions_date'),
            ('idx_budgets_user_id'),
            ('idx_categories_user_id')
    ) AS expected(idx_name)
    WHERE NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = expected.idx_name
    );

    IF missing_indexes IS NOT NULL THEN
        RAISE EXCEPTION 'Missing indexes: %', array_to_string(missing_indexes, ', ');
    END IF;

    RAISE NOTICE 'Performance indexes verified successfully';
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Review migration output for any errors
-- 2. Run verification queries above
-- 3. Test category deletion behavior (should SET NULL on transactions)
-- 4. Test budget deletion with existing categories (should RESTRICT)
-- 5. Test subscription creation with new fields
-- 6. Monitor query performance improvements
-- ============================================================================
