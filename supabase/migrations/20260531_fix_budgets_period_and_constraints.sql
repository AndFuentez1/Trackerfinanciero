-- 1. Add 'period' column to public.budgets if it does not exist
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS period TEXT NOT NULL DEFAULT 'monthly';

-- 2. Backfill category_id in budgets using categories table if any category_id is NULL
UPDATE public.budgets b
SET category_id = c.id
FROM public.categories c
WHERE b.category_id IS NULL
  AND b.user_id = c.user_id
  AND LOWER(TRIM(b.category)) = LOWER(TRIM(c.name));

-- 3. Remove duplicate entries to prevent unique constraint failures, keeping the latest one
DELETE FROM public.budgets a USING public.budgets b
WHERE a.id < b.id 
  AND a.user_id = b.user_id 
  AND COALESCE(a.category_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(b.category_id, '00000000-0000-0000-0000-000000000000'::uuid)
  AND a.month = b.month;

-- 4. Drop the old unique constraint on user_id, category, month
ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS budgets_user_id_category_month_key;

-- Drop the incorrect unique constraint on user_id, category_id if it was created
ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS budgets_user_id_category_id_key;

-- 5. Add new unique constraint on user_id, category_id, month
ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS budgets_user_id_category_id_month_key;
ALTER TABLE public.budgets ADD CONSTRAINT budgets_user_id_category_id_month_key UNIQUE (user_id, category_id, month);
