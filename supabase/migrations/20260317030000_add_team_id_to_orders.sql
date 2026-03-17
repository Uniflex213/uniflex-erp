-- ============================================================
-- Add team_id to orders for team-level order tracking
-- Links orders to teams so team leaders can see their team's orders
-- ============================================================

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_team_id ON orders(team_id);

-- Back-fill existing orders: link to owner's team if they have one
UPDATE orders o
SET team_id = p.team_id
FROM profiles p
WHERE o.owner_id = p.id
  AND p.team_id IS NOT NULL
  AND o.team_id IS NULL;
