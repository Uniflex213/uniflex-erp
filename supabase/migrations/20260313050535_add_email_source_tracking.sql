/*
  # Add source tracking to email_messages

  1. Modified Tables
    - `email_messages`
      - Add `source` column (text, default 'imap') to track where emails originate from:
        - 'imap': fetched from IMAP server (default for all existing records)
        - 'compose': sent via user compose modal
        - 'order_confirmation': sent as order confirmation
        - 'pricelist': sent as price list
        - 'sample_notification': sent as sample notification
        - 'pickup_ticket': sent as pickup ticket notification
        - 'sci_invoice': sent as SCI invoice/billing document

  2. Important Notes
    - All existing records default to 'imap'
    - Source tracking enables distinguishing platform-sent vs received emails
    - No data loss: purely additive change
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_messages' AND column_name = 'source'
  ) THEN
    ALTER TABLE email_messages ADD COLUMN source text DEFAULT 'imap';
  END IF;
END $$;
