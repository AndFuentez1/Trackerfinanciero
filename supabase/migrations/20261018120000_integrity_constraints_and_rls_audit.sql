-- 20261018120000_integrity_constraints_and_rls_audit.sql
-- 1. Constraints de integridad (préstamos, transacciones, tarjetas de crédito).
-- 2. Auditoría RLS: garantiza RLS activo y políticas base de propietario en todas las tablas de usuario,
--    y expone public.rls_audit() (solo service_role) para verificarlo.
-- Las restricciones nuevas se crean NOT VALID: aplican a filas nuevas/actualizadas sin bloquear
-- la migración por datos históricos. Validar con ALTER TABLE ... VALIDATE CONSTRAINT tras limpiar.

-- ============================================================================
-- 1. CONSTRAINTS
-- ============================================================================

-- Tarjeta de crédito: la deuda es balance negativo. El CHECK (balance >= 0) previo lo impedía.
ALTER TABLE public.payment_methods
  DROP CONSTRAINT IF EXISTS payment_methods_balance_check;
ALTER TABLE public.payment_methods
  ADD CONSTRAINT payment_methods_balance_check
  CHECK (type = 'credit' OR balance >= 0) NOT VALID;

-- Préstamos: nombre no vacío y unicidad sin distinguir mayúsculas/espacios.
ALTER TABLE public.loans
  DROP CONSTRAINT IF EXISTS loans_name_not_blank;
ALTER TABLE public.loans
  ADD CONSTRAINT loans_name_not_blank
  CHECK (length(btrim(name)) > 0) NOT VALID;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.loans
    GROUP BY user_id, lower(btrim(name))
    HAVING count(*) > 1
  ) THEN
    RAISE WARNING 'loans: existen duplicados (user_id, lower(btrim(name))); resolver antes de crear idx_loans_user_lower_name';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS idx_loans_user_lower_name
      ON public.loans (user_id, lower(btrim(name)));
  END IF;
END $$;

-- Presupuestos: un solo presupuesto mensual por (usuario, categoría, mes) también por category_id.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.budgets
    WHERE category_id IS NOT NULL AND NOT COALESCE(is_recurrent, false)
    GROUP BY user_id, category_id, month
    HAVING count(*) > 1
  ) THEN
    RAISE WARNING 'budgets: existen duplicados (user_id, category_id, month); no se crea idx_budgets_user_category_id_month';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_user_category_id_month
      ON public.budgets (user_id, category_id, month)
      WHERE category_id IS NOT NULL AND NOT is_recurrent;
  END IF;
END $$;

-- ============================================================================
-- 2. AUDITORÍA RLS
-- ============================================================================

-- RLS explícito en todas las tablas con datos de usuario (algunas se crearon fuera de migraciones).
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'transactions', 'budgets', 'profiles', 'payment_methods', 'savings_accounts',
    'savings_transactions', 'categories', 'classifier_rules', 'future_expenses',
    'pending_invoices', 'loans', 'loan_payments', 'user_configs', 'excel_import_staging'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;

-- Políticas base de propietario para tablas con user_id que no tengan política para alguna operación.
-- No reemplaza políticas existentes (p. ej. las que exigen has_accepted_data_policy()).
DO $$
DECLARE
  t text;
  op text;
BEGIN
  FOREACH t IN ARRAY ARRAY['categories', 'future_expenses', 'pending_invoices', 'savings_transactions', 'classifier_rules']
  LOOP
    CONTINUE WHEN to_regclass('public.' || t) IS NULL;
    CONTINUE WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'user_id'
    );

    FOREACH op IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = t AND cmd IN (op, 'ALL')
      ) THEN
        IF op = 'INSERT' THEN
          EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (auth.uid() = user_id)',
            'Owner can insert ' || t, t);
        ELSIF op = 'UPDATE' THEN
          EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',
            'Owner can update ' || t, t);
        ELSE
          EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR %s USING (auth.uid() = user_id)',
            'Owner can ' || lower(op) || ' ' || t, t, op);
        END IF;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Informe de auditoría: tablas públicas sin RLS, sin políticas o con políticas abiertas (USING true).
CREATE OR REPLACE FUNCTION public.rls_audit()
RETURNS TABLE (table_name text, rls_enabled boolean, policy_count integer, issue text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT
    c.relname::text,
    c.relrowsecurity,
    COALESCE(p.cnt, 0)::integer,
    CASE
      WHEN NOT c.relrowsecurity THEN 'RLS deshabilitado'
      WHEN COALESCE(p.cnt, 0) = 0 THEN 'RLS activo sin políticas (tabla inaccesible)'
      WHEN p.open_cnt > 0 THEN 'Política abierta (USING/WITH CHECK true)'
      ELSE NULL
    END
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN (
    SELECT tablename,
           count(*) AS cnt,
           count(*) FILTER (WHERE qual = 'true' OR with_check = 'true') AS open_cnt
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
  ) p ON p.tablename = c.relname
  WHERE n.nspname = 'public' AND c.relkind = 'r'
  ORDER BY 4 NULLS LAST, 1;
$$;

REVOKE ALL ON FUNCTION public.rls_audit() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rls_audit() TO service_role;

COMMENT ON FUNCTION public.rls_audit() IS
  'Auditoría RLS: lista tablas públicas y señala las que no tienen RLS, no tienen políticas o tienen políticas abiertas. Solo service_role.';
