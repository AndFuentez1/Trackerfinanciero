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
