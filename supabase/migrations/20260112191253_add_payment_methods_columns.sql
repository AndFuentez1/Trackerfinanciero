-- Add columns for Credit Card and Savings features to payment_methods table

ALTER TABLE payment_methods 
ADD COLUMN IF NOT EXISTS is_savings_account BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS savings_goal NUMERIC,
ADD COLUMN IF NOT EXISTS estimated_yield NUMERIC,
ADD COLUMN IF NOT EXISTS closing_date INTEGER,
ADD COLUMN IF NOT EXISTS payment_day INTEGER;
