import { query } from "@/lib/db";
import { getSession } from "@/lib/session";

/**
 * Best-effort permanent audit trail. Never throws — logging failures must
 * never break the business action it is attached to.
 */
export async function logActivity(params: {
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const session = await getSession();
    await query(
      `INSERT INTO activity_log (actor_user_id, actor_name, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        session?.sub || null,
        session?.name || "system",
        params.action,
        params.entityType || "system",
        params.entityId || null,
        JSON.stringify(params.metadata || {}),
      ]
    );
  } catch {
    // Audit logging is best-effort.
  }
}

export interface ActivityLogRow {
  id: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function getRecentActivity(limit = 60): Promise<ActivityLogRow[]> {
  const rows = await query<{
    id: string;
    actor_name: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    metadata: string;
    created_at: string;
  }>(
    `SELECT id, actor_name, action, entity_type, entity_id, metadata::text AS metadata, created_at
     FROM activity_log
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows.map((r) => ({
    ...r,
    metadata: (() => {
      try {
        return JSON.parse(r.metadata || "{}");
      } catch {
        return {};
      }
    })(),
  }));
}