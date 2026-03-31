-- ============================================================
-- STEP 1: HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION is_same_team(record_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles AS me
    JOIN profiles AS owner ON owner.team_id = me.team_id
    WHERE me.id = (SELECT auth.uid())
    AND owner.id = record_owner_id
    AND me.team_id IS NOT NULL
    AND owner.team_id IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION my_store_code()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT store_code FROM profiles WHERE id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION my_team_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM profiles WHERE id = (SELECT auth.uid());
$$;

-- ============================================================
-- STEP 2: CRM POLICIES
-- ============================================================

DROP POLICY IF EXISTS "crm_leads_select" ON crm_leads;
DROP POLICY IF EXISTS "crm_leads_insert" ON crm_leads;
DROP POLICY IF EXISTS "crm_leads_update" ON crm_leads;
DROP POLICY IF EXISTS "crm_leads_delete" ON crm_leads;

CREATE POLICY "crm_leads_select" ON crm_leads FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR is_same_team(owner_id) OR is_admin());
CREATE POLICY "crm_leads_insert" ON crm_leads FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()) OR is_admin());
CREATE POLICY "crm_leads_update" ON crm_leads FOR UPDATE TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR is_admin())
  WITH CHECK (owner_id = (SELECT auth.uid()) OR is_admin());
CREATE POLICY "crm_leads_delete" ON crm_leads FOR DELETE TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR is_admin());

-- CRM_ACTIVITIES
DROP POLICY IF EXISTS "crm_activities_select" ON crm_activities;
DROP POLICY IF EXISTS "crm_activities_insert" ON crm_activities;
DROP POLICY IF EXISTS "crm_activities_update" ON crm_activities;
DROP POLICY IF EXISTS "crm_activities_delete" ON crm_activities;

CREATE POLICY "crm_activities_select" ON crm_activities FOR SELECT TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM crm_leads WHERE crm_leads.id = crm_activities.lead_id AND (crm_leads.owner_id = (SELECT auth.uid()) OR is_same_team(crm_leads.owner_id))));
CREATE POLICY "crm_activities_insert" ON crm_activities FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR EXISTS (SELECT 1 FROM crm_leads WHERE crm_leads.id = crm_activities.lead_id AND crm_leads.owner_id = (SELECT auth.uid())));
CREATE POLICY "crm_activities_update" ON crm_activities FOR UPDATE TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM crm_leads WHERE crm_leads.id = crm_activities.lead_id AND crm_leads.owner_id = (SELECT auth.uid())));
CREATE POLICY "crm_activities_delete" ON crm_activities FOR DELETE TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM crm_leads WHERE crm_leads.id = crm_activities.lead_id AND crm_leads.owner_id = (SELECT auth.uid())));

-- CRM_REMINDERS
DROP POLICY IF EXISTS "crm_reminders_select" ON crm_reminders;
DROP POLICY IF EXISTS "crm_reminders_insert" ON crm_reminders;
DROP POLICY IF EXISTS "crm_reminders_update" ON crm_reminders;
DROP POLICY IF EXISTS "crm_reminders_delete" ON crm_reminders;

CREATE POLICY "crm_reminders_select" ON crm_reminders FOR SELECT TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM crm_leads WHERE crm_leads.id = crm_reminders.lead_id AND (crm_leads.owner_id = (SELECT auth.uid()) OR is_same_team(crm_leads.owner_id))));
CREATE POLICY "crm_reminders_insert" ON crm_reminders FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR EXISTS (SELECT 1 FROM crm_leads WHERE crm_leads.id = crm_reminders.lead_id AND crm_leads.owner_id = (SELECT auth.uid())));
CREATE POLICY "crm_reminders_update" ON crm_reminders FOR UPDATE TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM crm_leads WHERE crm_leads.id = crm_reminders.lead_id AND crm_leads.owner_id = (SELECT auth.uid())));
CREATE POLICY "crm_reminders_delete" ON crm_reminders FOR DELETE TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM crm_leads WHERE crm_leads.id = crm_reminders.lead_id AND crm_leads.owner_id = (SELECT auth.uid())));

-- CRM_FILES
DROP POLICY IF EXISTS "crm_files_select" ON crm_files;
DROP POLICY IF EXISTS "crm_files_insert" ON crm_files;
DROP POLICY IF EXISTS "crm_files_update" ON crm_files;
DROP POLICY IF EXISTS "crm_files_delete" ON crm_files;

