/*
  # Rewrite all RLS policies for user data isolation

  ## Summary
  Drops all permissive (anon/anyone) policies and replaces with
  owner-based policies: non-admins see only their own data,
  admins see everything.

  ## Notes
  - user_data_store uses user_id column (not owner_id)
  - sample_items/activities use sample_request_id foreign key
*/

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'god_admin')
  );
$$;

-- ─── CRM LEADS ───
DROP POLICY IF EXISTS "Anyone can select crm_leads" ON crm_leads;
DROP POLICY IF EXISTS "Anyone can insert crm_leads" ON crm_leads;
DROP POLICY IF EXISTS "Anyone can update crm_leads" ON crm_leads;
DROP POLICY IF EXISTS "Anyone can delete crm_leads" ON crm_leads;
DROP POLICY IF EXISTS "crm_leads_select" ON crm_leads;
DROP POLICY IF EXISTS "crm_leads_insert" ON crm_leads;
DROP POLICY IF EXISTS "crm_leads_update" ON crm_leads;
DROP POLICY IF EXISTS "crm_leads_delete" ON crm_leads;

CREATE POLICY "crm_leads_select" ON crm_leads FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR is_admin());
CREATE POLICY "crm_leads_insert" ON crm_leads FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR is_admin());
CREATE POLICY "crm_leads_update" ON crm_leads FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR is_admin());
CREATE POLICY "crm_leads_delete" ON crm_leads FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR is_admin());

-- ─── CRM ACTIVITIES ───
DROP POLICY IF EXISTS "Anyone can select crm_activities" ON crm_activities;
DROP POLICY IF EXISTS "Anyone can insert crm_activities" ON crm_activities;
DROP POLICY IF EXISTS "Anyone can update crm_activities" ON crm_activities;
DROP POLICY IF EXISTS "Anyone can delete crm_activities" ON crm_activities;
DROP POLICY IF EXISTS "crm_activities_select" ON crm_activities;
DROP POLICY IF EXISTS "crm_activities_insert" ON crm_activities;
DROP POLICY IF EXISTS "crm_activities_update" ON crm_activities;
DROP POLICY IF EXISTS "crm_activities_delete" ON crm_activities;

CREATE POLICY "crm_activities_select" ON crm_activities FOR SELECT TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM crm_leads WHERE id = crm_activities.lead_id AND owner_id = auth.uid()));
CREATE POLICY "crm_activities_insert" ON crm_activities FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR EXISTS (SELECT 1 FROM crm_leads WHERE id = crm_activities.lead_id AND owner_id = auth.uid()));
CREATE POLICY "crm_activities_update" ON crm_activities FOR UPDATE TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM crm_leads WHERE id = crm_activities.lead_id AND owner_id = auth.uid()));
CREATE POLICY "crm_activities_delete" ON crm_activities FOR DELETE TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM crm_leads WHERE id = crm_activities.lead_id AND owner_id = auth.uid()));

-- ─── CRM REMINDERS ───
DROP POLICY IF EXISTS "Anyone can select crm_reminders" ON crm_reminders;
DROP POLICY IF EXISTS "Anyone can insert crm_reminders" ON crm_reminders;
DROP POLICY IF EXISTS "Anyone can update crm_reminders" ON crm_reminders;
DROP POLICY IF EXISTS "Anyone can delete crm_reminders" ON crm_reminders;
DROP POLICY IF EXISTS "crm_reminders_select" ON crm_reminders;
DROP POLICY IF EXISTS "crm_reminders_insert" ON crm_reminders;
DROP POLICY IF EXISTS "crm_reminders_update" ON crm_reminders;
DROP POLICY IF EXISTS "crm_reminders_delete" ON crm_reminders;

