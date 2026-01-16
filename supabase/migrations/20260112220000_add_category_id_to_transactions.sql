-- Add category_id to transactions table and link to categories table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
