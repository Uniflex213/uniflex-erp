/*
  # Add Missing Foreign Key Indexes
  
  1. Performance Optimization
    - Adds indexes on all foreign key columns that are missing covering indexes
    - This improves JOIN performance and referential integrity checks
    
  2. Tables Affected
    - account_requests, calendar_events, client_credit_notes, client_disputes
    - client_notes, client_pickup_tickets, crm_activities, crm_files
    - crm_reminders, dispute_messages, email_drafts, email_send_logs
    - email_smtp_configs, email_templates, margin_analysis_lines, messages
    - physical_inventory_items, pickup_ticket_items, platform_teams
    - pricelist_lines, pricelists, sale_product_files, sale_product_images
    - sample_activities, sample_items, sample_requests, sci_email_log_items
    - stock_reception_items, system_email_configs, team_commission_records
    - team_join_requests, team_message_reactions, team_messages, team_tasks
    - user_data_store
*/

CREATE INDEX IF NOT EXISTS idx_account_requests_reviewed_by ON account_requests(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_calendar_events_client_id ON calendar_events(client_id);
CREATE INDEX IF NOT EXISTS idx_client_credit_notes_client_id ON client_credit_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_client_disputes_client_id ON client_disputes(client_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_client_id ON client_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_client_pickup_tickets_client_id ON client_pickup_tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_lead_id ON crm_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_files_lead_id ON crm_files(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_reminders_lead_id ON crm_reminders(lead_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute_id ON dispute_messages(dispute_id);
CREATE INDEX IF NOT EXISTS idx_email_drafts_user_id ON email_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_send_logs_sent_by ON email_send_logs(sent_by);
CREATE INDEX IF NOT EXISTS idx_email_smtp_configs_updated_by ON email_smtp_configs(updated_by);
CREATE INDEX IF NOT EXISTS idx_email_templates_updated_by ON email_templates(updated_by);
CREATE INDEX IF NOT EXISTS idx_margin_analysis_lines_analysis_id ON margin_analysis_lines(analysis_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_physical_inventory_items_inventory_id ON physical_inventory_items(inventory_id);
CREATE INDEX IF NOT EXISTS idx_physical_inventory_items_product_id ON physical_inventory_items(product_id);
CREATE INDEX IF NOT EXISTS idx_pickup_ticket_items_product_id ON pickup_ticket_items(product_id);
CREATE INDEX IF NOT EXISTS idx_platform_teams_manager_id ON platform_teams(manager_id);
CREATE INDEX IF NOT EXISTS idx_pricelist_lines_pricelist_id ON pricelist_lines(pricelist_id);
CREATE INDEX IF NOT EXISTS idx_pricelists_owner_id ON pricelists(owner_id);
CREATE INDEX IF NOT EXISTS idx_sale_product_files_product_id ON sale_product_files(product_id);
CREATE INDEX IF NOT EXISTS idx_sale_product_images_product_id ON sale_product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_sample_activities_sample_request_id ON sample_activities(sample_request_id);
CREATE INDEX IF NOT EXISTS idx_sample_items_sample_request_id ON sample_items(sample_request_id);
CREATE INDEX IF NOT EXISTS idx_sample_requests_client_id ON sample_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_sci_email_log_items_log_id ON sci_email_log_items(log_id);
CREATE INDEX IF NOT EXISTS idx_stock_reception_items_product_id ON stock_reception_items(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_reception_items_reception_id ON stock_reception_items(reception_id);
CREATE INDEX IF NOT EXISTS idx_system_email_configs_updated_by ON system_email_configs(updated_by);
CREATE INDEX IF NOT EXISTS idx_team_commission_records_member_id ON team_commission_records(member_id);
CREATE INDEX IF NOT EXISTS idx_team_commission_records_team_id ON team_commission_records(team_id);
CREATE INDEX IF NOT EXISTS idx_team_join_requests_team_id ON team_join_requests(team_id);
CREATE INDEX IF NOT EXISTS idx_team_message_reactions_member_id ON team_message_reactions(member_id);
CREATE INDEX IF NOT EXISTS idx_team_messages_member_id ON team_messages(member_id);
CREATE INDEX IF NOT EXISTS idx_team_tasks_assigned_member_id ON team_tasks(assigned_member_id);
CREATE INDEX IF NOT EXISTS idx_team_tasks_project_id ON team_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_user_data_store_team_id ON user_data_store(team_id);
