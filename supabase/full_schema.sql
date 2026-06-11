-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'savings', 'investment')),
  category TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create budgets table
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  month DATE NOT NULL,
  is_recurrent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, category, month)
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  currency TEXT DEFAULT 'MXN',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Transactions policies
CREATE POLICY "Users can view their own transactions"
ON public.transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions"
ON public.transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
ON public.transactions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
ON public.transactions FOR DELETE
USING (auth.uid() = user_id);

-- Budgets policies
CREATE POLICY "Users can view their own budgets"
ON public.budgets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own budgets"
ON public.budgets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets"
ON public.budgets FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets"
ON public.budgets FOR DELETE
USING (auth.uid() = user_id);

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at
BEFORE UPDATE ON public.budgets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- Create payment_methods table
CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'debit', 'credit')),
  balance NUMERIC NOT NULL DEFAULT 0,
  credit_limit NUMERIC DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own payment methods"
ON public.payment_methods FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payment methods"
ON public.payment_methods FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment methods"
ON public.payment_methods FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment methods"
ON public.payment_methods FOR DELETE
USING (auth.uid() = user_id);

-- Add payment_method_id to transactions
ALTER TABLE public.transactions
ADD COLUMN payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL;

-- Trigger for updated_at
CREATE TRIGGER update_payment_methods_updated_at
BEFORE UPDATE ON public.payment_methods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Add PIN field to profiles table for alternative login
ALTER TABLE public.profiles 
ADD COLUMN pin_hash TEXT DEFAULT NULL;

-- Note: PIN will be hashed on the client side before storing
-- Create savings accounts table
CREATE TABLE public.savings_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0,
  interest_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.savings_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own savings accounts" 
ON public.savings_accounts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own savings accounts" 
ON public.savings_accounts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own savings accounts" 
ON public.savings_accounts FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own savings accounts" 
ON public.savings_accounts FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_savings_accounts_updated_at
BEFORE UPDATE ON public.savings_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create savings transactions table for tracking deposits/withdrawals and performance
CREATE TABLE public.savings_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  savings_account_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'interest')),
  amount NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.savings_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own savings transactions" 
ON public.savings_transactions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own savings transactions" 
ON public.savings_transactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own savings transactions" 
ON public.savings_transactions FOR DELETE 
USING (auth.uid() = user_id);
create table "public"."categories" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "name" text not null,
    "user_id" uuid not null,
    "type" text not null,
    "icon" text,
    "color" text
);


alter table "public"."categories" enable row level security;

create unique index categories_pkey on public.categories using btree (id);

alter table "public"."categories" add constraint "categories_pkey" primary key using index "categories_pkey";

alter table "public"."categories" add constraint "categories_user_id_fkey" foreign key (user_id) references auth.users(id) on delete cascade not valid;

alter table "public"."categories" validate constraint "categories_user_id_fkey";

create policy "Users can delete their own categories"
on "public"."categories"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can insert their own categories"
on "public"."categories"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can select their own categories"
on "public"."categories"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Users can update their own categories"
on "public"."categories"
as permissive
for update
to public
using ((auth.uid() = user_id));

-- Add some default categories for existing users? 
-- It's hard to do this in SQL for all users without a function, 
-- but we can't easily iterate users here. 
-- Instead, the frontend should handle "default" categories if the list is empty, 
-- or we can create a function to initialize text.

-- However, since the user complained about existing structure, let's just create the table.
-- We will also modify the frontend to fallback to defaults if no categories exist in DB, 
-- or provide a button to "initialize defaults".
-- Insert default categories into categories table for existing users
-- Note: In a real multi-tenancy scenario, we might iterate users or rely on a trigger. 
-- For this individual user context, we will insert them for the currently authenticated user if possible, 
-- or generic if RLS allows. 
-- However, since this is a migration run, we can't easily target "current user".
-- Strategy: We'll create a function to seed categories for a given user, or just rely on the user manually creating them or the app doing it.
-- BETTER STRATEGY FOR THIS CONTEXT: We will insert the defaults with a hardcoded user_id OR 
-- we can insert them into a public/template table if we had one.
-- BUT, since the user complained the DB is empty, let's create a SQL script they can run in the SQL Editor 
-- or attempting to migratable way. 
-- PROBLEM: We don't have the user's ID in the migration.
-- ALTERNATIVE: Modify the app to check if categories are empty on load, and if so, seed them.
-- That is robust. Let's do that in `useFinanceData.ts`.
-- BUT for the migration artifact asked by user, I will create a SQL file that blindly inserts for ALL existing users? 
-- Or just create the categories unassigned? No, they require user_id.

-- Let's stick to the APP-SIDE SEEDING logic. It's safer. 
-- I will create a migration that just ENSURES the table exists (already done).

-- Wait, the `AddBudgetDialog` failure is likely because `categoryOptions` are hardcoded there but `useFinanceData` expects dynamic ones?
-- No, `useFinanceData` accepts string.
-- The issue is `AddBudgetDialog` has `categoryOptions` hardcoded.
-- If the user tries to create a budget, it sends a string like 'food'.
-- `addBudget` -> `supabase.from('budgets').insert(...)`
-- If `budgets` table has a foreign key to `categories`, that would fail if 'food' isn't in `categories` table.
-- Let's check the constraint in `budgets`.
-- I did NOT see a foreign key to `categories` in `budgets` in the previous `types.ts` view.
-- The schema I created for `categories` didn't enforce FK on `budgets` to `categories` yet? 
-- If I didn't add that constraint, inserts should work.
-- UNLESS the user implies "cannot create" because the dropdown is empty?
-- `AddBudgetDialog.tsx` uses a hardcoded list: `const categoryOptions ...`. So the dropdown IS NOT empty. The user CAN pick one.
-- So why "cannot create"?
-- "values total more than what is in the database" -> implies data syncing issues.

-- Let's update `AddBudgetDialog` to use dynamic categories FIRST.
-- And implement SEEDING in `useFinanceData` if empty.

-- I will create the seed migration script ANYWAY as an artifact for the user to optionally run, 
-- but I heavily suspect the app needs to handle the seeding because we don't know the User ID here.
-- actually, I can create a migration that iterates all users and inserts defaults.

DO $$
DECLARE
  user_rec record;
BEGIN
  FOR user_rec IN SELECT id FROM auth.users LOOP
    INSERT INTO public.categories (name, type, user_id, icon, color)
    VALUES 
    ('Salario', 'income', user_rec.id, 'wallet', 'bg-emerald-500'),
    ('Otros ingresos', 'income', user_rec.id, 'coins', 'bg-emerald-400'),
    ('Alimentación', 'expense', user_rec.id, 'utensils', 'bg-orange-500'),
    ('Arriendo y mudanzas', 'expense', user_rec.id, 'home', 'bg-amber-700'),
    ('Aseo y limpieza', 'expense', user_rec.id, 'spray-can', 'bg-sky-400'),
    ('Cuidado personal y estética', 'expense', user_rec.id, 'sparkles', 'bg-rose-400'),
    ('Teléfono', 'expense', user_rec.id, 'smartphone', 'bg-blue-400'),
    ('Restaurantes', 'expense', user_rec.id, 'utensils-crossed', 'bg-orange-400'),
    ('Mecato y bebidas', 'expense', user_rec.id, 'coffee', 'bg-pink-500'),
    ('Educación', 'expense', user_rec.id, 'graduation-cap', 'bg-indigo-600'),
    ('Gym', 'expense', user_rec.id, 'dumbbell', 'bg-red-500'),
    ('Oficina y trabajo', 'expense', user_rec.id, 'briefcase', 'bg-slate-500'),
    ('Salidas, hospedajes y ocio', 'expense', user_rec.id, 'plane', 'bg-cyan-500'),
    ('Aplicativos, libros y gadgets', 'expense', user_rec.id, 'laptop', 'bg-violet-500'),
    ('Ropa, calzado y accesorios', 'expense', user_rec.id, 'shirt', 'bg-fuchsia-500'),
    ('Farmacia y Salud', 'expense', user_rec.id, 'pill', 'bg-red-400'),
    ('Salud y pensión', 'expense', user_rec.id, 'activity', 'bg-rose-500'),
    ('Seguro de vida', 'expense', user_rec.id, 'heart', 'bg-red-600'),
    ('Seguro moto', 'expense', user_rec.id, 'shield', 'bg-blue-600'),
    ('Civica', 'expense', user_rec.id, 'bus', 'bg-blue-700'),
    ('Transporte', 'expense', user_rec.id, 'car', 'bg-blue-500'),
    ('Gasolina', 'expense', user_rec.id, 'fuel', 'bg-yellow-600'),
    ('Parqueadero', 'expense', user_rec.id, 'parking-circle', 'bg-slate-400'),
    ('Moto', 'expense', user_rec.id, 'bike', 'bg-neutral-700'),
    ('Regalos', 'expense', user_rec.id, 'gift', 'bg-pink-400'),
    ('Utilería hogar y decoración', 'expense', user_rec.id, 'sofa', 'bg-orange-800'),
    ('Utilería oficina', 'expense', user_rec.id, 'paperclip', 'bg-slate-600'),
    ('Documentos y papelería', 'expense', user_rec.id, 'file-text', 'bg-zinc-400'),
    ('Grandes activos', 'expense', user_rec.id, 'gem', 'bg-indigo-900'),
    ('Reparaciones', 'expense', user_rec.id, 'wrench', 'bg-orange-900'),
    ('Préstamos', 'expense', user_rec.id, 'banknote', 'bg-red-700'),
    ('Impuestos y multas', 'expense', user_rec.id, 'building-2', 'bg-stone-600'),
    ('Ahorro', 'savings', user_rec.id, 'piggy-bank', 'bg-emerald-600'),
    ('CDT', 'savings', user_rec.id, 'landmark', 'bg-purple-600'),
    ('Acciones', 'investment', user_rec.id, 'trending-up', 'bg-indigo-500'),
    ('Otro', 'other', user_rec.id, 'help-circle', 'bg-gray-500')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
