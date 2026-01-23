-- Add decimal_places column to profiles table
-- This column stores the number of decimal places to display in currency amounts
-- Default is 0 (no decimals), can be 0, 1, 2, etc.

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS decimal_places INTEGER DEFAULT 0;

-- Add comment to document the column
COMMENT ON COLUMN profiles.decimal_places IS 'Number of decimal places to display for currency amounts (0, 1, 2, etc.)';
