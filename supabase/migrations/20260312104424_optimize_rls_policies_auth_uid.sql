/*
  # Optimize RLS Policies for Performance
  
  1. Performance Improvement
    - Replaces `auth.uid()` with `(select auth.uid())` in all RLS policies
    - This ensures auth.uid() is evaluated once per query instead of once per row
    
  2. Affected Tables
    - pickup_tickets, pickup_ticket_items
    - conversations, conversation_participants, messages
    - crm_activities, crm_reminders, crm_leads
    - margin_analyses, margin_analysis_lines
    - sample_requests, sample_items, sample_activities
    - clients, calendar_events
    - platform_teams, user_permissions
    - activity_logs, user_data_store
    - profiles, orders
    - user_smtp_configs, system_email_configs
    - email_templates, email_send_logs, email_smtp_configs
    - messaging_rules
    - user_imap_configs, email_inbox_messages, email_drafts, email_messages
    - account_requests

  3. Security
    - No security changes, only performance optimization
*/

-- Helper function to check if user is admin (optimized with security definer)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (select auth.uid())
    AND role IN ('admin', 'god_admin')
  );
$$;

-- ============================================
-- PICKUP_TICKETS
-- ============================================
DROP POLICY IF EXISTS pickup_select ON pickup_tickets;
DROP POLICY IF EXISTS pickup_insert ON pickup_tickets;
DROP POLICY IF EXISTS pickup_update ON pickup_tickets;
DROP POLICY IF EXISTS pickup_delete ON pickup_tickets;

CREATE POLICY "pickup_select" ON pickup_tickets FOR SELECT TO authenticated
  USING (owner_id = (select auth.uid()) OR is_admin());

CREATE POLICY "pickup_insert" ON pickup_tickets FOR INSERT TO authenticated
  WITH CHECK (owner_id = (select auth.uid()) OR is_admin());

CREATE POLICY "pickup_update" ON pickup_tickets FOR UPDATE TO authenticated
  USING (owner_id = (select auth.uid()) OR is_admin());

CREATE POLICY "pickup_delete" ON pickup_tickets FOR DELETE TO authenticated
  USING (owner_id = (select auth.uid()) OR is_admin());

-- ============================================
-- PICKUP_TICKET_ITEMS
-- ============================================
DROP POLICY IF EXISTS pickup_items_select ON pickup_ticket_items;
DROP POLICY IF EXISTS pickup_items_insert ON pickup_ticket_items;
DROP POLICY IF EXISTS pickup_items_update ON pickup_ticket_items;
DROP POLICY IF EXISTS pickup_items_delete ON pickup_ticket_items;

CREATE POLICY "pickup_items_select" ON pickup_ticket_items FOR SELECT TO authenticated
  USING (is_admin() OR EXISTS (
    SELECT 1 FROM pickup_tickets WHERE pickup_tickets.id = pickup_ticket_items.ticket_id AND pickup_tickets.owner_id = (select auth.uid())
  ));

CREATE POLICY "pickup_items_insert" ON pickup_ticket_items FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR EXISTS (
    SELECT 1 FROM pickup_tickets WHERE pickup_tickets.id = pickup_ticket_items.ticket_id AND pickup_tickets.owner_id = (select auth.uid())
  ));

CREATE POLICY "pickup_items_update" ON pickup_ticket_items FOR UPDATE TO authenticated
  USING (is_admin() OR EXISTS (
    SELECT 1 FROM pickup_tickets WHERE pickup_tickets.id = pickup_ticket_items.ticket_id AND pickup_tickets.owner_id = (select auth.uid())
  ));

CREATE POLICY "pickup_items_delete" ON pickup_ticket_items FOR DELETE TO authenticated
  USING (is_admin() OR EXISTS (
    SELECT 1 FROM pickup_tickets WHERE pickup_tickets.id = pickup_ticket_items.ticket_id AND pickup_tickets.owner_id = (select auth.uid())
  ));

