-- 037: Native Android FCM device tokens (Capacitor app)
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL DEFAULT 'android',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fcm_token_user ON fcm_tokens(user_id);