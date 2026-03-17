/*
  # Enable Realtime on messaging tables

  1. Changes
    - Add `conversations`, `messages`, and `conversation_participants` to the
      `supabase_realtime` publication so that postgres_changes subscriptions
      fire correctly in the frontend.

  2. Important Notes
    - Without this, the real-time messaging subscriptions receive no events
    - Only the three core messaging tables are added to keep publication lean
*/

ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