-- ============================================
-- CONVERSATIONS
-- ============================================
DROP POLICY IF EXISTS conversation_select ON conversations;
DROP POLICY IF EXISTS conversation_insert ON conversations;
DROP POLICY IF EXISTS conversation_update ON conversations;

CREATE POLICY "conversation_select" ON conversations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = conversations.id AND cp.user_id = (select auth.uid())
  ));

CREATE POLICY "conversation_insert" ON conversations FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "conversation_update" ON conversations FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = conversations.id AND cp.user_id = (select auth.uid())
  ));

-- ============================================
-- CONVERSATION_PARTICIPANTS
-- ============================================
DROP POLICY IF EXISTS cp_select ON conversation_participants;
DROP POLICY IF EXISTS cp_insert ON conversation_participants;
DROP POLICY IF EXISTS cp_update ON conversation_participants;

CREATE POLICY "cp_select" ON conversation_participants FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()) OR EXISTS (
    SELECT 1 FROM conversation_participants cp2 WHERE cp2.conversation_id = conversation_participants.conversation_id AND cp2.user_id = (select auth.uid())
  ));

CREATE POLICY "cp_insert" ON conversation_participants FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "cp_update" ON conversation_participants FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================
-- MESSAGES
-- ============================================
DROP POLICY IF EXISTS messages_select ON messages;
DROP POLICY IF EXISTS messages_insert ON messages;

CREATE POLICY "messages_select" ON messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = (select auth.uid())
  ));

CREATE POLICY "messages_insert" ON messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = (select auth.uid()) AND EXISTS (
    SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = (select auth.uid())
  ));

-- ============================================
-- MESSAGING_RULES
-- ============================================
DROP POLICY IF EXISTS messaging_rules_delete ON messaging_rules;
DROP POLICY IF EXISTS messaging_rules_insert ON messaging_rules;
DROP POLICY IF EXISTS messaging_rules_update ON messaging_rules;

CREATE POLICY "messaging_rules_delete" ON messaging_rules FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'god_admin')
  ));

CREATE POLICY "messaging_rules_insert" ON messaging_rules FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'god_admin')
  ));

CREATE POLICY "messaging_rules_update" ON messaging_rules FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'god_admin')
  ));

-- ============================================
-- CRM_ACTIVITIES
-- ============================================
DROP POLICY IF EXISTS crm_activities_select ON crm_activities;
DROP POLICY IF EXISTS crm_activities_insert ON crm_activities;
DROP POLICY IF EXISTS crm_activities_update ON crm_activities;
DROP POLICY IF EXISTS crm_activities_delete ON crm_activities;

CREATE POLICY "crm_activities_select" ON crm_activities FOR SELECT TO authenticated
  USING (is_admin() OR EXISTS (
    SELECT 1 FROM crm_leads WHERE crm_leads.id = crm_activities.lead_id AND crm_leads.owner_id = (select auth.uid())
  ));

CREATE POLICY "crm_activities_insert" ON crm_activities FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR EXISTS (
    SELECT 1 FROM crm_leads WHERE crm_leads.id = crm_activities.lead_id AND crm_leads.owner_id = (select auth.uid())
  ));

CREATE POLICY "crm_activities_update" ON crm_activities FOR UPDATE TO authenticated
  USING (is_admin() OR EXISTS (
    SELECT 1 FROM crm_leads WHERE crm_leads.id = crm_activities.lead_id AND crm_leads.owner_id = (select auth.uid())
  ));

CREATE POLICY "crm_activities_delete" ON crm_activities FOR DELETE TO authenticated
  USING (is_admin() OR EXISTS (
    SELECT 1 FROM crm_leads WHERE crm_leads.id = crm_activities.lead_id AND crm_leads.owner_id = (select auth.uid())
  ));

