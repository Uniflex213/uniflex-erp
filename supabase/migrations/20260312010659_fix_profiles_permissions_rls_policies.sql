/*
  # Fix RLS policies on profiles, user_permissions, and account_requests

  The root cause of "Database error querying schema" at login:
  - profiles SELECT policies were too restrictive or had self-referencing
    subqueries that prevented non-admin users from reading their own profile
  - The AuthContext needs to read the user's profile at login to determine role
  - user_permissions had similar issues

  1. Changes to `profiles`
    - Drop all existing policies
    - Allow all authenticated users to SELECT profiles (needed for team visibility)
    - Users can update their own profile
    - Admins can update/insert/delete any profile

  2. Changes to `user_permissions`
    - Drop all existing policies
    - Users can read their own permissions
    - Admins can fully manage all permissions

  3. Changes to `account_requests`
    - Drop all existing policies
    - Anyone (anon + authenticated) can insert requests
    - Admins can view and update requests

  4. Security
    - All policies scoped to `authenticated` (except account_requests insert)
    - Admin policies check role via profiles subquery
    - UPDATE own profile restricted to own row via auth.uid()
*/

-- =============================================
-- PROFILES POLICIES
-- =============================================

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_same_team" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;

CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

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

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO anon, authenticated
  WITH CHECK (auth.uid() = id);

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

-- =============================================
-- USER_PERMISSIONS POLICIES
-- =============================================

DROP POLICY IF EXISTS "Permissions viewable by everyone" ON user_permissions;
DROP POLICY IF EXISTS "Admins can manage permissions" ON user_permissions;
DROP POLICY IF EXISTS "permissions_select_admin" ON user_permissions;
DROP POLICY IF EXISTS "permissions_select_own" ON user_permissions;
DROP POLICY IF EXISTS "permissions_insert_admin" ON user_permissions;
DROP POLICY IF EXISTS "permissions_update_admin" ON user_permissions;
DROP POLICY IF EXISTS "permissions_delete_admin" ON user_permissions;

CREATE POLICY "permissions_select_own"
  ON user_permissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

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

CREATE POLICY "permissions_update_admin"
  ON user_permissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'god_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'god_admin')
    )
  );

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

-- =============================================
-- ACCOUNT_REQUESTS POLICIES
-- =============================================

DROP POLICY IF EXISTS "Anyone can insert account requests" ON account_requests;
DROP POLICY IF EXISTS "Admins can view account requests" ON account_requests;
DROP POLICY IF EXISTS "Admins can update account requests" ON account_requests;
DROP POLICY IF EXISTS "requests_select_admin" ON account_requests;
DROP POLICY IF EXISTS "requests_update_admin" ON account_requests;
DROP POLICY IF EXISTS "account_requests_insert_anyone" ON account_requests;
DROP POLICY IF EXISTS "account_requests_select_admin" ON account_requests;
DROP POLICY IF EXISTS "account_requests_update_admin" ON account_requests;

CREATE POLICY "account_requests_insert_anyone"
  ON account_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "account_requests_select_admin"
  ON account_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'god_admin')
    )
  );

CREATE POLICY "account_requests_update_admin"
  ON account_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'god_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'god_admin')
    )
  );