CREATE POLICY "crm_files_select" ON crm_files FOR SELECT TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM crm_leads WHERE crm_leads.id = crm_files.lead_id AND (crm_leads.owner_id = (SELECT auth.uid()) OR is_same_team(crm_leads.owner_id))));
CREATE POLICY "crm_files_insert" ON crm_files FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR EXISTS (SELECT 1 FROM crm_leads WHERE crm_leads.id = crm_files.lead_id AND crm_leads.owner_id = (SELECT auth.uid())));
CREATE POLICY "crm_files_update" ON crm_files FOR UPDATE TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM crm_leads WHERE crm_leads.id = crm_files.lead_id AND crm_leads.owner_id = (SELECT auth.uid())));
CREATE POLICY "crm_files_delete" ON crm_files FOR DELETE TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM crm_leads WHERE crm_leads.id = crm_files.lead_id AND crm_leads.owner_id = (SELECT auth.uid())));

-- ============================================================
-- STEP 3: CLIENT POLICIES
-- ============================================================

DROP POLICY IF EXISTS "clients_select" ON clients;
DROP POLICY IF EXISTS "clients_insert" ON clients;
DROP POLICY IF EXISTS "clients_update" ON clients;
DROP POLICY IF EXISTS "clients_delete" ON clients;

CREATE POLICY "clients_select" ON clients FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR is_same_team(owner_id) OR is_admin());
CREATE POLICY "clients_insert" ON clients FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()) OR is_admin());
CREATE POLICY "clients_update" ON clients FOR UPDATE TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR is_admin())
  WITH CHECK (owner_id = (SELECT auth.uid()) OR is_admin());
CREATE POLICY "clients_delete" ON clients FOR DELETE TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR is_admin());

-- CLIENT_NOTES
DROP POLICY IF EXISTS "client_notes_select" ON client_notes;
DROP POLICY IF EXISTS "auth_select_client_notes" ON client_notes;
DROP POLICY IF EXISTS "client_notes_insert" ON client_notes;
DROP POLICY IF EXISTS "auth_insert_client_notes" ON client_notes;
DROP POLICY IF EXISTS "client_notes_update" ON client_notes;
DROP POLICY IF EXISTS "auth_update_client_notes" ON client_notes;
DROP POLICY IF EXISTS "client_notes_delete" ON client_notes;
DROP POLICY IF EXISTS "admin_delete_client_notes" ON client_notes;

ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_notes_select" ON client_notes FOR SELECT TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM clients WHERE clients.id = client_notes.client_id AND (clients.owner_id = (SELECT auth.uid()) OR is_same_team(clients.owner_id))));
CREATE POLICY "client_notes_insert" ON client_notes FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR EXISTS (SELECT 1 FROM clients WHERE clients.id = client_notes.client_id AND clients.owner_id = (SELECT auth.uid())));
CREATE POLICY "client_notes_update" ON client_notes FOR UPDATE TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM clients WHERE clients.id = client_notes.client_id AND clients.owner_id = (SELECT auth.uid())));
CREATE POLICY "client_notes_delete" ON client_notes FOR DELETE TO authenticated
  USING (is_admin());

-- CLIENT_CREDIT_NOTES
DROP POLICY IF EXISTS "client_credit_notes_select" ON client_credit_notes;
DROP POLICY IF EXISTS "auth_select_client_credit_notes" ON client_credit_notes;
DROP POLICY IF EXISTS "client_credit_notes_insert" ON client_credit_notes;
DROP POLICY IF EXISTS "auth_insert_client_credit_notes" ON client_credit_notes;
DROP POLICY IF EXISTS "client_credit_notes_update" ON client_credit_notes;
DROP POLICY IF EXISTS "auth_update_client_credit_notes" ON client_credit_notes;
DROP POLICY IF EXISTS "client_credit_notes_delete" ON client_credit_notes;
DROP POLICY IF EXISTS "admin_delete_client_credit_notes" ON client_credit_notes;

