-- 039: Performance indexes for hot paths
-- 1. users: logins query `WHERE lower(email) = lower($1)` — the UNIQUE(email) index is unusable there.
CREATE INDEX IF NOT EXISTS idx_users_lower_email ON users (lower(email));

-- 2. attendance: calendar/grid queries filter by DATE + user
CREATE INDEX IF NOT EXISTS idx_attendance_user_date_lookup ON attendance (user_id, date);

-- 3. leak checks: task status + project filters used by boards
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks (project_id, status);

-- 4. deliverable_assignees by deliverable (common join)
CREATE INDEX IF NOT EXISTS idx_deliv_assignees_deliv ON deliverable_assignees (deliverable_id);