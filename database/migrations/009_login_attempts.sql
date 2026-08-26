-- Database-backed brute-force throttle for login attempts.
-- Survives cold starts and works across all server instances.

CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time
  ON login_attempts (lower(email), created_at);

-- Auto-cleanup: remove records older than 1 hour
-- (also enforced in app code, but this is the safety net)
DELETE FROM login_attempts WHERE created_at < now() - interval '1 hour';