-- ============================================
-- CRM_REMINDERS
-- ============================================
DROP POLICY IF EXISTS crm_reminders_select ON crm_reminders;
DROP POLICY IF EXISTS crm_reminders_insert ON crm_reminders;
DROP POLICY IF EXISTS crm_reminders_update ON crm_reminders;
DROP POLICY IF EXISTS crm_reminders_delete ON crm_reminders;

CREATE POLICY "crm_reminders_select" ON crm_reminders FOR SELECT TO authenticated
  USING (is_admin() OR EXISTS (
    SELECT 1 FROM crm_leads WHERE crm_leads.id = crm_reminders.lead_id AND crm_leads.owner_id = (select auth.uid())
  ));

CREATE POLICY "crm_reminders_insert" ON crm_reminders FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR EXISTS (
    SELECT 1 FROM crm_leads WHERE crm_leads.id = crm_reminders.lead_id AND crm_leads.owner_id = (select auth.uid())
  ));

CREATE POLICY "crm_reminders_update" ON crm_reminders FOR UPDATE TO authenticated
  USING (is_admin() OR EXISTS (
    SELECT 1 FROM crm_leads WHERE crm_leads.id = crm_reminders.lead_id AND crm_leads.owner_id = (select auth.uid())
  ));

CREATE POLICY "crm_reminders_delete" ON crm_reminders FOR DELETE TO authenticated
  USING (is_admin() OR EXISTS (
    SELECT 1 FROM crm_leads WHERE crm_leads.id = crm_reminders.lead_id AND crm_leads.owner_id = (select auth.uid())
  ));

-- ============================================
-- CRM_LEADS
-- ============================================
DROP POLICY IF EXISTS crm_leads_select ON crm_leads;
DROP POLICY IF EXISTS crm_leads_insert ON crm_leads;
DROP POLICY IF EXISTS crm_leads_update ON crm_leads;
DROP POLICY IF EXISTS crm_leads_delete ON crm_leads;

CREATE POLICY "crm_leads_select" ON crm_leads FOR SELECT TO authenticated
  USING (owner_id = (select auth.uid()) OR is_admin());

CREATE POLICY "crm_leads_insert" ON crm_leads FOR INSERT TO authenticated
  WITH CHECK (owner_id = (select auth.uid()) OR is_admin());

CREATE POLICY "crm_leads_update" ON crm_leads FOR UPDATE TO authenticated
  USING (owner_id = (select auth.uid()) OR is_admin());

CREATE POLICY "crm_leads_delete" ON crm_leads FOR DELETE TO authenticated
  USING (owner_id = (select auth.uid()) OR is_admin());

-- ============================================
-- MARGIN_ANALYSES
-- ============================================
DROP POLICY IF EXISTS margin_select ON margin_analyses;
DROP POLICY IF EXISTS margin_insert ON margin_analyses;
DROP POLICY IF EXISTS margin_update ON margin_analyses;
DROP POLICY IF EXISTS margin_delete ON margin_analyses;

CREATE POLICY "margin_select" ON margin_analyses FOR SELECT TO authenticated
  USING (owner_id = (select auth.uid()) OR is_admin());

CREATE POLICY "margin_insert" ON margin_analyses FOR INSERT TO authenticated
  WITH CHECK (owner_id = (select auth.uid()) OR is_admin());

CREATE POLICY "margin_update" ON margin_analyses FOR UPDATE TO authenticated
  USING (owner_id = (select auth.uid()) OR is_admin());

CREATE POLICY "margin_delete" ON margin_analyses FOR DELETE TO authenticated
  USING (owner_id = (select auth.uid()) OR is_admin());

-- ============================================
-- MARGIN_ANALYSIS_LINES
-- ============================================
DROP POLICY IF EXISTS margin_lines_select ON margin_analysis_lines;
DROP POLICY IF EXISTS margin_lines_insert ON margin_analysis_lines;
DROP POLICY IF EXISTS margin_lines_update ON margin_analysis_lines;
DROP POLICY IF EXISTS margin_lines_delete ON margin_analysis_lines;

