/*
  # Fix auth triggers causing "Database error querying schema"

  1. Changes
    - Recreate `handle_new_user()` with explicit `SET search_path = public`
    - Recreate `handle_user_update()` with explicit `SET search_path = public`
    - Add WHEN condition to update trigger so it only fires when email actually changes
    - This prevents the trigger from interfering with GoTrue sign-in operations

  2. Important Notes
    - SECURITY DEFINER functions MUST set search_path explicitly in Supabase
    - Without it, the function may not resolve `public.profiles` correctly
    - The WHEN clause prevents unnecessary trigger execution during sign-in
*/

-- Fix handle_new_user with explicit search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'vendeur')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix handle_user_update with explicit search_path
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles
  SET email = COALESCE(NEW.email, email)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate update trigger with WHEN condition to only fire on actual email change
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.handle_user_update();
