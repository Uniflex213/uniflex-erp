/*
  # Fix Pickup Tickets Missing Columns

  ## Summary
  The pickup_tickets and pickup_ticket_counter tables were created before
  the full schema was defined, resulting in missing columns. This migration
  adds all missing columns safely using IF NOT EXISTS checks.

  ## Changes

  ### pickup_ticket_counter
  - `period` (text) — month/year period key (e.g., "0326")

  ### pickup_tickets
  - `client_contact` (text) — contact name on the ticket
  - `client_phone` (text) — client phone
  - `client_email` (text) — client email
  - `is_walkin` (boolean) — walk-in flag
  - `billing_status` (text) — unbilled / sent / billed_by_sci
  - `payment_method` (text)
  - `estimated_pickup_at` (timestamptz)
  - `picked_up_at` (timestamptz)
  - `total_value` (numeric)
  - `total_qty` (integer)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pickup_ticket_counter' AND column_name = 'period'
  ) THEN
    ALTER TABLE pickup_ticket_counter ADD COLUMN period text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pickup_ticket_counter' AND column_name = 'last_number'
  ) THEN
    ALTER TABLE pickup_ticket_counter ADD COLUMN last_number integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pickup_tickets' AND column_name = 'client_contact'
  ) THEN
    ALTER TABLE pickup_tickets ADD COLUMN client_contact text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pickup_tickets' AND column_name = 'client_phone'
  ) THEN
    ALTER TABLE pickup_tickets ADD COLUMN client_phone text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pickup_tickets' AND column_name = 'client_email'
  ) THEN
    ALTER TABLE pickup_tickets ADD COLUMN client_email text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pickup_tickets' AND column_name = 'is_walkin'
  ) THEN
    ALTER TABLE pickup_tickets ADD COLUMN is_walkin boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pickup_tickets' AND column_name = 'billing_status'
  ) THEN
    ALTER TABLE pickup_tickets ADD COLUMN billing_status text NOT NULL DEFAULT 'unbilled';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pickup_tickets' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE pickup_tickets ADD COLUMN payment_method text NOT NULL DEFAULT 'account_net30';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pickup_tickets' AND column_name = 'estimated_pickup_at'
  ) THEN
    ALTER TABLE pickup_tickets ADD COLUMN estimated_pickup_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pickup_tickets' AND column_name = 'picked_up_at'
  ) THEN
    ALTER TABLE pickup_tickets ADD COLUMN picked_up_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pickup_tickets' AND column_name = 'total_value'
  ) THEN
    ALTER TABLE pickup_tickets ADD COLUMN total_value numeric(12,2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pickup_tickets' AND column_name = 'total_qty'
  ) THEN
    ALTER TABLE pickup_tickets ADD COLUMN total_qty integer NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'pickup_ticket_counter' AND indexname = 'idx_pickup_ticket_counter_store_period'
  ) THEN
    CREATE UNIQUE INDEX idx_pickup_ticket_counter_store_period ON pickup_ticket_counter(store_code, period);
  END IF;
END $$;