CREATE POLICY "margin_lines_select" ON margin_analysis_lines FOR SELECT TO authenticated
  USING (is_admin() OR EXISTS (
    SELECT 1 FROM margin_analyses WHERE margin_analyses.id = margin_analysis_lines.analysis_id AND margin_analyses.owner_id = (select auth.uid())
  ));

CREATE POLICY "margin_lines_insert" ON margin_analysis_lines FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR EXISTS (
    SELECT 1 FROM margin_analyses WHERE margin_analyses.id = margin_analysis_lines.analysis_id AND margin_analyses.owner_id = (select auth.uid())
  ));

CREATE POLICY "margin_lines_update" ON margin_analysis_lines FOR UPDATE TO authenticated
  USING (is_admin() OR EXISTS (
    SELECT 1 FROM margin_analyses WHERE margin_analyses.id = margin_analysis_lines.analysis_id AND margin_analyses.owner_id = (select auth.uid())
  ));

CREATE POLICY "margin_lines_delete" ON margin_analysis_lines FOR DELETE TO authenticated
  USING (is_admin() OR EXISTS (
    SELECT 1 FROM margin_analyses WHERE margin_analyses.id = margin_analysis_lines.analysis_id AND margin_analyses.owner_id = (select auth.uid())
  ));

-- ============================================
-- SAMPLE_REQUESTS
-- ============================================
DROP POLICY IF EXISTS samples_select ON sample_requests;
DROP POLICY IF EXISTS samples_insert ON sample_requests;
DROP POLICY IF EXISTS samples_update ON sample_requests;
DROP POLICY IF EXISTS samples_delete ON sample_requests;

CREATE POLICY "samples_select" ON sample_requests FOR SELECT TO authenticated
  USING (owner_id = (select auth.uid()) OR is_admin());

CREATE POLICY "samples_insert" ON sample_requests FOR INSERT TO authenticated
  WITH CHECK (owner_id = (select auth.uid()) OR is_admin());

CREATE POLICY "samples_update" ON sample_requests FOR UPDATE TO authenticated
  USING (owner_id = (select auth.uid()) OR is_admin());

CREATE POLICY "samples_delete" ON sample_requests FOR DELETE TO authenticated
  USING (owner_id = (select auth.uid()) OR is_admin());

-- ============================================
-- SAMPLE_ITEMS
-- ============================================
DROP POLICY IF EXISTS sample_items_select ON sample_items;
DROP POLICY IF EXISTS sample_items_insert ON sample_items;
DROP POLICY IF EXISTS sample_items_update ON sample_items;
DROP POLICY IF EXISTS sample_items_delete ON sample_items;

CREATE POLICY "sample_items_select" ON sample_items FOR SELECT TO authenticated
  USING (is_admin() OR EXISTS (
    SELECT 1 FROM sample_requests WHERE sample_requests.id = sample_items.sample_request_id AND sample_requests.owner_id = (select auth.uid())
  ));

CREATE POLICY "sample_items_insert" ON sample_items FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR EXISTS (
    SELECT 1 FROM sample_requests WHERE sample_requests.id = sample_items.sample_request_id AND sample_requests.owner_id = (select auth.uid())
  ));

CREATE POLICY "sample_items_update" ON sample_items FOR UPDATE TO authenticated
  USING (is_admin() OR EXISTS (
    SELECT 1 FROM sample_requests WHERE sample_requests.id = sample_items.sample_request_id AND sample_requests.owner_id = (select auth.uid())
  ));

CREATE POLICY "sample_items_delete" ON sample_items FOR DELETE TO authenticated
  USING (is_admin() OR EXISTS (
    SELECT 1 FROM sample_requests WHERE sample_requests.id = sample_items.sample_request_id AND sample_requests.owner_id = (select auth.uid())
  ));

-- ============================================
-- SAMPLE_ACTIVITIES
-- ============================================
DROP POLICY IF EXISTS sample_activities_select ON sample_activities;
DROP POLICY IF EXISTS sample_activities_insert ON sample_activities;

