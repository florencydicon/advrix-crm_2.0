-- 038: Remove attendance proof images (stored as base64, offloaded feature)
ALTER TABLE attendance DROP COLUMN IF EXISTS proof_image_url;