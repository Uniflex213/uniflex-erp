/*
  # Align user_smtp_configs column names with edge function expectations

  The user_smtp_configs table was created with column names smtp_email,
  smtp_password_enc, display_name — but the send-email and test-smtp edge
  functions expect from_email, from_name, smtp_password, smtp_secure.

  This migration adds the missing columns so both the edge functions and
  UserSettings.tsx work correctly.

  Changes:
  - Add from_email column (matches edge function select)
  - Add from_name column (matches edge function select)
  - Add smtp_password column (plain text, stored server-side only)
  - Add smtp_secure column with default true (Hostinger uses SSL port 465)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_smtp_configs' AND column_name = 'from_email'
  ) THEN
    ALTER TABLE user_smtp_configs ADD COLUMN from_email text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_smtp_configs' AND column_name = 'from_name'
  ) THEN
    ALTER TABLE user_smtp_configs ADD COLUMN from_name text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_smtp_configs' AND column_name = 'smtp_password'
  ) THEN
    ALTER TABLE user_smtp_configs ADD COLUMN smtp_password text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_smtp_configs' AND column_name = 'smtp_secure'
  ) THEN
    ALTER TABLE user_smtp_configs ADD COLUMN smtp_secure boolean NOT NULL DEFAULT true;
  END IF;
END $$;
