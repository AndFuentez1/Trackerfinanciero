-- Drop the existing function first to change signature
DROP FUNCTION IF EXISTS approve_pending_invoice;

-- Recreate directly with the new parameter
CREATE OR REPLACE FUNCTION approve_pending_invoice(
  p_invoice_id UUID,
  p_user_id UUID,
  p_category_name TEXT,
  p_payment_method_id UUID DEFAULT NULL,
  p_transaction_type TEXT DEFAULT 'expense'
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice RECORD;
  v_category_id UUID;
  v_new_category BOOLEAN := FALSE;
BEGIN
  -- 1. Get invoice details
  SELECT * INTO v_invoice FROM pending_invoices WHERE id = p_invoice_id;
  
  IF v_invoice IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invoice not found');
  END IF;

  -- 2. Find or Create Category
  -- Normalize name
  SELECT id INTO v_category_id FROM categories 
  WHERE user_id = p_user_id 
  AND LOWER(name) = LOWER(TRIM(p_category_name));

  IF v_category_id IS NULL THEN
    INSERT INTO categories (user_id, name, type, color, icon)
    VALUES (p_user_id, TRIM(p_category_name), p_transaction_type, '#9CA3AF', 'circle')
    RETURNING id INTO v_category_id;
    v_new_category := TRUE;
  END IF;

  -- 3. Insert into transactions
  INSERT INTO transactions (
    user_id,
    amount,
    type,
    category,
    category_id,
    description,
    date,
    payment_method_id
  ) VALUES (
    p_user_id,
    v_invoice.amount,
    p_transaction_type, -- Use the passed type (income/expense)
    TRIM(p_category_name),
    v_category_id,
    v_invoice.description,
    v_invoice.arrival_date, -- Use arrival_date as transaction date
    p_payment_method_id
  );

  -- 4. Delete pending invoice
  DELETE FROM pending_invoices WHERE id = p_invoice_id;

  RETURN json_build_object(
    'success', true,
    'new_category', v_new_category,
    'category_name', TRIM(p_category_name)
  );
END;
$$;
