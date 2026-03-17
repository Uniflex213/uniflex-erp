-- Notifications internes Uniflex
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',          -- info, lead, order, sample, dispute, message
  title text NOT NULL,
  message text,
  read boolean NOT NULL DEFAULT false,
  reference_type text,                        -- lead, order, sample, dispute, conversation
  reference_id text,                          -- id de l'objet référencé
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- User can only see their own notifications
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- User can update (mark read) their own notifications
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- User can delete their own notifications
CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Insert: authenticated users can create notifications (for triggers / edge functions)
-- In production, restrict to service_role or specific functions
CREATE POLICY "notifications_insert_authenticated" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Helper function to create a notification
CREATE OR REPLACE FUNCTION notify_user(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text DEFAULT NULL,
  p_ref_type text DEFAULT NULL,
  p_ref_id text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  notif_id uuid;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
  VALUES (p_user_id, p_type, p_title, p_message, p_ref_type, p_ref_id)
  RETURNING id INTO notif_id;
  RETURN notif_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION notify_user TO authenticated;
