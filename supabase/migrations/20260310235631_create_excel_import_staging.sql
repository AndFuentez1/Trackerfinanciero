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
