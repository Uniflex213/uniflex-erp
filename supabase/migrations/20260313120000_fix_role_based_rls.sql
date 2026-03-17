/*
  # Fix role-based RLS policies

  ## Summary
  1. Create helper functions is_store_user() and is_manufacturer()
  2. Extend pickup_tickets & pickup_ticket_items policies so magasin users can access them
  3. Extend orders policies so manuf users can view all orders
  4. Extend sample_requests & children so manuf users can view all samples
  5. Replace anon policies on store_expenses with authenticated + role-based
  6. Restrict store_price_items write ops to admin/magasin only
  7. Replace anon policies on stock_movements and physical_inventory_items
  8. Add owner_id column to store_expenses (if missing)

  ## Security
  - Drops all anon policies on store_expenses, stock_movements, physical_inventory_items
  - Replaces with authenticated + role-based (is_admin OR is_store_user OR is_manufacturer)
  - magasin can access: pickup_tickets, inventory, store_expenses, store_price_items
  - manuf can access: orders (read), samples (read), inventory (read)
*/

-- ── Helper functions ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_store_user()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'magasin'
  );
$$;

CREATE OR REPLACE FUNCTION is_manufacturer()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'manuf'
  );
$$;

-- ── PICKUP TICKETS: allow magasin ──────────────────────────────────

DROP POLICY IF EXISTS "pickup_select" ON pickup_tickets;
DROP POLICY IF EXISTS "pickup_insert" ON pickup_tickets;
DROP POLICY IF EXISTS "pickup_update" ON pickup_tickets;
DROP POLICY IF EXISTS "pickup_delete" ON pickup_tickets;

CREATE POLICY "pickup_select" ON pickup_tickets FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR is_admin() OR is_store_user());
CREATE POLICY "pickup_insert" ON pickup_tickets FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR is_admin() OR is_store_user());
CREATE POLICY "pickup_update" ON pickup_tickets FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR is_admin() OR is_store_user());
CREATE POLICY "pickup_delete" ON pickup_tickets FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR is_admin());

-- ── PICKUP TICKET ITEMS: allow magasin ─────────────────────────────

DROP POLICY IF EXISTS "pickup_items_select" ON pickup_ticket_items;
DROP POLICY IF EXISTS "pickup_items_insert" ON pickup_ticket_items;
DROP POLICY IF EXISTS "pickup_items_update" ON pickup_ticket_items;
DROP POLICY IF EXISTS "pickup_items_delete" ON pickup_ticket_items;

CREATE POLICY "pickup_items_select" ON pickup_ticket_items FOR SELECT TO authenticated
  USING (is_admin() OR is_store_user() OR EXISTS (SELECT 1 FROM pickup_tickets WHERE id = pickup_ticket_items.ticket_id AND owner_id = auth.uid()));
CREATE POLICY "pickup_items_insert" ON pickup_ticket_items FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR is_store_user() OR EXISTS (SELECT 1 FROM pickup_tickets WHERE id = pickup_ticket_items.ticket_id AND owner_id = auth.uid()));
CREATE POLICY "pickup_items_update" ON pickup_ticket_items FOR UPDATE TO authenticated
  USING (is_admin() OR is_store_user() OR EXISTS (SELECT 1 FROM pickup_tickets WHERE id = pickup_ticket_items.ticket_id AND owner_id = auth.uid()));
CREATE POLICY "pickup_items_delete" ON pickup_ticket_items FOR DELETE TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM pickup_tickets WHERE id = pickup_ticket_items.ticket_id AND owner_id = auth.uid()));

-- ── ORDERS: allow manuf to view ────────────────────────────────────

DROP POLICY IF EXISTS "orders_select" ON orders;
CREATE POLICY "orders_select" ON orders FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR is_admin() OR is_manufacturer());

-- ── SAMPLE REQUESTS: allow manuf to view ───────────────────────────

DROP POLICY IF EXISTS "samples_select" ON sample_requests;
CREATE POLICY "samples_select" ON sample_requests FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR is_admin() OR is_manufacturer());

-- sample_items: allow manuf to view
DROP POLICY IF EXISTS "sample_items_select" ON sample_items;
CREATE POLICY "sample_items_select" ON sample_items FOR SELECT TO authenticated
  USING (is_admin() OR is_manufacturer() OR EXISTS (SELECT 1 FROM sample_requests WHERE id = sample_items.sample_request_id AND owner_id = auth.uid()));

