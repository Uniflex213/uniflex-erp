/*
  # Add follow_up_notes to sample_requests

  1. Changes
    - Adds `follow_up_notes` (text) column to `sample_requests` to store detailed agent notes on the follow-up outcome
    - Column is nullable with empty string default to avoid breaking existing rows

  2. Notes
    - The column was referenced in frontend code but missing from the DB schema
    - No RLS changes required (existing policies cover this table)
*/

ALTER TABLE sample_requests
  ADD COLUMN IF NOT EXISTS follow_up_notes text DEFAULT '';