ALTER TABLE client_credit_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_credit_notes_select" ON client_credit_notes FOR SELECT TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM clients WHERE clients.id = client_credit_notes.client_id AND (clients.owner_id = (SELECT auth.uid()) OR is_same_team(clients.owner_id))));
CREATE POLICY "client_credit_notes_insert" ON client_credit_notes FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR EXISTS (SELECT 1 FROM clients WHERE clients.id = client_credit_notes.client_id AND clients.owner_id = (SELECT auth.uid())));
CREATE POLICY "client_credit_notes_update" ON client_credit_notes FOR UPDATE TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM clients WHERE clients.id = client_credit_notes.client_id AND clients.owner_id = (SELECT auth.uid())));
CREATE POLICY "client_credit_notes_delete" ON client_credit_notes FOR DELETE TO authenticated
  USING (is_admin());

-- CLIENT_DISPUTES
DROP POLICY IF EXISTS "client_disputes_select" ON client_disputes;
DROP POLICY IF EXISTS "auth_select_client_disputes" ON client_disputes;
DROP POLICY IF EXISTS "client_disputes_insert" ON client_disputes;
DROP POLICY IF EXISTS "auth_insert_client_disputes" ON client_disputes;
DROP POLICY IF EXISTS "client_disputes_update" ON client_disputes;
DROP POLICY IF EXISTS "auth_update_client_disputes" ON client_disputes;
DROP POLICY IF EXISTS "client_disputes_delete" ON client_disputes;
DROP POLICY IF EXISTS "admin_delete_client_disputes" ON client_disputes;

ALTER TABLE client_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_disputes_select" ON client_disputes FOR SELECT TO authenticated
  USING (is_admin() OR is_store_user() OR EXISTS (SELECT 1 FROM clients WHERE clients.id = client_disputes.client_id AND (clients.owner_id = (SELECT auth.uid()) OR is_same_team(clients.owner_id))));
CREATE POLICY "client_disputes_insert" ON client_disputes FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR is_store_user() OR EXISTS (SELECT 1 FROM clients WHERE clients.id = client_disputes.client_id AND clients.owner_id = (SELECT auth.uid())));
CREATE POLICY "client_disputes_update" ON client_disputes FOR UPDATE TO authenticated
  USING (is_admin() OR is_store_user() OR EXISTS (SELECT 1 FROM clients WHERE clients.id = client_disputes.client_id AND clients.owner_id = (SELECT auth.uid())));
CREATE POLICY "client_disputes_delete" ON client_disputes FOR DELETE TO authenticated
  USING (is_admin());

-- DISPUTE_MESSAGES
DROP POLICY IF EXISTS "dispute_messages_select" ON dispute_messages;
DROP POLICY IF EXISTS "auth_select_dispute_messages" ON dispute_messages;
DROP POLICY IF EXISTS "dispute_messages_insert" ON dispute_messages;
DROP POLICY IF EXISTS "auth_insert_dispute_messages" ON dispute_messages;
DROP POLICY IF EXISTS "dispute_messages_update" ON dispute_messages;
DROP POLICY IF EXISTS "auth_update_dispute_messages" ON dispute_messages;
DROP POLICY IF EXISTS "dispute_messages_delete" ON dispute_messages;
DROP POLICY IF EXISTS "admin_delete_dispute_messages" ON dispute_messages;

ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dispute_messages_select" ON dispute_messages FOR SELECT TO authenticated
  USING (is_admin() OR is_store_user() OR EXISTS (SELECT 1 FROM client_disputes JOIN clients ON clients.id = client_disputes.client_id WHERE client_disputes.id = dispute_messages.dispute_id AND (clients.owner_id = (SELECT auth.uid()) OR is_same_team(clients.owner_id))));
CREATE POLICY "dispute_messages_insert" ON dispute_messages FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR is_store_user() OR EXISTS (SELECT 1 FROM client_disputes JOIN clients ON clients.id = client_disputes.client_id WHERE client_disputes.id = dispute_messages.dispute_id AND (clients.owner_id = (SELECT auth.uid()) OR is_same_team(clients.owner_id))));
CREATE POLICY "dispute_messages_delete" ON dispute_messages FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================
-- STEP 4: ORDERS & SAMPLES POLICIES
-- ============================================================

DROP POLICY IF EXISTS "orders_select" ON orders;
DROP POLICY IF EXISTS "orders_insert" ON orders;
DROP POLICY IF EXISTS "orders_update" ON orders;
DROP POLICY IF EXISTS "orders_delete" ON orders;

