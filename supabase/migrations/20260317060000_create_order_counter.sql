-- Create order_counter table (like pickup_ticket_counter)
-- Ensures unique sequential order numbers even with concurrent users
CREATE TABLE IF NOT EXISTS order_counter (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  period text NOT NULL DEFAULT to_char(now(), 'MMYY'),
  last_number int NOT NULL DEFAULT 0,
  UNIQUE (period)
);

ALTER TABLE order_counter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_order_counter" ON order_counter
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_order_counter" ON order_counter
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_order_counter" ON order_counter
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Function to atomically get next order number
CREATE OR REPLACE FUNCTION get_next_order_number(p_period text DEFAULT to_char(now(), 'MMYY'))
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_num int;
BEGIN
  INSERT INTO order_counter (period, last_number)
  VALUES (p_period, 1)
  ON CONFLICT (period)
  DO UPDATE SET last_number = order_counter.last_number + 1
  RETURNING last_number INTO next_num;

  RETURN next_num;
END;
$$;

GRANT EXECUTE ON FUNCTION get_next_order_number TO authenticated;
