-- 031: Content "Uploaded" timestamp — when an item was marked completed.
--
-- Adds a single nullable TIMESTAMPTZ to the standalone contents table.
-- Set to now() on transition to 'completed', cleared back to NULL when
-- re-opened to 'active'. Displayed as the "Uploaded" date column.

ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_contents_completed_at ON contents(completed_at);

-- Backfill: items already completed count as uploaded now.
UPDATE contents SET completed_at = updated_at WHERE status = 'completed' AND completed_at IS NULL;
