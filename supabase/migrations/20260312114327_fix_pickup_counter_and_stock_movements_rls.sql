/*
  # Fix RLS policies for pickup_ticket_counter and stock_movements

  1. Problem
    - `pickup_ticket_counter` only had RLS policies for the `anon` role.
      Authenticated users could not read/insert/update the counter,
      which broke pickup ticket number generation entirely.
    - `stock_movements` only had `anon` SELECT and INSERT policies.
      Authenticated users could not record stock movements when
      marking pickup tickets as picked-up or cancelled.

  2. Changes
    - Add SELECT, INSERT, UPDATE policies on `pickup_ticket_counter`
      for the `authenticated` role (all store staff need counter access).
    - Add SELECT, INSERT policies on `stock_movements` for the
      `authenticated` role so logged-in users can read and record
      stock movements.

  3. Security
    - Policies are restricted to `authenticated` users only.
    - `pickup_ticket_counter` is an operational counter shared by all
      authenticated store staff -- no per-user ownership needed.
    - `stock_movements` INSERT is restricted to authenticated users.
*/

-- ============================================================
-- pickup_ticket_counter: add authenticated policies
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pickup_ticket_counter'
      AND policyname = 'auth_select_pickup_counter'
  ) THEN
    CREATE POLICY "auth_select_pickup_counter"
      ON pickup_ticket_counter
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pickup_ticket_counter'
      AND policyname = 'auth_insert_pickup_counter'
  ) THEN
    CREATE POLICY "auth_insert_pickup_counter"
      ON pickup_ticket_counter
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pickup_ticket_counter'
      AND policyname = 'auth_update_pickup_counter'
  ) THEN
    CREATE POLICY "auth_update_pickup_counter"
      ON pickup_ticket_counter
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- stock_movements: add authenticated policies
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'stock_movements'
      AND policyname = 'auth_select_stock_movements'
  ) THEN
    CREATE POLICY "auth_select_stock_movements"
      ON stock_movements
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'stock_movements'
      AND policyname = 'auth_insert_stock_movements'
  ) THEN
    CREATE POLICY "auth_insert_stock_movements"
      ON stock_movements
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;
