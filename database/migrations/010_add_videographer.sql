-- Migration 010: Add VIDEOGRAPHER role and update deliverable_types
-- Run against live DB: this migration is idempotent (safe to re-run).

-- 1. Insert VIDEOGRAPHER role (skip if already exists)
INSERT INTO roles (key, label, permissions, dashboard)
VALUES ('VIDEOGRAPHER', 'Videographer', ARRAY['tasks:execute'], 'staff')
ON CONFLICT (key) DO NOTHING;

-- 2. Update video_shoot visual_role from EDITOR to VIDEOGRAPHER
UPDATE deliverable_types
SET visual_role = 'VIDEOGRAPHER'
WHERE key = 'video_shoot' AND visual_role = 'EDITOR';
