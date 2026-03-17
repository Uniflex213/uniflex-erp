/*
  # Create Pickup Tickets Tables

  ## Summary
  Creates the consignment pickup ticket system for Store OPS module.

  ## New Tables

  ### `pickup_tickets`
  - Core table for consignment exit documents
  - Tracks client, status, billing status, agents, and dates
  - Each ticket has a unique auto-generated ID (PU-BSB-MMYY-NNNNN format)
  - Columns:
    - `id` (uuid, PK)
    - `ticket_number` (text, unique) — formatted ticket ID
    - `store_code` (text) — 3-letter store code (e.g., BSB)
    - `client_id` (uuid, nullable) — FK to clients table if client exists in DB
    - `client_name` (text) — company name or walk-in name
    - `client_contact` (text)
    - `client_phone` (text)
    - `client_email` (text)
    - `is_walkin` (boolean) — true if client not in database
    - `status` (text) — 'prepared' | 'ready' | 'picked_up' | 'cancelled'
    - `billing_status` (text) — 'unbilled' | 'sent' | 'billed_by_sci'
    - `payment_method` (text)
    - `issued_at` (timestamptz) — when ticket was created
    - `estimated_pickup_at` (timestamptz, nullable)
    - `picked_up_at` (timestamptz, nullable)
    - `agent_name` (text)
    - `notes` (text)
    - `total_value` (numeric)
    - `total_qty` (integer)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### `pickup_ticket_items`
  - Line items for each pickup ticket
  - Columns:
    - `id` (uuid, PK)
    - `ticket_id` (uuid, FK -> pickup_tickets)
    - `product_id` (uuid, nullable) — FK to sale_products
    - `product_name` (text)
    - `quantity` (integer)
    - `format` (text)
    - `unit_price` (numeric)
    - `price_unit` (text) — '/KIT' | '/GAL'
    - `subtotal` (numeric)
    - `sort_order` (integer)

  ### `pickup_ticket_counter`
  - Tracks sequential ticket numbers per store+month
  - Ensures counters never go backwards

  ## Security
  - RLS enabled on all tables
  - Anon access allowed for read/write (same pattern as other tables in this app)
*/

CREATE TABLE IF NOT EXISTS pickup_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE NOT NULL,
  store_code text NOT NULL DEFAULT 'BSB',
  client_id uuid,
  client_name text NOT NULL DEFAULT '',
  client_contact text NOT NULL DEFAULT '',
  client_phone text NOT NULL DEFAULT '',
  client_email text NOT NULL DEFAULT '',
  is_walkin boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'prepared',
  billing_status text NOT NULL DEFAULT 'unbilled',
  payment_method text NOT NULL DEFAULT 'account_net30',
  issued_at timestamptz NOT NULL DEFAULT now(),
  estimated_pickup_at timestamptz,
  picked_up_at timestamptz,
  agent_name text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  total_value numeric(12,2) NOT NULL DEFAULT 0,
  total_qty integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pickup_ticket_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES pickup_tickets(id) ON DELETE CASCADE,
  product_id uuid,
  product_name text NOT NULL DEFAULT '',
  quantity integer NOT NULL DEFAULT 1,
  format text NOT NULL DEFAULT '',
  unit_price numeric(12,4) NOT NULL DEFAULT 0,
  price_unit text NOT NULL DEFAULT '/KIT',
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pickup_ticket_counter (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_code text NOT NULL,
  period text NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  UNIQUE(store_code, period)
);

ALTER TABLE pickup_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_ticket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_ticket_counter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can read pickup_tickets"
  ON pickup_tickets FOR SELECT TO anon USING (true);

CREATE POLICY "anon can insert pickup_tickets"
  ON pickup_tickets FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon can update pickup_tickets"
  ON pickup_tickets FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon can read pickup_ticket_items"
  ON pickup_ticket_items FOR SELECT TO anon USING (true);

CREATE POLICY "anon can insert pickup_ticket_items"
  ON pickup_ticket_items FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon can update pickup_ticket_items"
  ON pickup_ticket_items FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon can delete pickup_ticket_items"
  ON pickup_ticket_items FOR DELETE TO anon USING (true);

CREATE POLICY "anon can read pickup_ticket_counter"
  ON pickup_ticket_counter FOR SELECT TO anon USING (true);

CREATE POLICY "anon can insert pickup_ticket_counter"
  ON pickup_ticket_counter FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon can update pickup_ticket_counter"
  ON pickup_ticket_counter FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_pickup_tickets_status ON pickup_tickets(status);
CREATE INDEX IF NOT EXISTS idx_pickup_tickets_billing_status ON pickup_tickets(billing_status);
CREATE INDEX IF NOT EXISTS idx_pickup_tickets_issued_at ON pickup_tickets(issued_at);
CREATE INDEX IF NOT EXISTS idx_pickup_ticket_items_ticket_id ON pickup_ticket_items(ticket_id);