CREATE POLICY "orders_select" ON orders FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR is_same_team(owner_id) OR is_admin() OR is_manufacturer());
CREATE POLICY "orders_insert" ON orders FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()) OR is_admin());
CREATE POLICY "orders_update" ON orders FOR UPDATE TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR is_admin() OR is_manufacturer());
CREATE POLICY "orders_delete" ON orders FOR DELETE TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR is_admin());

-- SAMPLE_REQUESTS
DROP POLICY IF EXISTS "samples_select" ON sample_requests;
DROP POLICY IF EXISTS "sample_requests_select" ON sample_requests;
DROP POLICY IF EXISTS "samples_insert" ON sample_requests;
DROP POLICY IF EXISTS "sample_requests_insert" ON sample_requests;
DROP POLICY IF EXISTS "samples_update" ON sample_requests;
DROP POLICY IF EXISTS "sample_requests_update" ON sample_requests;
DROP POLICY IF EXISTS "samples_delete" ON sample_requests;
DROP POLICY IF EXISTS "sample_requests_delete" ON sample_requests;

CREATE POLICY "sample_requests_select" ON sample_requests FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR is_same_team(owner_id) OR is_admin() OR is_manufacturer());
CREATE POLICY "sample_requests_insert" ON sample_requests FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()) OR is_admin());
CREATE POLICY "sample_requests_update" ON sample_requests FOR UPDATE TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR is_admin() OR is_manufacturer());
CREATE POLICY "sample_requests_delete" ON sample_requests FOR DELETE TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR is_admin());

-- SAMPLE_ITEMS
DROP POLICY IF EXISTS "sample_items_select" ON sample_items;
DROP POLICY IF EXISTS "sample_items_insert" ON sample_items;
DROP POLICY IF EXISTS "sample_items_update" ON sample_items;
DROP POLICY IF EXISTS "sample_items_delete" ON sample_items;

CREATE POLICY "sample_items_select" ON sample_items FOR SELECT TO authenticated
  USING (is_admin() OR is_manufacturer() OR EXISTS (SELECT 1 FROM sample_requests WHERE sample_requests.id = sample_items.sample_request_id AND (sample_requests.owner_id = (SELECT auth.uid()) OR is_same_team(sample_requests.owner_id))));
CREATE POLICY "sample_items_insert" ON sample_items FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR EXISTS (SELECT 1 FROM sample_requests WHERE sample_requests.id = sample_items.sample_request_id AND sample_requests.owner_id = (SELECT auth.uid())));
CREATE POLICY "sample_items_update" ON sample_items FOR UPDATE TO authenticated
  USING (is_admin() OR is_manufacturer() OR EXISTS (SELECT 1 FROM sample_requests WHERE sample_requests.id = sample_items.sample_request_id AND sample_requests.owner_id = (SELECT auth.uid())));
CREATE POLICY "sample_items_delete" ON sample_items FOR DELETE TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM sample_requests WHERE sample_requests.id = sample_items.sample_request_id AND sample_requests.owner_id = (SELECT auth.uid())));

-- SAMPLE_ACTIVITIES
DROP POLICY IF EXISTS "sample_activities_select" ON sample_activities;
DROP POLICY IF EXISTS "sample_activities_insert" ON sample_activities;
DROP POLICY IF EXISTS "sample_activities_update" ON sample_activities;
DROP POLICY IF EXISTS "sample_activities_delete" ON sample_activities;

CREATE POLICY "sample_activities_select" ON sample_activities FOR SELECT TO authenticated
  USING (is_admin() OR is_manufacturer() OR EXISTS (SELECT 1 FROM sample_requests WHERE sample_requests.id = sample_activities.sample_request_id AND (sample_requests.owner_id = (SELECT auth.uid()) OR is_same_team(sample_requests.owner_id))));
CREATE POLICY "sample_activities_insert" ON sample_activities FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR is_manufacturer() OR EXISTS (SELECT 1 FROM sample_requests WHERE sample_requests.id = sample_activities.sample_request_id AND sample_requests.owner_id = (SELECT auth.uid())));
CREATE POLICY "sample_activities_delete" ON sample_activities FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================
-- STEP 5: PICKUP (store_code isolation)
-- ============================================================

