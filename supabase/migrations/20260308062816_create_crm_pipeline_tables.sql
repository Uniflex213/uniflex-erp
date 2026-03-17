/*
  # CRM Pipeline Team Tables

  1. New Tables
    - `crm_leads` — main leads table with all lead info
    - `crm_activities` — timeline of activities per lead
    - `crm_reminders` — reminders/tasks per lead
    - `crm_files` — files attached to leads

  2. Security
    - RLS enabled on all tables
    - Anon users can read/write for demo purposes (no auth implemented yet)

  3. Notes
    - leads have stage, temperature, type, source fields
    - activities have a type enum with all supported interaction types
    - reminders support recurrence
*/

CREATE TABLE IF NOT EXISTS crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_first_name text NOT NULL DEFAULT '',
  contact_last_name text NOT NULL DEFAULT '',
  contact_title text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  website text DEFAULT '',
  address text DEFAULT '',
  region text DEFAULT '',
  postal_code text DEFAULT '',
  type text NOT NULL DEFAULT 'Installateur',
  source text DEFAULT 'Cold call',
  temperature text NOT NULL DEFAULT 'Warm',
  stage text NOT NULL DEFAULT 'Nouveau Lead',
  estimated_value numeric DEFAULT 0,
  monthly_volume numeric DEFAULT 0,
  products_interest text[] DEFAULT '{}',
  closing_probability integer DEFAULT 25,
  target_closing_date date,
  annual_revenue_goal numeric DEFAULT 0,
  monthly_volume_goal numeric DEFAULT 0,
  notes text DEFAULT '',
  assigned_agent_id text DEFAULT '',
  assigned_agent_name text DEFAULT '',
  assigned_agent_initials text DEFAULT '',
  assigned_agent_color text DEFAULT '#0902b8',
  last_activity_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can select crm_leads"
  ON crm_leads FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert crm_leads"
  ON crm_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update crm_leads"
  ON crm_leads FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete crm_leads"
  ON crm_leads FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'Note',
  title text DEFAULT '',
  description text DEFAULT '',
  call_duration integer,
  call_result text,
  email_subject text,
  meeting_location text,
  meeting_duration integer,
  meeting_attendees text,
  proposal_amount numeric,
  sample_products text,
  sample_qty integer,
  loss_reason text,
  stage_from text,
  stage_to text,
  logged_by_name text DEFAULT '',
  logged_by_initials text DEFAULT '',
  activity_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can select crm_activities"
  ON crm_activities FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert crm_activities"
  ON crm_activities FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update crm_activities"
  ON crm_activities FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete crm_activities"
  ON crm_activities FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS crm_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  title text NOT NULL,
  reminder_at timestamptz NOT NULL,
  priority text NOT NULL DEFAULT 'Moyenne',
  recurrence text NOT NULL DEFAULT 'Aucune',
  notes text DEFAULT '',
  completed boolean DEFAULT false,
  completed_at timestamptz,
  assigned_agent_name text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE crm_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can select crm_reminders"
  ON crm_reminders FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert crm_reminders"
  ON crm_reminders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update crm_reminders"
  ON crm_reminders FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete crm_reminders"
  ON crm_reminders FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS crm_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  name text NOT NULL,
  size integer DEFAULT 0,
  type text DEFAULT '',
  url text DEFAULT '',
  generated_by_uniflex boolean DEFAULT false,
  uploaded_by text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE crm_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can select crm_files"
  ON crm_files FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert crm_files"
  ON crm_files FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update crm_files"
  ON crm_files FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete crm_files"
  ON crm_files FOR DELETE
  TO anon, authenticated
  USING (true);
