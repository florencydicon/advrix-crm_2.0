-- 005: Multi-assignee support for tasks.
-- tasks.assigned_to stays as the primary assignee; task_assignees holds
-- every additional member allocated to the task.
CREATE TABLE IF NOT EXISTS task_assignees (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON task_assignees(user_id);

-- Seed junction from existing primary assignees so nothing is lost.
INSERT INTO task_assignees (task_id, user_id)
SELECT id, assigned_to FROM tasks WHERE assigned_to IS NOT NULL
ON CONFLICT (task_id, user_id) DO NOTHING;
