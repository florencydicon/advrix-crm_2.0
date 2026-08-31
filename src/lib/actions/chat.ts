"use server";

import { query } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { createNotification, getProjectCreatorId } from "@/lib/notifications";
import type { ChatMessage, ChatAttachment } from "@/lib/types";

interface AttachmentPayload {
  fileName: string;
  dataUrl: string;
  fileSize: number;
  mimeType: string;
}

export async function getMessagesAction(projectId?: string | null, taskId?: string | null): Promise<{ error?: string; messages?: ChatMessage[] }> {
  const session = await getSession();
  if (!session) return { error: "Not authorized." };
  if (!hasPermission(session.permissions, "chat:use")) return { error: "Not authorized." };

  // Global chat when projectId is null (project_id IS NULL); otherwise scoped to a project/task.
  let rows: {
    id: string;
    project_id: string | null;
    task_id: string | null;
    sender_id: string;
    sender_name: string;
    content: string;
    created_at: string;
    updated_at: string;
  }[];
  if (projectId) {
    if (taskId) {
      rows = await query(
        `SELECT id, project_id, task_id, sender_id, sender_name, content, created_at, updated_at
           FROM chat_messages
          WHERE project_id = $1 AND task_id = $2
          ORDER BY created_at ASC`,
        [projectId, taskId]
      );
    } else {
      rows = await query(
        `SELECT id, project_id, task_id, sender_id, sender_name, content, created_at, updated_at
           FROM chat_messages
          WHERE project_id = $1 AND task_id IS NULL
          ORDER BY created_at ASC`,
        [projectId]
      );
    }
  } else {
    rows = await query(
      `SELECT id, project_id, task_id, sender_id, sender_name, content, created_at, updated_at
         FROM chat_messages
        WHERE project_id IS NULL AND task_id IS NULL
        ORDER BY created_at ASC`,
      []
    );
  }

  const messages: ChatMessage[] = [];
  for (const m of rows) {
    const attRows = await query<ChatAttachment>(
      `SELECT id, message_id, file_name, data_url, file_size, mime_type, created_at
         FROM chat_attachments WHERE message_id = $1 ORDER BY created_at ASC`,
      [m.id]
    );
    messages.push({ ...m, attachments: attRows });
  }

  return { messages };
}

export async function sendMessageAction(
  projectId: string | null,
  content: string,
  attachments: AttachmentPayload[] = [],
  taskId?: string | null
): Promise<{ error?: string; message?: ChatMessage }> {
  const session = await getSession();
  if (!session) return { error: "Not authorized." };
  if (!hasPermission(session.permissions, "chat:use")) return { error: "Not authorized." };

  const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  await query(
    `INSERT INTO chat_messages (id, project_id, task_id, sender_id, sender_name, content)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [msgId, projectId ?? null, taskId ?? null, session.sub, session.name, content || ""]
  );

  if (attachments.length > 0) {
    const placeholders: string[] = [];
    const vals: any[] = [];
    attachments.forEach((a, i) => {
      const off = i * 6 + 1;
      placeholders.push(`($${off}, $${off + 1}, $${off + 2}, $${off + 3}, $${off + 4}, $${off + 5})`);
      vals.push(`${msgId}_att_${i}`, msgId, a.fileName, a.dataUrl, a.fileSize, a.mimeType);
    });
    await query(
      `INSERT INTO chat_attachments (id, message_id, file_name, data_url, file_size, mime_type)
       VALUES ${placeholders.join(", ")}`,
      vals
    );
  }

  if (projectId) {
    const creatorId = await getProjectCreatorId(projectId);
    if (creatorId && creatorId !== session.sub) {
      await createNotification({
        userId: creatorId,
        type: "task",
        title: `New message in project`,
        body: (content || "").slice(0, 200),
        link: `/projects/${projectId}`,
      }).catch(() => {});
    }
  }

  const row = await query<ChatMessage>(
    `SELECT id, project_id, task_id, sender_id, sender_name, content, created_at, updated_at
       FROM chat_messages WHERE id = $1`,
    [msgId]
  );
  return { message: row[0] };
}

export async function deleteMessageAction(messageId: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Not authorized." };
  if (!hasPermission(session.permissions, "chat:use")) return { error: "Not authorized." };

  const m = await query<{ sender_id: string }>(
    `SELECT sender_id FROM chat_messages WHERE id = $1`,
    [messageId]
  );
  if (!m[0]) return { error: "Message not found." };
  if (m[0].sender_id !== session.sub && !hasPermission(session.permissions, "users:manage")) {
    return { error: "Only the sender or a manager can delete this message." };
  }

  await query(`DELETE FROM chat_attachments WHERE message_id = $1`, [messageId]);
  await query(`DELETE FROM chat_messages WHERE id = $1`, [messageId]);
  return {};
}