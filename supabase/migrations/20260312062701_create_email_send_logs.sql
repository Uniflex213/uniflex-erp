/*
  # Create email_send_logs table

  ## Purpose
  Tracks all outbound emails sent from the Uniflex platform via the send-invoice-email
  Edge Function. Provides an audit trail for billing emails, confirmations, etc.

  ## New Tables
  - `email_send_logs`
    - `id` (uuid, primary key)
    - `sent_by` (uuid, FK to profiles, nullable on delete)
    - `to_addresses` (text[], required)
    - `cc_addresses` (text[], default empty)
    - `subject` (text, required)
    - `module` (text — e.g. 'to_invoice', 'orders', 'samples')
    - `reference_ids` (text[], IDs of related records)
    - `has_attachment` (boolean)
    - `attachment_name` (text, nullable)
    - `success` (boolean)
    - `error_message` (text, nullable)
    - `resend_message_id` (text, nullable)
    - `sent_at` (timestamptz)

  ## Security
  - RLS enabled
  - Authenticated users can INSERT their own logs (sent_by = auth.uid())
  - Users can SELECT their own logs
  - Admins and god_admins can SELECT all logs
*/

CREATE TABLE IF NOT EXISTS email_send_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  to_addresses text[] NOT NULL,
  cc_addresses text[] DEFAULT '{}',
  subject text NOT NULL,
  module text NOT NULL,
  reference_ids text[] DEFAULT '{}',
  has_attachment boolean DEFAULT false,
  attachment_name text,
  success boolean NOT NULL DEFAULT false,
  error_message text,
  resend_message_id text,
  sent_at timestamptz DEFAULT now()
);

ALTER TABLE email_send_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_logs_insert"
  ON email_send_logs FOR INSERT
  TO authenticated
  WITH CHECK (sent_by = auth.uid());

CREATE POLICY "email_logs_read_own"
  ON email_send_logs FOR SELECT
  TO authenticated
  USING (sent_by = auth.uid());

CREATE POLICY "email_logs_read_admin"
  ON email_send_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'god_admin')
    )
  );