CREATE POLICY "crm_reminders_select" ON crm_reminders FOR SELECT TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM crm_leads WHERE id = crm_reminders.lead_id AND owner_id = auth.uid()));
CREATE POLICY "crm_reminders_insert" ON crm_reminders FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR EXISTS (SELECT 1 FROM crm_leads WHERE id = crm_reminders.lead_id AND owner_id = auth.uid()));
CREATE POLICY "crm_reminders_update" ON crm_reminders FOR UPDATE TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM crm_leads WHERE id = crm_reminders.lead_id AND owner_id = auth.uid()));
CREATE POLICY "crm_reminders_delete" ON crm_reminders FOR DELETE TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM crm_leads WHERE id = crm_reminders.lead_id AND owner_id = auth.uid()));

-- ─── ORDERS ───
DROP POLICY IF EXISTS "Anon can read orders" ON orders;
DROP POLICY IF EXISTS "Anon can insert orders" ON orders;
DROP POLICY IF EXISTS "Anon can update orders" ON orders;
DROP POLICY IF EXISTS "Anon can delete orders" ON orders;
DROP POLICY IF EXISTS "orders_select" ON orders;
DROP POLICY IF EXISTS "orders_insert" ON orders;
DROP POLICY IF EXISTS "orders_update" ON orders;
DROP POLICY IF EXISTS "orders_delete" ON orders;

CREATE POLICY "orders_select" ON orders FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR is_admin());
CREATE POLICY "orders_insert" ON orders FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR is_admin());
CREATE POLICY "orders_update" ON orders FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR is_admin());
CREATE POLICY "orders_delete" ON orders FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR is_admin());

-- ─── CLIENTS ───
DROP POLICY IF EXISTS "Anon can read clients" ON clients;
DROP POLICY IF EXISTS "Anon can insert clients" ON clients;
DROP POLICY IF EXISTS "Anon can update clients" ON clients;
DROP POLICY IF EXISTS "Anon can delete clients" ON clients;
DROP POLICY IF EXISTS "clients_select" ON clients;
DROP POLICY IF EXISTS "clients_insert" ON clients;
DROP POLICY IF EXISTS "clients_update" ON clients;
DROP POLICY IF EXISTS "clients_delete" ON clients;

CREATE POLICY "clients_select" ON clients FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR is_admin());
CREATE POLICY "clients_insert" ON clients FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR is_admin());
CREATE POLICY "clients_update" ON clients FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR is_admin());
CREATE POLICY "clients_delete" ON clients FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR is_admin());

-- ─── SAMPLE REQUESTS ───
DROP POLICY IF EXISTS "Anyone can select sample_requests" ON sample_requests;
DROP POLICY IF EXISTS "Anyone can insert sample_requests" ON sample_requests;
DROP POLICY IF EXISTS "Anyone can update sample_requests" ON sample_requests;
DROP POLICY IF EXISTS "Anyone can delete sample_requests" ON sample_requests;
DROP POLICY IF EXISTS "anon select sample_requests" ON sample_requests;
DROP POLICY IF EXISTS "anon insert sample_requests" ON sample_requests;
DROP POLICY IF EXISTS "anon update sample_requests" ON sample_requests;
DROP POLICY IF EXISTS "samples_select" ON sample_requests;
DROP POLICY IF EXISTS "samples_insert" ON sample_requests;
DROP POLICY IF EXISTS "samples_update" ON sample_requests;
DROP POLICY IF EXISTS "samples_delete" ON sample_requests;

CREATE POLICY "samples_select" ON sample_requests FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR is_admin());
CREATE POLICY "samples_insert" ON sample_requests FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR is_admin());
CREATE POLICY "samples_update" ON sample_requests FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR is_admin());
CREATE POLICY "samples_delete" ON sample_requests FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR is_admin());

