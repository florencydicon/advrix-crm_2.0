-- ============================================================
-- 042 — App usage & analytics tracking
-- Per-day, per-endpoint record of the app's own read traffic so the
-- admin "Usage & Analytics" page can show which screens drive database
-- egress, and trim them. App-measured data — not Neon's billable figure.
-- ============================================================

CREATE TABLE IF NOT EXISTS app_usage_daily (
  day           DATE NOT NULL,
  endpoint      TEXT NOT NULL,
  requests      INT NOT NULL DEFAULT 0,
  rows_returned BIGINT NOT NULL DEFAULT 0,
  approx_bytes  BIGINT NOT NULL DEFAULT 0,
  duration_ms   BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (day, endpoint)
);

-- Reverse day scan for the reports page.
CREATE INDEX IF NOT EXISTS idx_app_usage_daily_day ON app_usage_daily(day DESC);

-- The Usage & Analytics activity report filters these tables by created_at
-- across ALL users, so the existing (user_id, created_at) indexes are not
-- usable (leading column mismatch) and the query degrades to a sequential
-- scan on every page view. These keep the report range-scans cheap.
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed_at DESC) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_created ON clients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaves_created ON leaves(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_work_logs_created ON daily_work_logs(created_at DESC);

-- Trim the raw daily facts older than 180 days; the dashboard reads the
-- aggregated app_usage_daily rows and never needs ancient days.
-- (Kept as a comment so it runs via cron/pg_cron, not on every request.)
-- DELETE FROM app_usage_daily WHERE day < CURRENT_DATE - INTERVAL '180 days';
