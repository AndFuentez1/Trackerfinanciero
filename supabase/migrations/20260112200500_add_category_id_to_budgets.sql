-- Add category_id to budgets table and link to categories table
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id);

-- Optional: You might want to drop the old category string column later, 
-- but for now we keep it or just ignore it to avoid breaking existing code abruptly if it's used elsewhere.
-- We will rely on category_id for the new logic.
