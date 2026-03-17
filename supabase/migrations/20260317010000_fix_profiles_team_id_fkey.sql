-- Fix profiles.team_id foreign key: was pointing to platform_teams (unused), should point to teams
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_team_id_fkey;
ALTER TABLE profiles ADD CONSTRAINT profiles_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id);
