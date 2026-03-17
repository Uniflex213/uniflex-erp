/*
  # Email Messages Cache Table

  ## Purpose
  Caches emails fetched from IMAP (Hostinger) for each user, enabling fast inbox display
  without re-connecting to IMAP on every page load.

  ## New Tables
  - `email_messages` — stores per-user email headers and body content
    - uid: IMAP UID (integer, unique per user+mailbox)
    - mailbox: folder name (INBOX, Sent, Drafts, Trash, etc.)
    - message_id: RFC 2822 Message-ID header
    - from_address / from_name: sender info
    - to_addresses / cc_addresses: JSONB arrays of {name, address}
    - subject: email subject
    - body_html / body_text: email body (populated on first open)
    - received_at: email date
    - is_read / is_starred / is_deleted: flags
    - has_attachments: boolean flag
    - fetched_at: when the cache entry was last refreshed

  ## Security
  - RLS enabled, users can only access their own emails
*/

CREATE TABLE IF NOT EXISTS email_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  uid bigint NOT NULL,
  mailbox text NOT NULL DEFAULT 'INBOX',
  message_id text,
  from_address text DEFAULT '',
  from_name text DEFAULT '',
  to_addresses jsonb DEFAULT '[]',
  cc_addresses jsonb DEFAULT '[]',
  subject text DEFAULT '',
  body_html text,
  body_text text,
  received_at timestamptz,
  is_read boolean DEFAULT false,
  is_starred boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  has_attachments boolean DEFAULT false,
  fetched_at timestamptz DEFAULT now(),
  UNIQUE(user_id, uid, mailbox)
);

ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email messages"
  ON email_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email messages"
  ON email_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email messages"
  ON email_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own email messages"
  ON email_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_email_messages_user_mailbox ON email_messages(user_id, mailbox);
CREATE INDEX IF NOT EXISTS idx_email_messages_received ON email_messages(user_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_uid ON email_messages(user_id, uid, mailbox);
