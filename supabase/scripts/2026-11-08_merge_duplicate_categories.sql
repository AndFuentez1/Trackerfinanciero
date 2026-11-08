-- ============================================================================
-- Fusión de categorías duplicadas por mayúsculas (mismo usuario, mismo tipo).
-- Ej.: "Comida" y "comida" como gasto. Mientras existan, la migración
-- 20260701120000 no puede crear idx_categories_user_lower_name_type.
--
-- Ejecutar en el SQL Editor de Supabase. NO es una migración: primero revisar la
-- auditoría (paso 1) y luego correr el bloque DO del paso 2 completo.
--
-- Regla: se conserva la categoría MÁS ANTIGUA del grupo; transacciones, presupuestos,
-- compromisos y filas de importación de las demás pasan a ella y las demás se borran.
-- Si ambas tienen presupuesto para el mismo mes, gana el de la categoría conservada.
-- ============================================================================

-- 1) AUDITORÍA: grupos duplicados y cuántos registros se moverían.
WITH ranked AS (
  SELECT c.*,
         first_value(c.id) OVER (
           PARTITION BY c.user_id, lower(c.name), c.type
           ORDER BY c.created_at, c.id
         ) AS keeper_id,
         count(*) OVER (PARTITION BY c.user_id, lower(c.name), c.type) AS group_size
  FROM public.categories c
)
SELECT r.user_id,
       r.type,
       r.name,
       r.id,
       (r.id = r.keeper_id) AS se_conserva,
       (SELECT count(*) FROM public.transactions t WHERE t.category_id = r.id) AS transacciones,
       (SELECT count(*) FROM public.budgets b WHERE b.category_id = r.id)      AS presupuestos,
       (SELECT count(*) FROM public.future_expenses f WHERE f.category_id = r.id) AS compromisos,
       (SELECT count(*)
          FROM public.budgets b
          JOIN public.budgets kb
            ON kb.category_id = r.keeper_id
           AND kb.user_id = b.user_id
           AND kb.month IS NOT DISTINCT FROM b.month
         WHERE b.category_id = r.id AND r.id <> r.keeper_id) AS presupuestos_en_conflicto
FROM ranked r
WHERE r.group_size > 1
ORDER BY r.user_id, r.type, lower(r.name), (r.id = r.keeper_id) DESC, r.created_at;

-- 2) FUSIÓN (todo o nada). Un solo bloque DO = una sola sentencia/transacción:
--    si algo falla, no se aplica nada. Correr el bloque completo.
DO $$
DECLARE
  v_dups int;
BEGIN
  DROP TABLE IF EXISTS pg_temp.category_merge_map;

  CREATE TEMP TABLE category_merge_map AS
  SELECT id AS dup_id, keeper_id
  FROM (
    SELECT c.id,
           first_value(c.id) OVER (
             PARTITION BY c.user_id, lower(c.name), c.type
             ORDER BY c.created_at, c.id
           ) AS keeper_id
    FROM public.categories c
  ) ranked
  WHERE id <> keeper_id;

  SELECT count(*) INTO v_dups FROM category_merge_map;
  RAISE NOTICE 'Categorías duplicadas a fusionar: %', v_dups;

  -- Presupuestos que chocarían con uno de la categoría conservada (mismo mes): se descartan.
  DELETE FROM public.budgets b
  USING category_merge_map m, public.budgets kb
  WHERE b.category_id = m.dup_id
    AND kb.category_id = m.keeper_id
    AND kb.user_id = b.user_id
    AND kb.month IS NOT DISTINCT FROM b.month;

  -- Si dos duplicadas (sin la conservada) tienen presupuesto el mismo mes, se queda el más reciente.
  DELETE FROM public.budgets b
  USING category_merge_map m, category_merge_map m2, public.budgets b2
  WHERE b.category_id = m.dup_id
    AND b2.category_id = m2.dup_id
    AND m.keeper_id = m2.keeper_id
    AND b2.id <> b.id
    AND b2.user_id = b.user_id
    AND b2.month IS NOT DISTINCT FROM b.month
    AND (b2.updated_at, b2.id) > (b.updated_at, b.id);

  UPDATE public.budgets b SET category_id = m.keeper_id
    FROM category_merge_map m WHERE b.category_id = m.dup_id;
  UPDATE public.transactions t SET category_id = m.keeper_id
    FROM category_merge_map m WHERE t.category_id = m.dup_id;
  UPDATE public.future_expenses f SET category_id = m.keeper_id
    FROM category_merge_map m WHERE f.category_id = m.dup_id;
  UPDATE public.excel_import_staging s SET category_id = m.keeper_id
    FROM category_merge_map m WHERE s.category_id = m.dup_id;

  DELETE FROM public.categories c
  USING category_merge_map m
  WHERE c.id = m.dup_id;

  CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_user_lower_name_type
    ON public.categories (user_id, lower(name), type);

  DROP TABLE category_merge_map;
END $$;

-- 3) VERIFICACIÓN: debe devolver 0 filas y el índice debe existir.
SELECT user_id, lower(name), type, count(*)
FROM public.categories
GROUP BY 1, 2, 3
HAVING count(*) > 1;

SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND indexname = 'idx_categories_user_lower_name_type';
