-- ============================================================
-- Advrix CRM 2.0 — Initial Schema
-- Raw SQL for Neon (PostgreSQL). Run via scripts/seed.mjs.
-- NOTE: drops any legacy tables from prior app versions.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS project_deliverables CASCADE;
DROP TABLE IF EXISTS deliverable_types CASCADE;
DROP TABLE IF EXISTS workflow_steps CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS leaves CASCADE;
DROP TABLE IF EXISTS "Attendance" CASCADE;
DROP TABLE IF EXISTS "Client" CASCADE;
DROP TABLE IF EXISTS "Leave" CASCADE;
DROP TABLE IF EXISTS "Payment" CASCADE;
DROP TABLE IF EXISTS "Project" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- ---------- Roles ----------
CREATE TABLE IF NOT EXISTS roles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key           TEXT UNIQUE NOT NULL,
  label         TEXT NOT NULL,
  permissions   TEXT[] NOT NULL DEFAULT '{}',
  dashboard     TEXT NOT NULL DEFAULT 'staff',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Users ----------
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Clients ----------
CREATE TABLE IF NOT EXISTS clients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  company       TEXT,
  email         TEXT,
  phone         TEXT,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Projects ----------
CREATE TABLE IF NOT EXISTS projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending_approval', -- pending_approval | in_progress | completed | rejected
  brief         TEXT,
  deliverables  TEXT,
  deadline      DATE,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Deliverable types (config) ----------
CREATE TABLE IF NOT EXISTS deliverable_types (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key           TEXT UNIQUE NOT NULL,
  label         TEXT NOT NULL,
  content_role  TEXT REFERENCES roles(key) ON DELETE RESTRICT, -- role that drafts copy first (nullable)
  visual_role   TEXT REFERENCES roles(key) ON DELETE RESTRICT, -- role that produces the visual after content (nullable)
  default_qty   INT NOT NULL DEFAULT 1,
  sort          INT NOT NULL DEFAULT 0
);

-- ---------- Project deliverables (structured breakdown) ----------
CREATE TABLE IF NOT EXISTS project_deliverables (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category_key  TEXT NOT NULL,
  category_label TEXT NOT NULL,
  quantity      INT NOT NULL CHECK (quantity >= 1),
  is_custom     BOOLEAN NOT NULL DEFAULT false,
  custom_label  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deliverables_project ON project_deliverables(project_id);

-- ---------- Tasks ----------
CREATE TABLE IF NOT EXISTS tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  step_key      TEXT NOT NULL DEFAULT 'manual',
  group_key     TEXT NOT NULL DEFAULT 'manual',
  role_key      TEXT NOT NULL REFERENCES roles(key) ON DELETE RESTRICT,
  deliverable_id UUID REFERENCES project_deliverables(id) ON DELETE CASCADE,
  sequence      INT NOT NULL DEFAULT 1,
  title         TEXT NOT NULL,
  description   TEXT,
  content       TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',
  -- Status: pending | in_progress | submitted | needs_improvement | client_review
  --         | client_feedback | client_approved | uploading | completed
  priority      TEXT NOT NULL DEFAULT 'medium',
  assigned_to   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  review_comment  TEXT,
  client_feedback TEXT,
  platforms     TEXT[] NOT NULL DEFAULT '{}',
  reviewed_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at   TIMESTAMPTZ,
  due_date      DATE,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);

-- ---------- Workflow (Automation Logic Engine) ----------
CREATE TABLE IF NOT EXISTS workflow_steps (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_key            TEXT NOT NULL,
  group_key           TEXT NOT NULL,
  name                TEXT NOT NULL,
  target_role         TEXT NOT NULL REFERENCES roles(key) ON DELETE RESTRICT,
  title_template      TEXT NOT NULL,
  description_template TEXT NOT NULL DEFAULT '',
  await               TEXT NOT NULL DEFAULT '', -- comma-separated group_keys that must complete first
  sequence            INT NOT NULL DEFAULT 0,
  active              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role_key      TEXT NOT NULL REFERENCES roles(key) ON DELETE RESTRICT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, project_id, role_key)
);

-- ---------- Attendance ----------
CREATE TABLE IF NOT EXISTS attendance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  punch_in      TIMESTAMPTZ,
  punch_out     TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'present', -- present | absent | half_day | late | on_leave
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
  leave_type    TEXT NOT NULL, -- sick | casual | earned | unpaid | emergency
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  days          INT NOT NULL DEFAULT 1,
  reason        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  approved_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at   TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leaves_user ON leaves(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status);
CREATE INDEX IF NOT EXISTS idx_leaves_dates ON leaves(start_date, end_date);

-- ---------- Notifications ----------
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL DEFAULT 'system', -- task | project | leave | attendance | system
  title         TEXT NOT NULL,
  body          TEXT NOT NULL DEFAULT '',
  link          TEXT,
  read          BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);

-- ---------- Scalability indexes ----------
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);