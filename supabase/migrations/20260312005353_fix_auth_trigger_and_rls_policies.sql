/*
  # Fix authentication: add trigger + update RLS policies for god_admin

  1. New Functions & Triggers
    - `handle_new_user()` trigger function: auto-creates a profile row when a new auth user is created
    - `on_auth_user_created` trigger on auth.users AFTER INSERT
    - `handle_user_update()` trigger function: syncs email changes from auth to profiles
    - `on_auth_user_updated` trigger on auth.users AFTER UPDATE OF email

  2. Security Changes (RLS Policies)
    - Updated all admin-check policies on `profiles`, `user_permissions`, and `account_requests`
      to accept BOTH 'admin' and 'god_admin' roles
    - Added insert policy on profiles for the trigger (SECURITY DEFINER handles it)

  3. Important Notes
    - The trigger uses ON CONFLICT DO NOTHING to be safe if profile already exists
    - god_admin now has the same DB-level access as admin for managing users/permissions
    - Application-level code already treats god_admin as full-access via AuthContext
*/

-- ============================================
-- TRIGGER: Auto-create profile on new auth user
-- ============================================
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- TRIGGER: Sync email changes
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles
  SET email = COALESCE(NEW.email, email)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_update();

-- ============================================
-- FIX: profiles RLS policies to include god_admin
-- ============================================
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'god_admin')
    )
  );

DROP POLICY IF EXISTS "profiles_insert_admin" ON profiles;
CREATE POLICY "profiles_insert_admin"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'god_admin')
    )
  );

DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
CREATE POLICY "profiles_update_admin"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'god_admin')
    )
  );

DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;
CREATE POLICY "profiles_delete_admin"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'god_admin')
    )
  );

-- ============================================
-- FIX: user_permissions RLS policies to include god_admin
-- ============================================
DROP POLICY IF EXISTS "permissions_select_admin" ON user_permissions;
CREATE POLICY "permissions_select_admin"
  ON user_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'god_admin')
    )
  );

DROP POLICY IF EXISTS "permissions_insert_admin" ON user_permissions;
CREATE POLICY "permissions_insert_admin"
  ON user_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'god_admin')
    )
  );

DROP POLICY IF EXISTS "permissions_update_admin" ON user_permissions;
CREATE POLICY "permissions_update_admin"
  ON user_permissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'god_admin')
    )
  );

DROP POLICY IF EXISTS "permissions_delete_admin" ON user_permissions;
CREATE POLICY "permissions_delete_admin"
  ON user_permissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'god_admin')
    )
  );

-- ============================================
-- FIX: account_requests RLS policies to include god_admin
-- ============================================
DROP POLICY IF EXISTS "requests_select_admin" ON account_requests;
CREATE POLICY "requests_select_admin"
  ON account_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'god_admin')
    )
  );

DROP POLICY IF EXISTS "requests_update_admin" ON account_requests;
CREATE POLICY "requests_update_admin"
  ON account_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'god_admin')
    )
  );
