-- ============================================================
-- 019 — Strict activity logging + employee WhatsApp phone
-- Punches, leave requests & approval decisions get a permanent
-- audit trail, users gain a contact phone for wa.me deep links.
-- ============================================================

-- Audit trail for every attendance / leave / notification action.
CREATE TABLE IF NOT EXISTS activity_log (
  id            BIGSERIAL PRIMARY KEY,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_name    TEXT NOT NULL DEFAULT '',
  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL DEFAULT 'system',
  entity_id     TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_actor ON activity_log(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(entity_type, entity_id);

-- Employee contact number used for the free wa.me deep-link flow.
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);