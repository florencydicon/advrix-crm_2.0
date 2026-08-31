-- Global To-Do List (Admin / PM only).
--   * executors: Admin / PM create todos.
--   * Each todo can be assigned to an employee (assignee_id) OR be a personal
--     note for the creator (assignee_id IS NULL, scope defaults to 'personal').
--   * Filters (Today / This Week / This Year) are driven by due_date.
CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT,
  scope TEXT NOT NULL DEFAULT 'personal',   -- 'personal' | 'assigned'
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  due_date DATE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_todos_assignee ON todos(assignee_id);
CREATE INDEX IF NOT EXISTS idx_todos_created_by ON todos(created_by);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
