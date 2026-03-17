-- Allow anonymous users to submit access requests from the login page
GRANT INSERT ON account_requests TO anon;

DROP POLICY IF EXISTS "account_requests_insert_anon" ON account_requests;
CREATE POLICY "account_requests_insert_anon" ON account_requests
  FOR INSERT TO anon WITH CHECK (true);
