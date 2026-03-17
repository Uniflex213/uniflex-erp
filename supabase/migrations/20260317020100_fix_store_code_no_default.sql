-- ============================================================
-- Remove DEFAULT 'BSB' from store_code columns
-- store_code must be set explicitly by the application code
-- ============================================================

-- Back-fill existing rows that were created before multi-store
-- (these belong to BSB since it was the only store)
UPDATE store_expenses SET store_code = 'BSB' WHERE store_code IS NULL;
UPDATE store_price_items SET store_code = 'BSB' WHERE store_code IS NULL;

-- Remove the default so new rows must set store_code explicitly
ALTER TABLE store_expenses ALTER COLUMN store_code DROP DEFAULT;
ALTER TABLE store_price_items ALTER COLUMN store_code DROP DEFAULT;
