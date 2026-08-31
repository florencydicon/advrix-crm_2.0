"use server";

import { query } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { createNotification } from "@/lib/notifications";
import type { ChatMessage, ChatAttachment } from "@/lib/types";

export type ChatTarget =
  | { kind: "dm"; peerId: string }
  | { kind: "group"; conversationId: string };

interface AttachmentPayload {
  fileName: string;
  dataUrl: string;
  fileSize: number;
  mimeType: string;
}

export interface ChatContact {
  id: string;
  name: string;
  email: string;
  roleKey: string;
  roleLabel: string;
  isActive: boolean;
}

export interface ChatConversation {
  id: string;
  type: "dm" | "group";
  name: string;
  member_ids: string[];
  last_message: string | null;
  last_at: string | null;
  participants: { id: string; name: string }[];
}

async function loadSession() {
  const session = await getSession();
  if (!session) return null;
  if (!hasPermission(session.permissions, "chat:use")) return null;
  return session;
}

/** Build a dm_key sorted-pair so each pair of users always maps to one conversation. */
function dmKey(a: string, b: string) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

async function getConversationAccess(conversationId: string, userId: string): Promise<boolean> {
  const rows = await query<{ user_id: string }>(
    `SELECT user_id FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId]
  );
  return rows.length > 0;
}

async function loadConversations(session: {
  sub: string;
  permissions: string[];
}): Promise<ChatConversation[]> {
  const isAdmin = hasPermission(session.permissions, "admin:*");

  const users = await query<ChatContact>(
    `SELECT u.id, u.full_name AS name, u.email, r.key AS role_key, r.label AS role_label, u.is_active
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
      ORDER BY u.full_name ASC`
  );

  const { rows, params } = isAdmin
    ? {
        rows: `SELECT c.id, c.type, c.name, c.dm_key,
                      ARRAY_AGG(cm.user_id) AS member_ids
                 FROM conversations c
                 JOIN conversation_members cm ON cm.conversation_id = c.id
                GROUP BY c.id
                ORDER BY c.updated_at DESC`,
        params: [] as string[],
      }
    : {
        rows: `SELECT c.id, c.type, c.name, c.dm_key,
                      ARRAY_AGG(cm.user_id) AS member_ids
                 FROM conversations c
                 JOIN conversation_members cm ON cm.conversation_id = c.id
                WHERE cm.user_id = $1
                GROUP BY c.id
                ORDER BY c.updated_at DESC`,
        params: [session.sub],
      };

  const convRows = await query<{
    id: string;
    type: "dm" | "group";
    name: string | null;
    dm_key: string | null;
    member_ids: string[];
  }>(rows, params);

  const conversations: ChatConversation[] = [];
  for (const c of convRows) {
    let name = c.name || "";
    let participants: { id: string; name: string }[] = [];
    if (c.type === "dm") {
      const memberIds = c.member_ids || [];
      const peerId =
        (isAdmin ? memberIds[0] : memberIds.find((m) => m !== session.sub)) ?? "";
      const peer = users.find((u) => u.id === peerId);
      name = peer?.name || "Chat";
      participants = [{ id: peerId, name: peer?.name || "Chat" }];
    } else {
      participants = users
        .filter((u) => (c.member_ids || []).includes(u.id))
        .map((u) => ({ id: u.id, name: u.name }));
    }

    const last = await query<{ content: string; created_at: string }>(
      `SELECT content, created_at FROM chat_messages
        WHERE conversation_id = $1
        ORDER BY created_at DESC LIMIT 1`,
      [c.id]
    );

    conversations.push({
      id: c.id,
      type: c.type,
      name: name || "Group",
      member_ids: c.member_ids || [],
      participants,
      last_message: last[0]?.content || null,
      last_at: last[0]?.created_at || null,
    });
  }

  return conversations;
}

export async function getChatSidebarAction(): Promise<{
  error?: string;
  users?: ChatContact[];
  conversations?: ChatConversation[];
  isAdmin?: boolean;
}> {
  const session = await loadSession();
  if (!session) return { error: "Not authorized." };
  const isAdmin = hasPermission(session.permissions, "admin:*");

  const users = await query<ChatContact>(
    `SELECT u.id, u.full_name AS name, u.email, r.key AS role_key, r.label AS role_label, u.is_active
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
      ORDER BY u.full_name ASC`
  );

  const conversations = await loadConversations({ sub: session.sub, permissions: session.permissions ?? [] });

  return { users, conversations, isAdmin };
}

export async function openDmAction(peerId: string): Promise<{ error?: string; conversationId?: string }> {
  const session = await loadSession();
  if (!session) return { error: "Not authorized." };

  const key = dmKey(session.sub, peerId);
  const existing = await query<{ id: string }>(
    `SELECT id FROM conversations WHERE dm_key = $1`,
    [key]
  );
  if (existing[0]) return { conversationId: existing[0].id };

  const created = await query<{ id: string }>(
    `INSERT INTO conversations (type, dm_key, created_by)
     VALUES ('dm', $1, $2) RETURNING id`,
    [key, session.sub]
  );
  const convId = created[0].id;
  await query(
    `INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2), ($1, $3)`,
    [convId, session.sub, peerId]
  );
  return { conversationId: convId };
}

export async function createGroupAction(name: string, memberIds: string[]): Promise<{ error?: string; conversationId?: string }> {
  const session = await loadSession();
  if (!session) return { error: "Not authorized." };
  if (!hasPermission(session.permissions, "admin:*")) {
    return { error: "Only the Super Admin can create groups." };
  }

  const cleanName = (name || "").trim().slice(0, 120);
  if (!cleanName) return { error: "Group name is required." };

  const created = await query<{ id: string }>(
    `INSERT INTO conversations (type, name, created_by)
     VALUES ('group', $1, $2) RETURNING id`,
    [cleanName, session.sub]
  );
  const convId = created[0].id;

  const members = Array.from(new Set([session.sub, ...memberIds])).filter(Boolean);
  for (const m of members) {
    await query(
      `INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [convId, m]
    );
  }
  return { conversationId: convId };
}

