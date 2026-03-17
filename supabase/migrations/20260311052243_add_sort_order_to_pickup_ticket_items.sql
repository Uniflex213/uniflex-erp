/*
  # Add sort_order column to pickup_ticket_items

  ## Summary
  The pickup_ticket_items table is missing the sort_order column
  that the application uses when inserting items. This migration
  adds the column safely.

  ## Changes
  - `pickup_ticket_items.sort_order` (integer, default 0) — display order of items within a ticket
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pickup_ticket_items' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE pickup_ticket_items ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
  END IF;
END $$;
