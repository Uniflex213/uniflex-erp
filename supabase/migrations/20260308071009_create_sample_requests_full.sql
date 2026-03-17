/*
  # Full Sample Requests System

  ## Summary
  Creates or updates the sample request tables to support the full workflow:
  - sample_requests: main request table with all status, shipping, timer fields
  - sample_items: products included in each request
  - sample_activities: activity log per sample (status changes, notes)

  ## Tables

  ### sample_requests
  - id, lead_id, agent_id, agent_name
  - reason, priority, delivery_address, notes_for_office
  - status (8 states)
  - approved_by, approved_at, approval_notes, estimated_cost
  - transporteur, tracking_number, eta_delivery, shipped_at
  - delivered_at, timer_expires_at (delivered_at + 72h)
  - follow_up_completed_at, follow_up_notes, rejection_reason
  - lead_company_name (denormalized for admin views)

  ### sample_items
  - id, sample_request_id, product_name, quantity, format, color_finish

  ### sample_activities
  - id, sample_request_id, type, description, actor_name

  ## Security
  - RLS enabled on all tables
  - Anon can insert/select (consistent with existing platform pattern)
*/

CREATE TABLE IF NOT EXISTS sample_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id text NOT NULL,
  lead_company_name text NOT NULL DEFAULT '',
  agent_id text NOT NULL DEFAULT '',
  agent_name text NOT NULL DEFAULT '',
  reason text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'Normale',
  delivery_address text NOT NULL DEFAULT '',
  notes_for_office text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'En attente d''approbation',
  approved_by text NOT NULL DEFAULT '',
  approved_at timestamptz,
  approval_notes text NOT NULL DEFAULT '',
  estimated_cost numeric NOT NULL DEFAULT 0,
  transporteur text NOT NULL DEFAULT '',
  tracking_number text NOT NULL DEFAULT '',
  eta_delivery date,
  shipped_at timestamptz,
  delivered_at timestamptz,
  timer_expires_at timestamptz,
  follow_up_completed_at timestamptz,
  follow_up_notes text NOT NULL DEFAULT '',
  rejection_reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sample_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_request_id uuid NOT NULL REFERENCES sample_requests(id) ON DELETE CASCADE,
  product_name text NOT NULL DEFAULT '',
  quantity integer NOT NULL DEFAULT 1,
  format text NOT NULL DEFAULT 'Sample Kit',
  color_finish text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sample_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_request_id uuid NOT NULL REFERENCES sample_requests(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  actor_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sample_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sample_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sample_activities ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sample_requests' AND policyname = 'anon select sample_requests') THEN
    CREATE POLICY "anon select sample_requests" ON sample_requests FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sample_requests' AND policyname = 'anon insert sample_requests') THEN
    CREATE POLICY "anon insert sample_requests" ON sample_requests FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sample_requests' AND policyname = 'anon update sample_requests') THEN
    CREATE POLICY "anon update sample_requests" ON sample_requests FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sample_items' AND policyname = 'anon select sample_items') THEN
    CREATE POLICY "anon select sample_items" ON sample_items FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sample_items' AND policyname = 'anon insert sample_items') THEN
    CREATE POLICY "anon insert sample_items" ON sample_items FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sample_activities' AND policyname = 'anon select sample_activities') THEN
    CREATE POLICY "anon select sample_activities" ON sample_activities FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sample_activities' AND policyname = 'anon insert sample_activities') THEN
    CREATE POLICY "anon insert sample_activities" ON sample_activities FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;
