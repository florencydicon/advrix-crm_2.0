-- 030: Standalone Content Management table.
--
-- Fully independent of the Project Pipeline (no FK to projects/tasks).
-- Strict flow: Client (clients table) -> Content item -> Active/History tabs.
-- Status is two-state: 'active' (default) | 'completed' (History tab).

CREATE TABLE IF NOT EXISTS contents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  body          TEXT,
  remarks       TEXT,
  assignee_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contents_client ON contents(client_id);
CREATE INDEX IF NOT EXISTS idx_contents_status ON contents(status);
CREATE INDEX IF NOT EXISTS idx_contents_assignee ON contents(assignee_id);
