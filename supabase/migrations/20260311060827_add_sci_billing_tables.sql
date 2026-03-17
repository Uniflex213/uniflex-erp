/*
  # SCI Billing / To Invoice Module

  ## Summary
  Creates the infrastructure needed for the "To Invoice" module, which tracks the financial
  bridge between Uniflex and the manufacturer SCI. Uniflex operates on consignment — SCI
  invoices the end clients, so Uniflex must send all pickup tickets and completed orders to SCI
  for billing.

  ## Changes

  ### Modified Tables

  #### `pickup_tickets`
  - `sent_to_sci_at` (timestamptz, nullable) — when the document was sent to SCI
  - `sci_invoice_number` (text) — the invoice number SCI assigned
  - `sci_billed_amount` (numeric) — the amount SCI billed (may differ from ticket total)
  - `sci_billed_at` (timestamptz, nullable) — when SCI confirmed billing
  - `payment_status` (text) — 'En attente' | 'Payé' | 'En litige'

  #### `orders`
  - `billing_status` (text) — 'Non-facturé' | 'Envoyé' | 'Facturé par SCI'
  - `sent_to_sci_at` (timestamptz, nullable)
  - `sci_invoice_number` (text)
  - `sci_billed_amount` (numeric)
  - `sci_billed_at` (timestamptz, nullable)
  - `payment_status` (text)

  ### New Tables

  #### `sci_email_log`
  - Tracks every email batch sent to SCI
  - Columns: id, sent_at, sent_by, recipients, cc_recipients, subject, body,
    num_documents, total_value, log_type (send/followup), created_at

  #### `sci_email_log_items`
  - Line items for each email log — which documents were included
  - Columns: id, log_id (FK), document_type, document_id, document_number,
    client_name, value, created_at

  ## Security
  - RLS enabled on new tables
  - Anon read/write allowed (consistent with app pattern)
*/

-- Add SCI billing columns to pickup_tickets
ALTER TABLE pickup_tickets
  ADD COLUMN IF NOT EXISTS sent_to_sci_at timestamptz,
  ADD COLUMN IF NOT EXISTS sci_invoice_number text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sci_billed_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sci_billed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'En attente';

-- Add billing columns to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS billing_status text NOT NULL DEFAULT 'Non-facturé',
  ADD COLUMN IF NOT EXISTS sent_to_sci_at timestamptz,
  ADD COLUMN IF NOT EXISTS sci_invoice_number text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sci_billed_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sci_billed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'En attente';

-- Create sci_email_log table
CREATE TABLE IF NOT EXISTS sci_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_at timestamptz NOT NULL DEFAULT now(),
  sent_by text NOT NULL DEFAULT '',
  recipients text[] NOT NULL DEFAULT '{}',
  cc_recipients text[] NOT NULL DEFAULT '{}',
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  num_documents integer NOT NULL DEFAULT 0,
  total_value numeric(12,2) NOT NULL DEFAULT 0,
  log_type text NOT NULL DEFAULT 'send',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sci_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can select sci_email_log"
  ON sci_email_log FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert sci_email_log"
  ON sci_email_log FOR INSERT TO anon WITH CHECK (true);

-- Create sci_email_log_items table
CREATE TABLE IF NOT EXISTS sci_email_log_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id uuid NOT NULL REFERENCES sci_email_log(id) ON DELETE CASCADE,
  document_type text NOT NULL DEFAULT 'pickup',
  document_id text NOT NULL DEFAULT '',
  document_number text NOT NULL DEFAULT '',
  client_name text NOT NULL DEFAULT '',
  value numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sci_email_log_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can select sci_email_log_items"
  ON sci_email_log_items FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert sci_email_log_items"
  ON sci_email_log_items FOR INSERT TO anon WITH CHECK (true);
