-- Add initial_date to payment_methods to support historical balance tracking
ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS initial_date DATE DEFAULT CURRENT_DATE;

-- Update existing records to have a safe default (their creation month)
UPDATE public.payment_methods 
SET initial_date = date_trunc('month', created_at)::date
WHERE initial_date IS NULL;
