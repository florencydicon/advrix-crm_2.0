-- 028: Remarks tracking — last-edited-by metadata for the Remarks/Content box.
--
-- STATUS: APPLIED to Neon project blue-moon-60418368 (neondb, main) on this
-- session — the two ALTER TABLE statements below were executed against the live
-- database and are kept here for reproducibility.
--
-- Add two lightweight columns to the EXISTING tasks table (no new table). They
-- record who last edited the Remarks/Content textarea and when, so the pipeline
-- modal can show "Last updated by: [First Name] ([Role]) at [Time]" and support
-- auto-save / Save Text / Send Back author signatures without a comments table.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS remarks_edited_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS remarks_edited_at TIMESTAMPTZ;
