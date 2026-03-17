/*
  # Add transport_is_usd and extra_is_usd columns to margin_analyses

  ## Changes
  - Adds `transport_is_usd` boolean column (default false) to `margin_analyses`
  - Adds `extra_is_usd` boolean column (default false) to `margin_analyses`

  These flags indicate whether the transport cost and extra fees were entered in USD
  rather than CAD, allowing the margin calculator to apply the exchange rate multiplier
  when computing CAD-based margins.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'margin_analyses' AND column_name = 'transport_is_usd'
  ) THEN
    ALTER TABLE margin_analyses ADD COLUMN transport_is_usd boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'margin_analyses' AND column_name = 'extra_is_usd'
  ) THEN
    ALTER TABLE margin_analyses ADD COLUMN extra_is_usd boolean NOT NULL DEFAULT false;
  END IF;
END $$;