DROP POLICY IF EXISTS "pickup_select" ON pickup_tickets;
DROP POLICY IF EXISTS "pickup_insert" ON pickup_tickets;
DROP POLICY IF EXISTS "pickup_update" ON pickup_tickets;
DROP POLICY IF EXISTS "pickup_delete" ON pickup_tickets;

CREATE POLICY "pickup_select" ON pickup_tickets FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR is_same_team(owner_id) OR is_admin() OR is_manufacturer() OR (is_store_user() AND store_code = my_store_code()));
CREATE POLICY "pickup_insert" ON pickup_tickets FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()) OR is_admin() OR (is_store_user() AND store_code = my_store_code()));
CREATE POLICY "pickup_update" ON pickup_tickets FOR UPDATE TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR is_admin() OR (is_store_user() AND store_code = my_store_code()));
CREATE POLICY "pickup_delete" ON pickup_tickets FOR DELETE TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR is_admin());

-- PICKUP_TICKET_ITEMS
DROP POLICY IF EXISTS "pickup_items_select" ON pickup_ticket_items;
DROP POLICY IF EXISTS "pickup_items_insert" ON pickup_ticket_items;
DROP POLICY IF EXISTS "pickup_items_update" ON pickup_ticket_items;
DROP POLICY IF EXISTS "pickup_items_delete" ON pickup_ticket_items;

CREATE POLICY "pickup_items_select" ON pickup_ticket_items FOR SELECT TO authenticated
  USING (is_admin() OR is_manufacturer() OR EXISTS (SELECT 1 FROM pickup_tickets WHERE pickup_tickets.id = pickup_ticket_items.ticket_id AND (pickup_tickets.owner_id = (SELECT auth.uid()) OR is_same_team(pickup_tickets.owner_id) OR (is_store_user() AND pickup_tickets.store_code = my_store_code()))));
CREATE POLICY "pickup_items_insert" ON pickup_ticket_items FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR EXISTS (SELECT 1 FROM pickup_tickets WHERE pickup_tickets.id = pickup_ticket_items.ticket_id AND (pickup_tickets.owner_id = (SELECT auth.uid()) OR (is_store_user() AND pickup_tickets.store_code = my_store_code()))));
CREATE POLICY "pickup_items_update" ON pickup_ticket_items FOR UPDATE TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM pickup_tickets WHERE pickup_tickets.id = pickup_ticket_items.ticket_id AND (pickup_tickets.owner_id = (SELECT auth.uid()) OR (is_store_user() AND pickup_tickets.store_code = my_store_code()))));
CREATE POLICY "pickup_items_delete" ON pickup_ticket_items FOR DELETE TO authenticated
  USING (is_admin());

-- ============================================================
-- STEP 6: TEAM POLICIES
-- ============================================================

-- TEAM_MESSAGES
DROP POLICY IF EXISTS "auth_select_team_messages" ON team_messages;
DROP POLICY IF EXISTS "auth_insert_team_messages" ON team_messages;
DROP POLICY IF EXISTS "auth_update_team_messages" ON team_messages;
DROP POLICY IF EXISTS "admin_delete_team_messages" ON team_messages;
DROP POLICY IF EXISTS "team_messages_select" ON team_messages;
DROP POLICY IF EXISTS "team_messages_insert" ON team_messages;
DROP POLICY IF EXISTS "team_messages_update" ON team_messages;
DROP POLICY IF EXISTS "team_messages_delete" ON team_messages;

CREATE POLICY "team_messages_select" ON team_messages FOR SELECT TO authenticated
  USING (is_admin() OR team_id = my_team_id());
CREATE POLICY "team_messages_insert" ON team_messages FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR team_id = my_team_id());
CREATE POLICY "team_messages_update" ON team_messages FOR UPDATE TO authenticated
  USING (is_admin() OR team_id = my_team_id());
CREATE POLICY "team_messages_delete" ON team_messages FOR DELETE TO authenticated
  USING (is_admin());

