-- Migration 014: Revert video_shoot/video_edit to WRITER->visual to support chained scenarios
-- Scenarios 1: Writer->Designer->SMM, 2: Writer->Editor->SMM, 3: Writer->Videographer all require Writer first step.
-- Single-role direct (Designer only, Editor only, Videographer only) is handled by runtime heal
-- that deletes/ converts orphan Writer placeholder when no Writer is allocated.
UPDATE deliverable_types SET content_role = 'WRITER', visual_role = 'VIDEOGRAPHER' WHERE key = 'video_shoot';
UPDATE deliverable_types SET content_role = 'WRITER', visual_role = 'EDITOR' WHERE key = 'video_edit';
