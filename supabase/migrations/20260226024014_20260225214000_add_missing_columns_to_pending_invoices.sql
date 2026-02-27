-- Add missing columns to pending_invoices
ALTER TABLE public.pending_invoices
ADD COLUMN IF NOT EXISTS date timestamp with time zone,
ADD COLUMN IF NOT EXISTS payment_method_id uuid REFERENCES public.payment_methods(id),
ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'expense';
