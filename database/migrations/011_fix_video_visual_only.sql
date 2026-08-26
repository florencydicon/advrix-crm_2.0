-- Migration 011: Video Shoot / Video Edit are visual-only (no Writer step)
-- The yellow pill "Content Writer" on Video Shoot was wrong — it should be Videographer/Editor.
-- This migrates existing DB and fixes seed drift between seed.mjs (WRITER) and seed_data.mjs (NULL).

UPDATE deliverable_types SET content_role = NULL WHERE key = 'video_shoot' AND content_role IS NOT NULL;
UPDATE deliverable_types SET content_role = NULL WHERE key = 'video_edit' AND content_role IS NOT NULL;
-- Heal any stale pending Writer tasks for video_shoot/video_edit where no Writer was ever allocated.
-- These are safe to convert because they are still pending + unassigned.
UPDATE tasks SET role_key = 'VIDEOGRAPHER', step_key = REPLACE(step_key, '_c_', '_v_'), title = REPLACE(title, ' — Content & Copy', ' — Visual'), description = 'Produce the visual asset for "' || REPLACE(title, ' — Content & Copy', '') || '".'
WHERE role_key = 'WRITER' AND status = 'pending' AND assigned_to IS NULL
  AND group_key = 'video_shoot' AND step_key LIKE '%_c_%'
  AND NOT EXISTS (SELECT 1 FROM assignments WHERE assignments.project_id = tasks.project_id AND assignments.role_key = 'WRITER');
UPDATE tasks SET role_key = 'EDITOR', step_key = REPLACE(step_key, '_c_', '_v_'), title = REPLACE(title, ' — Content & Copy', ' — Visual'), description = 'Produce the visual asset for "' || REPLACE(title, ' — Content & Copy', '') || '".'
WHERE role_key = 'WRITER' AND status = 'pending' AND assigned_to IS NULL
  AND group_key = 'video_edit' AND step_key LIKE '%_c_%'
  AND NOT EXISTS (SELECT 1 FROM assignments WHERE assignments.project_id = tasks.project_id AND assignments.role_key = 'WRITER');
