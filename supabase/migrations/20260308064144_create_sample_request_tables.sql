/*
  # Sample Request Management System

  1. New Tables
    - `sample_requests` — main sample request with lead, agent, context, status
    - `sample_items` — individual products in each request (one request can have multiple products)
    - `sample_activities` — timeline of status changes and events

  2. Security
    - RLS enabled on all tables
    - Anon users can read/write for demo purposes

  3. Notes
    - sample_requests has statuses: pending, approved, preparing, shipped, delivered, follow_up_required, follow_up_completed, rejected
    - Timer 72h tracking: delivered_at timestamp, timer_expires_at auto-calculated
    - shipping: transporteur, tracking_number, eta
*/

CREATE TABLE IF NOT EXISTS sample_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  agent_id text DEFAULT '',
  agent_name text DEFAULT '',
  reason text NOT NULL DEFAULT 'Démonstration client',
  priority text NOT NULL DEFAULT 'Normale',
  delivery_address text DEFAULT '',
  notes_for_office text DEFAULT '',
  status text NOT NULL DEFAULT 'En attente d''approbation',
  approved_by text DEFAULT '',
  approved_at timestamptz,
  approval_notes text DEFAULT '',
  estimated_cost numeric DEFAULT 0,
  transporteur text DEFAULT '',
  tracking_number text DEFAULT '',
  eta_delivery date,
  shipped_at timestamptz,
  delivered_at timestamptz,
  timer_expires_at timestamptz,
  follow_up_completed_at timestamptz,
  rejection_reason text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sample_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can select sample_requests"
  ON sample_requests FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert sample_requests"
  ON sample_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update sample_requests"
  ON sample_requests FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete sample_requests"
  ON sample_requests FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS sample_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_request_id uuid NOT NULL REFERENCES sample_requests(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  format text NOT NULL DEFAULT 'Sample Kit',
  color_finish text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sample_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can select sample_items"
  ON sample_items FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert sample_items"
  ON sample_items FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update sample_items"
  ON sample_items FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete sample_items"
  ON sample_items FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS sample_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_request_id uuid NOT NULL REFERENCES sample_requests(id) ON DELETE CASCADE,
  type text NOT NULL,
  description text DEFAULT '',
  actor_name text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sample_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can select sample_activities"
  ON sample_activities FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert sample_activities"
  ON sample_activities FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