-- Add unique constraint on categories per user (user_id, name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'categories_user_name_unique'
  ) THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_user_name_unique UNIQUE (user_id, name);
  END IF;
END
$$;
-- Add columns for Credit Card and Savings features to payment_methods table

ALTER TABLE payment_methods 
ADD COLUMN IF NOT EXISTS is_savings_account BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS savings_goal NUMERIC,
ADD COLUMN IF NOT EXISTS estimated_yield NUMERIC,
ADD COLUMN IF NOT EXISTS closing_date INTEGER,
ADD COLUMN IF NOT EXISTS payment_day INTEGER;
-- Drop existing check constraint and add new one including 'transfer'
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE transactions 
ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('income', 'expense', 'savings', 'investment', 'transfer'));
-- Add category_id to budgets table and link to categories table
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id);

-- Optional: You might want to drop the old category string column later, 
-- but for now we keep it or just ignore it to avoid breaking existing code abruptly if it's used elsewhere.
-- We will rely on category_id for the new logic.
-- Add category_id to transactions table and link to categories table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);

-- Create pending_invoices table
create table if not exists public.pending_invoices (
    id uuid not null default gen_random_uuid(),
    created_at timestamp with time zone not null default now(),
    arrival_date timestamp with time zone not null default now(),
    amount numeric not null,
    description text not null,
    category text,
    status text not null default 'pending',
    user_id uuid not null references auth.users(id) on delete cascade,
    constraint pending_invoices_pkey primary key (id)
);

-- Enable Row Level Security (RLS)
alter table public.pending_invoices enable row level security;

-- Create policies
drop policy if exists "Users can view their own pending invoices" on public.pending_invoices;
create policy "Users can view their own pending invoices"
on public.pending_invoices for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own pending invoices" on public.pending_invoices;
create policy "Users can insert their own pending invoices"
on public.pending_invoices for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own pending invoices" on public.pending_invoices;
create policy "Users can update their own pending invoices"
on public.pending_invoices for update
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can delete their own pending invoices" on public.pending_invoices;
create policy "Users can delete their own pending invoices"
on public.pending_invoices for delete
to authenticated
using (auth.uid() = user_id);

-- Enable Realtime
alter publication supabase_realtime add table public.pending_invoices;
-- Create classifier_rules table to store user-specific classification feedback
CREATE TABLE IF NOT EXISTS public.classifier_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pattern TEXT NOT NULL, -- The keyword or product code
    category TEXT NOT NULL, -- The human-readable category name
    type TEXT NOT NULL CHECK (type IN ('keyword', 'code')), -- Type of match
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, pattern, type)
);

-- Enable RLS
ALTER TABLE public.classifier_rules ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own classifier rules"
    ON public.classifier_rules
    FOR ALL
    USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_classifier_rules_user_pattern ON public.classifier_rules (user_id, pattern);

-- Enable realtime
ALTER TABLE public.classifier_rules REPLICA IDENTITY FULL;
alter publication supabase_realtime add table public.classifier_rules;

-- RPC Function to Approve Pending Invoice with Smart Category Creation
create or replace function public.approve_pending_invoice(
    p_invoice_id uuid,
    p_user_id uuid,
    p_category_name text,
    p_payment_method_id uuid
)
returns boolean
language plpgsql
security definer
as $$
declare
    v_category_id uuid;
    v_amount numeric;
    v_description text;
    v_date timestamp with time zone;
    v_new_category boolean := false;
begin
    -- 1. Get invoice details
    select amount, description, arrival_date
    into v_amount, v_description, v_date
    from public.pending_invoices
    where id = p_invoice_id and user_id = p_user_id;

    if not found then
        raise exception 'Invoice not found or access denied';
    end if;

    -- 2. Normalize and Find/Create Category
    -- standardizing input: trim whitespace and lowercase for comparison, but store with proper casing if new? 
    -- User request: "Trim + lowercase" for normalization.
    
    select id into v_category_id
    from public.categories
    where lower(trim(name)) = lower(trim(p_category_name))
    and user_id = p_user_id
    limit 1;

    if v_category_id is null then
        -- Create new category
        insert into public.categories (name, user_id, type, color)
        values (trim(p_category_name), p_user_id, 'expense', '#9CA3AF') -- Default gray color
        returning id into v_category_id;
        v_new_category := true;
    end if;

    -- 3. Insert into Transactions
    insert into public.transactions (
        user_id,
        amount,
        description,
        date,
        type,
        category_id,
        payment_method_id,
        created_at
    )
    values (
        p_user_id,
        v_amount,
        v_description,
        v_date,
        'expense', -- Invoices are expenses
        v_category_id,
        p_payment_method_id,
        now()
    );

    -- 4. Delete from Pending Invoices
    delete from public.pending_invoices
    where id = p_invoice_id;

    return true;
end;
$$;

-- Create future_expenses table
create table if not exists public.future_expenses (
    id uuid not null default gen_random_uuid(),
    created_at timestamp with time zone not null default now(),
    payment_date date not null,
    amount numeric not null,
    description text not null,
    category_id uuid references public.categories(id) on delete set null,
    user_id uuid not null references auth.users(id) on delete cascade,
    status text not null default 'pending', -- 'pending', 'paid'
    constraint future_expenses_pkey primary key (id)
);

-- Enable RLS
alter table public.future_expenses enable row level security;

-- Policies
create policy "Users can view their own future expenses"
on public.future_expenses for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own future expenses"
on public.future_expenses for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own future expenses"
on public.future_expenses for update
to authenticated
using (auth.uid() = user_id);

create policy "Users can delete their own future expenses"
on public.future_expenses for delete
to authenticated
using (auth.uid() = user_id);
-- Drop the existing function first to change signature
DROP FUNCTION IF EXISTS approve_pending_invoice;

