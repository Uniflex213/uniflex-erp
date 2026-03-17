/*
  # Add god_admin role to profiles

  1. Changes
    - Update `profiles_role_check` constraint to include `god_admin` role
    - god_admin is a super-admin role with full access to all features

  2. Security
    - No RLS changes needed; existing policies apply
*/

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['god_admin','admin','manuf','vendeur','magasin']));
