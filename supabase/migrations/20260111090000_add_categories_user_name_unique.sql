-- Add unique constraint on categories per user (user_id, name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'categories_user_name_unique'
  ) THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_user_name_unique UNIQUE (user_id, name);
  END IF;
END
$$;