-- TEAM_MESSAGE_REACTIONS
DROP POLICY IF EXISTS "auth_select_team_reactions" ON team_message_reactions;
DROP POLICY IF EXISTS "auth_insert_team_reactions" ON team_message_reactions;
DROP POLICY IF EXISTS "auth_update_team_reactions" ON team_message_reactions;
DROP POLICY IF EXISTS "admin_delete_team_reactions" ON team_message_reactions;
DROP POLICY IF EXISTS "team_reactions_select" ON team_message_reactions;
DROP POLICY IF EXISTS "team_reactions_insert" ON team_message_reactions;
DROP POLICY IF EXISTS "team_reactions_delete" ON team_message_reactions;

CREATE POLICY "team_reactions_select" ON team_message_reactions FOR SELECT TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM team_messages WHERE team_messages.id = team_message_reactions.message_id AND team_messages.team_id = my_team_id()));
CREATE POLICY "team_reactions_insert" ON team_message_reactions FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR EXISTS (SELECT 1 FROM team_messages WHERE team_messages.id = team_message_reactions.message_id AND team_messages.team_id = my_team_id()));
CREATE POLICY "team_reactions_delete" ON team_message_reactions FOR DELETE TO authenticated
  USING (is_admin());

-- TEAM_GOALS
DROP POLICY IF EXISTS "auth_select_team_goals" ON team_goals;
DROP POLICY IF EXISTS "auth_insert_team_goals" ON team_goals;
DROP POLICY IF EXISTS "auth_update_team_goals" ON team_goals;
DROP POLICY IF EXISTS "admin_delete_team_goals" ON team_goals;
DROP POLICY IF EXISTS "team_goals_select" ON team_goals;
DROP POLICY IF EXISTS "team_goals_insert" ON team_goals;
DROP POLICY IF EXISTS "team_goals_update" ON team_goals;
DROP POLICY IF EXISTS "team_goals_delete" ON team_goals;

CREATE POLICY "team_goals_select" ON team_goals FOR SELECT TO authenticated
  USING (is_admin() OR team_id = my_team_id());
CREATE POLICY "team_goals_insert" ON team_goals FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR team_id = my_team_id());
CREATE POLICY "team_goals_update" ON team_goals FOR UPDATE TO authenticated
  USING (is_admin() OR team_id = my_team_id());
CREATE POLICY "team_goals_delete" ON team_goals FOR DELETE TO authenticated
  USING (is_admin());

-- TEAM_PROJECTS
DROP POLICY IF EXISTS "auth_select_team_projects" ON team_projects;
DROP POLICY IF EXISTS "auth_insert_team_projects" ON team_projects;
DROP POLICY IF EXISTS "auth_update_team_projects" ON team_projects;
DROP POLICY IF EXISTS "admin_delete_team_projects" ON team_projects;
DROP POLICY IF EXISTS "team_projects_select" ON team_projects;
DROP POLICY IF EXISTS "team_projects_insert" ON team_projects;
DROP POLICY IF EXISTS "team_projects_update" ON team_projects;
DROP POLICY IF EXISTS "team_projects_delete" ON team_projects;

CREATE POLICY "team_projects_select" ON team_projects FOR SELECT TO authenticated
  USING (is_admin() OR team_id = my_team_id());
CREATE POLICY "team_projects_insert" ON team_projects FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR team_id = my_team_id());
CREATE POLICY "team_projects_update" ON team_projects FOR UPDATE TO authenticated
  USING (is_admin() OR team_id = my_team_id());
CREATE POLICY "team_projects_delete" ON team_projects FOR DELETE TO authenticated
  USING (is_admin());

-- TEAM_TASKS
DROP POLICY IF EXISTS "auth_select_team_tasks" ON team_tasks;
DROP POLICY IF EXISTS "auth_insert_team_tasks" ON team_tasks;
DROP POLICY IF EXISTS "auth_update_team_tasks" ON team_tasks;
DROP POLICY IF EXISTS "admin_delete_team_tasks" ON team_tasks;
DROP POLICY IF EXISTS "team_tasks_select" ON team_tasks;
DROP POLICY IF EXISTS "team_tasks_insert" ON team_tasks;
DROP POLICY IF EXISTS "team_tasks_update" ON team_tasks;
DROP POLICY IF EXISTS "team_tasks_delete" ON team_tasks;

