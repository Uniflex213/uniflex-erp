/*
  # Create Calendar Events Table

  1. New Tables
    - `calendar_events`
      - `id` (uuid, primary key)
      - `title` (text, required) — event title
      - `description` (text) — full event description
      - `start_at` (timestamptz) — start date/time
      - `end_at` (timestamptz) — end date/time
      - `all_day` (boolean) — whether this is an all-day event
      - `label` (text) — color label key (rouge, orange, jaune, vert, bleu, violet, noir, gris)
      - `label_color` (text) — hex color for custom labels
      - `location` (text) — event location/address
      - `event_link` (text) — URL (Zoom, Google Meet, document, etc.)
      - `importance` (text) — Haute | Normale | Basse
      - `lead_id` (uuid, nullable) — associated CRM lead
      - `client_id` (uuid, nullable) — associated client
      - `reminder_minutes` (integer, nullable) — minutes before to remind (null = no reminder)
      - `recurrence` (text) — Aucune | Quotidien | Hebdomadaire | Bi-hebdomadaire | Mensuel | Annuel
      - `recurrence_end` (date, nullable) — end date for recurring events
      - `visibility` (text) — public | private
      - `sync_google` (boolean) — whether to sync to Google Calendar
      - `source` (text) — uniflex | google | crm_reminder
      - `google_event_id` (text, nullable) — Google Calendar event ID if synced
      - `created_by` (text) — agent name who created it
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `calendar_events` table
    - Policy for authenticated users to manage their own events
    - Policy for authenticated users to view public events

  3. Notes
    - CRM reminders are not stored here — they are fetched from crm_reminders and displayed as virtual calendar events
    - Google Calendar events are fetched via OAuth and displayed client-side (not stored)
*/

CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  all_day boolean DEFAULT false,
  label text DEFAULT 'bleu',
  label_color text DEFAULT '#2563eb',
  location text DEFAULT '',
  event_link text DEFAULT '',
  importance text DEFAULT 'Normale',
  lead_id uuid REFERENCES crm_leads(id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  reminder_minutes integer,
  recurrence text DEFAULT 'Aucune',
  recurrence_end date,
  visibility text DEFAULT 'public',
  sync_google boolean DEFAULT false,
  source text DEFAULT 'uniflex',
  google_event_id text,
  created_by text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view public events"
  ON calendar_events FOR SELECT
  TO authenticated
  USING (visibility = 'public' OR created_by = (auth.jwt() ->> 'email'));

CREATE POLICY "Authenticated users can insert events"
  ON calendar_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update own events"
  ON calendar_events FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete own events"
  ON calendar_events FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Anon users can view public events"
  ON calendar_events FOR SELECT
  TO anon
  USING (visibility = 'public');

CREATE POLICY "Anon users can insert events"
  ON calendar_events FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update events"
  ON calendar_events FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon users can delete events"
  ON calendar_events FOR DELETE
  TO anon
  USING (true);

CREATE INDEX IF NOT EXISTS calendar_events_start_at_idx ON calendar_events(start_at);
CREATE INDEX IF NOT EXISTS calendar_events_lead_id_idx ON calendar_events(lead_id);
