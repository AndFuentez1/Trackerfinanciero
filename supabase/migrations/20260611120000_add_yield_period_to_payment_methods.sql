-- Periodo de la tasa de rendimiento en cuentas de ahorro: 'annual' (default) o 'monthly'
ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS yield_period TEXT NOT NULL DEFAULT 'annual'
  CHECK (yield_period IN ('annual', 'monthly'));
