-- Client -> Project Manager assignment (PM data isolation)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS assigned_pm_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_clients_assigned_pm ON clients (assigned_pm_id);