-- Add color column to payment_methods table
ALTER TABLE payment_methods
ADD COLUMN color VARCHAR(7) DEFAULT '#6366f1';

-- Create index for color lookups if needed
CREATE INDEX idx_payment_methods_color ON payment_methods(user_id, color);
