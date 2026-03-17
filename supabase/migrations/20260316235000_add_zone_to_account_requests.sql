-- Add zone columns to account_requests for auto-filling CreateUserModal
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='account_requests' AND column_name='country') THEN
    ALTER TABLE account_requests ADD COLUMN country text DEFAULT 'CA';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='account_requests' AND column_name='province') THEN
    ALTER TABLE account_requests ADD COLUMN province text DEFAULT 'QC';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='account_requests' AND column_name='city') THEN
    ALTER TABLE account_requests ADD COLUMN city text;
  END IF;
END $$;
