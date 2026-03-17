/*
  # Add owner_id to all user-isolated tables

  ## Summary
  Adds owner_id (uuid, FK to profiles.id) to every table requiring
  per-user data isolation. user_data_store already exists from a prior run.

  ## Tables modified
  - crm_leads, orders, clients, sample_requests, calendar_events,
    pickup_tickets, margin_analyses, pricelists (if exists)
*/

ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_crm_leads_owner ON crm_leads(owner_id);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_owner ON orders(owner_id);

ALTER TABLE clients ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_clients_owner ON clients(owner_id);

ALTER TABLE sample_requests ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_samples_owner ON sample_requests(owner_id);

ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_owner ON calendar_events(owner_id);

ALTER TABLE pickup_tickets ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_pickup_owner ON pickup_tickets(owner_id);

ALTER TABLE margin_analyses ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_margin_owner ON margin_analyses(owner_id);

ALTER TABLE IF EXISTS pricelists ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
