-- ============================================================
-- SECURITY AUDIT FIX: RLS Policies
-- Fixes privilege escalation, removes anon access, adds proper auth checks
-- ============================================================

-- ============================================================
-- 1. PROFILES — Block privilege escalation
-- ============================================================
-- Users must NOT be able to change: role, is_active, is_suspended, totp_secret, totp_enrolled
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
    AND is_active = (SELECT p.is_active FROM profiles p WHERE p.id = auth.uid())
    AND is_suspended = (SELECT p.is_suspended FROM profiles p WHERE p.id = auth.uid())
    AND suspended_until IS NOT DISTINCT FROM (SELECT p.suspended_until FROM profiles p WHERE p.id = auth.uid())
    AND suspension_reason IS NOT DISTINCT FROM (SELECT p.suspension_reason FROM profiles p WHERE p.id = auth.uid())
    AND COALESCE(totp_secret, '') = COALESCE((SELECT p.totp_secret FROM profiles p WHERE p.id = auth.uid()), '')
    AND COALESCE(totp_enrolled, false) = COALESCE((SELECT p.totp_enrolled FROM profiles p WHERE p.id = auth.uid()), false)
  );

-- Remove anon INSERT on profiles (only admin or auth.uid() = id)
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- 2. CLIENT TABLES — Remove anon access, add authenticated + owner/admin
-- ============================================================

-- client_credit_notes
DROP POLICY IF EXISTS "Anon can read client_credit_notes" ON client_credit_notes;
DROP POLICY IF EXISTS "Anon can insert client_credit_notes" ON client_credit_notes;
DROP POLICY IF EXISTS "Anon can update client_credit_notes" ON client_credit_notes;
DROP POLICY IF EXISTS "Anon can delete client_credit_notes" ON client_credit_notes;

CREATE POLICY "auth_select_client_credit_notes" ON client_credit_notes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_client_credit_notes" ON client_credit_notes
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_client_credit_notes" ON client_credit_notes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_delete_client_credit_notes" ON client_credit_notes
  FOR DELETE TO authenticated USING (is_admin());

-- client_disputes
DROP POLICY IF EXISTS "Anon can read client_disputes" ON client_disputes;
DROP POLICY IF EXISTS "Anon can insert client_disputes" ON client_disputes;
DROP POLICY IF EXISTS "Anon can update client_disputes" ON client_disputes;
DROP POLICY IF EXISTS "Anon can delete client_disputes" ON client_disputes;

CREATE POLICY "auth_select_client_disputes" ON client_disputes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_client_disputes" ON client_disputes
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_client_disputes" ON client_disputes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_delete_client_disputes" ON client_disputes
  FOR DELETE TO authenticated USING (is_admin());

-- client_notes
DROP POLICY IF EXISTS "Anon can read client_notes" ON client_notes;
DROP POLICY IF EXISTS "Anon can insert client_notes" ON client_notes;
DROP POLICY IF EXISTS "Anon can update client_notes" ON client_notes;
DROP POLICY IF EXISTS "Anon can delete client_notes" ON client_notes;

CREATE POLICY "auth_select_client_notes" ON client_notes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_client_notes" ON client_notes
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_client_notes" ON client_notes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_delete_client_notes" ON client_notes
  FOR DELETE TO authenticated USING (is_admin());

-- client_pickup_tickets
DROP POLICY IF EXISTS "Anon can read client_pickup_tickets" ON client_pickup_tickets;
DROP POLICY IF EXISTS "Anon can insert client_pickup_tickets" ON client_pickup_tickets;
DROP POLICY IF EXISTS "Anon can update client_pickup_tickets" ON client_pickup_tickets;
DROP POLICY IF EXISTS "Anon can delete client_pickup_tickets" ON client_pickup_tickets;

CREATE POLICY "auth_select_client_pickup_tickets" ON client_pickup_tickets
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_client_pickup_tickets" ON client_pickup_tickets
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_client_pickup_tickets" ON client_pickup_tickets
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_delete_client_pickup_tickets" ON client_pickup_tickets
  FOR DELETE TO authenticated USING (is_admin());

