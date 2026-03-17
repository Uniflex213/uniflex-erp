-- NUCLEAR: Drop ALL anon policies on all team/operational tables
-- This fixes any lingering anon-accessible policies that previous migrations failed to remove

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'teams', 'team_members', 'team_messages', 'team_message_reactions',
        'team_projects', 'team_tasks', 'team_goals', 'team_commission_records',
        'team_join_requests',
        'client_credit_notes', 'client_disputes', 'client_notes', 'client_pickup_tickets',
        'dispute_messages', 'order_counter', 'physical_inventories',
        'pickup_ticket_counter', 'stock_reception_counter',
        'pricelist_lines', 'pricelists', 'stock_reception_items', 'stock_receptions',
        'sci_email_log', 'invoice_payments',
        'crm_files', 'change_logs', 'account_requests',
        'stock_movements', 'conversations', 'conversation_participants',
        'notifications'
      )
      AND roles @> ARRAY['anon']::name[]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    RAISE NOTICE 'Dropped anon policy: % on %', r.policyname, r.tablename;
  END LOOP;
END $$;
