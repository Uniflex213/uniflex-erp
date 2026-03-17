-- Add user_id to team_members so we can reliably link auth users to their team membership
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Index for fast lookup by user_id
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- Unique constraint: one active membership per user per team
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_user_team_active
  ON team_members(user_id, team_id) WHERE removed_at IS NULL AND user_id IS NOT NULL;
