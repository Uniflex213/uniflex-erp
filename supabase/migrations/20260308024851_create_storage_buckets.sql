/*
  # Create Storage Buckets for Product Images and Files

  1. Storage Buckets
    - `product-images`: Public bucket for product photos (main + example images)
    - `product-files`: Public bucket for PDF documents (TDS and SDS files)

  2. Policies
    - Authenticated users can upload, read, update, and delete objects in both buckets
    - Public read access so URLs work without auth (for sales agents viewing products)
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('product-images', 'product-images', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('product-files', 'product-files', true, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Authenticated update product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated delete product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "Public read product files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-files');

CREATE POLICY "Authenticated upload product files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-files');

CREATE POLICY "Authenticated update product files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-files');

CREATE POLICY "Authenticated delete product files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-files');