-- Recreate directly with the new parameter
CREATE OR REPLACE FUNCTION approve_pending_invoice(
  p_invoice_id UUID,
  p_user_id UUID,
  p_category_name TEXT,
  p_payment_method_id UUID DEFAULT NULL,
  p_transaction_type TEXT DEFAULT 'expense'
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice RECORD;
  v_category_id UUID;
  v_new_category BOOLEAN := FALSE;
BEGIN
  -- 1. Get invoice details
  SELECT * INTO v_invoice FROM pending_invoices WHERE id = p_invoice_id;
  
  IF v_invoice IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invoice not found');
  END IF;

  -- 2. Find or Create Category
  -- Normalize name
  SELECT id INTO v_category_id FROM categories 
  WHERE user_id = p_user_id 
  AND LOWER(name) = LOWER(TRIM(p_category_name));

  IF v_category_id IS NULL THEN
    INSERT INTO categories (user_id, name, type, color, icon)
    VALUES (p_user_id, TRIM(p_category_name), p_transaction_type, '#9CA3AF', 'circle')
    RETURNING id INTO v_category_id;
    v_new_category := TRUE;
  END IF;

  -- 3. Insert into transactions
  INSERT INTO transactions (
    user_id,
    amount,
    type,
    category,
    category_id,
    description,
    date,
    payment_method_id
  ) VALUES (
    p_user_id,
    v_invoice.amount,
    p_transaction_type, -- Use the passed type (income/expense)
    TRIM(p_category_name),
    v_category_id,
    v_invoice.description,
    v_invoice.arrival_date, -- Use arrival_date as transaction date
    p_payment_method_id
  );

  -- 4. Delete pending invoice
  DELETE FROM pending_invoices WHERE id = p_invoice_id;

  RETURN json_build_object(
    'success', true,
    'new_category', v_new_category,
    'category_name', TRIM(p_category_name)
  );
END;
$$;
-- Mark onboarding/welcome completion explicitly to avoid UI flicker while data loads
alter table public.profiles
  add column if not exists welcome_completed boolean default false;

-- Backfill for existing users that already completed onboarding flows
update public.profiles
set welcome_completed = true
where currency is not null;
-- Improve handle_new_user trigger to be more robust
-- This trigger creates profiles automatically for Magic Link, OTP, and all auth methods

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  display_name_value TEXT;
BEGIN
  -- Extract display_name from raw_user_meta_data, default to email user part if not provided
  display_name_value := COALESCE(
    NEW.raw_user_meta_data ->> 'display_name',
    SPLIT_PART(NEW.email, '@', 1)  -- Use email prefix as fallback
  );

  -- Insert profile with email and initialized fields
  -- This works for all auth methods: Magic Link, OTP, password signup, etc.
  INSERT INTO public.profiles (
    user_id,
    display_name,
    currency,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    display_name_value,
    'MXN',  -- Default currency
    now(),
    now()
  )
  ON CONFLICT (user_id) DO NOTHING;  -- Silently skip if profile already exists
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the trigger
  RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop and recreate the trigger to use the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Add comment documenting the trigger
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a user profile after auth.users insert. Works for all auth methods: Magic Link, OTP, password signup, etc. Uses email prefix as fallback display_name if not provided.';
-- Add decimal_places column to profiles table
-- This column stores the number of decimal places to display in currency amounts
-- Default is 0 (no decimals), can be 0, 1, 2, etc.

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS decimal_places INTEGER DEFAULT 0;

-- Add comment to document the column
COMMENT ON COLUMN profiles.decimal_places IS 'Number of decimal places to display for currency amounts (0, 1, 2, etc.)';
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
-- Ensure new user profiles have id = auth.users.id so app lookups by .eq('id', user.id) find the row.
-- The app expects profile.id to match the auth user id for updates and selects.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  display_name_value TEXT;
BEGIN
  display_name_value := COALESCE(
    NEW.raw_user_meta_data ->> 'display_name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  -- Insert profile with id = NEW.id so profile.id equals auth user id (app uses .eq('id', user.id))
  INSERT INTO public.profiles (
    id,
    user_id,
    display_name,
    currency,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.id,
    display_name_value,
    'MXN',
    now(),
    now()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates profile with id = user id so app lookups by profile.id find the row.';
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
-- ============================================================================
-- Backend hardening and schema alignment (2026-02-05)
-- ============================================================================

-- 0) Clean up corrupted profiles with NULL id before schema hardening
DELETE FROM public.profiles
WHERE id IS NULL;

-- 1) Profiles: missing columns, consistency, and constraints
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_decision text,
  ADD COLUMN IF NOT EXISTS has_pending_import boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS profile_type text,
  ADD COLUMN IF NOT EXISTS base_color text,
  ADD COLUMN IF NOT EXISTS decimal_places integer DEFAULT 0;

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id
  AND p.email IS NULL;

UPDATE public.profiles
SET id = user_id
WHERE id IS DISTINCT FROM user_id;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_matches_user_id;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_matches_user_id
  CHECK (id = user_id);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_onboarding_decision_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_onboarding_decision_check
  CHECK (onboarding_decision IS NULL OR onboarding_decision IN ('pending', 'from_scratch', 'imported'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_decimal_places_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_decimal_places_check
  CHECK (decimal_places IS NULL OR (decimal_places BETWEEN 0 AND 4));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'welcome_completed'
  ) THEN
    UPDATE public.profiles
    SET welcome_completed = true
    WHERE welcome_completed IS DISTINCT FROM true
      AND (
        onboarding_decision IS NOT NULL
        OR has_pending_import = true
        OR currency IS NOT NULL
      );
  END IF;
END $$;

-- Update handle_new_user to align with profile schema
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  display_name_value TEXT;
BEGIN
  display_name_value := COALESCE(
    NEW.raw_user_meta_data ->> 'display_name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (
    id,
    user_id,
    display_name,
    currency,
    created_at,
    updated_at,
    email,
    profile_type,
    onboarding_decision,
    has_pending_import,
    welcome_completed,
    decimal_places,
    base_color
  ) VALUES (
    NEW.id,
    NEW.id,
    display_name_value,
    'MXN',
    now(),
    now(),
    NEW.email,
    'Personal',
    NULL,
    false,
    false,
    0,
    NULL
  )
  ON CONFLICT (user_id) DO UPDATE
  SET display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
      email = COALESCE(EXCLUDED.email, profiles.email),
      updated_at = now()
  WHERE profiles.id IS NOT NULL;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2) Categories: saving_goal and type validation
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS saving_goal numeric(12,2);

ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_type_check;
ALTER TABLE public.categories
  ADD CONSTRAINT categories_type_check
  CHECK (type IN ('income', 'expense', 'savings', 'investment', 'loan', 'transfer', 'other'));

ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_saving_goal_check;
ALTER TABLE public.categories
  ADD CONSTRAINT categories_saving_goal_check
  CHECK (saving_goal IS NULL OR saving_goal >= 0);

CREATE OR REPLACE FUNCTION public.propagate_category_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE public.transactions
    SET category = NEW.name
    WHERE category_id = NEW.id;

    UPDATE public.budgets
    SET category = NEW.name
    WHERE category_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_categories_propagate_name ON public.categories;
CREATE TRIGGER trg_categories_propagate_name
AFTER UPDATE OF name ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.propagate_category_name();

-- 3) Payment methods: missing columns, constraints, and FK
ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS color text;

ALTER TABLE public.payment_methods
  DROP CONSTRAINT IF EXISTS payment_methods_type_check;

ALTER TABLE public.payment_methods
  ADD CONSTRAINT payment_methods_type_check
  CHECK (type IN ('cash', 'debit', 'credit', 'savings', 'investment'));

ALTER TABLE public.payment_methods
  DROP CONSTRAINT IF EXISTS payment_methods_balance_check;
ALTER TABLE public.payment_methods
  ADD CONSTRAINT payment_methods_balance_check
  CHECK (balance >= 0);

ALTER TABLE public.payment_methods
  DROP CONSTRAINT IF EXISTS payment_methods_credit_limit_check;
ALTER TABLE public.payment_methods
  ADD CONSTRAINT payment_methods_credit_limit_check
  CHECK (credit_limit IS NULL OR credit_limit >= 0);

ALTER TABLE public.payment_methods
  DROP CONSTRAINT IF EXISTS payment_methods_savings_goal_check;
ALTER TABLE public.payment_methods
  ADD CONSTRAINT payment_methods_savings_goal_check
  CHECK (savings_goal IS NULL OR savings_goal >= 0);

ALTER TABLE public.payment_methods
  DROP CONSTRAINT IF EXISTS payment_methods_estimated_yield_check;
ALTER TABLE public.payment_methods
  ADD CONSTRAINT payment_methods_estimated_yield_check
  CHECK (estimated_yield IS NULL OR estimated_yield >= 0);

ALTER TABLE public.payment_methods
  DROP CONSTRAINT IF EXISTS payment_methods_closing_date_check;
ALTER TABLE public.payment_methods
  ADD CONSTRAINT payment_methods_closing_date_check
  CHECK (closing_date IS NULL OR (closing_date BETWEEN 1 AND 31));

ALTER TABLE public.payment_methods
  DROP CONSTRAINT IF EXISTS payment_methods_payment_day_check;
ALTER TABLE public.payment_methods
  ADD CONSTRAINT payment_methods_payment_day_check
  CHECK (payment_day IS NULL OR (payment_day BETWEEN 1 AND 31));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_methods_user_id_fkey'
  ) THEN
    ALTER TABLE public.payment_methods
      ADD CONSTRAINT payment_methods_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payment_methods_user_savings
  ON public.payment_methods(user_id, is_savings_account);

