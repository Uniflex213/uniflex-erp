/*
  # Fix pickup_ticket_counter month_year column

  ## Problem
  The `pickup_ticket_counter` table has a `month_year` column that is NOT NULL
  with no default value. When the app tries to insert a new counter row for
  a new period, the insert fails silently because `month_year` is never provided
  by the application code (it uses the `period` column instead).

  ## Fix
  Add a default empty string to `month_year` so inserts succeed without
  needing to provide this legacy column.
*/

ALTER TABLE pickup_ticket_counter
  ALTER COLUMN month_year SET DEFAULT '';
