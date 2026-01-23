-- Improve handle_new_user trigger to be more robust
-- This trigger creates profiles automatically for Magic Link, OTP, and all auth methods

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  display_name_value TEXT;
BEGIN
  -- Extract display_name from raw_user_meta_data, default to email user part if not provided
  display_name_value := COALESCE(
    NEW.raw_user_meta_data ->> 'display_name',
    SPLIT_PART(NEW.email, '@', 1)  -- Use email prefix as fallback
  );

  -- Insert profile with email and initialized fields
  -- This works for all auth methods: Magic Link, OTP, password signup, etc.
  INSERT INTO public.profiles (
    user_id,
    display_name,
    currency,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    display_name_value,
    'MXN',  -- Default currency
    now(),
    now()
  )
  ON CONFLICT (user_id) DO NOTHING;  -- Silently skip if profile already exists
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the trigger
  RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop and recreate the trigger to use the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Add comment documenting the trigger
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a user profile after auth.users insert. Works for all auth methods: Magic Link, OTP, password signup, etc. Uses email prefix as fallback display_name if not provided.';
