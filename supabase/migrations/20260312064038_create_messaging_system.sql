/*
  # Create Messaging System

  Internal real-time messaging between Uniflex users.
  Tables: conversations, conversation_participants, messages, messaging_rules.
  All with RLS policies enforcing participant-only access.
*/

-- ─── conversations ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  last_message_at timestamptz DEFAULT now()
);

-- ─── conversation_participants ──────────────────────────────────
CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at timestamptz DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

-- ─── messages ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ─── messaging_rules ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messaging_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_role text NOT NULL,
  target_role text NOT NULL,
  can_message boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(source_role, target_role)
);

-- ─── indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS messages_conv_created_idx ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS cp_user_idx ON conversation_participants(user_id);

-- ─── RLS ───────────────────────────────────────────────────────
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messaging_rules ENABLE ROW LEVEL SECURITY;

-- conversations: visible to participants
CREATE POLICY "conversation_select"
  ON conversations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "conversation_insert"
  ON conversations FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "conversation_update"
  ON conversations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id AND cp.user_id = auth.uid()
    )
  );

-- conversation_participants
CREATE POLICY "cp_select"
  ON conversation_participants FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = conversation_participants.conversation_id
        AND cp2.user_id = auth.uid()
    )
  );

CREATE POLICY "cp_insert"
  ON conversation_participants FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "cp_update"
  ON conversation_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- messages
CREATE POLICY "messages_select"
  ON messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "messages_insert"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
    )
  );

-- messaging_rules: everyone can read; admins can modify
CREATE POLICY "messaging_rules_select"
  ON messaging_rules FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "messaging_rules_insert"
  ON messaging_rules FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','god_admin'))
  );

CREATE POLICY "messaging_rules_update"
  ON messaging_rules FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','god_admin'))
  );

CREATE POLICY "messaging_rules_delete"
  ON messaging_rules FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','god_admin'))
  );

-- ─── seed default rules ────────────────────────────────────────
INSERT INTO messaging_rules (source_role, target_role, can_message) VALUES
  ('vendeur',   'vendeur',   true),
  ('vendeur',   'admin',     true),
  ('vendeur',   'god_admin', true),
  ('admin',     'vendeur',   true),
  ('admin',     'admin',     true),
  ('admin',     'god_admin', true),
  ('admin',     'manuf',     true),
  ('admin',     'magasin',   true),
  ('god_admin', 'vendeur',   true),
  ('god_admin', 'admin',     true),
  ('god_admin', 'god_admin', true),
  ('god_admin', 'manuf',     true),
  ('god_admin', 'magasin',   true),
  ('manuf',     'admin',     true),
  ('manuf',     'god_admin', true),
  ('manuf',     'manuf',     true),
  ('magasin',   'admin',     true),
  ('magasin',   'god_admin', true),
  ('magasin',   'magasin',   true)
ON CONFLICT (source_role, target_role) DO NOTHING;
