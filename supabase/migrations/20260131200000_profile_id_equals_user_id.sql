-- Ensure new user profiles have id = auth.users.id so app lookups by .eq('id', user.id) find the row.
-- The app expects profile.id to match the auth user id for updates and selects.

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
    'MXN',
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

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates profile with id = user id so app lookups by profile.id find the row.';
