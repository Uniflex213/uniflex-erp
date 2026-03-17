/*
  # Add logbook columns to activity_logs

  Adds entity_type, entity_id, entity_name columns to activity_logs for
  structured logbook display. Also adds indexes for fast filtering by
  module, entity type, entity name, and action.
*/

ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id   text,
  ADD COLUMN IF NOT EXISTS entity_name text;

CREATE INDEX IF NOT EXISTS activity_logs_module_idx      ON activity_logs(module);
CREATE INDEX IF NOT EXISTS activity_logs_entity_type_idx ON activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS activity_logs_entity_name_idx ON activity_logs(entity_name);
CREATE INDEX IF NOT EXISTS activity_logs_action_idx      ON activity_logs(action);