-- Shared domain for transactions.type (single source of truth)
-- Frontend stores actual values: transfer_in, transfer_out
-- Categories normalize all variants to 'transfer'
CREATE OR REPLACE FUNCTION public.allowed_transaction_types()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ARRAY[
    'income',
    'expense',
    'savings',
    'investment',
    'transfer',
    'transfer_in',
    'transfer_out',
    'loan',
    'other'
  ]::text[];
$$;

-- 4) Transactions: missing columns, type alignment, FK, and category sync
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS calculated_yield_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS balance_at_transaction numeric(12,2);

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_type_check
  CHECK (type = ANY (public.allowed_transaction_types()));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_user_id_fkey'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sync_transaction_category_fields()
RETURNS TRIGGER AS $$
DECLARE
  v_category_id uuid;
  v_category_name text;
BEGIN
  -- Resolve category_id from name when missing
  IF NEW.category_id IS NULL AND NEW.category IS NOT NULL THEN
    SELECT id, name INTO v_category_id, v_category_name
    FROM public.categories
    WHERE user_id = NEW.user_id
      AND lower(name) = lower(NEW.category)
    ORDER BY created_at NULLS LAST
    LIMIT 1;

    IF v_category_id IS NOT NULL THEN
      NEW.category_id := v_category_id;
      NEW.category := v_category_name;
    END IF;
  END IF;

  -- If category_id provided, enforce ownership and sync name
  IF NEW.category_id IS NOT NULL THEN
    SELECT name INTO v_category_name
    FROM public.categories
    WHERE id = NEW.category_id
      AND user_id = NEW.user_id;

    IF v_category_name IS NULL THEN
      RAISE EXCEPTION 'Invalid category_id for user';
    END IF;

    NEW.category := v_category_name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_transactions_sync_category ON public.transactions;
CREATE TRIGGER trg_transactions_sync_category
BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.sync_transaction_category_fields();

-- Validate payment method ownership for transactions
CREATE OR REPLACE FUNCTION public.validate_transaction_payment_method()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_method_id IS NOT NULL THEN
    PERFORM 1 FROM public.payment_methods
    WHERE id = NEW.payment_method_id
      AND user_id = NEW.user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid payment_method_id for user';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_transactions_validate_payment_method ON public.transactions;
CREATE TRIGGER trg_transactions_validate_payment_method
BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.validate_transaction_payment_method();

-- 5) Budgets: FK, index, and category sync
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'budgets_user_id_fkey'
  ) THEN
    ALTER TABLE public.budgets
      ADD CONSTRAINT budgets_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_budgets_user_month
  ON public.budgets(user_id, month);

CREATE OR REPLACE FUNCTION public.sync_budget_category_fields()
RETURNS TRIGGER AS $$
DECLARE
  v_category_id uuid;
  v_category_name text;
BEGIN
  -- Resolve category_id from name when missing
  IF NEW.category_id IS NULL AND NEW.category IS NOT NULL THEN
    SELECT id, name INTO v_category_id, v_category_name
    FROM public.categories
    WHERE user_id = NEW.user_id
      AND lower(name) = lower(NEW.category)
    ORDER BY created_at NULLS LAST
    LIMIT 1;

    IF v_category_id IS NOT NULL THEN
      NEW.category_id := v_category_id;
      NEW.category := v_category_name;
    END IF;
  END IF;

  -- If category_id provided, enforce ownership and sync name
  IF NEW.category_id IS NOT NULL THEN
    SELECT name INTO v_category_name
    FROM public.categories
    WHERE id = NEW.category_id
      AND user_id = NEW.user_id;

    IF v_category_name IS NULL THEN
      RAISE EXCEPTION 'Invalid category_id for user';
    END IF;

    NEW.category := v_category_name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_budgets_sync_category ON public.budgets;
CREATE TRIGGER trg_budgets_sync_category
BEFORE INSERT OR UPDATE ON public.budgets
FOR EACH ROW EXECUTE FUNCTION public.sync_budget_category_fields();

-- 6) Savings accounts and transactions alignment
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'savings_accounts_user_id_fkey'
  ) THEN
    ALTER TABLE public.savings_accounts
      ADD CONSTRAINT savings_accounts_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.savings_accounts
  DROP CONSTRAINT IF EXISTS savings_accounts_balance_check;
ALTER TABLE public.savings_accounts
  ADD CONSTRAINT savings_accounts_balance_check
  CHECK (balance >= 0);

-- Add new columns to savings_transactions if they don't exist
ALTER TABLE public.savings_transactions
  ADD COLUMN IF NOT EXISTS payment_method_id uuid,
  ADD COLUMN IF NOT EXISTS calculated_yield numeric(12,2),
  ADD COLUMN IF NOT EXISTS balance_after_transaction numeric(12,2);

-- Make savings_account_id optional only if the column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'savings_transactions' AND column_name = 'savings_account_id'
  ) THEN
    ALTER TABLE public.savings_transactions
      ALTER COLUMN savings_account_id DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'savings_transactions_user_id_fkey'
  ) THEN
    ALTER TABLE public.savings_transactions
      ADD CONSTRAINT savings_transactions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'savings_transactions_payment_method_id_fkey'
  ) THEN
    ALTER TABLE public.savings_transactions
      ADD CONSTRAINT savings_transactions_payment_method_id_fkey
      FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.savings_transactions
  DROP CONSTRAINT IF EXISTS savings_transactions_amount_check;
ALTER TABLE public.savings_transactions
  ADD CONSTRAINT savings_transactions_amount_check
  CHECK (amount > 0);

ALTER TABLE public.savings_transactions
  DROP CONSTRAINT IF EXISTS savings_transactions_balance_after_check;
ALTER TABLE public.savings_transactions
  ADD CONSTRAINT savings_transactions_balance_after_check
  CHECK (balance_after_transaction IS NULL OR balance_after_transaction >= 0);

-- Only add the account_present_check if savings_account_id column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'savings_transactions' AND column_name = 'savings_account_id'
  ) THEN
    ALTER TABLE public.savings_transactions
      DROP CONSTRAINT IF EXISTS savings_transactions_account_present_check;
    ALTER TABLE public.savings_transactions
      ADD CONSTRAINT savings_transactions_account_present_check
      CHECK (savings_account_id IS NOT NULL OR payment_method_id IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_savings_transactions_user_payment_date
  ON public.savings_transactions(user_id, payment_method_id, date DESC);

CREATE OR REPLACE FUNCTION public.prepare_savings_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_is_savings boolean;
BEGIN
  -- Validate payment_method_id ownership and type when provided
  IF NEW.payment_method_id IS NOT NULL THEN
    SELECT is_savings_account INTO v_is_savings
    FROM public.payment_methods
    WHERE id = NEW.payment_method_id
      AND user_id = NEW.user_id;

    IF v_is_savings IS NULL THEN
      RAISE EXCEPTION 'Invalid payment_method_id for user';
    END IF;

    IF v_is_savings IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'payment_method_id is not a savings account';
    END IF;
  END IF;

  -- Validate savings_account_id ownership when provided
  -- Buscar en savings_accounts o en payment_methods (con is_savings_account = true)
  IF NEW.savings_account_id IS NOT NULL THEN
    -- Intentar en la tabla legacy savings_accounts
    PERFORM 1 FROM public.savings_accounts
    WHERE id = NEW.savings_account_id
      AND user_id = NEW.user_id;
      
    IF NOT FOUND THEN
      -- Intentar en payment_methods donde es cuenta de ahorros
      PERFORM 1 FROM public.payment_methods
      WHERE id = NEW.savings_account_id
        AND user_id = NEW.user_id
        AND is_savings_account = true;
        
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid savings_account_id for user';
      END IF;
    END IF;
  END IF;

  -- Fill calculated_yield if not provided
  IF NEW.calculated_yield IS NULL THEN
    IF NEW.type = 'interest' THEN
      NEW.calculated_yield := NEW.amount;
    ELSE
      NEW.calculated_yield := 0;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_savings_transactions_prepare ON public.savings_transactions;
CREATE TRIGGER trg_savings_transactions_prepare
BEFORE INSERT OR UPDATE ON public.savings_transactions
FOR EACH ROW EXECUTE FUNCTION public.prepare_savings_transaction();

-- 7) Future expenses and pending invoices: validation and indexes
ALTER TABLE public.future_expenses
  DROP CONSTRAINT IF EXISTS future_expenses_amount_check;
