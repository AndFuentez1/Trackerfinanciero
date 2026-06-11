-- 1. Agregar columna is_recurrent a la tabla budgets
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS is_recurrent BOOLEAN NOT NULL DEFAULT false;

-- 2. Crear índice único parcial para garantizar un único presupuesto recurrente por categoría y usuario
CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_user_id_category_id_recurrent 
ON public.budgets (user_id, category_id) 
WHERE (is_recurrent = true);

-- 3. Corregir función de validación del trigger prepare_savings_transaction
CREATE OR REPLACE FUNCTION public.prepare_savings_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_is_savings boolean;
BEGIN
  -- Validar payment_method_id ownership y tipo cuando se proporciona
  IF NEW.payment_method_id IS NOT NULL THEN
    SELECT is_savings_account INTO v_is_savings
    FROM public.payment_methods
    WHERE id = NEW.payment_method_id
      AND user_id = NEW.user_id;

    IF v_is_savings IS NULL THEN
      RAISE EXCEPTION 'Invalid payment_method_id for user';
    END IF;

    IF v_is_savings IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'payment_method_id is not a savings account';
    END IF;
  END IF;

  -- Validar savings_account_id ownership cuando se proporciona
  -- Buscar en savings_accounts o en payment_methods (con is_savings_account = true)
  IF NEW.savings_account_id IS NOT NULL THEN
    -- Intentar en la tabla legacy savings_accounts
    PERFORM 1 FROM public.savings_accounts
    WHERE id = NEW.savings_account_id
      AND user_id = NEW.user_id;
      
    IF NOT FOUND THEN
      -- Intentar en payment_methods donde es cuenta de ahorros
      PERFORM 1 FROM public.payment_methods
      WHERE id = NEW.savings_account_id
        AND user_id = NEW.user_id
        AND is_savings_account = true;
        
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid savings_account_id for user';
      END IF;
    END IF;
  END IF;

  -- Rellenar calculated_yield si no viene
  IF NEW.calculated_yield IS NULL THEN
    IF NEW.type = 'interest' THEN
      NEW.calculated_yield := NEW.amount;
    ELSE
      NEW.calculated_yield := 0;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
