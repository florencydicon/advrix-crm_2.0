-- ============================================================
-- Attendance & Leave System Migration
-- Run via: node scripts/attendance_migration.mjs
-- ============================================================

-- ---------- Attendance ----------
CREATE TABLE IF NOT EXISTS attendance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  punch_in      TIMESTAMPTZ,
  punch_out     TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'present',
  hours_worked  NUMERIC(4,2) DEFAULT 0,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);

-- ---------- Leaves ----------
CREATE TABLE IF NOT EXISTS leaves (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type    TEXT NOT NULL,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  days          INT NOT NULL DEFAULT 1,
  reason        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  approved_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at   TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leaves_user ON leaves(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status);
CREATE INDEX IF NOT EXISTS idx_leaves_dates ON leaves(start_date, end_date);

-- ---------- Scalability indexes ----------
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