-- ─── SAMPLE ITEMS ───
DROP POLICY IF EXISTS "Anyone can select sample_items" ON sample_items;
DROP POLICY IF EXISTS "Anyone can insert sample_items" ON sample_items;
DROP POLICY IF EXISTS "Anyone can update sample_items" ON sample_items;
DROP POLICY IF EXISTS "Anyone can delete sample_items" ON sample_items;
DROP POLICY IF EXISTS "anon select sample_items" ON sample_items;
DROP POLICY IF EXISTS "anon insert sample_items" ON sample_items;
DROP POLICY IF EXISTS "sample_items_select" ON sample_items;
DROP POLICY IF EXISTS "sample_items_insert" ON sample_items;
DROP POLICY IF EXISTS "sample_items_update" ON sample_items;
DROP POLICY IF EXISTS "sample_items_delete" ON sample_items;

CREATE POLICY "sample_items_select" ON sample_items FOR SELECT TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM sample_requests WHERE id = sample_items.sample_request_id AND owner_id = auth.uid()));
CREATE POLICY "sample_items_insert" ON sample_items FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR EXISTS (SELECT 1 FROM sample_requests WHERE id = sample_items.sample_request_id AND owner_id = auth.uid()));
CREATE POLICY "sample_items_update" ON sample_items FOR UPDATE TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM sample_requests WHERE id = sample_items.sample_request_id AND owner_id = auth.uid()));
CREATE POLICY "sample_items_delete" ON sample_items FOR DELETE TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM sample_requests WHERE id = sample_items.sample_request_id AND owner_id = auth.uid()));

-- ─── SAMPLE ACTIVITIES ───
DROP POLICY IF EXISTS "Anyone can insert sample_activities" ON sample_activities;
DROP POLICY IF EXISTS "Anyone can select sample_activities" ON sample_activities;
DROP POLICY IF EXISTS "anon insert sample_activities" ON sample_activities;
DROP POLICY IF EXISTS "anon select sample_activities" ON sample_activities;
DROP POLICY IF EXISTS "sample_activities_select" ON sample_activities;
DROP POLICY IF EXISTS "sample_activities_insert" ON sample_activities;

CREATE POLICY "sample_activities_select" ON sample_activities FOR SELECT TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM sample_requests WHERE id = sample_activities.sample_request_id AND owner_id = auth.uid()));
CREATE POLICY "sample_activities_insert" ON sample_activities FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR EXISTS (SELECT 1 FROM sample_requests WHERE id = sample_activities.sample_request_id AND owner_id = auth.uid()));

-- ─── CALENDAR EVENTS ───
DROP POLICY IF EXISTS "Anon users can view public events" ON calendar_events;
DROP POLICY IF EXISTS "Anon users can insert events" ON calendar_events;
DROP POLICY IF EXISTS "Anon users can update events" ON calendar_events;
DROP POLICY IF EXISTS "Anon users can delete events" ON calendar_events;
DROP POLICY IF EXISTS "Authenticated users can view public events" ON calendar_events;
DROP POLICY IF EXISTS "Authenticated users can insert events" ON calendar_events;
DROP POLICY IF EXISTS "Authenticated users can update own events" ON calendar_events;
DROP POLICY IF EXISTS "Authenticated users can delete own events" ON calendar_events;
DROP POLICY IF EXISTS "calendar_select" ON calendar_events;
DROP POLICY IF EXISTS "calendar_insert" ON calendar_events;
DROP POLICY IF EXISTS "calendar_update" ON calendar_events;
DROP POLICY IF EXISTS "calendar_delete" ON calendar_events;

CREATE POLICY "calendar_select" ON calendar_events FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR is_admin());
CREATE POLICY "calendar_insert" ON calendar_events FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR is_admin());
CREATE POLICY "calendar_update" ON calendar_events FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR is_admin());
CREATE POLICY "calendar_delete" ON calendar_events FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR is_admin());

