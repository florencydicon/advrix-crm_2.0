-- 008: Add remarks field to tasks for collaborative content input.
-- PM, Super Admin, and Sales team can all input and edit remarks.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS remarks TEXT;
