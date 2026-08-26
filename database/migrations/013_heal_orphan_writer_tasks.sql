-- Migration 013: Heal orphan Writer tasks for Designer/Video-only allocations
-- For any project where WRITER is NOT allocated but a visual role is, the
-- pending Writer "Content & Copy" placeholder is stale — remove it if a Visual
-- already exists, otherwise it will be converted on next allocation Save.
-- This handles Banner/Reel/Static Post when Designer/Editor was allocated
-- directly (Designer only, Video Editing only) — no need of content.
DELETE FROM tasks WHERE id IN (
  SELECT t.id FROM tasks t
  JOIN deliverable_types dt ON dt.key = t.group_key AND dt.content_role = 'WRITER' AND dt.visual_role IS NOT NULL
  WHERE t.role_key = 'WRITER' AND t.status = 'pending' AND t.assigned_to IS NULL AND t.step_key LIKE '%_c_%'
    AND NOT EXISTS (SELECT 1 FROM assignments a WHERE a.project_id = t.project_id AND a.role_key = 'WRITER')
    AND EXISTS (SELECT 1 FROM tasks v WHERE v.project_id = t.project_id AND v.step_key = REPLACE(t.step_key, '_c_', '_v_'))
);