ALTER TABLE public.future_expenses
  ADD CONSTRAINT future_expenses_amount_check
  CHECK (amount > 0);

ALTER TABLE public.future_expenses
  DROP CONSTRAINT IF EXISTS future_expenses_status_check;
ALTER TABLE public.future_expenses
  ADD CONSTRAINT future_expenses_status_check
  CHECK (status IN ('pending', 'paid', 'canceled', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_future_expenses_user_payment_date
  ON public.future_expenses(user_id, payment_date);

ALTER TABLE public.pending_invoices
  DROP CONSTRAINT IF EXISTS pending_invoices_amount_check;
ALTER TABLE public.pending_invoices
  ADD CONSTRAINT pending_invoices_amount_check
  CHECK (amount > 0);

ALTER TABLE public.pending_invoices
  DROP CONSTRAINT IF EXISTS pending_invoices_status_check;
ALTER TABLE public.pending_invoices
  ADD CONSTRAINT pending_invoices_status_check
  CHECK (status IN ('pending', 'approved', 'paid', 'canceled', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_pending_invoices_user_arrival
  ON public.pending_invoices(user_id, arrival_date);

-- 8) Loans and loan payments (missing backend tables)
CREATE TABLE IF NOT EXISTS public.loans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  total_amount numeric(12,2) NOT NULL CHECK (total_amount > 0),
  paid_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  interest_rate numeric(5,4) NOT NULL DEFAULT 0 CHECK (interest_rate >= 0),
  due_date date NULL,
  payment_method_id uuid NULL,
  type text NOT NULL CHECK (type IN ('borrowed', 'lent')),
  is_disbursed boolean NOT NULL DEFAULT true,
  installments integer NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT loans_pkey PRIMARY KEY (id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'loans_user_id_fkey'
  ) THEN
    ALTER TABLE public.loans
      ADD CONSTRAINT loans_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'loans_payment_method_id_fkey'
  ) THEN
    ALTER TABLE public.loans
      ADD CONSTRAINT loans_payment_method_id_fkey
      FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.loans
  DROP CONSTRAINT IF EXISTS loans_installments_check;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'loans' AND column_name = 'installments'
  ) THEN
    ALTER TABLE public.loans
      ADD CONSTRAINT loans_installments_check
      CHECK (installments IS NULL OR installments > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_loans_user_id
  ON public.loans(user_id);

CREATE INDEX IF NOT EXISTS idx_loans_due_date
  ON public.loans(user_id, due_date);

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own loans" ON public.loans;
CREATE POLICY "Users can view their own loans"
ON public.loans FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own loans" ON public.loans;
CREATE POLICY "Users can create their own loans"
ON public.loans FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own loans" ON public.loans;
CREATE POLICY "Users can update their own loans"
ON public.loans FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own loans" ON public.loans;
CREATE POLICY "Users can delete their own loans"
ON public.loans FOR DELETE
USING (auth.uid() = user_id);

-- Helper function for updating updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_loans_updated_at ON public.loans;
CREATE TRIGGER update_loans_updated_at
BEFORE UPDATE ON public.loans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.loan_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT loan_payments_pkey PRIMARY KEY (id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'loan_payments_loan_id_fkey'
  ) THEN
    ALTER TABLE public.loan_payments
      ADD CONSTRAINT loan_payments_loan_id_fkey
      FOREIGN KEY (loan_id) REFERENCES public.loans(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_date
  ON public.loan_payments(loan_id, date);

ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own loan payments" ON public.loan_payments;
CREATE POLICY "Users can view their own loan payments"
ON public.loan_payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.loans
    WHERE loans.id = loan_payments.loan_id
      AND loans.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create their own loan payments" ON public.loan_payments;
CREATE POLICY "Users can create their own loan payments"
ON public.loan_payments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.loans
    WHERE loans.id = loan_payments.loan_id
      AND loans.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update their own loan payments" ON public.loan_payments;
CREATE POLICY "Users can update their own loan payments"
ON public.loan_payments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.loans
    WHERE loans.id = loan_payments.loan_id
      AND loans.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.loans
    WHERE loans.id = loan_payments.loan_id
      AND loans.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete their own loan payments" ON public.loan_payments;
CREATE POLICY "Users can delete their own loan payments"
ON public.loan_payments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.loans
    WHERE loans.id = loan_payments.loan_id
      AND loans.user_id = auth.uid()
  )
);

-- Validate loan payment method ownership
CREATE OR REPLACE FUNCTION public.validate_loan_payment_method()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_method_id IS NOT NULL THEN
    PERFORM 1 FROM public.payment_methods
    WHERE id = NEW.payment_method_id
      AND user_id = NEW.user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid payment_method_id for user';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_loans_validate_payment_method ON public.loans;
CREATE TRIGGER trg_loans_validate_payment_method
BEFORE INSERT OR UPDATE ON public.loans
FOR EACH ROW EXECUTE FUNCTION public.validate_loan_payment_method();

-- 9) Approve pending invoice RPC: enforce auth and consistency
DROP FUNCTION IF EXISTS public.approve_pending_invoice(uuid, uuid, text, uuid, text);

