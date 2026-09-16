-- Reference / Drive links per subtask + workflow enhancements
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reference_links TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS client_feedback TEXT;

-- Ensure platforms column exists (already TEXT[] but verify)
-- No change to content_management; it will be dropped in next migration if needed

-- Index for reference_links search (optional)
-- CREATE INDEX IF NOT EXISTS idx_tasks_reference_links ON tasks USING gin(to_tsvector('english', reference_links));

-- Expand status check if any (ensure new statuses allowed: client_feedback, uploading etc already in app)
-- No constraint on status; keep free-form

-- For bulk paste: no schema change
