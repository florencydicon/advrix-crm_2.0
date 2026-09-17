-- 041: Daily Work Log — date-wise notes for everyone + WhatsApp share
CREATE TABLE IF NOT EXISTS daily_work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_daily_work_logs_user ON daily_work_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_work_logs_date ON daily_work_logs(entry_date);
CREATE INDEX IF NOT EXISTS idx_daily_work_logs_user_date ON daily_work_logs(user_id, entry_date);
