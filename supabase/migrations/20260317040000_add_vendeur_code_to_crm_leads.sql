-- Add vendeur_code column to crm_leads (was missing, causing insert failures)
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS vendeur_code TEXT;
CREATE INDEX IF NOT EXISTS idx_crm_leads_vendeur_code ON crm_leads(vendeur_code);
