/*
  # Create Inventory Management Tables

  ## Summary
  Creates all tables required for the inventory management system:
  stock movements log, stock receptions (incoming shipments from SCI),
  and physical inventory (manual counting sessions).

  ## New Tables

  ### `stock_movements`
  - Immutable log of every stock change for every product
  - Tracks before/after stock, who made the change, source reference

  ### `stock_receptions`
  - Records incoming shipments from SCI (consignment arrivals)
  - Tracks carrier, delivery note number, condition of received goods

  ### `stock_reception_items`
  - Line items for each reception (one per product received)
  - Tracks quantity, condition, damage details per product

  ### `stock_reception_counter`
  - Auto-incrementing counter for reception numbers per store/period

  ### `physical_inventories`
  - Physical counting sessions
  - Tracks discrepancies between system stock and counted stock

  ### `physical_inventory_items`
  - Per-product counted quantities for a physical inventory session

  ## Security
  - RLS enabled on all tables
  - Anon access allowed (same pattern as rest of app)
*/

CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES sale_products(id),
  product_name text NOT NULL DEFAULT '',
  movement_type text NOT NULL DEFAULT '',
  quantity integer NOT NULL DEFAULT 0,
  stock_before integer NOT NULL DEFAULT 0,
  stock_after integer NOT NULL DEFAULT 0,
  reference_type text NOT NULL DEFAULT '',
  reference_id text NOT NULL DEFAULT '',
  reference_number text NOT NULL DEFAULT '',
  reason text NOT NULL DEFAULT '',
  agent_name text NOT NULL DEFAULT '',
  store_code text NOT NULL DEFAULT 'BSB',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_stock_movements" ON stock_movements FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_stock_movements" ON stock_movements FOR INSERT TO anon WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_type ON stock_movements(movement_type);

CREATE TABLE IF NOT EXISTS stock_receptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reception_number text UNIQUE NOT NULL,
  store_code text NOT NULL DEFAULT 'BSB',
  received_at timestamptz NOT NULL DEFAULT now(),
  supplier text NOT NULL DEFAULT 'SCI',
  delivery_note_number text NOT NULL DEFAULT '',
  carrier text NOT NULL DEFAULT '',
  tracking_number text NOT NULL DEFAULT '',
  received_by text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  total_units integer NOT NULL DEFAULT 0,
  total_units_ok integer NOT NULL DEFAULT 0,
  total_units_damaged integer NOT NULL DEFAULT 0,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE stock_receptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_stock_receptions" ON stock_receptions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_stock_receptions" ON stock_receptions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_stock_receptions" ON stock_receptions FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS stock_reception_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reception_id uuid NOT NULL REFERENCES stock_receptions(id) ON DELETE CASCADE,
  product_id uuid REFERENCES sale_products(id),
  product_name text NOT NULL DEFAULT '',
  quantity_received integer NOT NULL DEFAULT 0,
  format text NOT NULL DEFAULT '',
  batch_number text NOT NULL DEFAULT '',
  condition text NOT NULL DEFAULT 'good',
  quantity_damaged integer NOT NULL DEFAULT 0,
  damage_description text NOT NULL DEFAULT '',
  quantity_ok integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE stock_reception_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_stock_reception_items" ON stock_reception_items FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_stock_reception_items" ON stock_reception_items FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_stock_reception_items" ON stock_reception_items FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS stock_reception_counter (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_code text NOT NULL,
  period text NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  UNIQUE(store_code, period)
);

ALTER TABLE stock_reception_counter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_reception_counter" ON stock_reception_counter FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_reception_counter" ON stock_reception_counter FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_reception_counter" ON stock_reception_counter FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS physical_inventories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_number text UNIQUE NOT NULL,
  store_code text NOT NULL DEFAULT 'BSB',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'in_progress',
  started_by text NOT NULL DEFAULT '',
  completed_by text NOT NULL DEFAULT '',
  total_products integer NOT NULL DEFAULT 0,
  products_with_discrepancy integer NOT NULL DEFAULT 0,
  total_discrepancy_value numeric(12,2) NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE physical_inventories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_physical_inventories" ON physical_inventories FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_physical_inventories" ON physical_inventories FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_physical_inventories" ON physical_inventories FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS physical_inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES physical_inventories(id) ON DELETE CASCADE,
  product_id uuid REFERENCES sale_products(id),
  product_name text NOT NULL DEFAULT '',
  stock_system integer NOT NULL DEFAULT 0,
  stock_counted integer,
  discrepancy integer,
  cost_price numeric(12,4) NOT NULL DEFAULT 0,
  discrepancy_value numeric(12,2),
  notes text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE physical_inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_physical_inventory_items" ON physical_inventory_items FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_physical_inventory_items" ON physical_inventory_items FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_physical_inventory_items" ON physical_inventory_items FOR UPDATE TO anon USING (true) WITH CHECK (true);
