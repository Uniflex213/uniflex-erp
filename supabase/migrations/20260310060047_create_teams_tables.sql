/*
  # Create Teams Tables

  ## Overview
  Complete team management system for sales teams including:
  members, messaging, goals, projects, and commissions.

  ## New Tables
  1. `teams` — A sales team with a unique join code
  2. `team_join_requests` — Requests from agents to create a team (admin review)
  3. `team_members` — Membership records linking agents to a team
  4. `team_messages` — Real-time chat messages within a team
  5. `team_message_reactions` — Emoji reactions on chat messages
  6. `team_goals` — Team objectives with progress tracking
  7. `team_projects` — Team projects for coordinated work
  8. `team_tasks` — Tasks within projects
  9. `team_commission_records` — Commission payment records per member

  ## Security
  - RLS enabled on all tables
  - Anon access allowed for prototype (auth system not fully set up)
*/

-- TEAMS
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  description text DEFAULT '',
  join_code text UNIQUE NOT NULL,
  code_active boolean DEFAULT true,
  region text DEFAULT '',
  monthly_target numeric(14,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon can select teams" ON teams FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert teams" ON teams FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update teams" ON teams FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can delete teams" ON teams FOR DELETE TO anon USING (true);

-- TEAM JOIN REQUESTS
CREATE TABLE IF NOT EXISTS team_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_name text NOT NULL DEFAULT '',
  requester_email text DEFAULT '',
  reason text DEFAULT '',
  estimated_members integer DEFAULT 0,
  target_region text DEFAULT '',
  status text DEFAULT 'pending',
  rejection_reason text DEFAULT '',
  generated_code text,
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by text DEFAULT ''
);

ALTER TABLE team_join_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon can select requests" ON team_join_requests FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert requests" ON team_join_requests FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update requests" ON team_join_requests FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can delete requests" ON team_join_requests FOR DELETE TO anon USING (true);

-- TEAM MEMBERS
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  agent_name text NOT NULL DEFAULT '',
  agent_initials text DEFAULT '',
  agent_email text DEFAULT '',
  agent_phone text DEFAULT '',
  region text DEFAULT '',
  role text DEFAULT 'member',
  is_online boolean DEFAULT false,
  last_seen_at timestamptz DEFAULT now(),
  avatar_color text DEFAULT '#0902b8',
  joined_at timestamptz DEFAULT now(),
  removed_at timestamptz
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon can select members" ON team_members FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert members" ON team_members FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update members" ON team_members FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can delete members" ON team_members FOR DELETE TO anon USING (true);

-- TEAM MESSAGES
CREATE TABLE IF NOT EXISTS team_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  message_type text DEFAULT 'text',
  file_url text DEFAULT '',
  file_name text DEFAULT '',
  file_type text DEFAULT '',
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon can select messages" ON team_messages FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert messages" ON team_messages FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update messages" ON team_messages FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can delete messages" ON team_messages FOR DELETE TO anon USING (true);

-- TEAM MESSAGE REACTIONS
CREATE TABLE IF NOT EXISTS team_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES team_messages(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  emoji text NOT NULL DEFAULT '👍',
  created_at timestamptz DEFAULT now(),
  UNIQUE (message_id, member_id, emoji)
);

ALTER TABLE team_message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon can select reactions" ON team_message_reactions FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert reactions" ON team_message_reactions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update reactions" ON team_message_reactions FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can delete reactions" ON team_message_reactions FOR DELETE TO anon USING (true);

-- TEAM GOALS
CREATE TABLE IF NOT EXISTS team_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  goal_type text DEFAULT 'sales',
  target_value numeric(14,2) NOT NULL DEFAULT 0,
  current_value numeric(14,2) DEFAULT 0,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text DEFAULT 'active',
  created_by text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE team_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon can select goals" ON team_goals FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert goals" ON team_goals FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update goals" ON team_goals FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can delete goals" ON team_goals FOR DELETE TO anon USING (true);

-- TEAM PROJECTS
CREATE TABLE IF NOT EXISTS team_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  description text DEFAULT '',
  priority text DEFAULT 'Moyenne',
  status text DEFAULT 'En cours',
  start_date date,
  end_date date,
  notes text DEFAULT '',
  assigned_member_ids text[] DEFAULT '{}',
  created_by text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE team_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon can select projects" ON team_projects FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert projects" ON team_projects FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update projects" ON team_projects FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can delete projects" ON team_projects FOR DELETE TO anon USING (true);

-- TEAM TASKS
CREATE TABLE IF NOT EXISTS team_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES team_projects(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  assigned_to text DEFAULT '',
  assigned_member_id uuid REFERENCES team_members(id) ON DELETE SET NULL,
  due_date date,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE team_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon can select tasks" ON team_tasks FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert tasks" ON team_tasks FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update tasks" ON team_tasks FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can delete tasks" ON team_tasks FOR DELETE TO anon USING (true);

-- TEAM COMMISSION RECORDS
CREATE TABLE IF NOT EXISTS team_commission_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  gross_sales numeric(14,2) DEFAULT 0,
  commission_rate numeric(5,4) DEFAULT 0.05,
  gross_commission numeric(14,2) DEFAULT 0,
  deductions numeric(14,2) DEFAULT 0,
  net_commission numeric(14,2) DEFAULT 0,
  payment_status text DEFAULT 'pending',
  payment_date date,
  payment_method text DEFAULT '',
  payment_ref text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE team_commission_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon can select commissions" ON team_commission_records FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert commissions" ON team_commission_records FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update commissions" ON team_commission_records FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can delete commissions" ON team_commission_records FOR DELETE TO anon USING (true);

CREATE INDEX IF NOT EXISTS team_members_team_id_idx ON team_members(team_id);
CREATE INDEX IF NOT EXISTS team_messages_team_id_idx ON team_messages(team_id);
CREATE INDEX IF NOT EXISTS team_goals_team_id_idx ON team_goals(team_id);
CREATE INDEX IF NOT EXISTS team_projects_team_id_idx ON team_projects(team_id);