-- ─── PICKUP TICKETS ───
DROP POLICY IF EXISTS "anon can read pickup_tickets" ON pickup_tickets;
DROP POLICY IF EXISTS "anon can insert pickup_tickets" ON pickup_tickets;
DROP POLICY IF EXISTS "anon can update pickup_tickets" ON pickup_tickets;
DROP POLICY IF EXISTS "anon_select_pickup_tickets" ON pickup_tickets;
DROP POLICY IF EXISTS "anon_insert_pickup_tickets" ON pickup_tickets;
DROP POLICY IF EXISTS "anon_update_pickup_tickets" ON pickup_tickets;
DROP POLICY IF EXISTS "pickup_select" ON pickup_tickets;
DROP POLICY IF EXISTS "pickup_insert" ON pickup_tickets;
DROP POLICY IF EXISTS "pickup_update" ON pickup_tickets;
DROP POLICY IF EXISTS "pickup_delete" ON pickup_tickets;

CREATE POLICY "pickup_select" ON pickup_tickets FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR is_admin());
CREATE POLICY "pickup_insert" ON pickup_tickets FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR is_admin());
CREATE POLICY "pickup_update" ON pickup_tickets FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR is_admin());
CREATE POLICY "pickup_delete" ON pickup_tickets FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR is_admin());

-- ─── PICKUP TICKET ITEMS ───
DROP POLICY IF EXISTS "anon can read pickup_ticket_items" ON pickup_ticket_items;
DROP POLICY IF EXISTS "anon can insert pickup_ticket_items" ON pickup_ticket_items;
DROP POLICY IF EXISTS "anon can update pickup_ticket_items" ON pickup_ticket_items;
DROP POLICY IF EXISTS "anon can delete pickup_ticket_items" ON pickup_ticket_items;
DROP POLICY IF EXISTS "anon_select_pickup_ticket_items" ON pickup_ticket_items;
DROP POLICY IF EXISTS "anon_insert_pickup_ticket_items" ON pickup_ticket_items;
DROP POLICY IF EXISTS "anon_update_pickup_ticket_items" ON pickup_ticket_items;
DROP POLICY IF EXISTS "pickup_items_select" ON pickup_ticket_items;
DROP POLICY IF EXISTS "pickup_items_insert" ON pickup_ticket_items;
DROP POLICY IF EXISTS "pickup_items_update" ON pickup_ticket_items;
DROP POLICY IF EXISTS "pickup_items_delete" ON pickup_ticket_items;

CREATE POLICY "pickup_items_select" ON pickup_ticket_items FOR SELECT TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM pickup_tickets WHERE id = pickup_ticket_items.ticket_id AND owner_id = auth.uid()));
CREATE POLICY "pickup_items_insert" ON pickup_ticket_items FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR EXISTS (SELECT 1 FROM pickup_tickets WHERE id = pickup_ticket_items.ticket_id AND owner_id = auth.uid()));
CREATE POLICY "pickup_items_update" ON pickup_ticket_items FOR UPDATE TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM pickup_tickets WHERE id = pickup_ticket_items.ticket_id AND owner_id = auth.uid()));
CREATE POLICY "pickup_items_delete" ON pickup_ticket_items FOR DELETE TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM pickup_tickets WHERE id = pickup_ticket_items.ticket_id AND owner_id = auth.uid()));

-- ─── MARGIN ANALYSES ───
DROP POLICY IF EXISTS "Anon users can view margin analyses" ON margin_analyses;
DROP POLICY IF EXISTS "Anon users can insert margin analyses" ON margin_analyses;
DROP POLICY IF EXISTS "Anon users can update margin analyses" ON margin_analyses;
DROP POLICY IF EXISTS "Anon users can delete margin analyses" ON margin_analyses;
DROP POLICY IF EXISTS "Authenticated users can view margin analyses" ON margin_analyses;
DROP POLICY IF EXISTS "Authenticated users can insert margin analyses" ON margin_analyses;
DROP POLICY IF EXISTS "Authenticated users can update margin analyses" ON margin_analyses;
DROP POLICY IF EXISTS "Authenticated users can delete margin analyses" ON margin_analyses;
DROP POLICY IF EXISTS "margin_select" ON margin_analyses;
DROP POLICY IF EXISTS "margin_insert" ON margin_analyses;
DROP POLICY IF EXISTS "margin_update" ON margin_analyses;
DROP POLICY IF EXISTS "margin_delete" ON margin_analyses;

