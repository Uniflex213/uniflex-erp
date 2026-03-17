/*
  # Add Follow-up Result Fields to Sample Requests

  Adds structured follow-up result tracking fields to the sample_requests table.

  ## New Columns
  - `follow_up_result` — Enum-like text: "Positif", "Neutre", or "Négatif"
  - `follow_up_next_step` — For Positif results: next step selected (e.g., "Prêt à commander")
  - `follow_up_reason` — For Neutre/Négatif results: reason selected from dropdown
  - `follow_up_agent_name` — Name of the agent who completed the follow-up
  - `follow_up_reminder_date` — Optional reminder date for Neutre results (triggers a new reminder)

  ## Purpose
  Enables the full structured follow-up workflow and analytics:
  - Track positive vs neutral vs negative outcomes per sample
  - Admin can see exact client feedback notes + reason/next step
  - Analytics can compute conversion rates by result type
  - Reminder auto-creation for Neutre results
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sample_requests' AND column_name = 'follow_up_result'
  ) THEN
    ALTER TABLE sample_requests ADD COLUMN follow_up_result text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sample_requests' AND column_name = 'follow_up_next_step'
  ) THEN
    ALTER TABLE sample_requests ADD COLUMN follow_up_next_step text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sample_requests' AND column_name = 'follow_up_reason'
  ) THEN
    ALTER TABLE sample_requests ADD COLUMN follow_up_reason text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sample_requests' AND column_name = 'follow_up_agent_name'
  ) THEN
    ALTER TABLE sample_requests ADD COLUMN follow_up_agent_name text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sample_requests' AND column_name = 'follow_up_reminder_date'
  ) THEN
    ALTER TABLE sample_requests ADD COLUMN follow_up_reminder_date text DEFAULT NULL;
  END IF;
END $$;