-- dispute_messages
DROP POLICY IF EXISTS "Anon can read dispute_messages" ON dispute_messages;
DROP POLICY IF EXISTS "Anon can insert dispute_messages" ON dispute_messages;
DROP POLICY IF EXISTS "Anon can update dispute_messages" ON dispute_messages;
DROP POLICY IF EXISTS "Anon can delete dispute_messages" ON dispute_messages;

CREATE POLICY "auth_select_dispute_messages" ON dispute_messages
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_dispute_messages" ON dispute_messages
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_dispute_messages" ON dispute_messages
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_delete_dispute_messages" ON dispute_messages
  FOR DELETE TO authenticated USING (is_admin());

-- ============================================================
-- 3. INVENTORY TABLES — Remove anon access
-- ============================================================

-- physical_inventories
DROP POLICY IF EXISTS "anon_select_physical_inventories" ON physical_inventories;
DROP POLICY IF EXISTS "anon_insert_physical_inventories" ON physical_inventories;
DROP POLICY IF EXISTS "anon_update_physical_inventories" ON physical_inventories;

CREATE POLICY "auth_select_physical_inventories" ON physical_inventories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_physical_inventories" ON physical_inventories
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_physical_inventories" ON physical_inventories
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- stock_reception_counter
DROP POLICY IF EXISTS "anon_select_reception_counter" ON stock_reception_counter;
DROP POLICY IF EXISTS "anon_insert_reception_counter" ON stock_reception_counter;
DROP POLICY IF EXISTS "anon_update_reception_counter" ON stock_reception_counter;

CREATE POLICY "auth_select_reception_counter" ON stock_reception_counter
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_reception_counter" ON stock_reception_counter
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_reception_counter" ON stock_reception_counter
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- stock_reception_items
DROP POLICY IF EXISTS "anon_select_stock_reception_items" ON stock_reception_items;
DROP POLICY IF EXISTS "anon_insert_stock_reception_items" ON stock_reception_items;
DROP POLICY IF EXISTS "anon_update_stock_reception_items" ON stock_reception_items;

CREATE POLICY "auth_select_stock_reception_items" ON stock_reception_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_stock_reception_items" ON stock_reception_items
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_stock_reception_items" ON stock_reception_items
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- stock_receptions
DROP POLICY IF EXISTS "anon_select_stock_receptions" ON stock_receptions;
DROP POLICY IF EXISTS "anon_insert_stock_receptions" ON stock_receptions;
DROP POLICY IF EXISTS "anon_update_stock_receptions" ON stock_receptions;

CREATE POLICY "auth_select_stock_receptions" ON stock_receptions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_stock_receptions" ON stock_receptions
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_stock_receptions" ON stock_receptions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 4. BILLING TABLES — Remove anon access
-- ============================================================

-- sci_email_log
DROP POLICY IF EXISTS "Anon can select sci_email_log" ON sci_email_log;
DROP POLICY IF EXISTS "Anon can insert sci_email_log" ON sci_email_log;

CREATE POLICY "auth_select_sci_email_log" ON sci_email_log
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_sci_email_log" ON sci_email_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- invoice_payments
DROP POLICY IF EXISTS "Anon can read invoice_payments" ON invoice_payments;
DROP POLICY IF EXISTS "Anon can insert invoice_payments" ON invoice_payments;
DROP POLICY IF EXISTS "Anon can update invoice_payments" ON invoice_payments;
DROP POLICY IF EXISTS "Anon can delete invoice_payments" ON invoice_payments;

CREATE POLICY "auth_select_invoice_payments" ON invoice_payments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_invoice_payments" ON invoice_payments
  FOR INSERT TO authenticated WITH CHECK (document_id IS NOT NULL);
CREATE POLICY "auth_update_invoice_payments" ON invoice_payments
  FOR UPDATE TO authenticated USING (true) WITH CHECK (document_id IS NOT NULL);
CREATE POLICY "admin_delete_invoice_payments" ON invoice_payments
  FOR DELETE TO authenticated USING (is_admin());

