-- Migration: future_expenses_payment_revert
-- Date: 2026-11-12
-- Description: Permite revertir el último pago de un compromiso y terminar suscripciones.
--   last_payment_transaction_id: transacción creada al pagar (SET NULL si se borra a mano).
--   last_payment_previous_date: fecha de cobro antes del pago; marca que hay un pago que revertir
--     (sigue presente aunque la transacción se haya borrado, para que el revertir sea idempotente).
--   last_paid_at: cuándo se registró el último pago (historial).

ALTER TABLE public.future_expenses
  ADD COLUMN IF NOT EXISTS last_payment_transaction_id UUID
    REFERENCES public.transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_payment_previous_date DATE,
  ADD COLUMN IF NOT EXISTS last_paid_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_future_expenses_last_payment_tx
  ON public.future_expenses(last_payment_transaction_id)
  WHERE last_payment_transaction_id IS NOT NULL;

COMMENT ON COLUMN public.future_expenses.last_payment_transaction_id IS 'Transacción del último pago registrado desde el compromiso (para revertirlo).';
COMMENT ON COLUMN public.future_expenses.last_payment_previous_date IS 'payment_date antes del último pago; NULL = no hay pago que revertir.';
COMMENT ON COLUMN public.future_expenses.last_paid_at IS 'Fecha/hora del último pago registrado.';