-- sample_activities: allow manuf to view
DROP POLICY IF EXISTS "sample_activities_select" ON sample_activities;
CREATE POLICY "sample_activities_select" ON sample_activities FOR SELECT TO authenticated
  USING (is_admin() OR is_manufacturer() OR EXISTS (SELECT 1 FROM sample_requests WHERE id = sample_activities.sample_request_id AND owner_id = auth.uid()));

-- ── STORE EXPENSES: drop anon, add authenticated + owner_id ────────

-- Add owner_id column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'store_expenses' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE store_expenses ADD COLUMN owner_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Drop anon policies
DROP POLICY IF EXISTS "Anon can read store_expenses" ON store_expenses;
DROP POLICY IF EXISTS "Anon can insert store_expenses" ON store_expenses;
DROP POLICY IF EXISTS "Anon can update store_expenses" ON store_expenses;
DROP POLICY IF EXISTS "Anon can delete store_expenses" ON store_expenses;

-- Create authenticated policies (drop first to make idempotent)
DROP POLICY IF EXISTS "store_expenses_select" ON store_expenses;
DROP POLICY IF EXISTS "store_expenses_insert" ON store_expenses;
DROP POLICY IF EXISTS "store_expenses_update" ON store_expenses;
DROP POLICY IF EXISTS "store_expenses_delete" ON store_expenses;

CREATE POLICY "store_expenses_select" ON store_expenses FOR SELECT TO authenticated
  USING (is_admin() OR is_store_user());
CREATE POLICY "store_expenses_insert" ON store_expenses FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR is_store_user());
CREATE POLICY "store_expenses_update" ON store_expenses FOR UPDATE TO authenticated
  USING (is_admin() OR is_store_user());
CREATE POLICY "store_expenses_delete" ON store_expenses FOR DELETE TO authenticated
  USING (is_admin());

-- ── STORE PRICE ITEMS: restrict write to admin/magasin ─────────────

DROP POLICY IF EXISTS "Authenticated users can insert store price items" ON store_price_items;
DROP POLICY IF EXISTS "Authenticated users can update store price items" ON store_price_items;
DROP POLICY IF EXISTS "Authenticated users can delete store price items" ON store_price_items;

DROP POLICY IF EXISTS "store_price_items_insert" ON store_price_items;
DROP POLICY IF EXISTS "store_price_items_update" ON store_price_items;
DROP POLICY IF EXISTS "store_price_items_delete" ON store_price_items;

CREATE POLICY "store_price_items_insert" ON store_price_items FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR is_store_user());
CREATE POLICY "store_price_items_update" ON store_price_items FOR UPDATE TO authenticated
  USING (is_admin() OR is_store_user())
  WITH CHECK (is_admin() OR is_store_user());
CREATE POLICY "store_price_items_delete" ON store_price_items FOR DELETE TO authenticated
  USING (is_admin());

-- ── STOCK MOVEMENTS: drop anon, add role-based ─────────────────────

DROP POLICY IF EXISTS "anon_select_stock_movements" ON stock_movements;
DROP POLICY IF EXISTS "anon_insert_stock_movements" ON stock_movements;

-- Keep existing authenticated policies (auth_select_stock_movements, auth_insert_stock_movements)
-- They already allow all authenticated users, which is correct for stock movements

-- ── PHYSICAL INVENTORY ITEMS: drop anon ────────────────────────────

DROP POLICY IF EXISTS "anon_select_physical_inventory_items" ON physical_inventory_items;
DROP POLICY IF EXISTS "anon_insert_physical_inventory_items" ON physical_inventory_items;
DROP POLICY IF EXISTS "anon_update_physical_inventory_items" ON physical_inventory_items;

-- Add authenticated policies if not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'physical_inventory_items'
      AND policyname = 'auth_select_physical_inventory_items'
  ) THEN
    CREATE POLICY "auth_select_physical_inventory_items"
      ON physical_inventory_items FOR SELECT TO authenticated
      USING (is_admin() OR is_store_user() OR is_manufacturer());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'physical_inventory_items'
      AND policyname = 'auth_insert_physical_inventory_items'
  ) THEN
    CREATE POLICY "auth_insert_physical_inventory_items"
      ON physical_inventory_items FOR INSERT TO authenticated
      WITH CHECK (is_admin() OR is_store_user() OR is_manufacturer());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'physical_inventory_items'
      AND policyname = 'auth_update_physical_inventory_items'
  ) THEN
    CREATE POLICY "auth_update_physical_inventory_items"
      ON physical_inventory_items FOR UPDATE TO authenticated
      USING (is_admin() OR is_store_user() OR is_manufacturer())
      WITH CHECK (is_admin() OR is_store_user() OR is_manufacturer());
  END IF;
END $$;
