/*
  # Add Inventory Fields to sale_products

  ## Summary
  Adds inventory management fields to the sale_products table needed for
  the full inventory management module.

  ## Changes
  ### sale_products
  - `sku` (text) — stock keeping unit code
  - `min_stock` (integer, default 0) — minimum stock threshold for alerts
  - `cost_price` (numeric) — cost price per unit for consignment valuation
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sale_products' AND column_name = 'sku'
  ) THEN
    ALTER TABLE sale_products ADD COLUMN sku text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sale_products' AND column_name = 'min_stock'
  ) THEN
    ALTER TABLE sale_products ADD COLUMN min_stock integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sale_products' AND column_name = 'cost_price'
  ) THEN
    ALTER TABLE sale_products ADD COLUMN cost_price numeric(12,4) NOT NULL DEFAULT 0;
  END IF;
END $$;
