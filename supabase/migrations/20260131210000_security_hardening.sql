-- ============================================================================
-- 🔒 SECURITY HARDENING PATCH (ZERO TRUST AUDIT)
-- ============================================================================
-- Generated: 2026-01-31
-- Purpose: Fix RLS vulnerabilities identified in Zero Trust audit.
-- 1. Add WITH CHECK to all UPDATE policies to prevent "Transfer Attacks" (hijacking ownership).
-- 2. Add explicit DELETE policy for profiles.
-- ============================================================================

-- 1. PROFILES: Fix UPDATE and add DELETE
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id); -- Prevent changing user_id

DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile"
ON public.profiles FOR DELETE
USING (auth.uid() = user_id);

-- 2. TRANSACTIONS: Secure UPDATE
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
CREATE POLICY "Users can update their own transactions"
ON public.transactions FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id); -- Ensure transaction remains owned by user

-- 3. BUDGETS: Secure UPDATE
DROP POLICY IF EXISTS "Users can update their own budgets" ON public.budgets;
CREATE POLICY "Users can update their own budgets"
ON public.budgets FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. CATEGORIES: Secure UPDATE
DROP POLICY IF EXISTS "Users can update their own categories" ON public.categories;
CREATE POLICY "Users can update their own categories"
ON public.categories FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. SAVINGS: Secure UPDATE (Accounts & Transactions)
DROP POLICY IF EXISTS "Users can update their own savings accounts" ON public.savings_accounts;
CREATE POLICY "Users can update their own savings accounts"
ON public.savings_accounts FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own savings transactions" ON public.savings_transactions;
CREATE POLICY "Users can update their own savings transactions"
ON public.savings_transactions FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. PENDING INVOICES (Loans): Secure UPDATE
DROP POLICY IF EXISTS "Users can update their own pending invoices" ON public.pending_invoices;
CREATE POLICY "Users can update their own pending invoices"
ON public.pending_invoices FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 7. FUTURE EXPENSES: Secure UPDATE (Conditional check/re-apply)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'future_expenses') THEN
        DROP POLICY IF EXISTS "Users can update their own future expenses" ON public.future_expenses;
        
        EXECUTE 'CREATE POLICY "Users can update their own future expenses"
        ON public.future_expenses FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id)';
    END IF;
END $$;

-- 8. PAYMENT METHODS: Secure UPDATE
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payment_methods') THEN
        DROP POLICY IF EXISTS "Users can update their own payment methods" ON public.payment_methods;
        
        EXECUTE 'CREATE POLICY "Users can update their own payment methods"
        ON public.payment_methods FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id)';
    END IF;
END $$;
