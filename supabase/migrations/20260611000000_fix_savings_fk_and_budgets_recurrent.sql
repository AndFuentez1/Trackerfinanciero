-- ============================================================
-- SCRIPT SQL INCREMENTAL - Ejecutar en Supabase SQL Editor
-- Fecha: 2026-06-11
-- Resuelve:
--   1. savings_transactions.savings_account_id: DROP NOT NULL + corregir FK
--   2. budgets.is_recurrent: garantizar columna e índice parcial único
--   3. Corrección del trigger prepare_savings_transaction
--   4. FK de transactions.to_payment_method_id con ON DELETE SET NULL
-- ============================================================

-- ----------------------------------------------------------------
-- 1. SAVINGS_TRANSACTIONS: Eliminar NOT NULL y corregir FK
-- ----------------------------------------------------------------

-- Paso 1a: Permitir NULL en savings_account_id (era NOT NULL, causaba el error al insertar)
ALTER TABLE public.savings_transactions
  ALTER COLUMN savings_account_id DROP NOT NULL;

-- Paso 1b: Eliminar la FK antigua (puede apuntar a savings_accounts o tener restricción incorrecta)
ALTER TABLE public.savings_transactions
  DROP CONSTRAINT IF EXISTS savings_transactions_savings_account_id_fkey;

-- Paso 1c: Re-crear la FK apuntando a payment_methods con ON DELETE SET NULL
ALTER TABLE public.savings_transactions
  ADD CONSTRAINT savings_transactions_savings_account_id_fkey
  FOREIGN KEY (savings_account_id)
  REFERENCES public.payment_methods(id)
  ON DELETE SET NULL;

-- ----------------------------------------------------------------
-- 2. BUDGETS: Columna is_recurrent e índice único parcial
-- ----------------------------------------------------------------

-- Paso 2a: Agregar la columna is_recurrent si no existe
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS is_recurrent BOOLEAN NOT NULL DEFAULT false;

-- Paso 2b: Crear el índice único parcial para recurrentes (un recurrente por categoría/usuario)
CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_user_id_category_id_recurrent
ON public.budgets (user_id, category_id)
WHERE (is_recurrent = true);

-- ----------------------------------------------------------------
-- 3. TRIGGER prepare_savings_transaction: Corregir validación de savings_account_id
--    Ahora acepta NULL en savings_account_id (antes lanzaba excepción)
-- ----------------------------------------------------------------

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

  -- Validar savings_account_id ownership cuando se proporciona (NULL es aceptado)
  IF NEW.savings_account_id IS NOT NULL THEN
    -- Intentar en payment_methods donde es cuenta de ahorros
    PERFORM 1 FROM public.payment_methods
    WHERE id = NEW.savings_account_id
      AND user_id = NEW.user_id
      AND is_savings_account = true;

    IF NOT FOUND THEN
      -- Intentar en la tabla legacy savings_accounts (compatibilidad)
      PERFORM 1 FROM public.savings_accounts
      WHERE id = NEW.savings_account_id
        AND user_id = NEW.user_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid savings_account_id for user';
      END IF;
    END IF;
  END IF;

  -- Calcular calculated_yield si no viene
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

-- ----------------------------------------------------------------
-- 4. FK de transactions.to_payment_method_id (ON DELETE SET NULL)
-- ----------------------------------------------------------------

-- Ensure the column exists before creating the FK (some DBs lacked it)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS to_payment_method_id UUID;

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_to_payment_method_id_fkey;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_to_payment_method_id_fkey
  FOREIGN KEY (to_payment_method_id)
  REFERENCES public.payment_methods(id)
  ON DELETE SET NULL;

-- ----------------------------------------------------------------
-- VERIFICACIÓN FINAL
-- ----------------------------------------------------------------

DO $$
BEGIN
  -- Verificar FK savings_transactions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'savings_transactions_savings_account_id_fkey'
      AND table_name = 'savings_transactions'
  ) THEN
    RAISE WARNING 'FK savings_transactions_savings_account_id_fkey no se creó correctamente';
  ELSE
    RAISE NOTICE '✅ FK savings_transactions_savings_account_id_fkey: OK';
  END IF;

  -- Verificar columna is_recurrent en budgets
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budgets' AND column_name = 'is_recurrent'
  ) THEN
    RAISE WARNING 'Columna is_recurrent en budgets no existe';
  ELSE
    RAISE NOTICE '✅ Columna budgets.is_recurrent: OK';
  END IF;

  -- Verificar columna to_payment_method_id en transactions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'to_payment_method_id'
  ) THEN
    RAISE WARNING 'Columna to_payment_method_id en transactions no existe';
  ELSE
    RAISE NOTICE '✅ Columna transactions.to_payment_method_id: OK';
  END IF;

  RAISE NOTICE '✅ Script ejecutado. Verificar warnings en la consola.';
END $$;
