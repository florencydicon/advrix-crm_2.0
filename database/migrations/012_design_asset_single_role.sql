-- Migration 012: Add Designer-only single-role deliverable + ensure multi-pipeline SMM is optional
INSERT INTO deliverable_types (key, label, content_role, visual_role, default_qty, sort)
VALUES ('design_asset', 'Design Asset', NULL, 'DESIGNER', 1, 80)
ON CONFLICT (key) DO NOTHING;
-- Visual approve without SMM now completes directly (handled in code reviewTaskAction),
-- so no DB change needed for pipeline. Single-role tasks (Writer only, Designer only,
-- Editor only via video_edit, Videographer only via video_shoot) now all exist as
-- content_role NULL → visual_role pipelines that create a single task.
