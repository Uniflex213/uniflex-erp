/*
  # Create Margin Analyses Tables

  ## Summary
  Creates the data model for the "Margin Calculator" tool under "Ventes / Outils de vente".
  Allows sales reps to save profitability analyses linked to clients.

  ## New Tables

  ### `margin_analyses`
  Stores saved profitability analysis headers.
  - `id` (uuid, PK)
  - `reference` (text) — submission/deal reference e.g. CMD-2026-001
  - `client_name` (text) — optional client name
  - `commission_pct` (numeric) — commission percentage (default 8)
  - `global_discount_pct` (numeric) — global discount applied to all products (default 0)
  - `transport_cost` (numeric) — shipping cost (default 0)
  - `extra_fees` (numeric) — extra handling/customs fees (default 0)
  - `is_usd` (boolean) — whether the sale is in USD with CAD costs
  - `exchange_rate` (numeric) — USD/CAD exchange rate (default 1.38)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `margin_analysis_lines`
  Stores product lines within an analysis.
  - `id` (uuid, PK)
  - `analysis_id` (uuid, FK → margin_analyses)
  - `product_name` (text) — selected product name
  - `sku` (text) — product SKU/code
  - `cogs_unit` (numeric) — cost per unit (editable)
  - `selling_price_unit` (numeric) — negotiated selling price per unit
  - `quantity` (int) — quantity
  - `sort_order` (int) — ordering
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on both tables
  - Authenticated users can CRUD their own analyses (using anon key for now — open access)
*/

CREATE TABLE IF NOT EXISTS margin_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL DEFAULT '',
  client_name text NOT NULL DEFAULT '',
  commission_pct numeric NOT NULL DEFAULT 8,
  global_discount_pct numeric NOT NULL DEFAULT 0,
  transport_cost numeric NOT NULL DEFAULT 0,
  extra_fees numeric NOT NULL DEFAULT 0,
  is_usd boolean NOT NULL DEFAULT false,
  exchange_rate numeric NOT NULL DEFAULT 1.38,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS margin_analysis_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES margin_analyses(id) ON DELETE CASCADE,
  product_name text NOT NULL DEFAULT '',
  sku text NOT NULL DEFAULT '',
  cogs_unit numeric NOT NULL DEFAULT 0,
  selling_price_unit numeric NOT NULL DEFAULT 0,
  quantity int NOT NULL DEFAULT 1,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE margin_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE margin_analysis_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon users can view margin analyses"
  ON margin_analyses FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert margin analyses"
  ON margin_analyses FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update margin analyses"
  ON margin_analyses FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon users can delete margin analyses"
  ON margin_analyses FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Authenticated users can view margin analyses"
  ON margin_analyses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert margin analyses"
  ON margin_analyses FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update margin analyses"
  ON margin_analyses FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete margin analyses"
  ON margin_analyses FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Anon users can view margin lines"
  ON margin_analysis_lines FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert margin lines"
  ON margin_analysis_lines FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update margin lines"
  ON margin_analysis_lines FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon users can delete margin lines"
  ON margin_analysis_lines FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Authenticated users can view margin lines"
  ON margin_analysis_lines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert margin lines"
  ON margin_analysis_lines FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update margin lines"
  ON margin_analysis_lines FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete margin lines"
  ON margin_analysis_lines FOR DELETE
  TO authenticated
  USING (true);
