"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { sanitizeRich, richToPlain, isEmptyRich } from "@/lib/rich";

export interface NoteRow {
  id: string;
  title: string;
  body: string;
  author_id: string;
  author_name: string;
  author_email: string;
  project_id: string | null;
  project_name: string | null;
  created_at: string;
  updated_at: string;
}

export async function getNotesAction(search?: string): Promise<{ error?: string; notes?: NoteRow[] }> {
  const session = await getSession();
  if (!session) return { error: "Not authorized." };
  if (!hasPermission(session.permissions, "notes:manage")) return { error: "Not authorized." };

  // PRIVACY: only the Super Admin (admin:* wildcard) may read everyone's notes.
  // Every other user is strictly scoped to their own notes (author_id = current_user).
  const isAdmin = hasPermission(session.permissions, "admin:*");

  let where = "WHERE 1=1";
  const params: any[] = [];
  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    where += ` AND (n.title ILIKE $${params.length} OR n.body ILIKE $${params.length})`;
  }
  if (!isAdmin) {
    params.push(session.sub);
    where += ` AND n.author_id = $${params.length}`;
  }

  const rows = await query<NoteRow>(
    `SELECT n.id, n.title, n.body, n.author_id, u.full_name AS author_name, u.email AS author_email,
            n.project_id, p.name AS project_name, n.created_at, n.updated_at
     FROM notes n
     JOIN users u ON u.id = n.author_id
     LEFT JOIN projects p ON p.id = n.project_id
     ${where}
     ORDER BY n.updated_at DESC`,
    params
  );

  return { notes: rows };
}

export async function getNoteByIdAction(id: string): Promise<{ error?: string; note?: NoteRow }> {
  const session = await getSession();
  if (!session) return { error: "Not authorized." };
  if (!hasPermission(session.permissions, "notes:manage")) return { error: "Not authorized." };

  const isAdmin = hasPermission(session.permissions, "admin:*");

  const rows = await query<NoteRow>(
    `SELECT n.id, n.title, n.body, n.author_id, u.full_name AS author_name, u.email AS author_email,
            n.project_id, p.name AS project_name, n.created_at, n.updated_at
     FROM notes n
     JOIN users u ON u.id = n.author_id
     LEFT JOIN projects p ON p.id = n.project_id
     WHERE n.id = $1${isAdmin ? "" : " AND n.author_id = $2"}`,
    isAdmin ? [id] : [id, session.sub]
  );
  if (!rows[0]) return { error: "Note not found." };
  return { note: rows[0] };
}

export async function createNoteAction(title?: string, body?: string, projectId?: string | null): Promise<{ error?: string; note?: NoteRow }> {
  const session = await getSession();
  if (!session) return { error: "Not authorized." };
  if (!hasPermission(session.permissions, "notes:manage")) return { error: "Not authorized." };

  const cleanTitle = (title || "Untitled").slice(0, 500);
  const cleanBody = sanitizeRich(body || "");

  const rows = await query<{ id: string }>(
    `INSERT INTO notes (title, body, author_id, project_id)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [cleanTitle, cleanBody, session.sub, projectId || null]
  );
  if (!rows[0]) return { error: "Failed to create note." };

  revalidatePath("/notes");
  const result = await getNoteByIdAction(rows[0].id);
  return result;
}

export async function updateNoteAction(id: string, title?: string, body?: string, projectId?: string | null): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Not authorized." };
  if (!hasPermission(session.permissions, "notes:manage")) return { error: "Not authorized." };

  const existing = await query<{ author_id: string }>(
    `SELECT author_id FROM notes WHERE id = $1`, [id]
  );
  if (!existing[0]) return { error: "Note not found." };
  if (existing[0].author_id !== session.sub && !hasPermission(session.permissions, "users:manage")) {
    return { error: "Only the author or a manager can edit this note." };
  }

  const sets: string[] = [];
  const vals: any[] = [];
  let idx = 1;

  if (title !== undefined) {
    sets.push(`title = $${idx++}`);
    vals.push(title.slice(0, 500));
  }
  if (body !== undefined) {
    sets.push(`body = $${idx++}`);
    vals.push(sanitizeRich(body));
  }
  if (projectId !== undefined) {
    sets.push(`project_id = $${idx++}`);
    vals.push(projectId || null);
  }
  sets.push(`updated_at = now()`);

  if (sets.length > 1) {
    vals.push(id);
    await query(`UPDATE notes SET ${sets.join(", ")} WHERE id = $${idx}`, vals);
  }

  revalidatePath("/notes");
  return {};
}

export async function deleteNoteAction(id: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Not authorized." };
  if (!hasPermission(session.permissions, "notes:manage")) return { error: "Not authorized." };

  const existing = await query<{ author_id: string }>(
    `SELECT author_id FROM notes WHERE id = $1`, [id]
  );
  if (!existing[0]) return { error: "Note not found." };
  if (existing[0].author_id !== session.sub && !hasPermission(session.permissions, "users:manage")) {
    return { error: "Only the author or a manager can delete this note." };
  }

  await query(`DELETE FROM notes WHERE id = $1`, [id]);
  revalidatePath("/notes");
  return {};
}