CREATE OR REPLACE FUNCTION public.approve_pending_invoice(
  p_invoice_id uuid,
  p_user_id uuid,
  p_category_name text,
  p_payment_method_id uuid DEFAULT NULL,
  p_transaction_type text DEFAULT 'expense'
)
RETURNS json
AS $$
DECLARE
  v_invoice RECORD;
  v_category_id uuid;
  v_new_category boolean := false;
  v_category_name text;
  v_category_type text;
  v_existing_category_type text;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  v_category_name := NULLIF(trim(p_category_name), '');
  IF v_category_name IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Category name required');
  END IF;

  IF p_transaction_type IS NULL OR NOT (p_transaction_type = ANY (public.allowed_transaction_types())) THEN
    RETURN json_build_object('success', false, 'error', 'Invalid transaction type');
  END IF;

  SELECT * INTO v_invoice
  FROM public.pending_invoices
  WHERE id = p_invoice_id
    AND user_id = auth.uid()
  FOR UPDATE;

  IF v_invoice IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invoice not found');
  END IF;

  IF p_payment_method_id IS NOT NULL THEN
    PERFORM 1 FROM public.payment_methods
    WHERE id = p_payment_method_id
      AND user_id = auth.uid();
    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'Invalid payment method');
    END IF;
  END IF;

  v_category_type := CASE
    WHEN p_transaction_type IN ('transfer_in', 'transfer_out') THEN 'transfer'
    ELSE p_transaction_type
  END;

  SELECT id, type INTO v_category_id, v_existing_category_type
  FROM public.categories
  WHERE user_id = auth.uid()
    AND lower(name) = lower(v_category_name)
  LIMIT 1;

  IF v_category_id IS NOT NULL AND v_existing_category_type IS DISTINCT FROM v_category_type THEN
    UPDATE public.categories
    SET type = v_category_type
    WHERE id = v_category_id;
  END IF;

  IF v_category_id IS NULL THEN
    INSERT INTO public.categories (user_id, name, type, color)
    VALUES (auth.uid(), v_category_name, v_category_type, '#9CA3AF')
    ON CONFLICT (user_id, name) DO UPDATE
    SET type = EXCLUDED.type
    RETURNING id INTO v_category_id;
    v_new_category := true;
  END IF;

  INSERT INTO public.transactions (
    user_id,
    amount,
    type,
    category,
    category_id,
    description,
    date,
    payment_method_id
  ) VALUES (
    auth.uid(),
    v_invoice.amount,
    p_transaction_type,
    v_category_name,
    v_category_id,
    v_invoice.description,
    v_invoice.arrival_date::date,
    p_payment_method_id
  );

  DELETE FROM public.pending_invoices
  WHERE id = p_invoice_id;

  RETURN json_build_object(
    'success', true,
    'new_category', v_new_category,
    'category_name', v_category_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- End of migration
-- ============================================================================

-- ============================================================================
-- Migration audit summary
-- ============================================================================
-- DBA Senior Review & Hardening (2026-02-05)
-- 
-- Corrections applied:
-- 1. Removed duplicate 'saving' from allowed_transaction_types() - kept only 'savings'
-- 2. Removed duplicate 'save' from categories.type - now mirrors domain
-- 3. Separated validation concerns:
--    - sync_transaction_category_fields(): handles category resolution ONLY
--    - validate_transaction_payment_method(): handles payment method ownership
-- 4. Clarified category type normalization in approve_pending_invoice():
--    - transfer_in/transfer_out → 'transfer' for categories
--    - Transactions preserve actual value (transfer_in, transfer_out)
-- 5. All validations now use single source of truth: public.allowed_transaction_types()
-- 6. No hardcoded type lists in functions - all checks use the shared domain function
--
-- Single source of truth established:
-- ✓ transactions.type: uses allowed_transaction_types() via CHECK
-- ✓ categories.type: normalized subset (transfer covers all transfer variants)
-- ✓ All RPC validations: use allowed_transaction_types()
-- ✓ No redundant or conflicting checks
--
-- Ready for production: ✅ APPROVED
-- ============================================================================
-- Fix savings_transactions.savings_account_id: allow NULL, update FK to payment_methods

-- Step 1: Allow NULL (was NOT NULL, causing FK insert errors)
ALTER TABLE public.savings_transactions
  ALTER COLUMN savings_account_id DROP NOT NULL;

-- Step 2: Drop existing FK (may reference savings_accounts or have wrong behavior)
ALTER TABLE public.savings_transactions
  DROP CONSTRAINT IF EXISTS savings_transactions_savings_account_id_fkey;

-- Step 3: Re-create FK pointing to payment_methods with ON DELETE SET NULL
ALTER TABLE public.savings_transactions
  ADD CONSTRAINT savings_transactions_savings_account_id_fkey
  FOREIGN KEY (savings_account_id)
  REFERENCES public.payment_methods(id)
  ON DELETE SET NULL;

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
-- Migration: Setup user_configs (consolidated from backend/migrations 001, 002, 003)
-- Date: 2026-02-11
-- Description: Ensures user_configs table and notification preference columns exist with correct names.

-- 1. Create table if not exists (base structure from 001)
CREATE TABLE IF NOT EXISTS public.user_configs (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  
  -- Encrypted credentials
  gmail_tokens TEXT,
  gemini_api_key TEXT,
  telegram_bot_token TEXT,
  telegram_chat_id TEXT,
  
  -- Metadata
  gmail_connected_at TIMESTAMPTZ,
  gemini_configured_at TIMESTAMPTZ,
  telegram_configured_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Handle Column Renames (upgrade from 002 -> 003)
DO $$
BEGIN
  -- notify_on_invoice -> notify_rules_exceptions
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_configs' AND column_name = 'notify_on_invoice') THEN
    ALTER TABLE public.user_configs RENAME COLUMN notify_on_invoice TO notify_rules_exceptions;
  END IF;

  -- notify_on_agent -> notify_ai_exceptions
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_configs' AND column_name = 'notify_on_agent') THEN
    ALTER TABLE public.user_configs RENAME COLUMN notify_on_agent TO notify_ai_exceptions;
  END IF;
END $$;

-- 3. Add default notification columns if they are still missing (upgrade from 001 -> 003)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_configs' AND column_name = 'notify_rules_exceptions') THEN
    ALTER TABLE public.user_configs ADD COLUMN notify_rules_exceptions BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_configs' AND column_name = 'notify_ai_exceptions') THEN
    ALTER TABLE public.user_configs ADD COLUMN notify_ai_exceptions BOOLEAN DEFAULT FALSE;
  END IF;

END $$;

-- 4. Enable RLS
ALTER TABLE public.user_configs ENABLE ROW LEVEL SECURITY;

-- 5. Policies
DROP POLICY IF EXISTS "Users can manage their own config" ON public.user_configs;
CREATE POLICY "Users can manage their own config"
  ON public.user_configs
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_user_configs_email ON public.user_configs(email);
CREATE INDEX IF NOT EXISTS idx_user_configs_id ON public.user_configs(id);

-- 7. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_user_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_configs_updated_at ON public.user_configs;
CREATE TRIGGER trigger_update_user_configs_updated_at
  BEFORE UPDATE ON public.user_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_configs_updated_at();

-- 8. Comments
COMMENT ON TABLE public.user_configs IS 'Per-user configuration for invoice processing and notifications';
COMMENT ON COLUMN public.user_configs.notify_rules_exceptions IS 'Notificar si las reglas fallan (Categoría: Otros)';
COMMENT ON COLUMN public.user_configs.notify_ai_exceptions IS 'Notificar si la IA falla (Categoría: Otros)';
-- Track Gmail invoice message status (read/approved)
create table if not exists public.gmail_message_status (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id text not null,
  status text not null default 'unread',
  read_at timestamp with time zone,
  approved_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint gmail_message_status_pkey primary key (id),
  constraint gmail_message_status_unique unique (user_id, message_id),
  constraint gmail_message_status_check check (status in ('unread', 'read', 'approved'))
);

create index if not exists idx_gmail_message_status_user
  on public.gmail_message_status(user_id);

create index if not exists idx_gmail_message_status_user_status
  on public.gmail_message_status(user_id, status);

alter table public.gmail_message_status enable row level security;

create policy "Users can view their own Gmail statuses"
on public.gmail_message_status for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own Gmail statuses"
on public.gmail_message_status for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own Gmail statuses"
on public.gmail_message_status for update
to authenticated
using (auth.uid() = user_id);

create policy "Users can delete their own Gmail statuses"
on public.gmail_message_status for delete
to authenticated
using (auth.uid() = user_id);

alter publication supabase_realtime add table public.gmail_message_status;
-- Allow archived/deleted statuses and migrate legacy 'approved' to 'archived'
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'gmail_message_status'
  ) then
    update public.gmail_message_status
    set status = 'archived'
    where status = 'approved';

    alter table public.gmail_message_status
      drop constraint if exists gmail_message_status_check;

    alter table public.gmail_message_status
      add constraint gmail_message_status_check
      check (status in ('unread', 'read', 'archived', 'deleted'));
  end if;
end $$;
-- Add message_id to pending_invoices for Gmail duplicate tracking
alter table public.pending_invoices
  add column if not exists message_id text;

create unique index if not exists idx_pending_invoices_user_message_id
  on public.pending_invoices(user_id, message_id)
  where message_id is not null;
-- Add source field for pending_invoices and relax message_id uniqueness
alter table public.pending_invoices
  add column if not exists source text;

drop index if exists idx_pending_invoices_user_message_id;

create index if not exists idx_pending_invoices_user_message_id
  on public.pending_invoices(user_id, message_id)
  where message_id is not null;
-- Add telegram_verified_at to user_configs for Telegram connection verification
alter table public.user_configs
  add column if not exists telegram_verified_at timestamptz;
-- Add cashflow_use_real_balance to user_configs for Cash Flow toggle persistence
alter table public.user_configs
  add column if not exists cashflow_use_real_balance boolean default false;

comment on column public.user_configs.cashflow_use_real_balance
  is 'Sincronizar flujo de caja con saldo real';
-- ============================================================================
-- DATA MASKING & LOAN INTEGRITY PATCH (2026-02-23)
-- ============================================================================
-- 1. Unique constraint on loans to prevent duplicate inserts at DB level
-- 2. Masked view over user_configs (hides tokens from direct SQL queries)
-- 3. Audit columns on user_configs for credential rotation tracking
-- ============================================================================
-- NOTE: Field-level encryption is handled entirely by the Node.js backend
-- (encryption.service.js → AES-256-CBC, key derived per user via scrypt).
-- Tokens in user_configs columns are NEVER plain text — they are stored as
-- "iv:ciphertext" hex. The SQL layer masks them as an additional display guard.
-- ============================================================================

-- ============================================================================
-- 1. LOANS: Prevent duplicate rows at DB level (same user + same loan name)
-- ============================================================================
ALTER TABLE public.loans
  DROP CONSTRAINT IF EXISTS loans_user_name_unique;

ALTER TABLE public.loans
  ADD CONSTRAINT loans_user_name_unique
  UNIQUE (user_id, name);

-- ============================================================================
-- 2. MASKED VIEW for user_configs
-- Protects credential columns from accidental exposure in direct SQL queries
-- (e.g. Supabase dashboard → Table editor, or poorly scoped admin queries).
-- The Node.js backend reads the base table directly via service_role.
-- ============================================================================
DROP VIEW IF EXISTS public.user_configs_masked;

CREATE VIEW public.user_configs_masked
WITH (security_invoker = true)
AS
SELECT
  id,
  email,
  -- Credentials: already AES-256 encrypted by Node.js backend.
  -- This view masks even the ciphertext so it is invisible via SQL browsing.
  CASE
    WHEN gmail_tokens IS NOT NULL AND gmail_tokens != '' THEN '***CONNECTED***'
    ELSE NULL
  END AS gmail_tokens,
  CASE
    WHEN gemini_api_key IS NOT NULL AND gemini_api_key != '' THEN '***CONFIGURED***'
    ELSE NULL
  END AS gemini_api_key,
  CASE
    WHEN telegram_bot_token IS NOT NULL AND telegram_bot_token != '' THEN '***CONFIGURED***'
    ELSE NULL
  END AS telegram_bot_token,
  CASE
    WHEN telegram_chat_id IS NOT NULL AND telegram_chat_id != '' THEN '***CONFIGURED***'
    ELSE NULL
  END AS telegram_chat_id,
  -- Non-sensitive metadata: visible as-is
  gmail_connected_at,
  gemini_configured_at,
  telegram_configured_at,
  notify_rules_exceptions,
  notify_ai_exceptions,
  created_at,
  updated_at
FROM public.user_configs
WHERE auth.uid() = id;

COMMENT ON VIEW public.user_configs_masked IS
  'Read-only view of user_configs. Credential columns are masked — they are '
  'already AES-256 encrypted by the backend, but this view hides ciphertext too. '
  'Backend reads the base table directly via service_role.';

-- ============================================================================
-- 3. AUDIT COLUMNS on user_configs
-- Track last time each credential was rotated (written/changed).
-- ============================================================================
ALTER TABLE public.user_configs
  ADD COLUMN IF NOT EXISTS gemini_key_updated_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS telegram_token_updated_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gmail_tokens_updated_at    TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.audit_user_configs_credential_rotation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.gemini_api_key IS DISTINCT FROM OLD.gemini_api_key THEN
    NEW.gemini_key_updated_at := now();
  END IF;

  IF NEW.telegram_bot_token IS DISTINCT FROM OLD.telegram_bot_token
    OR NEW.telegram_chat_id IS DISTINCT FROM OLD.telegram_chat_id THEN
    NEW.telegram_token_updated_at := now();
  END IF;

  IF NEW.gmail_tokens IS DISTINCT FROM OLD.gmail_tokens THEN
    NEW.gmail_tokens_updated_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_configs_credential_audit ON public.user_configs;
CREATE TRIGGER trg_user_configs_credential_audit
BEFORE UPDATE ON public.user_configs
FOR EACH ROW
EXECUTE FUNCTION public.audit_user_configs_credential_rotation();

-- ============================================================================
-- 4. COMMENTS for documentation
-- ============================================================================
COMMENT ON COLUMN public.user_configs.gemini_api_key     IS 'AES-256-CBC encrypted by Node.js backend (encryption.service.js). Format: iv:ciphertext (hex).';
COMMENT ON COLUMN public.user_configs.telegram_bot_token IS 'AES-256-CBC encrypted by Node.js backend (encryption.service.js). Format: iv:ciphertext (hex).';
COMMENT ON COLUMN public.user_configs.telegram_chat_id   IS 'Plain text Telegram Chat ID (numeric, non-secret). Masked at view layer.';
COMMENT ON COLUMN public.user_configs.gmail_tokens       IS 'AES-256-CBC encrypted JSON bundle (encryption.service.js). Never expose to frontend.';
-- Add missing columns to pending_invoices
ALTER TABLE public.pending_invoices
ADD COLUMN IF NOT EXISTS date timestamp with time zone,
ADD COLUMN IF NOT EXISTS payment_method_id uuid REFERENCES public.payment_methods(id),
ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'expense';
-- Migration: Add missing columns to loans table
-- Created at: 2026-02-28
-- Reason: fix 400 error when confirming disbursement

ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS is_disbursed BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS installments INTEGER,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing loans: if they have a payment method, they are disbursed.
-- If they don't, they are pending.
UPDATE public.loans 
SET is_disbursed = (payment_method_id IS NOT NULL)
WHERE is_disbursed IS NULL;

COMMENT ON COLUMN public.loans.is_disbursed IS 'Flag to indicate if the loan amount has been actually moved/disbursed.';
COMMENT ON COLUMN public.loans.installments IS 'Number of installments for amortized loans.';
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
-- Add initial_date to payment_methods to support historical balance tracking
ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS initial_date DATE DEFAULT CURRENT_DATE;

-- Update existing records to have a safe default (their creation month)
UPDATE public.payment_methods 
SET initial_date = date_trunc('month', created_at)::date
WHERE initial_date IS NULL;
-- Migration: Fix pending_invoices payment_method_id foreign key constraint
-- Description: Adds ON DELETE SET NULL to allow deleting payment methods even if they are referenced by invoices.
-- Date: 2026-03-05

-- 1. Identify and drop the existing constraint if it doesn't have the desired behavior
-- Based on the migration: 20260226024014_20260225214000_add_missing_columns_to_pending_invoices.sql
-- The constraint name is usually automatically generated if not specified.
-- We'll look for it and recreate it properly.

DO $$
DECLARE
    constraint_name_val TEXT;
BEGIN
    -- Look for the foreign key constraint on pending_invoices referencing payment_methods
    SELECT conname INTO constraint_name_val
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'pending_invoices'
      AND con.contype = 'f'
      AND confrelid = (SELECT oid FROM pg_class WHERE relname = 'payment_methods' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'));

    -- If found, drop it and recreate with ON DELETE SET NULL
    IF constraint_name_val IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.pending_invoices DROP CONSTRAINT ' || constraint_name_val;
    END IF;

    -- Recreate the constraint correctly
    ALTER TABLE public.pending_invoices
    ADD CONSTRAINT pending_invoices_payment_method_id_fkey
    FOREIGN KEY (payment_method_id)
    REFERENCES public.payment_methods(id)
    ON DELETE SET NULL;
    
END $$;
-- Migration: Add UI preference columns to user_configs
-- Date: 2026-03-07
-- Description: Moves currency_usage and password_dialog_shown from localStorage to Supabase
--              so they are correctly persisted across devices and sessions.

-- currency_usage: JSONB map of { "COP": 3, "USD": 1 } for ordering the currency selector
-- password_dialog_shown: flag to avoid showing "Add password?" dialog more than once

ALTER TABLE public.user_configs
  ADD COLUMN IF NOT EXISTS currency_usage JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS password_dialog_shown BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.user_configs.currency_usage IS 'Map of currency code -> usage count for ordering the currency selector. Synced across devices.';
COMMENT ON COLUMN public.user_configs.password_dialog_shown IS 'Whether the "add a password?" prompt has been shown to this user. Prevents re-showing on new devices.';
ALTER TABLE public.loans
ADD COLUMN IF NOT EXISTS source_message_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_loans_user_source_message
  ON public.loans(user_id, source_message_id)
  WHERE source_message_id IS NOT NULL;
-- Migration: create_excel_import_staging
-- Date: 2026-03-10
-- Description: Creates the excel_import_staging table and RPC for optimized duplicate detection.

CREATE TABLE public.excel_import_staging (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  category TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  payment_method TEXT,
  payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  type TEXT,
  is_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'imported', 'ignored')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.excel_import_staging ENABLE ROW LEVEL SECURITY;

-- Policies for staging
CREATE POLICY "Users can view their own staging data"
ON public.excel_import_staging FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own staging data"
ON public.excel_import_staging FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own staging data"
ON public.excel_import_staging FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own staging data"
ON public.excel_import_staging FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_excel_import_staging_updated_at
BEFORE UPDATE ON public.excel_import_staging
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RPC for optimized duplicate detection
CREATE OR REPLACE FUNCTION public.mark_staging_duplicates(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.excel_import_staging s
    SET is_duplicate = true
    WHERE s.user_id = p_user_id
      AND s.status = 'pending'
      AND EXISTS (
          SELECT 1 
          FROM public.transactions t
          WHERE t.user_id = p_user_id
            AND t.date = s.date
            AND t.amount = s.amount
            AND LOWER(t.description) = LOWER(s.description)
      );
END;
$$;
-- Migration: update_mark_staging_duplicates
-- Date: 2026-03-11
-- Description: Align duplicate detection with "same date, amount, and account" rule.

CREATE OR REPLACE FUNCTION public.mark_staging_duplicates(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.excel_import_staging s
    SET is_duplicate = true
    WHERE s.user_id = p_user_id
      AND s.status = 'pending'
      AND EXISTS (
          SELECT 1
          FROM public.transactions t
          WHERE t.user_id = p_user_id
            AND t.date = s.date
            AND t.amount = s.amount
            AND (
                (s.payment_method_id IS NOT NULL AND t.payment_method_id = s.payment_method_id)
                OR (s.payment_method_id IS NULL AND t.payment_method_id IS NULL AND LOWER(t.description) = LOWER(s.description))
            )
      );
END;
$$;
-- Migration: create_find_import_duplicates
-- Date: 2026-03-11
-- Description: Find duplicate imports against transactions using date, amount, and account.

CREATE OR REPLACE FUNCTION public.find_import_duplicates(
    p_user_id UUID,
    p_rows JSONB
)
RETURNS TABLE(row_index INTEGER)
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH normalized_input AS (
        SELECT 
            i.row_index,
            i.date::DATE as date,
            ROUND(i.amount::numeric, 2) as amount,
            i.type as tx_type,
            -- Normalización Ultra-Robusta: 
            -- 1. Quitar prefijos comunes (Concepto, Descripcion, etc)
            -- 2. Quitar acentos (TRANSLATE)
            -- 3. Quitar todo lo que no sea alfanumérico (regexp_replace)
            regexp_replace(
                LOWER(TRANSLATE(
                    REGEXP_REPLACE(i.description, '^([Dd]escripci[óo]n|[Dd]escription|[Cc]oncepto|[Dd]etalle|[Mm]emo):[\s]*', '', 'i'),
                    'áéíóúÁÉÍÓÚüÜñÑàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛäëïöüÄËÏÖÜçÇ', 
                    'aeiouAEIOUuUnNaeiouAEIOUaeiouAEIOUaeiouAEIOUcC')), 
                '[^a-z0-9]', '', 'g'
            ) as norm_desc,
            i.payment_method_id
        FROM jsonb_to_recordset(p_rows) AS i(
            row_index INTEGER,
            date TEXT,
            amount NUMERIC,
            description TEXT,
            type TEXT,
            payment_method_id UUID
        )
    )
    SELECT ni.row_index
    FROM normalized_input ni
    WHERE EXISTS (
        SELECT 1 
        FROM public.transactions t
        WHERE t.user_id = p_user_id
          AND t.date::DATE = ni.date
          AND t.type = ni.tx_type
          -- Tolerancia de 0.01 para evitar fallos por precisión de punto flotante
          AND ABS(ROUND(t.amount::numeric, 2) - ni.amount) < 0.01
          -- Comparación de Cuenta (si viene en el Excel o ya está mapeada)
          AND (
              (ni.payment_method_id IS NULL AND t.payment_method_id IS NULL) OR
              (ni.payment_method_id = t.payment_method_id)
          )
          -- Aplicamos la misma limpieza profunda a los datos existentes en la BD
          AND regexp_replace(
                LOWER(TRANSLATE(
                    REGEXP_REPLACE(t.description, '^([Dd]escripci[óo]n|[Dd]escription|[Cc]oncepto|[Dd]etalle|[Mm]emo):[\s]*', '', 'i'),
                    'áéíóúÁÉÍÓÚüÜñÑàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛäëïöüÄËÏÖÜçÇ', 
                    'aeiouAEIOUuUnNaeiouAEIOUaeiouAEIOUaeiouAEIOUcC')), 
                '[^a-z0-9]', '', 'g'
            ) = ni.norm_desc
    );
END;
$$;
-- Ensure transactions has created_at / updated_at columns (idempotent)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
-- Allow zero amounts for error-placeholder transactions
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_amount_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_amount_check
  CHECK (amount >= 0);
-- Remove default MXN currency so new users must choose it in the Welcome Panel
ALTER TABLE public.profiles ALTER COLUMN currency DROP DEFAULT;

-- Update the new user trigger to insert NULL for currency
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  display_name_value TEXT;
BEGIN
  display_name_value := COALESCE(
    NEW.raw_user_meta_data ->> 'display_name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  -- Insert profile with id = NEW.id so profile.id equals auth user id (app uses .eq('id', user.id))
  INSERT INTO public.profiles (
    id,
    user_id,
    display_name,
    currency,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.id,
    display_name_value,
    NULL,
    now(),
    now()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Clean up any existing un-finished profiles that got stuck with MXN
UPDATE public.profiles 
SET currency = NULL 
WHERE (welcome_completed = false OR welcome_completed IS NULL) AND currency = 'MXN';
-- Alinea mark_staging_duplicates con find_import_duplicates (misma normalización de descripción,
-- tolerancia de monto y criterio de cuenta/tipo).

CREATE OR REPLACE FUNCTION public.mark_staging_duplicates(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.excel_import_staging s
  SET is_duplicate = true
  WHERE s.user_id = p_user_id
    AND s.status = 'pending'
    AND EXISTS (
      SELECT 1
      FROM public.transactions t
      WHERE t.user_id = p_user_id
        AND t.date::DATE = s.date::DATE
        AND t.type = s.type
        AND ABS(ROUND(t.amount::numeric, 2) - ROUND(s.amount::numeric, 2)) < 0.01
        AND (
          (s.payment_method_id IS NULL AND t.payment_method_id IS NULL)
          OR (s.payment_method_id IS NOT NULL AND s.payment_method_id = t.payment_method_id)
        )
        AND regexp_replace(
              LOWER(TRANSLATE(
                REGEXP_REPLACE(
                  COALESCE(t.description, ''),
                  '^([Dd]escripci[óo]n|[Dd]escription|[Cc]oncepto|[Dd]etalle|[Mm]emo):[\s]*',
                  '',
                  'i'
                ),
                'áéíóúÁÉÍÓÚüÜñÑàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛäëïöüÄËÏÖÜçÇ',
                'aeiouAEIOUuUnNaeiouAEIOUaeiouAEIOUaeiouAEIOUcC'
              )),
              '[^a-z0-9]',
              '',
              'g'
            )
            = regexp_replace(
                LOWER(TRANSLATE(
                  REGEXP_REPLACE(
                    COALESCE(s.description, ''),
                    '^([Dd]escripci[óo]n|[Dd]escription|[Cc]oncepto|[Dd]etalle|[Mm]emo):[\s]*',
                    '',
                    'i'
                  ),
                  'áéíóúÁÉÍÓÚüÜñÑàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛäëïöüÄËÏÖÜçÇ',
                  'aeiouAEIOUuUnNaeiouAEIOUaeiouAEIOUaeiouAEIOUcC'
                )),
                '[^a-z0-9]',
                '',
                'g'
              )
    );
END;
$$;

-- Create partial unique index to ensure at most one recurrent budget per category per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_user_id_category_id_recurrent 
ON public.budgets (user_id, category_id) 
WHERE (is_recurrent = true);

-- ============================================================
-- MIGRATION 20260611: Fix savings FK not null + is_recurrent
-- ============================================================

-- Budgets: ensure is_recurrent column exists
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS is_recurrent BOOLEAN NOT NULL DEFAULT false;

-- Fix to_payment_method_id FK to support ON DELETE SET NULL
-- Ensure column exists before adding FK (older DBs may lack it)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS to_payment_method_id UUID;

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_to_payment_method_id_fkey;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_to_payment_method_id_fkey
  FOREIGN KEY (to_payment_method_id)
  REFERENCES public.payment_methods(id)
  ON DELETE SET NULL;

-- Fix prepare_savings_transaction trigger: accept NULL savings_account_id
CREATE OR REPLACE FUNCTION public.prepare_savings_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_is_savings boolean;
BEGIN
  -- Validate payment_method_id ownership when provided
  IF NEW.payment_method_id IS NOT NULL THEN
    SELECT is_savings_account INTO v_is_savings
    FROM public.payment_methods
    WHERE id = NEW.payment_method_id
      AND user_id = NEW.user_id;

    IF v_is_savings IS NULL THEN
      RAISE EXCEPTION 'Invalid payment_method_id for user';
    END IF;

    IF v_is_savings IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'payment_method_id is not a savings account';
    END IF;
  END IF;

  -- Validate savings_account_id when provided (NULL is accepted)
  IF NEW.savings_account_id IS NOT NULL THEN
    PERFORM 1 FROM public.payment_methods
    WHERE id = NEW.savings_account_id
      AND user_id = NEW.user_id
      AND is_savings_account = true;

    IF NOT FOUND THEN
      PERFORM 1 FROM public.savings_accounts
      WHERE id = NEW.savings_account_id
        AND user_id = NEW.user_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid savings_account_id for user';
      END IF;
    END IF;
  END IF;

  -- Compute calculated_yield
  IF NEW.calculated_yield IS NULL THEN
    IF NEW.type = 'interest' THEN
      NEW.calculated_yield := NEW.amount;
    ELSE
      NEW.calculated_yield := 0;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
