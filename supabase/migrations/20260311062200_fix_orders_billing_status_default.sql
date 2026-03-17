/*
  # Fix orders billing_status default value

  Changes the default for orders.billing_status from French 'Non-facturé'
  to English 'unbilled' to match the pattern used by pickup_tickets.
*/
ALTER TABLE orders ALTER COLUMN billing_status SET DEFAULT 'unbilled';
UPDATE orders SET billing_status = 'unbilled' WHERE billing_status = 'Non-facturé';
