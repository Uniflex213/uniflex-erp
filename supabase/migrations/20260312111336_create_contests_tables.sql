/*
  # Create Contests System Tables

  1. New Tables
    - `contests`
      - `id` (uuid, primary key)
      - `title` (text) - Contest name
      - `description` (text) - Contest description
      - `prize_description` (text) - Description of the prize
      - `prize_value` (numeric) - Monetary value of the prize
      - `start_date` (timestamptz) - When the contest begins
      - `end_date` (timestamptz) - When the contest ends
      - `scoring_rule` (text) - How points are calculated (sales_total, new_clients, orders_count, custom_points)
      - `status` (text) - Current status (draft, active, completed, cancelled)
      - `min_participants` (integer) - Minimum participants required
      - `created_by` (uuid) - Admin who created the contest
      - `owner_id` (uuid) - Row owner for RLS
      - `created_at` / `updated_at` (timestamptz)
    - `contest_participants`
      - `id` (uuid, primary key)
      - `contest_id` (uuid, FK to contests)
      - `user_id` (uuid, FK to profiles)
      - `total_points` (numeric) - Accumulated points
      - `current_rank` (integer) - Current position
      - `opted_in_at` (timestamptz) - When user joined
      - `owner_id` (uuid) - Row owner for RLS
    - `contest_point_events`
      - `id` (uuid, primary key)
      - `contest_id` (uuid, FK to contests)
      - `user_id` (uuid, FK to profiles)
      - `event_type` (text) - Type of event (sale, new_client, order, manual_adjustment, bonus)
      - `points` (numeric) - Points awarded (can be negative for deductions)
      - `reference_id` (text) - Optional link to the triggering entity
      - `description` (text) - Human-readable description
      - `created_by` (uuid) - Who awarded the points
      - `owner_id` (uuid)
    - `contest_prizes`
      - `id` (uuid, primary key)
      - `contest_id` (uuid, FK to contests)
      - `rank_from` (integer) - Starting rank for this prize tier
      - `rank_to` (integer) - Ending rank for this prize tier
      - `prize_description` (text)
      - `prize_value` (numeric)

  2. Security
    - RLS enabled on all tables
    - Admins/god_admins can manage contests
    - Authenticated users can view active contests and their own participation

  3. Indexes
    - contest_participants: contest_id, user_id
    - contest_point_events: contest_id, user_id
    - contest_prizes: contest_id
*/

-- Contests table
CREATE TABLE IF NOT EXISTS contests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  prize_description text NOT NULL DEFAULT '',
  prize_value numeric NOT NULL DEFAULT 0,
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz NOT NULL DEFAULT now(),
  scoring_rule text NOT NULL DEFAULT 'custom_points',
  status text NOT NULL DEFAULT 'draft',
  min_participants integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  owner_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contests ENABLE ROW LEVEL SECURITY;

-- Contest participants table
CREATE TABLE IF NOT EXISTS contest_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  total_points numeric NOT NULL DEFAULT 0,
  current_rank integer NOT NULL DEFAULT 0,
  opted_in_at timestamptz NOT NULL DEFAULT now(),
  owner_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contest_id, user_id)
);

ALTER TABLE contest_participants ENABLE ROW LEVEL SECURITY;

-- Contest point events table
CREATE TABLE IF NOT EXISTS contest_point_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  event_type text NOT NULL DEFAULT 'manual_adjustment',
  points numeric NOT NULL DEFAULT 0,
  reference_id text,
  description text NOT NULL DEFAULT '',
  created_by uuid REFERENCES auth.users(id),
  owner_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contest_point_events ENABLE ROW LEVEL SECURITY;

-- Contest prizes table
CREATE TABLE IF NOT EXISTS contest_prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  rank_from integer NOT NULL DEFAULT 1,
  rank_to integer NOT NULL DEFAULT 1,
  prize_description text NOT NULL DEFAULT '',
  prize_value numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contest_prizes ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contest_participants_contest ON contest_participants(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_participants_user ON contest_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_contest_point_events_contest ON contest_point_events(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_point_events_user ON contest_point_events(user_id);
CREATE INDEX IF NOT EXISTS idx_contest_prizes_contest ON contest_prizes(contest_id);
CREATE INDEX IF NOT EXISTS idx_contests_status ON contests(status);

-- RLS Policies for contests
CREATE POLICY "Admins can manage contests"
  ON contests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'god_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'god_admin')
    )
  );

CREATE POLICY "Users can view active contests"
  ON contests FOR SELECT
  TO authenticated
  USING (status = 'active');

-- RLS Policies for contest_participants
CREATE POLICY "Admins can manage contest participants"
  ON contest_participants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'god_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'god_admin')
    )
  );

CREATE POLICY "Users can view their own participation"
  ON contest_participants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view participants in active contests"
  ON contest_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contests
      WHERE contests.id = contest_participants.contest_id
      AND contests.status = 'active'
    )
  );

-- RLS Policies for contest_point_events
CREATE POLICY "Admins can manage point events"
  ON contest_point_events FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'god_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'god_admin')
    )
  );

CREATE POLICY "Users can view their own point events"
  ON contest_point_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view point events in active contests"
  ON contest_point_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contests
      WHERE contests.id = contest_point_events.contest_id
      AND contests.status = 'active'
    )
  );

-- RLS Policies for contest_prizes
CREATE POLICY "Admins can manage prizes"
  ON contest_prizes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'god_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'god_admin')
    )
  );

CREATE POLICY "Users can view prizes for active contests"
  ON contest_prizes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contests
      WHERE contests.id = contest_prizes.contest_id
      AND contests.status = 'active'
    )
  );
