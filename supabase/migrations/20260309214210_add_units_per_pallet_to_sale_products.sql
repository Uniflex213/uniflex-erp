/*
  # Add units_per_pallet to sale_products

  Adds an optional numeric field to track how many units form a full pallet.

  1. Modified Tables
    - `sale_products`
      - `units_per_pallet` (integer, nullable) — number of common-format units per full pallet
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sale_products' AND column_name = 'units_per_pallet'
  ) THEN
    ALTER TABLE sale_products ADD COLUMN units_per_pallet integer;
  END IF;
END $$;
