/*
  # Optimize Email Policies and Cleanup Duplicates
  
  1. Performance Optimization
    - Optimizes remaining email-related RLS policies
    - Uses (select auth.uid()) instead of auth.uid()
    
  2. Cleanup
    - Removes duplicate indexes
    - Removes duplicate policies on user_smtp_configs and pickup_ticket_counter
    
  3. Tables Affected
    - user_smtp_configs, email_send_logs, email_smtp_configs
    - email_templates, system_email_configs
    - user_imap_configs, email_inbox_messages, email_drafts, email_messages
    - pickup_ticket_items (duplicate index removal)
    - email_inbox_messages (duplicate index removal)
*/

-- ============================================
-- DROP DUPLICATE INDEXES
-- ============================================
DROP INDEX IF EXISTS email_inbox_messages_user_read_idx;
DROP INDEX IF EXISTS idx_pickup_ticket_items_ticket;

-- ============================================
-- USER_SMTP_CONFIGS - Remove duplicate policies first
-- ============================================
DROP POLICY IF EXISTS smtp_own_delete ON user_smtp_configs;
DROP POLICY IF EXISTS smtp_own_insert ON user_smtp_configs;
DROP POLICY IF EXISTS smtp_own_select ON user_smtp_configs;
DROP POLICY IF EXISTS smtp_own_update ON user_smtp_configs;
DROP POLICY IF EXISTS user_smtp_admin_read ON user_smtp_configs;
DROP POLICY IF EXISTS user_smtp_own_insert ON user_smtp_configs;
DROP POLICY IF EXISTS user_smtp_own_select ON user_smtp_configs;
DROP POLICY IF EXISTS user_smtp_own_update ON user_smtp_configs;

CREATE POLICY "user_smtp_select_own" ON user_smtp_configs FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "user_smtp_select_admin" ON user_smtp_configs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'god_admin')
  ));

CREATE POLICY "user_smtp_insert_own" ON user_smtp_configs FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "user_smtp_update_own" ON user_smtp_configs FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "user_smtp_delete_own" ON user_smtp_configs FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================
-- EMAIL_SEND_LOGS
-- ============================================
DROP POLICY IF EXISTS email_logs_insert ON email_send_logs;
DROP POLICY IF EXISTS email_logs_read_admin ON email_send_logs;
DROP POLICY IF EXISTS email_logs_read_own ON email_send_logs;

CREATE POLICY "email_logs_insert" ON email_send_logs FOR INSERT TO authenticated
  WITH CHECK (sent_by = (select auth.uid()));

CREATE POLICY "email_logs_read_admin" ON email_send_logs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'god_admin')
  ));

CREATE POLICY "email_logs_read_own" ON email_send_logs FOR SELECT TO authenticated
  USING (sent_by = (select auth.uid()));

-- ============================================
-- EMAIL_SMTP_CONFIGS
-- ============================================
DROP POLICY IF EXISTS smtp_configs_admin_insert ON email_smtp_configs;
DROP POLICY IF EXISTS smtp_configs_admin_select ON email_smtp_configs;
DROP POLICY IF EXISTS smtp_configs_admin_update ON email_smtp_configs;

CREATE POLICY "smtp_configs_admin_insert" ON email_smtp_configs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'god_admin')
  ));

CREATE POLICY "smtp_configs_admin_select" ON email_smtp_configs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'god_admin')
  ));

CREATE POLICY "smtp_configs_admin_update" ON email_smtp_configs FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'god_admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'god_admin')
  ));

-- ============================================
-- EMAIL_TEMPLATES
-- ============================================
DROP POLICY IF EXISTS templates_admin_delete ON email_templates;
DROP POLICY IF EXISTS templates_admin_insert ON email_templates;
DROP POLICY IF EXISTS templates_admin_update ON email_templates;

CREATE POLICY "templates_admin_delete" ON email_templates FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'god_admin')
  ));

