/*
  # Add Anon Upload Policy for client-files Storage Bucket

  ## Summary
  The client-files storage bucket only had an INSERT policy for the
  "authenticated" role. The app uses the anon key, so PDF uploads
  were being rejected. This migration adds the missing anon policies
  to match the pattern used by product-images and product-files buckets.

  ## Changes
  - Add INSERT (upload) policy for anon role on client-files bucket
  - Add UPDATE policy for anon role on client-files bucket
  - Add DELETE policy for anon role on client-files bucket
*/

CREATE POLICY "Anon upload client files"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'client-files');

CREATE POLICY "Anon update client files"
  ON storage.objects
  FOR UPDATE
  TO anon
  USING (bucket_id = 'client-files');

CREATE POLICY "Anon delete client files"
  ON storage.objects
  FOR DELETE
  TO anon
  USING (bucket_id = 'client-files');
