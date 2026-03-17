-- Migration: TOTP Authentication
-- Adds Google Authenticator support for vendeur_code + TOTP login flow

-- 1. Add TOTP columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS totp_secret TEXT,
  ADD COLUMN IF NOT EXISTS totp_enrolled BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Index for fast vendeur_code lookups at login
CREATE INDEX IF NOT EXISTS idx_profiles_vendeur_code_login
  ON profiles (vendeur_code)
  WHERE vendeur_code IS NOT NULL;

-- 3. RPC: get_user_by_vendeur_code
-- Called by totp-login Edge Function (via frontend with anon key).
-- Returns user_id, email, totp_enrolled — NEVER totp_secret.
-- Filters: active accounts only, suspended_until must be in the past if set.
DROP FUNCTION IF EXISTS get_user_by_vendeur_code(TEXT);

CREATE OR REPLACE FUNCTION get_user_by_vendeur_code(code TEXT)
RETURNS TABLE(user_id UUID, email TEXT, totp_enrolled BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT
      p.id,
      p.email,
      p.totp_enrolled
    FROM profiles p
    WHERE
      p.vendeur_code = code
      AND p.is_active = TRUE
      AND (
        p.is_suspended = FALSE
        OR (p.suspended_until IS NOT NULL AND p.suspended_until <= NOW())
      );
END;
$$;

-- Grant execute to anon (frontend calls this before login — no session exists)
GRANT EXECUTE ON FUNCTION get_user_by_vendeur_code(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_user_by_vendeur_code(TEXT) TO authenticated;

-- 4. Comment for documentation
COMMENT ON COLUMN profiles.totp_secret IS
  'Base32 TOTP secret for Google Authenticator. Never exposed to frontend — read only via service role in Edge Functions.';

COMMENT ON COLUMN profiles.totp_enrolled IS
  'True when user has confirmed TOTP enrollment by entering a valid code. Until true, login falls back to email OTP.';
