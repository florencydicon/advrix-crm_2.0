-- ============================================================
-- Advrix CRM 2.0 — Migration 003: performance indexes
-- Speeds up the hot paths: pipeline loads, task tables,
-- lead filters, notification badges, attendance reports.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_assignments_project ON assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_leads_owner ON leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_owner_updated ON leads(owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaves_user_dates ON leaves(user_id, start_date);
CREATE INDEX IF NOT EXISTS idx_projects_client_created ON projects(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE read = false;