-- ============================================================
-- 5. TEAM TABLES — Remove anon access, add authenticated
-- ============================================================

-- teams
DROP POLICY IF EXISTS "Anon can select teams" ON teams;
DROP POLICY IF EXISTS "Anon can insert teams" ON teams;
DROP POLICY IF EXISTS "Anon can update teams" ON teams;
DROP POLICY IF EXISTS "Anon can delete teams" ON teams;

CREATE POLICY "auth_select_teams" ON teams
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_teams" ON teams
  FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admin_update_teams" ON teams
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_delete_teams" ON teams
  FOR DELETE TO authenticated USING (is_admin());

-- team_members
DROP POLICY IF EXISTS "Anon can select members" ON team_members;
DROP POLICY IF EXISTS "Anon can insert members" ON team_members;
DROP POLICY IF EXISTS "Anon can update members" ON team_members;
DROP POLICY IF EXISTS "Anon can delete members" ON team_members;

CREATE POLICY "auth_select_team_members" ON team_members
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_team_members" ON team_members
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_team_members" ON team_members
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_delete_team_members" ON team_members
  FOR DELETE TO authenticated USING (is_admin());

-- team_messages
DROP POLICY IF EXISTS "Anon can select messages" ON team_messages;
DROP POLICY IF EXISTS "Anon can insert messages" ON team_messages;
DROP POLICY IF EXISTS "Anon can update messages" ON team_messages;
DROP POLICY IF EXISTS "Anon can delete messages" ON team_messages;

CREATE POLICY "auth_select_team_messages" ON team_messages
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_team_messages" ON team_messages
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_team_messages" ON team_messages
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_delete_team_messages" ON team_messages
  FOR DELETE TO authenticated USING (is_admin());

-- team_message_reactions
DROP POLICY IF EXISTS "Anon can select reactions" ON team_message_reactions;
DROP POLICY IF EXISTS "Anon can insert reactions" ON team_message_reactions;
DROP POLICY IF EXISTS "Anon can update reactions" ON team_message_reactions;
DROP POLICY IF EXISTS "Anon can delete reactions" ON team_message_reactions;

CREATE POLICY "auth_select_team_reactions" ON team_message_reactions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_team_reactions" ON team_message_reactions
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_team_reactions" ON team_message_reactions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_delete_team_reactions" ON team_message_reactions
  FOR DELETE TO authenticated USING (is_admin());

-- team_projects
DROP POLICY IF EXISTS "Anon can select projects" ON team_projects;
DROP POLICY IF EXISTS "Anon can insert projects" ON team_projects;
DROP POLICY IF EXISTS "Anon can update projects" ON team_projects;
DROP POLICY IF EXISTS "Anon can delete projects" ON team_projects;

CREATE POLICY "auth_select_team_projects" ON team_projects
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_team_projects" ON team_projects
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_team_projects" ON team_projects
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_delete_team_projects" ON team_projects
  FOR DELETE TO authenticated USING (is_admin());

-- team_tasks
DROP POLICY IF EXISTS "Anon can select tasks" ON team_tasks;
DROP POLICY IF EXISTS "Anon can insert tasks" ON team_tasks;
DROP POLICY IF EXISTS "Anon can update tasks" ON team_tasks;
DROP POLICY IF EXISTS "Anon can delete tasks" ON team_tasks;

CREATE POLICY "auth_select_team_tasks" ON team_tasks
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_team_tasks" ON team_tasks
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_team_tasks" ON team_tasks
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_delete_team_tasks" ON team_tasks
  FOR DELETE TO authenticated USING (is_admin());

-- team_goals
DROP POLICY IF EXISTS "Anon can select goals" ON team_goals;
DROP POLICY IF EXISTS "Anon can insert goals" ON team_goals;
DROP POLICY IF EXISTS "Anon can update goals" ON team_goals;
DROP POLICY IF EXISTS "Anon can delete goals" ON team_goals;

