-- ============================================================================
-- Auditoría y corrección de tarjetas de crédito con deuda guardada en POSITIVO
-- (antes del 2026-11-08, "Deuda actual" se guardaba positiva al crear la tarjeta).
-- Convención: deuda = balance NEGATIVO; balance > 0 = saldo a favor.
-- Ejecutar en el SQL Editor de Supabase. NO es una migración: revisar cada tarjeta.
-- ============================================================================

-- 1) AUDITORÍA: tarjetas con balance positivo y el efecto de sus transacciones.
--    efecto_transacciones = lo que la app sumó/restó al saldo desde que existe la tarjeta
--    (solo transacciones creadas desde la app; las importadas de Excel/Gmail no movieron el saldo).
SELECT
  pm.id,
  pm.user_id,
  pm.name,
  pm.balance                                   AS balance_actual,
  pm.credit_limit,
  pm.created_at,
  COUNT(t.id)                                  AS num_transacciones,
  COALESCE(SUM(CASE WHEN t.type IN ('income', 'transfer_in') THEN abs(t.amount)
                    ELSE -abs(t.amount) END), 0) AS efecto_transacciones,
  -pm.balance                                  AS opcion_a_solo_invertir_signo,
  -pm.balance + 2 * COALESCE(SUM(CASE WHEN t.type IN ('income', 'transfer_in') THEN abs(t.amount)
                                      ELSE -abs(t.amount) END), 0) AS opcion_b_invertir_deuda_inicial
FROM public.payment_methods pm
LEFT JOIN public.transactions t ON t.payment_method_id = pm.id
WHERE pm.type = 'credit'
  AND COALESCE(pm.is_savings_account, false) = false
  AND pm.balance > 0
GROUP BY pm.id
ORDER BY pm.user_id, pm.name;

-- Cómo elegir, por tarjeta:
--  * Opción A (-balance): la tarjeta casi no tiene transacciones creadas desde la app.
--  * Opción B: la deuda inicial se guardó positiva y luego la app restó/sumó movimientos;
--    invierte solo la deuda inicial y conserva los movimientos.
--  * Si el balance positivo es un saldo a favor real (pagaste de más), NO tocarla.
--  * Ante la duda: compara con el extracto del banco y usa ese valor (negativo).

-- 2) CORRECCIÓN (una sentencia por tarjeta; reemplazar <ID> y <NUEVO_BALANCE>).
--    <NUEVO_BALANCE> debe ser NEGATIVO si hay deuda. Ej.: deuda de 1.200.000 → -1200000
BEGIN;
UPDATE public.payment_methods
SET balance = <NUEVO_BALANCE>
WHERE id = '<ID>' AND type = 'credit';
-- Verificar antes de confirmar:
SELECT id, name, balance FROM public.payment_methods WHERE id = '<ID>';
COMMIT;   -- o ROLLBACK; si algo no cuadra
