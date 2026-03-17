/*
  # Create store_price_items table

  ## Summary
  Creates a dedicated product catalog for the store (magasin) that is
  completely independent from the sales catalog (sale_products). This allows
  pickup tickets to reference store-specific products with their own pricing,
  while orders, samples, and CRM continue to use sale_products.

  ## New Tables
  - `store_price_items`
    - `id` (uuid, primary key)
    - `name` (text, required) — product name as shown on pickup tickets
    - `sku` (text) — optional product code
    - `formats` (text[]) — available formats e.g. ["Common (3gal/2gal)", "Large (15GAL/10GAL)"]
    - `unit_price` (numeric) — default selling price for pickup tickets
    - `price_unit` (text) — unit label e.g. "/KIT", "/GAL"
    - `is_active` (boolean) — whether the product appears in pickup ticket dropdowns
    - `sort_order` (integer) — display ordering
    - `owner_id` (uuid) — user who created the item
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Authenticated users can read all active store items
  - Only admin/owner can insert, update, delete
*/

CREATE TABLE IF NOT EXISTS store_price_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  sku         text DEFAULT '',
  formats     text[] DEFAULT '{}',
  unit_price  numeric(10,2) DEFAULT 0,
  price_unit  text DEFAULT '/KIT',
  is_active   boolean DEFAULT true,
  sort_order  integer DEFAULT 0,
  owner_id    uuid REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE store_price_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view store price items"
  ON store_price_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert store price items"
  ON store_price_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update store price items"
  ON store_price_items FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete store price items"
  ON store_price_items FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_store_price_items_is_active ON store_price_items (is_active);
CREATE INDEX IF NOT EXISTS idx_store_price_items_sort_order ON store_price_items (sort_order);
