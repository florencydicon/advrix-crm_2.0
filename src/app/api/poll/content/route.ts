import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { resolveDataScope } from "@/lib/scope";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const CONTENT_SELECT = `
  SELECT c.*, cl.name AS client_name, cl.company AS client_company,
         u.full_name AS assignee_name,
         c.created_at::text AS created_at, c.updated_at::text AS updated_at,
         c.completed_at::text AS completed_at,
         tsk.id AS task_id, pj.id AS task_project_id, pj.name AS task_project_name,
         tsk.status AS task_status
  FROM contents c
  JOIN clients cl ON cl.id = c.client_id
  LEFT JOIN users u ON u.id = c.assignee_id
  LEFT JOIN tasks tsk ON tsk.id = c.task_id
  LEFT JOIN projects pj ON pj.id = tsk.project_id
`;

/**
 * Lightweight JSON endpoint backing the 3s silent Content Hub poll. Returns the
 * caller's RBAC-scoped content rows only — the ContentModal editing state is
 * never touched by this refresh.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = resolveDataScope(session);
  let rows;
  if (scope.kind === "pm") {
    rows = await query(
      `${CONTENT_SELECT} WHERE cl.assigned_pm_id = $1 ORDER BY c.created_at DESC`,
      [session.sub]
    );
  } else if (scope.kind === "self") {
    rows = await query(
      `${CONTENT_SELECT} WHERE (c.assignee_id = $1 OR c.assignee_id IS NULL) ORDER BY c.created_at DESC`,
      [session.sub]
    );
  } else {
    rows = await query(`${CONTENT_SELECT} ORDER BY c.created_at DESC`);
  }

  return NextResponse.json(
    { items: rows },
    { headers: { "Cache-Control": "no-store" } }
  );
}