CREATE POLICY "auth_select_team_goals" ON team_goals
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_team_goals" ON team_goals
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_team_goals" ON team_goals
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_delete_team_goals" ON team_goals
  FOR DELETE TO authenticated USING (is_admin());

-- team_commission_records
DROP POLICY IF EXISTS "Anon can select commissions" ON team_commission_records;
DROP POLICY IF EXISTS "Anon can insert commissions" ON team_commission_records;
DROP POLICY IF EXISTS "Anon can update commissions" ON team_commission_records;
DROP POLICY IF EXISTS "Anon can delete commissions" ON team_commission_records;

CREATE POLICY "auth_select_team_commissions" ON team_commission_records
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_team_commissions" ON team_commission_records
  FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admin_update_team_commissions" ON team_commission_records
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_delete_team_commissions" ON team_commission_records
  FOR DELETE TO authenticated USING (is_admin());

-- team_join_requests
DROP POLICY IF EXISTS "Anon can select requests" ON team_join_requests;
DROP POLICY IF EXISTS "Anon can insert requests" ON team_join_requests;
DROP POLICY IF EXISTS "Anon can update requests" ON team_join_requests;
DROP POLICY IF EXISTS "Anon can delete requests" ON team_join_requests;

CREATE POLICY "auth_select_team_join_requests" ON team_join_requests
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_team_join_requests" ON team_join_requests
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_update_team_join_requests" ON team_join_requests
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_delete_team_join_requests" ON team_join_requests
  FOR DELETE TO authenticated USING (is_admin());

-- ============================================================
-- 6. CRM FILES — Remove anon access
-- ============================================================

DROP POLICY IF EXISTS "Anyone can select crm_files" ON crm_files;
DROP POLICY IF EXISTS "Anyone can insert crm_files" ON crm_files;
DROP POLICY IF EXISTS "Anyone can update crm_files" ON crm_files;
DROP POLICY IF EXISTS "Anyone can delete crm_files" ON crm_files;

CREATE POLICY "auth_select_crm_files" ON crm_files
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_crm_files" ON crm_files
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_crm_files" ON crm_files
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_delete_crm_files" ON crm_files
  FOR DELETE TO authenticated USING (is_admin());

-- ============================================================
-- 7. CHANGE LOGS — Remove anon, keep authenticated
-- ============================================================

DROP POLICY IF EXISTS "Anyone can insert change logs" ON change_logs;
DROP POLICY IF EXISTS "Anyone can read change logs" ON change_logs;

CREATE POLICY "auth_select_change_logs" ON change_logs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_change_logs" ON change_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- 8. ACCOUNT REQUESTS — Remove anon INSERT (only authenticated can request)
-- ============================================================

DROP POLICY IF EXISTS "account_requests_insert_anyone" ON account_requests;
CREATE POLICY "account_requests_insert_authenticated" ON account_requests
  FOR INSERT TO authenticated WITH CHECK (true);
-- Note: anon users who want to create an account should use supabase auth signup first,
-- then submit an account request as authenticated.
-- If you need anon account requests, keep the old policy instead.

-- ============================================================
-- 9. PRICELISTS — Add RLS policies (currently NONE exist)
-- ============================================================

-- Enable RLS if not already
ALTER TABLE IF EXISTS pricelists ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pricelist_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_pricelists" ON pricelists
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_pricelists" ON pricelists
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_pricelists" ON pricelists
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_delete_pricelists" ON pricelists
  FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "auth_select_pricelist_lines" ON pricelist_lines
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_pricelist_lines" ON pricelist_lines
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_pricelist_lines" ON pricelist_lines
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_pricelist_lines" ON pricelist_lines
  FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 10. CONVERSATIONS — Tighten INSERT (require auth.uid() as participant)
-- ============================================================

DROP POLICY IF EXISTS "cp_insert" ON conversation_participants;
CREATE POLICY "cp_insert" ON conversation_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = conversation_participants.conversation_id
      AND cp2.user_id = (SELECT auth.uid())
    )
    OR is_admin()
  );

-- ============================================================
-- DONE — All anon/public policies with 'true' condition removed
-- ============================================================
