-- =====================================================
-- Trigger para calcular automáticamente el yield de savings_transactions
-- =====================================================
-- Descripción:
--   - Para transacciones de tipo 'interest': calcula el yield como (amount / previous_balance) * 100
--   - Previous_balance = suma de todas las transacciones ANTES de la fecha actual (mismo payment_method_id)
--   - Para transacciones de tipo 'deposit' o 'withdrawal': yield = 0
-- =====================================================

-- Primero, eliminar trigger y función si ya existen
-- Importante: eliminar el trigger ANTES de la función para evitar errores de dependencia
DROP TRIGGER IF EXISTS trigger_calculate_savings_yield ON savings_transactions;
DROP TRIGGER IF EXISTS trg_calculate_savings_yield ON savings_transactions;
DROP FUNCTION IF EXISTS calculate_savings_yield() CASCADE;

-- Crear la función del trigger
CREATE OR REPLACE FUNCTION calculate_savings_yield()
RETURNS TRIGGER AS $$
DECLARE
  prev_balance NUMERIC := 0;
  current_pm_balance NUMERIC := 0;
BEGIN
  -- Solo calcular yield para transacciones de tipo 'interest'
  IF NEW.type = 'interest' THEN
    -- Calcular el saldo ANTES de esta transacción de interés
    -- Suma todos los depósitos e intereses, resta todos los retiros
    -- Solo para transacciones ANTES de la fecha actual (excluyendo la transacción actual si es un UPDATE)
    SELECT COALESCE(SUM(
      CASE 
        WHEN type = 'withdrawal' THEN -amount
        ELSE amount  -- deposit o interest
      END
    ), 0) INTO prev_balance
    FROM savings_transactions
    WHERE payment_method_id = NEW.payment_method_id
      AND user_id = NEW.user_id
      AND date < NEW.date  -- Solo transacciones ANTES de esta fecha
      AND (TG_OP = 'INSERT' OR id != NEW.id);  -- En UPDATE, excluir la transacción actual
    
    -- Si prev_balance es 0 o NULL, intentar obtener el balance inicial del payment_method
    -- Restando el monto del interés actual
    IF prev_balance = 0 OR prev_balance IS NULL THEN
      SELECT COALESCE(balance, 0) INTO current_pm_balance
      FROM payment_methods
      WHERE id = NEW.payment_method_id;
      
      -- El balance previo sería el balance actual menos el monto de este interés
      prev_balance := current_pm_balance - NEW.amount;
      
      -- Si aún es negativo o cero, poner en 0 para evitar división por cero
      IF prev_balance <= 0 THEN
        prev_balance := 0;
      END IF;
    END IF;
    
    -- Calcular el yield como porcentaje
    IF prev_balance > 0 THEN
      NEW.calculated_yield := ROUND(((NEW.amount / prev_balance) * 100)::NUMERIC, 4);
    ELSE
      NEW.calculated_yield := 0;
    END IF;
    
    -- Log para debugging (opcional, comentar en producción)
    RAISE NOTICE 'Interest Transaction - Date: %, Amount: %, Prev Balance: %, Yield: %', 
      NEW.date, NEW.amount, prev_balance, NEW.calculated_yield;
  ELSE
    -- Para deposit y withdrawal, yield es siempre 0
    NEW.calculated_yield := 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger que se ejecuta BEFORE INSERT OR UPDATE
CREATE TRIGGER trigger_calculate_savings_yield
  BEFORE INSERT OR UPDATE ON savings_transactions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_savings_yield();

-- Comentarios
COMMENT ON FUNCTION calculate_savings_yield() IS 
'Calcula automáticamente el yield para transacciones de tipo interest. 
Formula: (interest_amount / previous_balance) * 100
Previous_balance = suma de todas las transacciones antes de la fecha actual.';

COMMENT ON TRIGGER trigger_calculate_savings_yield ON savings_transactions IS
'Trigger que ejecuta calculate_savings_yield() antes de INSERT o UPDATE en savings_transactions';
