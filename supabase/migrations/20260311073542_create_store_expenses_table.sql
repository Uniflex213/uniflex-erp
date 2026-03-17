/*
  # Create store expenses table for profit tracking

  1. New Tables
    - `store_expenses`
      - `id` (uuid, primary key)
      - `document_type` (text) - 'pickup' or 'order' or 'general'
      - `document_id` (text, nullable) - FK reference to pickup_tickets or orders
      - `expense_type` (text) - 'sample', 'dispute', 'lost_product', 'transport', 'other'
      - `description` (text) - description of the expense
      - `amount` (numeric) - expense amount in CAD
      - `expense_date` (timestamptz) - when expense occurred
      - `recorded_by` (text) - who recorded the expense
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `store_expenses`
    - Add anon CRUD policies

  3. Notes
    - Profit per document = selling price - (cost_price * quantity for each item) - related expenses
    - Weekly profit = sum of profits for all billed documents in the week
    - cost_price already exists on sale_products table
*/

CREATE TABLE IF NOT EXISTS store_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL DEFAULT 'general' CHECK (document_type IN ('pickup', 'order', 'general')),
  document_id text,
  expense_type text NOT NULL DEFAULT 'other' CHECK (expense_type IN ('sample', 'dispute', 'lost_product', 'transport', 'other')),
  description text DEFAULT '',
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
  expense_date timestamptz NOT NULL DEFAULT now(),
  recorded_by text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE store_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read store_expenses"
  ON store_expenses FOR SELECT
  TO anon
  USING (id IS NOT NULL);

CREATE POLICY "Anon can insert store_expenses"
  ON store_expenses FOR INSERT
  TO anon
  WITH CHECK (id IS NOT NULL);

CREATE POLICY "Anon can update store_expenses"
  ON store_expenses FOR UPDATE
  TO anon
  USING (id IS NOT NULL)
  WITH CHECK (id IS NOT NULL);

CREATE POLICY "Anon can delete store_expenses"
  ON store_expenses FOR DELETE
  TO anon
  USING (id IS NOT NULL);