CREATE POLICY "team_tasks_select" ON team_tasks FOR SELECT TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM team_projects WHERE team_projects.id = team_tasks.project_id AND team_projects.team_id = my_team_id()));
CREATE POLICY "team_tasks_insert" ON team_tasks FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR EXISTS (SELECT 1 FROM team_projects WHERE team_projects.id = team_tasks.project_id AND team_projects.team_id = my_team_id()));
CREATE POLICY "team_tasks_update" ON team_tasks FOR UPDATE TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM team_projects WHERE team_projects.id = team_tasks.project_id AND team_projects.team_id = my_team_id()));
CREATE POLICY "team_tasks_delete" ON team_tasks FOR DELETE TO authenticated
  USING (is_admin());

-- TEAM_COMMISSION_RECORDS
DROP POLICY IF EXISTS "auth_select_team_commission_records" ON team_commission_records;
DROP POLICY IF EXISTS "auth_insert_team_commission_records" ON team_commission_records;
DROP POLICY IF EXISTS "auth_update_team_commission_records" ON team_commission_records;
DROP POLICY IF EXISTS "admin_delete_team_commission_records" ON team_commission_records;
DROP POLICY IF EXISTS "team_commissions_select" ON team_commission_records;
DROP POLICY IF EXISTS "team_commissions_insert" ON team_commission_records;
DROP POLICY IF EXISTS "team_commissions_update" ON team_commission_records;
DROP POLICY IF EXISTS "team_commissions_delete" ON team_commission_records;

CREATE POLICY "team_commissions_select" ON team_commission_records FOR SELECT TO authenticated
  USING (is_admin() OR team_id = my_team_id());
CREATE POLICY "team_commissions_insert" ON team_commission_records FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR team_id = my_team_id());
CREATE POLICY "team_commissions_update" ON team_commission_records FOR UPDATE TO authenticated
  USING (is_admin() OR team_id = my_team_id());
CREATE POLICY "team_commissions_delete" ON team_commission_records FOR DELETE TO authenticated
  USING (is_admin());

-- CALENDAR_EVENTS
DROP POLICY IF EXISTS "calendar_events_select" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_insert" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_update" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_delete" ON calendar_events;

CREATE POLICY "calendar_events_select" ON calendar_events FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR is_same_team(owner_id) OR is_admin());
CREATE POLICY "calendar_events_insert" ON calendar_events FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()) OR is_admin());
CREATE POLICY "calendar_events_update" ON calendar_events FOR UPDATE TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR is_admin());
CREATE POLICY "calendar_events_delete" ON calendar_events FOR DELETE TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR is_admin());

-- ============================================================
-- STEP 7: PERFORMANCE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_team_id ON profiles(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_store_code ON profiles(store_code) WHERE store_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

CREATE INDEX IF NOT EXISTS idx_crm_leads_owner_id ON crm_leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_lead_id ON crm_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_reminders_lead_id ON crm_reminders(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_files_lead_id ON crm_files(lead_id);

CREATE INDEX IF NOT EXISTS idx_clients_owner_id ON clients(owner_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_client_id ON client_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_client_credit_notes_client_id ON client_credit_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_client_disputes_client_id ON client_disputes(client_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute_id ON dispute_messages(dispute_id);

CREATE INDEX IF NOT EXISTS idx_orders_owner_id ON orders(owner_id);
CREATE INDEX IF NOT EXISTS idx_sample_requests_owner_id ON sample_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_sample_items_request_id ON sample_items(sample_request_id);
CREATE INDEX IF NOT EXISTS idx_sample_activities_request_id ON sample_activities(sample_request_id);

CREATE INDEX IF NOT EXISTS idx_pickup_tickets_owner_id ON pickup_tickets(owner_id);
CREATE INDEX IF NOT EXISTS idx_pickup_tickets_store_code ON pickup_tickets(store_code);
CREATE INDEX IF NOT EXISTS idx_pickup_ticket_items_ticket_id ON pickup_ticket_items(ticket_id);

CREATE INDEX IF NOT EXISTS idx_team_messages_team_id ON team_messages(team_id);
CREATE INDEX IF NOT EXISTS idx_team_goals_team_id ON team_goals(team_id);
CREATE INDEX IF NOT EXISTS idx_team_projects_team_id ON team_projects(team_id);
CREATE INDEX IF NOT EXISTS idx_team_tasks_project_id ON team_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_team_commission_records_team_id ON team_commission_records(team_id);

CREATE INDEX IF NOT EXISTS idx_calendar_events_owner_id ON calendar_events(owner_id);