export async function getMessagesAction(target: ChatTarget): Promise<{ error?: string; messages?: ChatMessage[] }> {
  const session = await loadSession();
  if (!session) return { error: "Not authorized." };
  const isAdmin = hasPermission(session.permissions, "admin:*");

  let conversationId: string | null = null;
  if (target.kind === "dm") {
    const key = dmKey(session.sub, target.peerId);
    const row = await query<{ id: string, sender_id: string, receiver_id: string }>(
      `SELECT c.id, m.sender_id, m.receiver_id
         FROM conversations c
         LEFT JOIN chat_messages m ON m.conversation_id = c.id
        WHERE c.dm_key = $1
        LIMIT 1`,
      [key]
    );
    if (!row[0]) return { messages: [] };
    conversationId = row[0].id;
    const isParticipant =
      isAdmin ||
      (await getConversationAccess(conversationId, session.sub)) ||
      row[0].sender_id === session.sub ||
      row[0].receiver_id === session.sub;
    if (!isParticipant) return { error: "Not authorized." };
  } else if (target.kind === "group") {
    conversationId = target.conversationId;
    if (isAdmin || (await getConversationAccess(conversationId, session.sub))) {
      // allowed
    } else {
      return { error: "Not authorized." };
    }
  }

  let rows: {
    id: string;
    conversation_id: string | null;
    sender_id: string;
    sender_name: string;
    content: string;
    recipient_id: string | null;
    created_at: string;
  }[];
  if (conversationId) {
    rows = await query(
      `SELECT id, conversation_id, sender_id, sender_name, content, recipient_id, created_at
         FROM chat_messages
        WHERE conversation_id = $1
        ORDER BY created_at ASC`,
      [conversationId]
    );
  } else {
    rows = [];
  }

  const messages: ChatMessage[] = [];
  for (const m of rows) {
    const att = await query<ChatAttachment>(
      `SELECT id, message_id, file_name, data_url, file_size, mime_type, created_at
         FROM chat_attachments WHERE message_id = $1 ORDER BY created_at ASC`,
      [m.id]
    );
    messages.push({ ...m, project_id: null, task_id: null, attachments: att });
  }
  return { messages };
}

export async function sendMessageAction(
  target: ChatTarget,
  content: string,
  attachments: AttachmentPayload[] = []
): Promise<{ error?: string; message?: ChatMessage }> {
  const session = await loadSession();
  if (!session) return { error: "Not authorized." };

  let conversationId: string | null = null;
  let recipientId: string | null = null;
  if (target.kind === "dm") {
    const key = dmKey(session.sub, target.peerId);
    const row = await query<{ id: string }>(`SELECT id FROM conversations WHERE dm_key = $1`, [key]);
    const convId = row[0]?.id || (await openDmAction(target.peerId)).conversationId;
    if (!convId) return { error: "Could not open conversation." };
    conversationId = convId;
    recipientId = target.peerId;
  } else if (target.kind === "group") {
    conversationId = target.conversationId;
    const can = await getConversationAccess(conversationId, session.sub);
    if (!can && !hasPermission(session.permissions, "admin:*")) return { error: "Not authorized." };
  }

  const row = await query<ChatMessage>(
    `INSERT INTO chat_messages (conversation_id, project_id, task_id, sender_id, sender_name, content, recipient_id)
     VALUES ($1, NULL, NULL, $2, $3, $4, $5)
     RETURNING id, conversation_id, sender_id, sender_name, content, recipient_id, created_at`,
    [conversationId, session.sub, session.name, content || "", recipientId]
  );
  const msgId = row[0].id;

  if (attachments.length > 0) {
    const placeholders: string[] = [];
    const vals: any[] = [];
    attachments.forEach((a, i) => {
      const off = i * 6 + 1;
      placeholders.push(`($${off}, $${off + 1}, $${off + 2}, $${off + 3}, $${off + 4}, $${off + 5})`);
      vals.push(a.fileName, msgId, a.dataUrl, a.fileSize, a.mimeType);
    });
    await query(
      `INSERT INTO chat_attachments (file_name, message_id, data_url, file_size, mime_type)
       VALUES ${placeholders.join(", ")}`,
      vals
    );
  }

  if (target.kind === "dm" && recipientId && recipientId !== session.sub) {
    await createNotification({
      userId: recipientId,
      type: "task",
      title: `New message from ${session.name}`,
      body: (content || "").slice(0, 200),
      link: "/chat",
    }).catch(() => {});
  }

  await query(`UPDATE conversations SET updated_at = now() WHERE id = $1`, [conversationId ?? "00000000-0000-0000-0000-000000000000"]).catch(() => {});

  const att = await query<ChatAttachment>(
    `SELECT id, message_id, file_name, data_url, file_size, mime_type, created_at
       FROM chat_attachments WHERE message_id = $1 ORDER BY created_at ASC`,
    [msgId]
  );
  const built: ChatMessage = {
    ...row[0],
    project_id: null,
    task_id: null,
    sender_id: session.sub,
    sender_name: session.name,
    attachments: att,
  };
  return { message: built };
}

export async function deleteMessageAction(messageId: string): Promise<{ error?: string }> {
  const session = await loadSession();
  if (!session) return { error: "Not authorized." };

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
