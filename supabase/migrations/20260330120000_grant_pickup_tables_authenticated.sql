-- ═══════════════════════════════════════════════════════════════════
-- Grant table-level access on pickup tables to authenticated role
-- Without these GRANTs, RLS policies alone are insufficient —
-- Supabase silently returns empty results.
-- ═══════════════════════════════════════════════════════════════════

GRANT SELECT, INSERT, UPDATE, DELETE ON pickup_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pickup_ticket_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON pickup_ticket_counter TO authenticated;
