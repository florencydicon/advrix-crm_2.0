-- ============================================================
-- Advrix CRM 2.0 — Migration 002
-- Sales Lead Manager + flexible leave/deadline logic
-- Run with: node scripts/migrate_002.mjs
-- ============================================================

-- ---------- Sales Leads ----------
CREATE TABLE IF NOT EXISTS leads (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  company        TEXT,
  email          TEXT,
  phone          TEXT,
  source         TEXT NOT NULL DEFAULT 'other', -- website | referral | instagram | cold_outreach | walk_in | other
  status         TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','follow_up','proposal','won','lost')),
  deal_value     NUMERIC(12,2) DEFAULT 0,
  notes          TEXT,
  next_follow_up DATE,
  owner_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  converted_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leads_owner ON leads(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- ---------- Assignment leave tracking (cascading deadline extensions) ----------
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS on_leave BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS leave_reason TEXT;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS leave_days INT NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS on_leave_note TEXT;
