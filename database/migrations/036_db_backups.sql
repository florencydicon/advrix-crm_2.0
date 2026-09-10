-- 036: Database backups & storage monitoring
-- Stores full SQL dumps so SUPER_ADMIN can download them later (including the
-- monthly auto-backup created by the Vercel cron). Also holds the configured
-- storage limit / alert thresholds.

CREATE TABLE IF NOT EXISTS db_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL DEFAULT 'manual',              -- manual | monthly
  filename TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  sql_content TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_db_backups_created ON db_backups (created_at DESC);

CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  max_storage_bytes BIGINT NOT NULL DEFAULT 536870912,   -- 512 MB (Neon free tier)
  storage_alert_pct INTEGER NOT NULL DEFAULT 90,          -- % of limit that triggers "almost full"
  last_storage_alert_at TIMESTAMPTZ,
  storage_checked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;