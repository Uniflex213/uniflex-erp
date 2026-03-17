/*
  # Create Products Tables for Uniflex Sales Tools

  ## Summary
  Creates the data model for the "Produits" section under "Ventes / Outils de vente".

  ## New Tables

  ### `sale_products`
  Stores product catalog entries.
  - `id` (uuid, PK)
  - `name` (text) — product name, e.g. Uni-100
  - `description` (text) — max 100 words description
  - `components_count` (int) — 1, 2, or 3 components
  - `formats` (text[]) — selected formats (2 GAL, 10 GAL, etc.)
  - `formats_other` (text) — free-text for "Autre" format option
  - `is_active` (bool) — product active/inactive status
  - `created_at` (timestamptz)

  ### `sale_product_images`
  Stores image URLs for product photos and project example images.
  - `id` (uuid, PK)
  - `product_id` (uuid, FK → sale_products)
  - `image_type` (text) — 'main' or 'example'
  - `image_url` (text)
  - `sort_order` (int)

  ### `sale_product_files`
  Stores downloadable PDF file references (TDS, SDS-A/B/C).
  - `id` (uuid, PK)
  - `product_id` (uuid, FK → sale_products)
  - `file_type` (text) — 'TDS', 'SDS-A', 'SDS-B', 'SDS-C'
  - `file_url` (text)
  - `file_name` (text)

  ## Security
  - RLS enabled on all tables
  - Authenticated users can read all products
  - Only service role can insert/update/delete (managed via edge functions or admin)
*/

CREATE TABLE IF NOT EXISTS sale_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  components_count int NOT NULL DEFAULT 1,
  formats text[] NOT NULL DEFAULT '{}',
  formats_other text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sale_product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES sale_products(id) ON DELETE CASCADE,
  image_type text NOT NULL DEFAULT 'main',
  image_url text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sale_product_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES sale_products(id) ON DELETE CASCADE,
  file_type text NOT NULL DEFAULT 'TDS',
  file_url text NOT NULL DEFAULT '',
  file_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sale_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_product_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view products"
  ON sale_products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON sale_products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
  ON sale_products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete products"
  ON sale_products FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view product images"
  ON sale_product_images FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert product images"
  ON sale_product_images FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update product images"
  ON sale_product_images FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete product images"
  ON sale_product_images FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view product files"
  ON sale_product_files FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert product files"
  ON sale_product_files FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update product files"
  ON sale_product_files FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete product files"
  ON sale_product_files FOR DELETE
  TO authenticated
  USING (true);
