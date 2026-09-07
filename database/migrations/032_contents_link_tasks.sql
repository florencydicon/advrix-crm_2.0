-- Migration 032: Link Content Hub items to their Project Pipeline task.
-- Content added in Content Management now creates ONE unified pipeline task
-- under the chosen project (same start → submit → gate approval → handoff flow
-- as deliverable tasks). task_id points the content record at its task so the
-- hub can surface the task's live status.
ALTER TABLE contents ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_contents_task ON contents(task_id);