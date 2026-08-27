-- Migration 015: Priority ordering for team allocation
-- Allows PM to drag-reorder team members; auto-assign next follows this order instead of fixed Writer->Designer flow.
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS position INT NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_assignments_position ON assignments(project_id, position, created_at);
-- Backfill existing rows with insertion order as position
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at ASC, id ASC) - 1 AS rn
  FROM assignments
)
UPDATE assignments SET position = ordered.rn FROM ordered WHERE assignments.id = ordered.id;
