-- 034: Attendance engine — settings, lunch breaks, leave quota
-- Applies idempotently (safe to re-run).

CREATE TABLE IF NOT EXISTS attendance_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  shift_start_time TEXT NOT NULL DEFAULT '10:00',
  shift_end_time TEXT NOT NULL DEFAULT '19:00',
  late_grace_period_mins INTEGER NOT NULL DEFAULT 15,
  minimum_hours_for_half_day NUMERIC(4,2) NOT NULL DEFAULT 4.5,
  minimum_hours_for_full_day NUMERIC(4,2) NOT NULL DEFAULT 8.0,
  monthly_paid_leaves INTEGER NOT NULL DEFAULT 1,
  allowed_break_mins INTEGER NOT NULL DEFAULT 60,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO attendance_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS break_start_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS break_end_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_break_mins INT NOT NULL DEFAULT 0;

ALTER TABLE leaves
  ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT true;