-- 026: Client shared dashboards (restricted magic-link tokens).
--
-- Each row = one secure, revocable share token for exactly one client.
-- Clients open /shared/[token] with NO login and see ONLY their own tasks,
-- with internal fields (priority, remarks, assignee) hidden for privacy.

CREATE TABLE IF NOT EXISTS client_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_shares_client ON client_shares(client_id);
