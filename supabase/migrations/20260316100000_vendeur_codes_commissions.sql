/*
  # Vendeur Codes + Commissions + Team Prices

  1. profiles: vendeur_code, commission_rate, region_code
  2. orders: vendeur_code for fast tracking
  3. team_prices: equipe-specific product prices
  4. team_commission_configs: per-vendeur commission rates managed by team leader
  5. team_expenses: team-level expenses for profit calc
*/

-- 1. Add vendeur_code, commission_rate, region_code to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS vendeur_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,4) DEFAULT 0.05,
  ADD COLUMN IF NOT EXISTS region_code TEXT;

-- 2. Add vendeur_code to orders for fast tracking
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS vendeur_code TEXT;

-- Soft FK: we don't add a hard constraint since vendeur_code may be null on old orders
CREATE INDEX IF NOT EXISTS idx_orders_vendeur_code ON orders(vendeur_code);

-- 3. Table team_prices (per-team product price overrides)
CREATE TABLE IF NOT EXISTS team_prices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID REFERENCES teams(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES sale_products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  sku         TEXT DEFAULT '',
  format      TEXT DEFAULT '',
  unit_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_unit  TEXT DEFAULT '/KIT',
  is_active   BOOLEAN DEFAULT true,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE team_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_prices_select" ON team_prices;
DROP POLICY IF EXISTS "team_prices_insert" ON team_prices;
DROP POLICY IF EXISTS "team_prices_update" ON team_prices;
DROP POLICY IF EXISTS "team_prices_delete" ON team_prices;

CREATE POLICY "team_prices_select" ON team_prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "team_prices_insert" ON team_prices FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND team_id = team_prices.team_id));
CREATE POLICY "team_prices_update" ON team_prices FOR UPDATE TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND team_id = team_prices.team_id));
CREATE POLICY "team_prices_delete" ON team_prices FOR DELETE TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_team_prices_team_id ON team_prices(team_id);
CREATE INDEX IF NOT EXISTS idx_team_prices_product_id ON team_prices(product_id);

-- 4. Table team_commission_configs (per-vendeur rates set by team leader)
CREATE TABLE IF NOT EXISTS team_commission_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.05,
  effective_from  DATE DEFAULT CURRENT_DATE,
  notes           TEXT,
  set_by          UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, user_id)
);

ALTER TABLE team_commission_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_commission_configs_select" ON team_commission_configs;
DROP POLICY IF EXISTS "team_commission_configs_insert" ON team_commission_configs;
DROP POLICY IF EXISTS "team_commission_configs_update" ON team_commission_configs;
DROP POLICY IF EXISTS "team_commission_configs_delete" ON team_commission_configs;

CREATE POLICY "team_commission_configs_select" ON team_commission_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "team_commission_configs_insert" ON team_commission_configs FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND team_id = team_commission_configs.team_id));
CREATE POLICY "team_commission_configs_update" ON team_commission_configs FOR UPDATE TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND team_id = team_commission_configs.team_id));
CREATE POLICY "team_commission_configs_delete" ON team_commission_configs FOR DELETE TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_team_commission_configs_team ON team_commission_configs(team_id);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_commission_configs' AND column_name = 'user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_team_commission_configs_user ON team_commission_configs(user_id);
  END IF;
END $$;

-- 5. Table team_expenses (team-level expenses for profit calculation)
CREATE TABLE IF NOT EXISTS team_expenses (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id  UUID REFERENCES teams(id) ON DELETE CASCADE,
  label    TEXT NOT NULL,
  amount   NUMERIC(10,2) NOT NULL,
  category TEXT DEFAULT 'general',
  date     DATE DEFAULT CURRENT_DATE,
  added_by UUID REFERENCES profiles(id),
  notes    TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE team_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_expenses_select" ON team_expenses;
DROP POLICY IF EXISTS "team_expenses_insert" ON team_expenses;
DROP POLICY IF EXISTS "team_expenses_update" ON team_expenses;
DROP POLICY IF EXISTS "team_expenses_delete" ON team_expenses;

CREATE POLICY "team_expenses_select" ON team_expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "team_expenses_insert" ON team_expenses FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND team_id = team_expenses.team_id));
CREATE POLICY "team_expenses_update" ON team_expenses FOR UPDATE TO authenticated
  USING (is_admin() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND team_id = team_expenses.team_id));
CREATE POLICY "team_expenses_delete" ON team_expenses FOR DELETE TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_team_expenses_team_id ON team_expenses(team_id);
