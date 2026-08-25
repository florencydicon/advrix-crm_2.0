-- 006: Persist per-allotment deadlines set in the Team Allotment builder.
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS allotment_deadline DATE;
