/*
  # Add extended columns to client_disputes and dispute_messages

  ## Changes

  ### client_disputes
  - `order_ref` (text) — free-form order reference string (in addition to order_id FK)
  - `invoice_ref` (text) — free-form invoice reference string
  - `amount_disputed` (numeric) — monetary amount in dispute

  ### dispute_messages
  - `sender_id` (uuid) — FK to profiles, replaces/supplements author_name for authenticated messages

  All changes are idempotent (IF NOT EXISTS).
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_disputes' AND column_name = 'order_ref'
  ) THEN
    ALTER TABLE client_disputes ADD COLUMN order_ref text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_disputes' AND column_name = 'invoice_ref'
  ) THEN
    ALTER TABLE client_disputes ADD COLUMN invoice_ref text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_disputes' AND column_name = 'amount_disputed'
  ) THEN
    ALTER TABLE client_disputes ADD COLUMN amount_disputed numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dispute_messages' AND column_name = 'sender_id'
  ) THEN
    ALTER TABLE dispute_messages ADD COLUMN sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS dispute_messages_sender_id_idx ON dispute_messages(sender_id);
CREATE INDEX IF NOT EXISTS client_disputes_status_idx ON client_disputes(status);
CREATE INDEX IF NOT EXISTS client_disputes_priority_idx ON client_disputes(priority);
