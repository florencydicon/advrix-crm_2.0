-- 029: Content lifecycle status — independent content-hub tracking per task.
--
-- Adds a single nullable TEXT column to the EXISTING tasks table (no new
-- table, no changes to the ultra-lean task status flow). NULL means "Pending"
-- in the UI. Content tasks are those whose deliverable type carries a
-- content_role (Client -> Project/Task -> Content Hub; no orphans possible).
--
-- Allowed values (enforced in application code, kept free-form in DB for
-- forward-compatibility):
--   pending | in_process | approval | designer_completed | uploaded_scheduled

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS content_status TEXT;

CREATE INDEX IF NOT EXISTS idx_tasks_content_status ON tasks(content_status);

-- Backfill: existing content-bearing tasks start at Pending.
UPDATE tasks t
SET content_status = 'pending'
FROM project_deliverables pd
JOIN deliverable_types dt ON dt.key = pd.category_key
WHERE t.deliverable_id = pd.id
  AND dt.content_role IS NOT NULL
  AND t.content_status IS NULL;
