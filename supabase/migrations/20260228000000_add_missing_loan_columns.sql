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