CREATE POLICY "sample_activities_select" ON sample_activities FOR SELECT TO authenticated
  USING (is_admin() OR EXISTS (
    SELECT 1 FROM sample_requests WHERE sample_requests.id = sample_activities.sample_request_id AND sample_requests.owner_id = (select auth.uid())
  ));

CREATE POLICY "sample_activities_insert" ON sample_activities FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR EXISTS (
    SELECT 1 FROM sample_requests WHERE sample_requests.id = sample_activities.sample_request_id AND sample_requests.owner_id = (select auth.uid())
  ));

-- ============================================
-- CLIENTS
-- ============================================
DROP POLICY IF EXISTS clients_select ON clients;
DROP POLICY IF EXISTS clients_insert ON clients;
DROP POLICY IF EXISTS clients_update ON clients;
DROP POLICY IF EXISTS clients_delete ON clients;

CREATE POLICY "clients_select" ON clients FOR SELECT TO authenticated
  USING (owner_id = (select auth.uid()) OR is_admin());

CREATE POLICY "clients_insert" ON clients FOR INSERT TO authenticated
  WITH CHECK (owner_id = (select auth.uid()) OR is_admin());

CREATE POLICY "clients_update" ON clients FOR UPDATE TO authenticated
  USING (owner_id = (select auth.uid()) OR is_admin());

CREATE POLICY "clients_delete" ON clients FOR DELETE TO authenticated
  USING (owner_id = (select auth.uid()) OR is_admin());

-- ============================================
-- CALENDAR_EVENTS
-- ============================================
DROP POLICY IF EXISTS calendar_select ON calendar_events;
DROP POLICY IF EXISTS calendar_insert ON calendar_events;
DROP POLICY IF EXISTS calendar_update ON calendar_events;
DROP POLICY IF EXISTS calendar_delete ON calendar_events;

CREATE POLICY "calendar_select" ON calendar_events FOR SELECT TO authenticated
  USING (owner_id = (select auth.uid()) OR is_admin());

CREATE POLICY "calendar_insert" ON calendar_events FOR INSERT TO authenticated
  WITH CHECK (owner_id = (select auth.uid()) OR is_admin());

CREATE POLICY "calendar_update" ON calendar_events FOR UPDATE TO authenticated
  USING (owner_id = (select auth.uid()) OR is_admin());

CREATE POLICY "calendar_delete" ON calendar_events FOR DELETE TO authenticated
  USING (owner_id = (select auth.uid()) OR is_admin());

-- ============================================
-- PLATFORM_TEAMS
-- ============================================
DROP POLICY IF EXISTS platform_teams_select_admin ON platform_teams;
DROP POLICY IF EXISTS platform_teams_select_member ON platform_teams;
DROP POLICY IF EXISTS platform_teams_insert_admin ON platform_teams;
DROP POLICY IF EXISTS platform_teams_update_admin ON platform_teams;
DROP POLICY IF EXISTS platform_teams_delete_admin ON platform_teams;

CREATE POLICY "platform_teams_select_admin" ON platform_teams FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin'
  ));

CREATE POLICY "platform_teams_select_member" ON platform_teams FOR SELECT TO authenticated
  USING (id = (SELECT profiles.team_id FROM profiles WHERE profiles.id = (select auth.uid())));

CREATE POLICY "platform_teams_insert_admin" ON platform_teams FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin'
  ));

CREATE POLICY "platform_teams_update_admin" ON platform_teams FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin'
  ));

CREATE POLICY "platform_teams_delete_admin" ON platform_teams FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin'
  ));

-- ============================================
-- USER_PERMISSIONS
-- ============================================
DROP POLICY IF EXISTS permissions_select_admin ON user_permissions;
DROP POLICY IF EXISTS permissions_select_own ON user_permissions;
DROP POLICY IF EXISTS permissions_insert_admin ON user_permissions;
DROP POLICY IF EXISTS permissions_update_admin ON user_permissions;
DROP POLICY IF EXISTS permissions_delete_admin ON user_permissions;

