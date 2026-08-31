-- 020: Granular access controls
-- users.permissions (NULL = inherit role), users.designation (free-text job title),
-- and upgrade built-in role permission arrays to the granular permission catalog.

ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS designation TEXT;

UPDATE roles SET permissions = ARRAY['admin:*'] WHERE key = 'SUPER_ADMIN';

UPDATE roles SET permissions = ARRAY[
  'projects:view','projects:create','projects:manage','projects:delete','projects:assign',
  'tasks:execute','tasks:review','tasks:manage',
  'attendance:view',
  'leads:view','leads:manage',
  'reports:view',
  'chat:use','notes:manage'
] WHERE key = 'PROJECT_MANAGER';

UPDATE roles SET permissions = ARRAY[
  'projects:view','projects:create',
  'leads:view','leads:manage',
  'chat:use','notes:manage'
] WHERE key = 'SALES';

UPDATE roles SET permissions = ARRAY['tasks:execute','chat:use','notes:manage']
WHERE key IN ('WRITER','DESIGNER','EDITOR','SMM','VIDEOGRAPHER');