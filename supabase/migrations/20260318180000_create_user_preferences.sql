-- user_preferences: stores per-user settings like notes, widget order, etc.
-- Replaces localStorage so data survives across browsers/devices.
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  personal_notes text DEFAULT '',
  dashboard_widgets jsonb DEFAULT '[]'::jsonb,
  dashboard_widget_order jsonb DEFAULT '[]'::jsonb,
  dashboard_sales_period text DEFAULT 'monthly',
  workstation_notes text DEFAULT '',
  workstation_widgets jsonb DEFAULT '[]'::jsonb,
  workstation_widget_order jsonb DEFAULT '[]'::jsonb,
  workstation_personal_goals jsonb DEFAULT '{}'::jsonb,
  workstation_sticky_notes jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: each user can only read/write their own preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own preferences"
  ON user_preferences
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
