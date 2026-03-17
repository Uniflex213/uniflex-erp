/*
  # Fix Pickup Tickets — Add client_name and notes Columns

  ## Summary
  The pickup_tickets table was created with different column names
  (client_company_name / internal_notes) than what the application code expects
  (client_name / notes). This migration adds the missing aliased columns.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pickup_tickets' AND column_name = 'client_name'
  ) THEN
    ALTER TABLE pickup_tickets ADD COLUMN client_name text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pickup_tickets' AND column_name = 'notes'
  ) THEN
    ALTER TABLE pickup_tickets ADD COLUMN notes text NOT NULL DEFAULT '';
  END IF;
END $$;
