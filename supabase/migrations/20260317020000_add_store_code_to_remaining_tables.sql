-- ============================================================
-- Add store_code to store_expenses, store_price_items, and orders
-- For multi-store data isolation
-- ============================================================

-- 1. Add store_code to store_expenses
ALTER TABLE store_expenses
ADD COLUMN IF NOT EXISTS store_code TEXT DEFAULT 'BSB';

-- Back-fill existing rows
UPDATE store_expenses SET store_code = 'BSB' WHERE store_code IS NULL;

-- 2. Add store_code to store_price_items
ALTER TABLE store_price_items
ADD COLUMN IF NOT EXISTS store_code TEXT DEFAULT 'BSB';

-- Back-fill existing rows
UPDATE store_price_items SET store_code = 'BSB' WHERE store_code IS NULL;

-- 3. Add store_code to orders (for store-originated orders)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS store_code TEXT;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_store_expenses_store_code ON store_expenses(store_code);
CREATE INDEX IF NOT EXISTS idx_store_price_items_store_code ON store_price_items(store_code);
CREATE INDEX IF NOT EXISTS idx_orders_store_code ON orders(store_code);
