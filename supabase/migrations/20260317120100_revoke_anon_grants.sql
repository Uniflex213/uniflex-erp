-- Revoke ALL anon grants on operational tables
-- This ensures anon users cannot access any internal data even with RLS policies

REVOKE ALL ON teams FROM anon;
REVOKE ALL ON team_members FROM anon;
REVOKE ALL ON team_messages FROM anon;
REVOKE ALL ON team_message_reactions FROM anon;
REVOKE ALL ON team_projects FROM anon;
REVOKE ALL ON team_tasks FROM anon;
REVOKE ALL ON team_goals FROM anon;
REVOKE ALL ON team_commission_records FROM anon;
REVOKE ALL ON team_join_requests FROM anon;
REVOKE ALL ON client_credit_notes FROM anon;
REVOKE ALL ON client_disputes FROM anon;
REVOKE ALL ON client_notes FROM anon;
REVOKE ALL ON client_pickup_tickets FROM anon;
REVOKE ALL ON dispute_messages FROM anon;
REVOKE ALL ON order_counter FROM anon;
REVOKE ALL ON physical_inventories FROM anon;
REVOKE ALL ON pickup_ticket_counter FROM anon;
REVOKE ALL ON stock_reception_counter FROM anon;
REVOKE ALL ON pricelist_lines FROM anon;
REVOKE ALL ON pricelists FROM anon;
REVOKE ALL ON stock_reception_items FROM anon;
REVOKE ALL ON stock_receptions FROM anon;
REVOKE ALL ON invoice_payments FROM anon;
REVOKE ALL ON crm_files FROM anon;
REVOKE ALL ON change_logs FROM anon;
REVOKE ALL ON account_requests FROM anon;
REVOKE ALL ON stock_movements FROM anon;
REVOKE ALL ON conversations FROM anon;
REVOKE ALL ON conversation_participants FROM anon;
REVOKE ALL ON notifications FROM anon;
