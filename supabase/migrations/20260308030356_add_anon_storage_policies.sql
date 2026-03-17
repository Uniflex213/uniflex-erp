/*
  # Add anon role storage policies

  1. Changes
    - Add INSERT, UPDATE, DELETE policies on `storage.objects` for the `anon` role
      for both `product-images` and `product-files` buckets
    - This mirrors the existing `authenticated` role policies so that
      requests made with the Supabase anon key can upload, update, and delete files

  2. Affected Buckets
    - `product-images`
    - `product-files`

  3. Notes
    - SELECT policies already exist for the `public` role, so reads are unaffected
*/

CREATE POLICY "Anon upload product images"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Anon update product images"
  ON storage.objects FOR UPDATE
  TO anon
  USING (bucket_id = 'product-images');

CREATE POLICY "Anon delete product images"
  ON storage.objects FOR DELETE
  TO anon
  USING (bucket_id = 'product-images');

CREATE POLICY "Anon upload product files"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'product-files');

CREATE POLICY "Anon update product files"
  ON storage.objects FOR UPDATE
  TO anon
  USING (bucket_id = 'product-files');

CREATE POLICY "Anon delete product files"
  ON storage.objects FOR DELETE
  TO anon
  USING (bucket_id = 'product-files');
