/*
  # Create change_logs table for audit trail

  ## Summary
  Creates a universal audit/change log table to track all modifications
  made to orders, pickup tickets, and client records across the platform.

  ## New Tables
  - `change_logs`
    - `id` (uuid, primary key)
    - `entity_type` (text) — 'order', 'pickup_ticket', or 'client'
    - `entity_id` (text) — ID of the modified entity
    - `entity_label` (text) — Human-readable label (e.g. order ID, ticket number, company name)
    - `field_name` (text) — Name of the field that changed
    - `old_value` (text, nullable) — Previous value
    - `new_value` (text, nullable) — New value
    - `change_type` (text) — 'field_edit', 'status_change', 'item_added', 'item_removed', 'item_edited', 'created'
    - `changed_by` (text) — Name of the person who made the change
    - `changed_at` (timestamptz) — When the change occurred
    - `note` (text, nullable) — Optional context note

  ## Security
  - RLS enabled
  - Anon can INSERT (app uses anon key) and SELECT
  - No UPDATE or DELETE to preserve audit integrity
*/

CREATE TABLE IF NOT EXISTS change_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  entity_label text NOT NULL DEFAULT '',
  field_name text NOT NULL,
  old_value text,
  new_value text,
  change_type text NOT NULL DEFAULT 'field_edit',
  changed_by text NOT NULL DEFAULT 'Système',
  changed_at timestamptz NOT NULL DEFAULT now(),
  note text
);

CREATE INDEX IF NOT EXISTS change_logs_entity_idx ON change_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS change_logs_changed_at_idx ON change_logs(changed_at DESC);

ALTER TABLE change_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert change logs"
  ON change_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read change logs"
  ON change_logs
  FOR SELECT
  TO anon, authenticated
  USING (true);
