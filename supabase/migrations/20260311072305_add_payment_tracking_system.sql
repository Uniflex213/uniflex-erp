/*
  # Add payment tracking system for invoices

  1. Modified Tables
    - `pickup_tickets`
      - `paid_amount` (numeric, default 0) - total amount paid so far
      - `paid_at` (timestamptz, nullable) - date when fully paid
      - `closed_at` (timestamptz, nullable) - date when invoice was closed
      - `closed_by` (text, nullable) - who closed the invoice
    - `orders`
      - `paid_amount` (numeric, default 0) - total amount paid so far
      - `paid_at` (timestamptz, nullable) - date when fully paid
      - `closed_at` (timestamptz, nullable) - date when invoice was closed
      - `closed_by` (text, nullable) - who closed the invoice

  2. New Tables
    - `invoice_payments`
      - `id` (uuid, primary key)
      - `document_type` (text) - 'pickup' or 'order'
      - `document_id` (uuid) - FK to pickup_tickets or orders
      - `amount` (numeric) - payment amount
      - `payment_date` (timestamptz) - when payment was received
      - `reference` (text) - payment reference / check number / etc.
      - `notes` (text) - optional notes
      - `recorded_by` (text) - who recorded the payment
      - `created_at` (timestamptz)

  3. Security
    - Enable RLS on `invoice_payments`
    - Add anon policies for CRUD on invoice_payments

  4. Notes
    - payment_status values: 'En attente', 'Partiel', 'Payé', 'En litige'
    - When paid_amount >= sci_billed_amount (or total), status = 'Payé'
    - When 0 < paid_amount < total, status = 'Partiel'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pickup_tickets' AND column_name = 'paid_amount'
  ) THEN
    ALTER TABLE pickup_tickets ADD COLUMN paid_amount numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pickup_tickets' AND column_name = 'paid_at'
  ) THEN
    ALTER TABLE pickup_tickets ADD COLUMN paid_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pickup_tickets' AND column_name = 'closed_at'
  ) THEN
    ALTER TABLE pickup_tickets ADD COLUMN closed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pickup_tickets' AND column_name = 'closed_by'
  ) THEN
    ALTER TABLE pickup_tickets ADD COLUMN closed_by text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'paid_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN paid_amount numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'paid_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN paid_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'closed_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN closed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'closed_by'
  ) THEN
    ALTER TABLE orders ADD COLUMN closed_by text;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL CHECK (document_type IN ('pickup', 'order')),
  document_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  payment_date timestamptz NOT NULL DEFAULT now(),
  reference text DEFAULT '',
  notes text DEFAULT '',
  recorded_by text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read invoice_payments"
  ON invoice_payments FOR SELECT
  TO anon
  USING (document_id IS NOT NULL);

CREATE POLICY "Anon can insert invoice_payments"
  ON invoice_payments FOR INSERT
  TO anon
  WITH CHECK (document_id IS NOT NULL);

CREATE POLICY "Anon can update invoice_payments"
  ON invoice_payments FOR UPDATE
  TO anon
  USING (document_id IS NOT NULL)
  WITH CHECK (document_id IS NOT NULL);

CREATE POLICY "Anon can delete invoice_payments"
  ON invoice_payments FOR DELETE
  TO anon
  USING (document_id IS NOT NULL);
