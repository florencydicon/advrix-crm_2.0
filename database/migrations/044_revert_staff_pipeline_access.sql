-- 044: Revert 043 — Project Pipeline / Clients are PM + Super Admin only
--
-- 043 granted `projects:view` to the staff roles (WRITER, DESIGNER, EDITOR,
-- SMM, VIDEOGRAPHER, CONTENT_WRITER) so they could open the paginated
-- pipeline. That was wrong: the Project Pipeline and Clients pages are
-- restricted to Project Managers and Super Admin, and staff work from their
-- own dashboard.
--
-- Strip `projects:view` back out of those roles. Any OTHER permission an admin
-- granted to them in the meantime is preserved (array_remove, not overwrite).
-- SALES / PROJECT_MANAGER / SUPER_ADMIN are untouched.
--
-- Idempotent: roles that never had `projects:view` are left alone.

UPDATE roles
   SET permissions = array_remove(COALESCE(permissions, ARRAY[]::text[]), 'projects:view')
 WHERE key IN ('WRITER', 'CONTENT_WRITER', 'DESIGNER', 'EDITOR', 'SMM', 'VIDEOGRAPHER')
   AND 'projects:view' = ANY (COALESCE(permissions, ARRAY[]::text[]));