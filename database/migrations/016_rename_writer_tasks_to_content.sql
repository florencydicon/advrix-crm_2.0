-- Migration 016: Rename old Writer Content tasks to their actual content for clarity
-- After the content-title swap fix, new Writer submissions are renamed on submit.
-- This backfills already-completed/submitted Writer tasks that still show generic "Static Post 01 — Content & Copy".
UPDATE tasks
SET title = LEFT(TRIM(SPLIT_PART(content, E'\n', 1)), 80)
WHERE role_key = 'WRITER'
  AND title LIKE '% — Content & Copy'
  AND content IS NOT NULL
  AND LENGTH(TRIM(content)) >= 3
  AND TRIM(SPLIT_PART(content, E'\n', 1)) <> title;
