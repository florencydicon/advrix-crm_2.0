-- 042: Track task row-level changes for cheap board change-detection.
-- Adds updated_at (filled on INSERT by default) and bumps it on EVERY
-- UPDATE via a BEFORE UPDATE trigger, so the board fingerprint can detect
-- any change without extra client bookkeeping in mutation code.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION bump_tasks_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON tasks;
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION bump_tasks_updated_at();