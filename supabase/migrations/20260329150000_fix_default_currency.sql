-- Remove default MXN currency so new users must choose it in the Welcome Panel
ALTER TABLE public.profiles ALTER COLUMN currency DROP DEFAULT;

-- Update the new user trigger to insert NULL for currency
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  display_name_value TEXT;
BEGIN
  display_name_value := COALESCE(
    NEW.raw_user_meta_data ->> 'display_name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  -- Insert profile with id = NEW.id so profile.id equals auth user id (app uses .eq('id', user.id))
  INSERT INTO public.profiles (
    id,
    user_id,
    display_name,
    currency,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.id,
    display_name_value,
    NULL,
    now(),
    now()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Clean up any existing un-finished profiles that got stuck with MXN
UPDATE public.profiles 
SET currency = NULL 
WHERE (welcome_completed = false OR welcome_completed IS NULL) AND currency = 'MXN';
