-- Chat is now a GLOBAL module (not per-project). Allow project_id to be NULL
-- so global messages can live in the same table. Existing project messages keep
-- their project_id.
ALTER TABLE chat_messages ALTER COLUMN project_id DROP NOT NULL;
