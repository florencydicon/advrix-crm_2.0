-- Migration 018: One-time team sequence per deliverable
-- The PM sets the ordered team ONCE per deliverable (e.g. "Static Post":
-- Writer -> Designer -> SMM). Every item of that deliverable (01..NN) inherits
-- the exact same sequence automatically, so there is no per-subtask setup.
-- A deliverable with no explicit sequence falls back to the project team order.

CREATE TABLE IF NOT EXISTS deliverable_assignees (
  deliverable_id UUID NOT NULL REFERENCES project_deliverables(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position       INT  NOT NULL DEFAULT 0,
  added_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (deliverable_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_deliverable_assignees_seq ON deliverable_assignees(deliverable_id, position);