CREATE POLICY "margin_select" ON margin_analyses FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR is_admin());
CREATE POLICY "margin_insert" ON margin_analyses FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR is_admin());
CREATE POLICY "margin_update" ON margin_analyses FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR is_admin());
CREATE POLICY "margin_delete" ON margin_analyses FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR is_admin());

-- ─── MARGIN ANALYSIS LINES ───
DROP POLICY IF EXISTS "Anon users can view margin lines" ON margin_analysis_lines;
DROP POLICY IF EXISTS "Anon users can insert margin lines" ON margin_analysis_lines;
DROP POLICY IF EXISTS "Anon users can update margin lines" ON margin_analysis_lines;
DROP POLICY IF EXISTS "Anon users can delete margin lines" ON margin_analysis_lines;
DROP POLICY IF EXISTS "Authenticated users can view margin lines" ON margin_analysis_lines;
DROP POLICY IF EXISTS "Authenticated users can insert margin lines" ON margin_analysis_lines;
DROP POLICY IF EXISTS "Authenticated users can update margin lines" ON margin_analysis_lines;
DROP POLICY IF EXISTS "Authenticated users can delete margin lines" ON margin_analysis_lines;
DROP POLICY IF EXISTS "margin_lines_select" ON margin_analysis_lines;
DROP POLICY IF EXISTS "margin_lines_insert" ON margin_analysis_lines;
DROP POLICY IF EXISTS "margin_lines_update" ON margin_analysis_lines;
DROP POLICY IF EXISTS "margin_lines_delete" ON margin_analysis_lines;

CREATE POLICY "margin_lines_select" ON margin_analysis_lines FOR SELECT TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM margin_analyses WHERE id = margin_analysis_lines.analysis_id AND owner_id = auth.uid()));
CREATE POLICY "margin_lines_insert" ON margin_analysis_lines FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR EXISTS (SELECT 1 FROM margin_analyses WHERE id = margin_analysis_lines.analysis_id AND owner_id = auth.uid()));
CREATE POLICY "margin_lines_update" ON margin_analysis_lines FOR UPDATE TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM margin_analyses WHERE id = margin_analysis_lines.analysis_id AND owner_id = auth.uid()));
CREATE POLICY "margin_lines_delete" ON margin_analysis_lines FOR DELETE TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM margin_analyses WHERE id = margin_analysis_lines.analysis_id AND owner_id = auth.uid()));

-- ─── SALE PRODUCTS ───
DROP POLICY IF EXISTS "Anon users can view products" ON sale_products;
DROP POLICY IF EXISTS "Anon users can insert products" ON sale_products;
DROP POLICY IF EXISTS "Anon users can update products" ON sale_products;
DROP POLICY IF EXISTS "Anon users can delete products" ON sale_products;
DROP POLICY IF EXISTS "Authenticated users can view products" ON sale_products;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON sale_products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON sale_products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON sale_products;
DROP POLICY IF EXISTS "products_select" ON sale_products;
DROP POLICY IF EXISTS "products_insert" ON sale_products;
DROP POLICY IF EXISTS "products_update" ON sale_products;
DROP POLICY IF EXISTS "products_delete" ON sale_products;

CREATE POLICY "products_select" ON sale_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_insert" ON sale_products FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "products_update" ON sale_products FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "products_delete" ON sale_products FOR DELETE TO authenticated USING (is_admin());

