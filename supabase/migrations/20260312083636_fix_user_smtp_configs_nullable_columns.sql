/*
  # Fix user_smtp_configs nullable columns

  1. Changes
    - Set default values for `smtp_email` and `smtp_password_enc` columns
    - These legacy columns are no longer used directly but block inserts due to NOT NULL constraints
*/

ALTER TABLE user_smtp_configs ALTER COLUMN smtp_email SET DEFAULT '';
ALTER TABLE user_smtp_configs ALTER COLUMN smtp_password_enc SET DEFAULT '';
