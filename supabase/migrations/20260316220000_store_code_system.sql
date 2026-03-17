-- ============================================================
-- Store Code System Migration
-- ============================================================

-- 1. Table des magasins (source de vérité des codes)
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_code TEXT UNIQUE NOT NULL,
  store_name TEXT NOT NULL,
  store_address TEXT,
  store_city TEXT,
  store_province TEXT DEFAULT 'QC',
  store_country TEXT DEFAULT 'CA',
  store_phone TEXT,
  store_email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Ajouter store_code et store_role à profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS store_code TEXT,
ADD COLUMN IF NOT EXISTS store_name TEXT,
ADD COLUMN IF NOT EXISTS store_role TEXT DEFAULT 'staff';

-- 3. Ajouter store_code à account_requests
ALTER TABLE account_requests
ADD COLUMN IF NOT EXISTS store_code TEXT,
ADD COLUMN IF NOT EXISTS store_code_requested TEXT;

-- 4. Insérer le magasin par défaut (Boisbriand = BSB)
INSERT INTO stores (store_code, store_name, store_city, store_province)
VALUES ('BSB', 'Boisbriand', 'Boisbriand', 'QC')
ON CONFLICT (store_code) DO NOTHING;

-- 5. Mettre à jour les profils magasin existants avec BSB par défaut
UPDATE profiles SET store_code = 'BSB', store_name = 'Boisbriand'
WHERE role = 'magasin' AND store_code IS NULL;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_store_code ON profiles(store_code);
CREATE INDEX IF NOT EXISTS idx_stores_store_code ON stores(store_code);

-- 7. RLS sur stores
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stores_read_all" ON stores FOR SELECT TO authenticated USING (true);

CREATE POLICY "stores_god_admin_write" ON stores FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'god_admin'));

-- 8. FK constraint for profiles.store_code -> stores.store_code (deferred to allow data setup)
-- Note: Not adding FK constraint since store_code can be null for non-magasin users
-- and the stores table is the source of truth validated at application level