-- ─── SALE PRODUCT IMAGES ───
DROP POLICY IF EXISTS "Anon users can view product images" ON sale_product_images;
DROP POLICY IF EXISTS "Anon users can insert product images" ON sale_product_images;
DROP POLICY IF EXISTS "Anon users can update product images" ON sale_product_images;
DROP POLICY IF EXISTS "Anon users can delete product images" ON sale_product_images;
DROP POLICY IF EXISTS "Authenticated users can view product images" ON sale_product_images;
DROP POLICY IF EXISTS "Authenticated users can insert product images" ON sale_product_images;
DROP POLICY IF EXISTS "Authenticated users can update product images" ON sale_product_images;
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON sale_product_images;
DROP POLICY IF EXISTS "prod_images_select" ON sale_product_images;
DROP POLICY IF EXISTS "prod_images_insert" ON sale_product_images;
DROP POLICY IF EXISTS "prod_images_update" ON sale_product_images;
DROP POLICY IF EXISTS "prod_images_delete" ON sale_product_images;

CREATE POLICY "prod_images_select" ON sale_product_images FOR SELECT TO authenticated USING (true);
CREATE POLICY "prod_images_insert" ON sale_product_images FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "prod_images_update" ON sale_product_images FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "prod_images_delete" ON sale_product_images FOR DELETE TO authenticated USING (is_admin());

-- ─── SALE PRODUCT FILES ───
DROP POLICY IF EXISTS "Anon users can view product files" ON sale_product_files;
DROP POLICY IF EXISTS "Anon users can insert product files" ON sale_product_files;
DROP POLICY IF EXISTS "Anon users can update product files" ON sale_product_files;
DROP POLICY IF EXISTS "Anon users can delete product files" ON sale_product_files;
DROP POLICY IF EXISTS "Authenticated users can view product files" ON sale_product_files;
DROP POLICY IF EXISTS "Authenticated users can insert product files" ON sale_product_files;
DROP POLICY IF EXISTS "Authenticated users can update product files" ON sale_product_files;
DROP POLICY IF EXISTS "Authenticated users can delete product files" ON sale_product_files;
DROP POLICY IF EXISTS "prod_files_select" ON sale_product_files;
DROP POLICY IF EXISTS "prod_files_insert" ON sale_product_files;
DROP POLICY IF EXISTS "prod_files_update" ON sale_product_files;
DROP POLICY IF EXISTS "prod_files_delete" ON sale_product_files;

CREATE POLICY "prod_files_select" ON sale_product_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "prod_files_insert" ON sale_product_files FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "prod_files_update" ON sale_product_files FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "prod_files_delete" ON sale_product_files FOR DELETE TO authenticated USING (is_admin());

-- ─── SCI EMAIL LOG ITEMS ───
DROP POLICY IF EXISTS "Anon can select sci_email_log_items" ON sci_email_log_items;
DROP POLICY IF EXISTS "Anon can insert sci_email_log_items" ON sci_email_log_items;
DROP POLICY IF EXISTS "sci_log_select" ON sci_email_log_items;
DROP POLICY IF EXISTS "sci_log_insert" ON sci_email_log_items;
DROP POLICY IF EXISTS "sci_log_update" ON sci_email_log_items;

CREATE POLICY "sci_log_select" ON sci_email_log_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "sci_log_insert" ON sci_email_log_items FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "sci_log_update" ON sci_email_log_items FOR UPDATE TO authenticated USING (is_admin());

-- ─── USER DATA STORE (uses user_id column) ───
DROP POLICY IF EXISTS "data_own_select" ON user_data_store;
DROP POLICY IF EXISTS "data_admin_read" ON user_data_store;
DROP POLICY IF EXISTS "data_own_insert" ON user_data_store;
DROP POLICY IF EXISTS "data_own_update" ON user_data_store;
DROP POLICY IF EXISTS "data_own_delete" ON user_data_store;
DROP POLICY IF EXISTS "data_team_read" ON user_data_store;
DROP POLICY IF EXISTS "uds_select" ON user_data_store;
DROP POLICY IF EXISTS "uds_insert" ON user_data_store;
DROP POLICY IF EXISTS "uds_update" ON user_data_store;
DROP POLICY IF EXISTS "uds_delete" ON user_data_store;

CREATE POLICY "uds_select" ON user_data_store FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "uds_insert" ON user_data_store FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "uds_update" ON user_data_store FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "uds_delete" ON user_data_store FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR is_admin());
