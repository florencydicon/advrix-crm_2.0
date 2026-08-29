-- Migration 017: Unified Sequential Task Workflow
-- Replaces role-fragmented sub-tasks (content "_c_" + visual "_v_") and
-- role-based conditional routing with ONE unified task block per deliverable.
-- The task travels sequentially through the exact team members the PM assigns,
-- gated by an initial brief approval and an approval before every handoff.
-- Completion is automatic after the final approval, with a manual override.

-- A unified task has no fixed role: role_key now reflects the CURRENT member's
-- role and is null until the team is allotted (brief approved).
ALTER TABLE tasks ALTER COLUMN role_key DROP NOT NULL;

-- Step tracker: index into the ordered task_assignees sequence (0-based).
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS current_step INT NOT NULL DEFAULT 0;
-- Initial task-brief approval (Step 2) happens before any team allottment.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS brief_approved_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS brief_approved_at TIMESTAMPTZ;

-- Sequence order for task_assignees (exact order the PM added each member).
ALTER TABLE task_assignees ADD COLUMN IF NOT EXISTS position INT NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_task_assignees_seq ON task_assignees(task_id, position, added_at);

-- Preserve existing membership order as the sequence for old tasks.
WITH ordered AS (
  SELECT task_id, user_id,
         ROW_NUMBER() OVER (PARTITION BY task_id ORDER BY added_at ASC, user_id ASC) - 1 AS rn
  FROM task_assignees
)
UPDATE task_assignees SET position = ordered.rn
FROM ordered
WHERE task_assignees.task_id = ordered.task_id
  AND task_assignees.user_id = ordered.user_id;

-- Per-stage work history: every submission + approval gate per step so later
-- members can clearly see all previously approved content/assets.
CREATE TABLE IF NOT EXISTS task_contributions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  step            INT NOT NULL DEFAULT 0,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name       TEXT,
  role_label      TEXT,
  content         TEXT,
  status          TEXT NOT NULL DEFAULT 'submitted', -- submitted | needs_improvement | approved
  review_comment  TEXT,
  reviewed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_task_contributions_task ON task_contributions(task_id, step);