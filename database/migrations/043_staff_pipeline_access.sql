-- 043: Grant staff roles access to the Project Pipeline
--
-- Staff roles (WRITER, DESIGNER, EDITOR, SMM, VIDEOGRAPHER, CONTENT_WRITER)
-- previously had only `tasks:execute`, so /projects redirected them to the
-- dashboard and the paginated board was unreachable for them.
--
-- `projects:view` is read-only and does NOT widen their data visibility:
-- resolveDataScope() returns "self" for anyone without `admin:*` and without
-- both projects:view + projects:manage, so the board query still returns only
-- tasks the member is assigned to. A PM keeps its client-scoped isolation and
-- Super Admin keeps global scope.
--
-- Appended (not replaced) so any extra permission an admin already granted to
-- one of these roles is preserved. The existing set is UNION-ed with
-- projects:view rather than overwritten.
UPDATE roles
   SET permissions = ARRAY(
         SELECT DISTINCT p
           FROM unnest(COALESCE(permissions, ARRAY[]::text[])) AS p
           UNION
         SELECT 'projects:view'::text
         ORDER BY 1
       )
 WHERE key IN ('WRITER', 'CONTENT_WRITER', 'DESIGNER', 'EDITOR', 'SMM', 'VIDEOGRAPHER')
   AND NOT ('projects:view' = ANY (COALESCE(permissions, ARRAY[]::text[])));