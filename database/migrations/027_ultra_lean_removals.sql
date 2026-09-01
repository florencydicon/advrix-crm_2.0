-- 027: Ultra-lean architecture removal
--
-- STATUS: APPLIED to Neon project blue-moon-60418368 (neondb, main) on this
-- session — the DROP / UPDATE statements below were executed against the live
-- database and are kept here for reproducibility.
--
-- Per the final architecture, the CRM is a pure status-tracking pipeline.
-- Internal communication (chat), notes, and to-do lists are permanently removed;
-- all team communication happens externally (WhatsApp) and files are hosted
-- externally. This drops the corresponding tables and strips the now-defunct
-- permission strings from persisted role arrays.

-- Drop chat tables (chat_messages, chat_attachments, conversations,
-- conversation_members) — 021, 023, 025.
DROP TABLE IF EXISTS conversation_members;
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS chat_attachments;
DROP TABLE IF EXISTS chat_messages;

-- Drop notes — 022.
DROP TABLE IF EXISTS notes;

-- Drop to-dos — 024.
DROP TABLE IF EXISTS todos;

-- Strip now-removed permissions from persisted role arrays.
UPDATE roles SET permissions = array_remove(permissions, 'chat:use')   WHERE permissions IS NOT NULL;
UPDATE roles SET permissions = array_remove(permissions, 'notes:manage') WHERE permissions IS NOT NULL;
UPDATE roles SET permissions = array_remove(permissions, 'todos:manage') WHERE permissions IS NOT NULL;
-- Drop any empty arrays back to NULL so role defaults are inherited.
UPDATE roles SET permissions = NULL WHERE permissions = '{}';

-- Also strip the removed permissions from any user-level overrides.
UPDATE users SET permissions = array_remove(permissions, 'chat:use')    WHERE permissions IS NOT NULL;
UPDATE users SET permissions = array_remove(permissions, 'notes:manage') WHERE permissions IS NOT NULL;
UPDATE users SET permissions = array_remove(permissions, 'todos:manage') WHERE permissions IS NOT NULL;
UPDATE users SET permissions = NULL WHERE permissions = '{}';
