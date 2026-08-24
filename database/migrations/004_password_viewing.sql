-- 004: Password viewing for Super Admin
-- Adds a reversible (AES-256-GCM encrypted) copy of each user's password.
-- Existing bcrypt-only rows stay unviewable until their password is reset once.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_enc TEXT;
