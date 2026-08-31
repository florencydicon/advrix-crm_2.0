"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { createNotification } from "@/lib/notifications";

export interface TodoRow {
  id: string;
  title: string;
  notes: string | null;
  scope: "personal" | "assigned";
  assignee_id: string | null;
  assignee_name: string | null;
  created_by: string;
  creator_name: string;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type TodoFilter = "today" | "week" | "year";

function hasAccess(permissions: string[] | undefined): boolean {
  return hasPermission(permissions, "todos:manage") || hasPermission(permissions, "admin:*");
}

export async function getTodosAction(filter?: TodoFilter): Promise<{ error?: string; todos?: TodoRow[] }> {
  const session = await getSession();
  if (!session) return { error: "Not authorized." };
  if (!hasAccess(session.permissions)) return { error: "Not authorized." };

  let where = "";
  const params: any[] = [];
  if (filter === "today") {
    where = "WHERE t.due_date = CURRENT_DATE";
  } else if (filter === "week") {
    where = "WHERE t.due_date >= date_trunc('week', CURRENT_DATE) AND t.due_date < date_trunc('week', CURRENT_DATE) + interval '1 week'";
  } else if (filter === "year") {
    where = "WHERE t.due_date >= date_trunc('year', CURRENT_DATE) AND t.due_date < date_trunc('year', CURRENT_DATE) + interval '1 year'";
  }

  const rows = await query<TodoRow>(
    `SELECT t.id, t.title, t.notes, t.scope, t.assignee_id, u.full_name AS assignee_name,
            t.created_by, cr.full_name AS creator_name, t.due_date::text AS due_date,
            t.completed, t.completed_at::text AS completed_at, t.created_at::text AS created_at,
            t.updated_at::text AS updated_at
     FROM todos t
     LEFT JOIN users u ON u.id = t.assignee_id
     JOIN users cr ON cr.id = t.created_by
     ${where}
     ORDER BY t.completed ASC, t.due_date ASC NULLS LAST, t.created_at DESC`,
    params
  );

  return { todos: rows };
}

export async function getTodoAssigneeOptionsAction(): Promise<{ error?: string; users?: { id: string; name: string }[] }> {
  const session = await getSession();
  if (!session) return { error: "Not authorized." };
  if (!hasAccess(session.permissions)) return { error: "Not authorized." };

  const rows = await query<{ id: string; name: string }>(
    `SELECT u.id, u.full_name AS name
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.is_active = TRUE
        AND COALESCE(r.key, '') NOT IN ('SUPER_ADMIN', 'PROJECT_MANAGER')
      ORDER BY u.full_name ASC`
  );
  return { users: rows };
}

export async function createTodoAction(input: {
  title: string;
  notes?: string;
  assigneeId?: string | null;
  dueDate?: string | null;
}): Promise<{ error?: string; todo?: TodoRow }> {
  const session = await getSession();
  if (!session) return { error: "Not authorized." };
  if (!hasAccess(session.permissions)) return { error: "Not authorized." };

  const title = (input.title || "").trim().slice(0, 500);
  if (!title) return { error: "Title is required." };

  const scope: "personal" | "assigned" = input.assigneeId ? "assigned" : "personal";
  const id = `todo_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const dueDate = input.dueDate ? (input.dueDate as string) : null;

  await query(
    `INSERT INTO todos (id, title, notes, scope, assignee_id, created_by, due_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, title, input.notes?.trim() || null, scope, input.assigneeId || null, session.sub, dueDate]
  );

  if (scope === "assigned" && input.assigneeId && input.assigneeId !== session.sub) {
    await createNotification({
      userId: input.assigneeId,
      type: "task",
      title: "New task on your to-do list",
      body: title.slice(0, 200),
      link: "/todos",
    }).catch(() => {});
  }

  revalidatePath("/todos");
  const result = await getTodosAction();
  const created = (result.todos || []).find((t) => t.id === id);
  return created ? { todo: created } : { todo: (await getTodoById(id)) };
}

async function getTodoById(id: string): Promise<TodoRow | undefined> {
  const rows = await query<TodoRow>(
    `SELECT t.id, t.title, t.notes, t.scope, t.assignee_id, u.full_name AS assignee_name,
            t.created_by, cr.full_name AS creator_name, t.due_date::text AS due_date,
            t.completed, t.completed_at::text AS completed_at, t.created_at::text AS created_at,
            t.updated_at::text AS updated_at
     FROM todos t
     LEFT JOIN users u ON u.id = t.assignee_id
     JOIN users cr ON cr.id = t.created_by
     WHERE t.id = $1`,
    [id]
  );
  return rows[0];
}

export async function updateTodoAction(
  id: string,
  input: { title?: string; notes?: string; assigneeId?: string | null; dueDate?: string | null }
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Not authorized." };
  if (!hasAccess(session.permissions)) return { error: "Not authorized." };

  const existing = await query<{ id: string }>(`SELECT id FROM todos WHERE id = $1`, [id]);
  if (!existing[0]) return { error: "To-do not found." };

  const sets: string[] = [];
  const params: any[] = [];
  params.push(id);
  if (input.title !== undefined) {
    sets.push(`title = $${params.length + 1}`);
    params.push(input.title.trim().slice(0, 500) || "Untitled");
  }
  if (input.notes !== undefined) {
    sets.push(`notes = $${params.length + 1}`);
    params.push(input.notes.trim() || null);
  }
  if (input.dueDate !== undefined) {
    sets.push(`due_date = $${params.length + 1}`);
    params.push(input.dueDate || null);
  }
  if (input.assigneeId !== undefined) {
    sets.push(`assignee_id = $${params.length + 1}`);
    sets.push(`scope = $${params.length + 2}`);
    params.push(input.assigneeId || null, input.assigneeId ? "assigned" : "personal");
  }
  if (sets.length > 0) {
    sets.push(`updated_at = now()`);
    await query(`UPDATE todos SET ${sets.join(", ")} WHERE id = $1`, params);
  }

  revalidatePath("/todos");
  return {};
}

export async function toggleTodoAction(id: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Not authorized." };
  if (!hasAccess(session.permissions)) return { error: "Not authorized." };

  const rows = await query<{ completed: boolean }>(`SELECT completed FROM todos WHERE id = $1`, [id]);
  if (!rows[0]) return { error: "To-do not found." };
  const next = !rows[0].completed;

  await query(
    `UPDATE todos SET completed = $2, completed_at = CASE WHEN $2 THEN now() ELSE NULL END, updated_at = now() WHERE id = $1`,
    [id, next]
  );

  revalidatePath("/todos");
  return {};
}

export async function deleteTodoAction(id: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Not authorized." };
  if (!hasAccess(session.permissions)) return { error: "Not authorized." };

  await query(`DELETE FROM todos WHERE id = $1`, [id]);
  revalidatePath("/todos");
  return {};
}
