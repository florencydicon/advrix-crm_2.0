"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import type { ContentItem, StandaloneContentStatus } from "@/lib/types";

const PERM_TASKS_MANAGE = "tasks:manage";

const MANAGER_ROLES = ["SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER", "PM"];
const EDITOR_ROLES = [...MANAGER_ROLES, "WRITER", "CONTENT_WRITER"];

type SessionLike = { role_key?: string | null; permissions?: string[] } | null | undefined;

function isManager(session: SessionLike): boolean {
  if (!session) return false;
  const role = (session.role_key || "").toUpperCase();
  if (MANAGER_ROLES.includes(role)) return true;
  return hasPermission(session.permissions, PERM_TASKS_MANAGE);
}

function isContentEditor(session: SessionLike): boolean {
  if (!session) return false;
  const role = (session.role_key || "").toUpperCase();
  if (EDITOR_ROLES.includes(role)) return true;
  return hasPermission(session.permissions, PERM_TASKS_MANAGE);
}

function revalidate() {
  revalidatePath("/content");
}

const CONTENT_SELECT = `
  SELECT c.*, cl.name AS client_name, cl.company AS client_company,
         u.full_name AS assignee_name,
         c.created_at::text AS created_at, c.updated_at::text AS updated_at,
         c.completed_at::text AS completed_at
  FROM contents c
  JOIN clients cl ON cl.id = c.client_id
  LEFT JOIN users u ON u.id = c.assignee_id
`;

/**
 * Standalone Content Hub list. Managers see everything; everyone else sees
 * items assigned to them plus unassigned pick-ups. No pipeline coupling.
 */
export async function getContentItemsAction(): Promise<{
  items: ContentItem[];
  canManage: boolean;
  canEdit: boolean;
  roleKey: string | null;
  userId: string | null;
}> {
  const session = await getSession();
  if (!session) return { items: [], canManage: false, canEdit: false, roleKey: null, userId: null };

  const broad =
    (session.permissions || []).includes("admin:*") || isManager(session);
  const rows = broad
    ? await query<ContentItem>(`${CONTENT_SELECT} ORDER BY c.created_at DESC`)
    : await query<ContentItem>(
        `${CONTENT_SELECT} WHERE (c.assignee_id = $1 OR c.assignee_id IS NULL) ORDER BY c.created_at DESC`,
        [session.sub]
      );

  return {
    items: rows,
    canManage: isManager(session),
    canEdit: isContentEditor(session),
    roleKey: session.role_key,
    userId: session.sub,
  };
}

export interface ContentInput {
  clientId: string;
  title: string;
  body?: string | null;
  remarks?: string | null;
  assigneeId?: string | null;
}

/** Direct-add a content item. Content team + managers. */
export async function createContentItemAction(
  input: ContentInput
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authorized." };
  if (!isContentEditor(session)) return { ok: false, error: "Not authorized." };

  const title = String(input.title || "").trim().slice(0, 200);
  if (!input.clientId) return { ok: false, error: "Pick a client." };
  if (!title) return { ok: false, error: "Title cannot be empty." };
  const client = await query<{ id: string }>(`SELECT id FROM clients WHERE id = $1`, [input.clientId]);
  if (!client[0]) return { ok: false, error: "Client not found." };

  const rows = await query<{ id: string }>(
    `INSERT INTO contents (client_id, title, body, remarks, assignee_id, status, created_by)
     VALUES ($1, $2, $3, $4, $5, 'active', $6) RETURNING id`,
    [
      input.clientId,
      title,
      input.body ?? null,
      input.remarks ?? null,
      input.assigneeId || null,
      session.sub,
    ]
  );
  revalidate();
  return { ok: true, id: rows[0]?.id };
}

