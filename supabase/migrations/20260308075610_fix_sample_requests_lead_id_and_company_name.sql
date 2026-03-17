/*
  # Fix sample_requests schema for CRM lead compatibility

  1. Modified Columns
    - `lead_id`: Changed from uuid to text to match CRM lead IDs (e.g. "l1", "l2")
  2. New Columns
    - `lead_company_name` (text): Stores the company name for display in admin views
  3. Important Notes
    - No data loss: column type change is safe as the table has no existing rows
    - lead_id has no foreign key constraint, so the type change is safe
*/

ALTER TABLE sample_requests
  ALTER COLUMN lead_id TYPE text USING lead_id::text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sample_requests' AND column_name = 'lead_company_name'
  ) THEN
    ALTER TABLE sample_requests ADD COLUMN lead_company_name text DEFAULT '';
  END IF;
END $$;
