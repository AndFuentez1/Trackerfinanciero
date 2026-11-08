-- 20261108120000_atomic_balances_and_payment_method_delete.sql
-- Saldos atómicos y borrado atómico de métodos de pago / cuentas de ahorro.
--
-- Antes el cliente hacía "select balance + update balance", con condiciones de carrera
-- (dos pestañas o dos movimientos seguidos pisaban el saldo) y pasos sueltos que podían
-- quedar a medias al eliminar una cuenta.
--
-- Ambas funciones son SECURITY INVOKER: corren con los permisos del usuario y respetan RLS.
-- Además filtran por auth.uid() para fallar explícitamente si la cuenta no es del usuario.

-- ============================================================================
-- 1. adjust_balances: aplica varios incrementos de saldo en una sola transacción
-- ============================================================================
-- p_changes: [{"id": "<uuid>", "delta": <numeric>}, ...]
-- Devuelve el saldo resultante de cada cuenta. Si una cuenta no existe o no es del
-- usuario, o el CHECK de saldo falla, no se aplica ningún cambio.
CREATE OR REPLACE FUNCTION public.adjust_balances(p_changes jsonb)
RETURNS TABLE (id uuid, balance numeric)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_change record;
  v_balance numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'adjust_balances: no autenticado' USING ERRCODE = '42501';
  END IF;

  IF p_changes IS NULL OR jsonb_typeof(p_changes) <> 'array' THEN
    RAISE EXCEPTION 'adjust_balances: p_changes debe ser un arreglo' USING ERRCODE = '22023';
  END IF;

  -- Agrupa por cuenta y ordena por id para evitar interbloqueos entre llamadas concurrentes.
  FOR v_change IN
    SELECT (c->>'id')::uuid AS pm_id, sum((c->>'delta')::numeric) AS delta
    FROM jsonb_array_elements(p_changes) AS c
    GROUP BY (c->>'id')::uuid
    ORDER BY 1
  LOOP
    IF v_change.delta IS NULL OR v_change.delta = 0 THEN
      CONTINUE;
    END IF;

    UPDATE public.payment_methods pm
       SET balance = pm.balance + v_change.delta
     WHERE pm.id = v_change.pm_id
       AND pm.user_id = v_uid
    RETURNING pm.balance INTO v_balance;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'adjust_balances: método de pago % no encontrado', v_change.pm_id
        USING ERRCODE = 'P0002';
    END IF;

    id := v_change.pm_id;
    balance := v_balance;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_balances(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_balances(jsonb) TO authenticated;

COMMENT ON FUNCTION public.adjust_balances(jsonb) IS
  'Incrementa saldos de payment_methods de forma atómica: [{id, delta}]. Todo o nada.';

-- ============================================================================
-- 2. delete_payment_method: elimina una cuenta en una sola transacción
-- ============================================================================
-- p_option:
--   'delete'   → borra transacciones y movimientos de ahorro asociados.
--   'orphan'   → conserva el historial sin cuenta asociada.
--   'transfer' → mueve historial, préstamos y saldo a p_transfer_to_id (también se usa
--                para fusionar cuentas duplicadas).
-- El destino se valida ANTES de mover nada; cualquier error revierte todo.
CREATE OR REPLACE FUNCTION public.delete_payment_method(
  p_id uuid,
  p_option text DEFAULT 'orphan',
  p_transfer_to_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_balance numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'delete_payment_method: no autenticado' USING ERRCODE = '42501';
  END IF;

  IF p_option NOT IN ('delete', 'orphan', 'transfer') THEN
    RAISE EXCEPTION 'delete_payment_method: opción inválida %', p_option USING ERRCODE = '22023';
  END IF;

  SELECT pm.balance INTO v_balance
    FROM public.payment_methods pm
   WHERE pm.id = p_id AND pm.user_id = v_uid
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'delete_payment_method: método de pago % no encontrado', p_id
      USING ERRCODE = 'P0002';
  END IF;

  IF p_option = 'transfer' THEN
    IF p_transfer_to_id IS NULL OR p_transfer_to_id = p_id THEN
      RAISE EXCEPTION 'delete_payment_method: cuenta destino inválida' USING ERRCODE = '22023';
    END IF;

    PERFORM 1
      FROM public.payment_methods pm
     WHERE pm.id = p_transfer_to_id AND pm.user_id = v_uid
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'delete_payment_method: cuenta destino % no encontrada', p_transfer_to_id
        USING ERRCODE = 'P0002';
    END IF;

    UPDATE public.transactions SET payment_method_id = p_transfer_to_id
     WHERE payment_method_id = p_id AND user_id = v_uid;
    UPDATE public.transactions SET to_payment_method_id = p_transfer_to_id
     WHERE to_payment_method_id = p_id AND user_id = v_uid;
    UPDATE public.savings_transactions
       SET payment_method_id = p_transfer_to_id, savings_account_id = p_transfer_to_id
     WHERE (payment_method_id = p_id OR savings_account_id = p_id) AND user_id = v_uid;
    UPDATE public.loans SET payment_method_id = p_transfer_to_id
     WHERE payment_method_id = p_id AND user_id = v_uid;
    UPDATE public.pending_invoices SET payment_method_id = p_transfer_to_id
     WHERE payment_method_id = p_id AND user_id = v_uid;

    UPDATE public.payment_methods
       SET balance = balance + COALESCE(v_balance, 0)
     WHERE id = p_transfer_to_id AND user_id = v_uid;

  ELSIF p_option = 'delete' THEN
    DELETE FROM public.transactions
     WHERE (payment_method_id = p_id OR to_payment_method_id = p_id) AND user_id = v_uid;
    DELETE FROM public.savings_transactions
     WHERE (payment_method_id = p_id OR savings_account_id = p_id) AND user_id = v_uid;
    -- Préstamos y facturas pendientes no se borran: solo pierden la cuenta.
    UPDATE public.loans SET payment_method_id = NULL
     WHERE payment_method_id = p_id AND user_id = v_uid;
    UPDATE public.pending_invoices SET payment_method_id = NULL
     WHERE payment_method_id = p_id AND user_id = v_uid;

  ELSE -- 'orphan'
    UPDATE public.transactions SET payment_method_id = NULL
     WHERE payment_method_id = p_id AND user_id = v_uid;
    UPDATE public.transactions SET to_payment_method_id = NULL
     WHERE to_payment_method_id = p_id AND user_id = v_uid;
    UPDATE public.savings_transactions SET payment_method_id = NULL, savings_account_id = NULL
     WHERE (payment_method_id = p_id OR savings_account_id = p_id) AND user_id = v_uid;
    UPDATE public.loans SET payment_method_id = NULL
     WHERE payment_method_id = p_id AND user_id = v_uid;
    UPDATE public.pending_invoices SET payment_method_id = NULL
     WHERE payment_method_id = p_id AND user_id = v_uid;
  END IF;

  DELETE FROM public.payment_methods WHERE id = p_id AND user_id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_payment_method(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_payment_method(uuid, text, uuid) TO authenticated;

COMMENT ON FUNCTION public.delete_payment_method(uuid, text, uuid) IS
  'Elimina un método de pago/cuenta de ahorro (delete | orphan | transfer) en una sola transacción.';
