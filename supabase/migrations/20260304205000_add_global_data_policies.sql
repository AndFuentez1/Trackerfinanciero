-- 1. Schema Update: Add country and data_treatment_accepted to profiles
ALTER TABLE public.profiles 
ADD COLUMN country TEXT,
ADD COLUMN data_treatment_accepted BOOLEAN DEFAULT false;

-- 2. Access Control Function
CREATE OR REPLACE FUNCTION public.has_accepted_data_policy()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT data_treatment_accepted FROM public.profiles WHERE user_id = auth.uid()), false);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. RLS Hardening for INSERT and UPDATE on core tables
-- We only restrict INSERT and UPDATE. Users can always SELECT and DELETE their own data.

-- Transactions
DROP POLICY IF EXISTS "Users can create their own transactions" ON public.transactions;
CREATE POLICY "Users can create their own transactions"
ON public.transactions FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.has_accepted_data_policy());

DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
CREATE POLICY "Users can update their own transactions"
ON public.transactions FOR UPDATE
USING (auth.uid() = user_id AND public.has_accepted_data_policy());

-- Budgets
DROP POLICY IF EXISTS "Users can create their own budgets" ON public.budgets;
CREATE POLICY "Users can create their own budgets"
ON public.budgets FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.has_accepted_data_policy());

DROP POLICY IF EXISTS "Users can update their own budgets" ON public.budgets;
CREATE POLICY "Users can update their own budgets"
ON public.budgets FOR UPDATE
USING (auth.uid() = user_id AND public.has_accepted_data_policy());

-- Payment Methods
DROP POLICY IF EXISTS "Users can create their own payment methods" ON public.payment_methods;
CREATE POLICY "Users can create their own payment methods"
ON public.payment_methods FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.has_accepted_data_policy());

DROP POLICY IF EXISTS "Users can update their own payment methods" ON public.payment_methods;
CREATE POLICY "Users can update their own payment methods"
ON public.payment_methods FOR UPDATE
USING (auth.uid() = user_id AND public.has_accepted_data_policy());

-- Savings Accounts
DROP POLICY IF EXISTS "Users can insert their own savings accounts" ON public.savings_accounts;
CREATE POLICY "Users can insert their own savings accounts"
ON public.savings_accounts FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.has_accepted_data_policy());

DROP POLICY IF EXISTS "Users can update their own savings accounts" ON public.savings_accounts;
CREATE POLICY "Users can update their own savings accounts"
ON public.savings_accounts FOR UPDATE
USING (auth.uid() = user_id AND public.has_accepted_data_policy());

-- Future Expenses
DROP POLICY IF EXISTS "Users can create their own future expenses" ON public.future_expenses;
CREATE POLICY "Users can create their own future expenses"
ON public.future_expenses FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.has_accepted_data_policy());

DROP POLICY IF EXISTS "Users can update their own future expenses" ON public.future_expenses;
CREATE POLICY "Users can update their own future expenses"
ON public.future_expenses FOR UPDATE
USING (auth.uid() = user_id AND public.has_accepted_data_policy());

-- Pending Invoices
DROP POLICY IF EXISTS "Users can create their own pending invoices" ON public.pending_invoices;
CREATE POLICY "Users can create their own pending invoices"
ON public.pending_invoices FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.has_accepted_data_policy());

DROP POLICY IF EXISTS "Users can update their own pending invoices" ON public.pending_invoices;
CREATE POLICY "Users can update their own pending invoices"
ON public.pending_invoices FOR UPDATE
USING (auth.uid() = user_id AND public.has_accepted_data_policy());

-- Profiles: Allow updates WITHOUT the policy check so the user CAN ACCEPT the policy itself
-- (The existing policy `USING (auth.uid() = user_id)` remains unchanged to allow them to toggle `data_treatment_accepted`)
