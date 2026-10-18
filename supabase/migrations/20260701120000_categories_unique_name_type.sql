-- Unicidad de categorías por (user_id, lower(name), type) en lugar de (user_id, name).
-- Permite p. ej. "Regalos" como gasto y como ingreso, y evita duplicados por mayúsculas.

ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_user_name_unique;

DO $$
BEGIN
  -- Si existen duplicados por mayúsculas dentro del mismo tipo, no se puede crear el índice;
  -- se avisa en lugar de fallar la migración completa.
  IF EXISTS (
    SELECT 1
    FROM public.categories
    GROUP BY user_id, lower(name), type
    HAVING count(*) > 1
  ) THEN
    RAISE WARNING 'categories: existen duplicados (user_id, lower(name), type); resolver antes de crear idx_categories_user_lower_name_type';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_user_lower_name_type
      ON public.categories (user_id, lower(name), type);
  END IF;
END $$;