CREATE POLICY "templates_admin_insert" ON email_templates FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'god_admin')
  ));

CREATE POLICY "templates_admin_update" ON email_templates FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'god_admin')
  ));

-- ============================================
-- SYSTEM_EMAIL_CONFIGS
-- ============================================
DROP POLICY IF EXISTS system_email_admin_delete ON system_email_configs;
DROP POLICY IF EXISTS system_email_admin_insert ON system_email_configs;
DROP POLICY IF EXISTS system_email_admin_select ON system_email_configs;
DROP POLICY IF EXISTS system_email_admin_update ON system_email_configs;

CREATE POLICY "system_email_admin_delete" ON system_email_configs FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'god_admin')
  ));

CREATE POLICY "system_email_admin_insert" ON system_email_configs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'god_admin')
  ));

CREATE POLICY "system_email_admin_select" ON system_email_configs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'god_admin')
  ));

CREATE POLICY "system_email_admin_update" ON system_email_configs FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'god_admin')
  ));

-- ============================================
-- USER_IMAP_CONFIGS
-- ============================================
DROP POLICY IF EXISTS "Users can delete own imap config" ON user_imap_configs;
DROP POLICY IF EXISTS "Users can insert own imap config" ON user_imap_configs;
DROP POLICY IF EXISTS "Users can update own imap config" ON user_imap_configs;
DROP POLICY IF EXISTS "Users can view own imap config" ON user_imap_configs;

CREATE POLICY "imap_select_own" ON user_imap_configs FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "imap_insert_own" ON user_imap_configs FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "imap_update_own" ON user_imap_configs FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "imap_delete_own" ON user_imap_configs FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================
-- EMAIL_INBOX_MESSAGES
-- ============================================
DROP POLICY IF EXISTS "Users can delete own emails" ON email_inbox_messages;
DROP POLICY IF EXISTS "Users can insert own emails" ON email_inbox_messages;
DROP POLICY IF EXISTS "Users can update own emails" ON email_inbox_messages;
DROP POLICY IF EXISTS "Users can view own emails" ON email_inbox_messages;

CREATE POLICY "inbox_select_own" ON email_inbox_messages FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "inbox_insert_own" ON email_inbox_messages FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "inbox_update_own" ON email_inbox_messages FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "inbox_delete_own" ON email_inbox_messages FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================
-- EMAIL_DRAFTS
-- ============================================
DROP POLICY IF EXISTS "Users can delete own drafts" ON email_drafts;
DROP POLICY IF EXISTS "Users can insert own drafts" ON email_drafts;
DROP POLICY IF EXISTS "Users can update own drafts" ON email_drafts;
DROP POLICY IF EXISTS "Users can view own drafts" ON email_drafts;

CREATE POLICY "drafts_select_own" ON email_drafts FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "drafts_insert_own" ON email_drafts FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "drafts_update_own" ON email_drafts FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "drafts_delete_own" ON email_drafts FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================
-- EMAIL_MESSAGES
-- ============================================
DROP POLICY IF EXISTS "Users can delete own email messages" ON email_messages;
DROP POLICY IF EXISTS "Users can insert own email messages" ON email_messages;
DROP POLICY IF EXISTS "Users can update own email messages" ON email_messages;
DROP POLICY IF EXISTS "Users can view own email messages" ON email_messages;

CREATE POLICY "email_msg_select_own" ON email_messages FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "email_msg_insert_own" ON email_messages FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "email_msg_update_own" ON email_messages FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "email_msg_delete_own" ON email_messages FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================
-- PICKUP_TICKET_COUNTER - Remove duplicate policies
-- ============================================
DROP POLICY IF EXISTS "anon can insert pickup_ticket_counter" ON pickup_ticket_counter;
DROP POLICY IF EXISTS "anon can read pickup_ticket_counter" ON pickup_ticket_counter;
DROP POLICY IF EXISTS "anon can update pickup_ticket_counter" ON pickup_ticket_counter;
