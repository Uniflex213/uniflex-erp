/*
  # Add Pricelist PDF to Clients

  ## Summary
  Adds a `pricelist_pdf_url` column to the clients table so each client
  can have a custom price list PDF attached directly to their profile.
  Also creates the `client-files` storage bucket for secure file uploads.

  ## Changes

  ### clients table
  - `pricelist_pdf_url` (text) — public URL of the client's price list PDF

  ### Storage
  - New bucket `client-files`: public, accepts PDFs up to 20 MB
  - Public read policy (sales agents can view the price list without auth)
  - Authenticated upload/update/delete policies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'pricelist_pdf_url'
  ) THEN
    ALTER TABLE clients ADD COLUMN pricelist_pdf_url text NOT NULL DEFAULT '';
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('client-files', 'client-files', true, 20971520, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public read client files'
  ) THEN
    CREATE POLICY "Public read client files"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'client-files');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated upload client files'
  ) THEN
    CREATE POLICY "Authenticated upload client files"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'client-files');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated update client files'
  ) THEN
    CREATE POLICY "Authenticated update client files"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'client-files');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated delete client files'
  ) THEN
    CREATE POLICY "Authenticated delete client files"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'client-files');
  END IF;
END $$;