/** Edit a content item's fields (status changes go through setContentItemStatusAction). */
export async function updateContentItemAction(
  id: string,
  input: ContentInput
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authorized." };
  if (!isContentEditor(session)) return { ok: false, error: "Not authorized." };

  const title = String(input.title || "").trim().slice(0, 200);
  if (!title) return { ok: false, error: "Title cannot be empty." };
  const existing = await query<{ id: string }>(`SELECT id FROM contents WHERE id = $1`, [id]);
  if (!existing[0]) return { ok: false, error: "Content not found." };
  if (input.clientId) {
    const client = await query<{ id: string }>(`SELECT id FROM clients WHERE id = $1`, [input.clientId]);
    if (!client[0]) return { ok: false, error: "Client not found." };
  }

  await query(
    `UPDATE contents
     SET client_id = COALESCE($2, client_id), title = $3, body = $4, remarks = $5,
         assignee_id = $6, updated_at = now()
     WHERE id = $1`,
    [id, input.clientId || null, title, input.body ?? null, input.remarks ?? null, input.assigneeId || null]
  );
  revalidate();
  return { ok: true };
}

/**
 * Move between Active and History. Saving with "Mark as Completed" sets
 * 'completed' so the item leaves the Active tab automatically.
 */
export async function setContentItemStatusAction(
  id: string,
  status: StandaloneContentStatus
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authorized." };
  if (!isContentEditor(session)) return { ok: false, error: "Not authorized." };
  if (status !== "active" && status !== "completed") {
    return { ok: false, error: "Invalid status." };
  }
  const existing = await query<{ id: string }>(`SELECT id FROM contents WHERE id = $1`, [id]);
  if (!existing[0]) return { ok: false, error: "Content not found." };
  await query(
    `UPDATE contents SET status = $2, updated_at = now(),
       completed_at = CASE WHEN $2 = 'completed' THEN now() ELSE NULL END
     WHERE id = $1`,
    [id, status]
  );
  revalidate();
  return { ok: true };
}

/** Delete a content item. Managers only — writers can never delete. */
export async function deleteContentItemAction(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authorized." };
  if (!isManager(session)) return { ok: false, error: "Not authorized." };
  await query(`DELETE FROM contents WHERE id = $1`, [id]);
  revalidate();
  return { ok: true };
}

/** Safety cap for multi-select bulk operations. */
const MAX_BULK = 100;

function cleanIdList(ids: string[] | null | undefined): string[] {
  return [...new Set((ids || []).filter(Boolean))].slice(0, MAX_BULK);
}

/** Bulk: assign one writer to every selected item. Managers only. */
export async function bulkAssignContentAction(
  ids: string[],
  assigneeId: string | null
): Promise<{ ok: boolean; count?: number; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authorized." };
  if (!isManager(session)) return { ok: false, error: "Not authorized." };
  const list = cleanIdList(ids);
  if (list.length === 0) return { ok: false, error: "No content selected." };
  for (const id of list) {
    await query(`UPDATE contents SET assignee_id = $2, updated_at = now() WHERE id = $1`, [
      id,
      assigneeId || null,
    ]);
  }
  revalidate();
  return { ok: true, count: list.length };
}

/** Bulk: delete every selected item. Managers only. */
export async function bulkDeleteContentAction(
  ids: string[]
): Promise<{ ok: boolean; count?: number; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authorized." };
  if (!isManager(session)) return { ok: false, error: "Not authorized." };
  const list = cleanIdList(ids);
  if (list.length === 0) return { ok: false, error: "No content selected." };
  for (const id of list) {
    await query(`DELETE FROM contents WHERE id = $1`, [id]);
  }
  revalidate();
  return { ok: true, count: list.length };
}

/**
 * Bulk: move every selected item between Active and History.
 * Content team + managers (writers can change status, never delete).
 */
export async function bulkSetContentStatusAction(
  ids: string[],
  status: StandaloneContentStatus
): Promise<{ ok: boolean; count?: number; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authorized." };
  if (!isContentEditor(session)) return { ok: false, error: "Not authorized." };
  if (status !== "active" && status !== "completed") {
    return { ok: false, error: "Invalid status." };
  }
  const list = cleanIdList(ids);
  if (list.length === 0) return { ok: false, error: "No content selected." };
  for (const id of list) {
    await query(
      `UPDATE contents SET status = $2, updated_at = now(),
         completed_at = CASE WHEN $2 = 'completed' THEN now() ELSE NULL END
       WHERE id = $1`,
      [id, status]
    );
  }
  revalidate();
  return { ok: true, count: list.length };
}
