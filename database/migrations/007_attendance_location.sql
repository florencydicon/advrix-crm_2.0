-- 007: Add geolocation fields to attendance table
-- Captures latitude, longitude and human-readable location on punch in/out.

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_text TEXT;
