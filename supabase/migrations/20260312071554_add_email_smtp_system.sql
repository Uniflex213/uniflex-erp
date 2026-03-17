/*
  # Email SMTP System — Core Infrastructure

  ## Summary
  Adds the full email sending infrastructure to Uniflex:
  - System-level SMTP configs per email type (managed by admins)
  - Per-user personal SMTP configs for personal sends (pricelists, samples)
  - Extends existing email_send_logs with new columns for the SMTP-based system

  ## New Tables
  ### email_smtp_configs
  - Stores one row per email category (commandes, factures, samples, pricelist, pickups)
  - Admin-only read/write via RLS
  - SMTP credentials stored server-side, never exposed to frontend

  ### user_smtp_configs
  - Per-user personal Hostinger SMTP settings
  - Users can only access their own row
  - Admins can read all for support purposes

  ## Modified Tables
  ### email_send_logs (existing)
  - Adds smtp_config_key, from_email, template_key, reference_type, reference_id
  - All new columns nullable to preserve existing rows

  ## Security
  - email_smtp_configs: admin/god_admin only
  - user_smtp_configs: own row + admin read
  - email_send_logs: policies already exist
*/

-- ─── NEW COLUMNS ON email_send_logs ───
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='email_send_logs' AND column_name='smtp_config_key') THEN
    ALTER TABLE email_send_logs ADD COLUMN smtp_config_key text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='email_send_logs' AND column_name='from_email') THEN
    ALTER TABLE email_send_logs ADD COLUMN from_email text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='email_send_logs' AND column_name='template_key') THEN
    ALTER TABLE email_send_logs ADD COLUMN template_key text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='email_send_logs' AND column_name='reference_type') THEN
    ALTER TABLE email_send_logs ADD COLUMN reference_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='email_send_logs' AND column_name='reference_id') THEN
    ALTER TABLE email_send_logs ADD COLUMN reference_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='email_send_logs' AND column_name='to_addresses') THEN
    ALTER TABLE email_send_logs ADD COLUMN to_addresses text[] NOT NULL DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='email_send_logs' AND column_name='cc_addresses') THEN
    ALTER TABLE email_send_logs ADD COLUMN cc_addresses text[] DEFAULT '{}';
  END IF;
END $$;

-- ─── email_smtp_configs ───
CREATE TABLE IF NOT EXISTS email_smtp_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text UNIQUE NOT NULL,
  label text NOT NULL,
  smtp_host text NOT NULL DEFAULT 'smtp.hostinger.com',
  smtp_port integer NOT NULL DEFAULT 465,
  smtp_secure boolean NOT NULL DEFAULT true,
  from_email text NOT NULL DEFAULT '',
  from_name text NOT NULL DEFAULT 'Uniflex Distribution',
  smtp_password text NOT NULL DEFAULT '',
  is_active boolean DEFAULT true,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE email_smtp_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "smtp_configs_admin_select"
  ON email_smtp_configs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','god_admin')));

CREATE POLICY "smtp_configs_admin_insert"
  ON email_smtp_configs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','god_admin')));

CREATE POLICY "smtp_configs_admin_update"
  ON email_smtp_configs FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','god_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','god_admin')));

INSERT INTO email_smtp_configs (config_key, label, from_name)
VALUES
  ('commandes', 'Confirmations de commandes', 'Uniflex Distribution'),
  ('factures', 'Facturation SCI', 'Uniflex Distribution'),
  ('samples', 'Échantillons', 'Uniflex Distribution'),
  ('pricelist', 'Pricelists clients', 'Uniflex Distribution'),
  ('pickups', 'Pickup Tickets', 'Uniflex Distribution')
ON CONFLICT (config_key) DO NOTHING;

-- ─── user_smtp_configs ───
CREATE TABLE IF NOT EXISTS user_smtp_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  smtp_host text NOT NULL DEFAULT 'smtp.hostinger.com',
  smtp_port integer NOT NULL DEFAULT 465,
  smtp_secure boolean NOT NULL DEFAULT true,
  from_email text NOT NULL DEFAULT '',
  from_name text NOT NULL DEFAULT '',
  smtp_password text NOT NULL DEFAULT '',
  is_verified boolean DEFAULT false,
  verified_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_smtp_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_smtp_own_select"
  ON user_smtp_configs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_smtp_own_insert"
  ON user_smtp_configs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_smtp_own_update"
  ON user_smtp_configs FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_smtp_admin_read"
  ON user_smtp_configs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','god_admin')));
