/*
  # Add Tax and Financial Fields to Pickup Tickets

  ## Summary
  Extends the pickup_tickets table with a full financial breakdown:
  discount, subtotals, taxes by line, extra fees, and total with tax.

  ## Changes to `pickup_tickets`

  ### New Columns
  - `subtotal_products` (numeric) — sum of all line items (qty × unit_price)
  - `discount_type` (text) — '%' or '$'
  - `discount_value` (numeric) — user-entered discount value
  - `discount_amount` (numeric) — calculated discount in dollars
  - `subtotal_after_discount` (numeric) — subtotal_products - discount_amount
  - `province` (text) — detected province code (QC, ON, BC, etc.)
  - `tax_lines` (jsonb) — array of { label, rate, amount } objects
  - `tax_total` (numeric) — sum of all tax amounts
  - `extra_fees` (numeric) — optional handling/pallet fees
  - `total_with_tax` (numeric) — subtotal_after_discount + tax_total + extra_fees

  ### Backward Compatibility
  - Existing `total_value` column is kept (stores subtotal_products going forward)
  - All new columns default to 0 / safe values
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pickup_tickets' AND column_name = 'subtotal_products') THEN
    ALTER TABLE pickup_tickets ADD COLUMN subtotal_products numeric(12,2) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pickup_tickets' AND column_name = 'discount_type') THEN
    ALTER TABLE pickup_tickets ADD COLUMN discount_type text NOT NULL DEFAULT '%';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pickup_tickets' AND column_name = 'discount_value') THEN
    ALTER TABLE pickup_tickets ADD COLUMN discount_value numeric(12,4) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pickup_tickets' AND column_name = 'discount_amount') THEN
    ALTER TABLE pickup_tickets ADD COLUMN discount_amount numeric(12,2) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pickup_tickets' AND column_name = 'subtotal_after_discount') THEN
    ALTER TABLE pickup_tickets ADD COLUMN subtotal_after_discount numeric(12,2) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pickup_tickets' AND column_name = 'province') THEN
    ALTER TABLE pickup_tickets ADD COLUMN province text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pickup_tickets' AND column_name = 'tax_lines') THEN
    ALTER TABLE pickup_tickets ADD COLUMN tax_lines jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pickup_tickets' AND column_name = 'tax_total') THEN
    ALTER TABLE pickup_tickets ADD COLUMN tax_total numeric(12,2) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pickup_tickets' AND column_name = 'extra_fees') THEN
    ALTER TABLE pickup_tickets ADD COLUMN extra_fees numeric(12,2) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pickup_tickets' AND column_name = 'total_with_tax') THEN
    ALTER TABLE pickup_tickets ADD COLUMN total_with_tax numeric(12,2) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pickup_tickets' AND column_name = 'billing_address') THEN
    ALTER TABLE pickup_tickets ADD COLUMN billing_address text NOT NULL DEFAULT '';
  END IF;
END $$;
