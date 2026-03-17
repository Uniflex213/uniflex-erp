/*
  # Create Clients Module Tables

  ## Summary
  Full client management system for Uniflex agents and admins.

  ## New Tables

  ### 1. `clients`
  Core client record — converted from leads or created manually.
  - All contact, billing, shipping, classification, and commercial fields.
  - `lead_id` links back to original CRM lead (if converted).
  - `is_converted_lead` flag for easy filtering.

  ### 2. `client_notes`
  Free-form notes per client, with CRM import flag.

  ### 3. `client_credit_notes`
  Credit notes submitted by agents for admin approval.

  ### 4. `client_disputes`
  Disputes opened by agents, managed by admins with timeline messages.

  ### 5. `dispute_messages`
  Threaded messages on a dispute (between agent and admin).

  ### 6. `client_pickup_tickets`
  Pickup tickets for orders with delivery type "Pickup".

  ## Security
  - RLS enabled on all tables
  - Anon read/write allowed (mirrors sample_requests pattern) for local dev
  - In production, replace with auth.uid() checks
*/

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT '',
  contact_first_name text NOT NULL DEFAULT '',
  contact_last_name text NOT NULL DEFAULT '',
  contact_title text DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  phone_secondary text DEFAULT '',
  website text DEFAULT '',
  billing_address text DEFAULT '',
  billing_city text DEFAULT '',
  billing_province text DEFAULT '',
  billing_postal_code text DEFAULT '',
  billing_country text DEFAULT 'Canada',
  shipping_same_as_billing boolean DEFAULT true,
  shipping_address text DEFAULT '',
  shipping_city text DEFAULT '',
  shipping_province text DEFAULT '',
  shipping_postal_code text DEFAULT '',
  shipping_country text DEFAULT 'Canada',
  client_type text DEFAULT 'Installateur',
  client_type_other text DEFAULT '',
  tier text DEFAULT 'MED',
  region text DEFAULT '',
  source text DEFAULT 'Référence',
  agent_id text DEFAULT '',
  agent_name text DEFAULT '',
  client_code text DEFAULT '',
  payment_terms text DEFAULT 'Net 30',
  currency text DEFAULT 'CAD',
  special_commission_rate numeric(5,2),
  pricelist_id text DEFAULT '',
  pricelist_name text DEFAULT '',
  notes text DEFAULT '',
  lead_id text DEFAULT '',
  is_converted_lead boolean DEFAULT false,
  crm_history_transferred boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  author_name text DEFAULT '',
  is_from_crm boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  order_id text DEFAULT '',
  reason text DEFAULT '',
  reason_other text DEFAULT '',
  amount numeric(12,2) DEFAULT 0,
  description text DEFAULT '',
  status text DEFAULT 'En attente',
  created_by text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  order_id text DEFAULT '',
  subject text NOT NULL DEFAULT '',
  priority text DEFAULT 'Moyenne',
  description text DEFAULT '',
  status text DEFAULT 'Ouverte',
  resolution text DEFAULT '',
  credit_note_id uuid,
  created_by text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dispute_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES client_disputes(id) ON DELETE CASCADE,
  author_name text DEFAULT '',
  content text NOT NULL DEFAULT '',
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_pickup_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  order_id text DEFAULT '',
  availability_date timestamptz,
  notes text DEFAULT '',
  status text DEFAULT 'Prêt',
  created_by text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_pickup_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read clients"
  ON clients FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert clients"
  ON clients FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update clients"
  ON clients FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete clients"
  ON clients FOR DELETE TO anon USING (true);

CREATE POLICY "Anon can read client_notes"
  ON client_notes FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert client_notes"
  ON client_notes FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update client_notes"
  ON client_notes FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete client_notes"
  ON client_notes FOR DELETE TO anon USING (true);

CREATE POLICY "Anon can read client_credit_notes"
  ON client_credit_notes FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert client_credit_notes"
  ON client_credit_notes FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update client_credit_notes"
  ON client_credit_notes FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete client_credit_notes"
  ON client_credit_notes FOR DELETE TO anon USING (true);

CREATE POLICY "Anon can read client_disputes"
  ON client_disputes FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert client_disputes"
  ON client_disputes FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update client_disputes"
  ON client_disputes FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete client_disputes"
  ON client_disputes FOR DELETE TO anon USING (true);

CREATE POLICY "Anon can read dispute_messages"
  ON dispute_messages FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert dispute_messages"
  ON dispute_messages FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update dispute_messages"
  ON dispute_messages FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete dispute_messages"
  ON dispute_messages FOR DELETE TO anon USING (true);

CREATE POLICY "Anon can read client_pickup_tickets"
  ON client_pickup_tickets FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert client_pickup_tickets"
  ON client_pickup_tickets FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update client_pickup_tickets"
  ON client_pickup_tickets FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can delete client_pickup_tickets"
  ON client_pickup_tickets FOR DELETE TO anon USING (true);