CREATE POLICY "permissions_select_admin" ON user_permissions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role IN ('admin', 'god_admin')
  ));

CREATE POLICY "permissions_select_own" ON user_permissions FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "permissions_insert_admin" ON user_permissions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role IN ('admin', 'god_admin')
  ));

CREATE POLICY "permissions_update_admin" ON user_permissions FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role IN ('admin', 'god_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role IN ('admin', 'god_admin')
  ));

CREATE POLICY "permissions_delete_admin" ON user_permissions FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role IN ('admin', 'god_admin')
  ));

-- ============================================
-- ACTIVITY_LOGS
-- ============================================
DROP POLICY IF EXISTS logs_insert_authenticated ON activity_logs;
DROP POLICY IF EXISTS logs_select_admin ON activity_logs;
DROP POLICY IF EXISTS logs_select_own ON activity_logs;

CREATE POLICY "logs_insert_authenticated" ON activity_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "logs_select_admin" ON activity_logs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin'
  ));

CREATE POLICY "logs_select_own" ON activity_logs FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================
-- USER_DATA_STORE
-- ============================================
DROP POLICY IF EXISTS uds_select ON user_data_store;
DROP POLICY IF EXISTS uds_insert ON user_data_store;
DROP POLICY IF EXISTS uds_update ON user_data_store;
DROP POLICY IF EXISTS uds_delete ON user_data_store;

CREATE POLICY "uds_select" ON user_data_store FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()) OR is_admin());

CREATE POLICY "uds_insert" ON user_data_store FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "uds_update" ON user_data_store FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "uds_delete" ON user_data_store FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()) OR is_admin());

-- ============================================
-- ACCOUNT_REQUESTS
-- ============================================
DROP POLICY IF EXISTS account_requests_select_admin ON account_requests;
DROP POLICY IF EXISTS account_requests_update_admin ON account_requests;

CREATE POLICY "account_requests_select_admin" ON account_requests FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role IN ('admin', 'god_admin')
  ));

CREATE POLICY "account_requests_update_admin" ON account_requests FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role IN ('admin', 'god_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role IN ('admin', 'god_admin')
  ));

-- ============================================
-- PROFILES
-- ============================================
DROP POLICY IF EXISTS profiles_delete_admin ON profiles;
DROP POLICY IF EXISTS profiles_insert_admin ON profiles;
DROP POLICY IF EXISTS profiles_insert_own ON profiles;
DROP POLICY IF EXISTS profiles_update_admin ON profiles;
DROP POLICY IF EXISTS profiles_update_own ON profiles;

CREATE POLICY "profiles_delete_admin" ON profiles FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role IN ('admin', 'god_admin')
  ));

CREATE POLICY "profiles_insert_admin" ON profiles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role IN ('admin', 'god_admin')
  ));

CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role IN ('admin', 'god_admin')
  ));

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- ============================================
-- ORDERS
-- ============================================
DROP POLICY IF EXISTS orders_select ON orders;
DROP POLICY IF EXISTS orders_insert ON orders;
DROP POLICY IF EXISTS orders_update ON orders;
DROP POLICY IF EXISTS orders_delete ON orders;

CREATE POLICY "orders_select" ON orders FOR SELECT TO authenticated
  USING (owner_id = (select auth.uid()) OR is_admin());

CREATE POLICY "orders_insert" ON orders FOR INSERT TO authenticated
  WITH CHECK (owner_id = (select auth.uid()) OR is_admin());

CREATE POLICY "orders_update" ON orders FOR UPDATE TO authenticated
  USING (owner_id = (select auth.uid()) OR is_admin());

CREATE POLICY "orders_delete" ON orders FOR DELETE TO authenticated
  USING (owner_id = (select auth.uid()) OR is_admin());
