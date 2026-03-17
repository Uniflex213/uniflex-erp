
/*
  # Add anon role policies for sale tables

  ## Summary
  The existing RLS policies only allow `authenticated` users to access the sale tables.
  Since the app operates without a login flow (using the anon key directly), requests
  come in as the `anon` role and are blocked.

  ## Changes
  - Add SELECT, INSERT, UPDATE, DELETE policies for the `anon` role on:
    - `sale_products`
    - `sale_product_images`
    - `sale_product_files`

  ## Security Note
  This is appropriate for an internal admin tool with no public authentication.
*/

CREATE POLICY "Anon users can view products"
  ON sale_products FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert products"
  ON sale_products FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update products"
  ON sale_products FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon users can delete products"
  ON sale_products FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Anon users can view product images"
  ON sale_product_images FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert product images"
  ON sale_product_images FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update product images"
  ON sale_product_images FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon users can delete product images"
  ON sale_product_images FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Anon users can view product files"
  ON sale_product_files FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert product files"
  ON sale_product_files FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update product files"
  ON sale_product_files FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon users can delete product files"
  ON sale_product_files FOR DELETE
  TO anon
  USING (true);
