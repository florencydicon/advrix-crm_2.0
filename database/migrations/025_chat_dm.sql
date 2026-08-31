-- 025: Chat overhaul — 1:1 direct messages + groups (Super Admin creates groups).
--
-- Adds a conversations model on top of the existing chat_messages table.
--   * 'team' channel = messages where conversation_id IS NULL (existing global chat).
--   * 'dm'   = pair of users (dm_key = sorted "userA:userB").
--   * 'group' = named group created by Super Admin.
-- Existing chat_messages gains sender_name (denormalized display) + conversation_id.

ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS conversation_id UUID;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS recipient_id UUID;

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,                       -- 'dm' | 'group'
  name TEXT,                                 -- group name (groups only)
  dm_key TEXT,                               -- sorted "userA:userB" for dms
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_dm_key ON conversations(dm_key) WHERE dm_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conv_members_user ON conversation_members(user_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_members_conv ON conversation_members(conversation_id);
