"use server";

import { query } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getMemberHistoryTasks } from "@/lib/data";
import { getUserActivity, type ActivityLogRow } from "@/lib/activity";
import type { Task } from "@/lib/types";

export interface MemberTimelinePayload {
  member: {
    id: string;
    full_name: string;
    email: string;
    role_key: string;
    role_label: string;
    designation: string | null;
    phone: string | null;
    is_active: boolean;
    created_at: string;
  };
  tasks: Task[];
  activity: ActivityLogRow[];
}

/**
 * Chronological history for one team member: every task they touched (with
 * per-step timestamps) plus their action_log trail. Managers only.
 */
export async function getMemberTimelineAction(userId: string): Promise<
  | { error: string }
  | { payload: MemberTimelinePayload }
> {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "users:manage")) {
    return { error: "Not authorized." };
  }
  if (!userId) return { error: "Member not found." };

  const members = await query<MemberTimelinePayload["member"]>(
    `SELECT u.id, u.full_name, u.email, u.role_key, r.label AS role_label,
            u.designation, u.phone, u.is_active, u.created_at::text AS created_at
     FROM users u
     JOIN roles r ON r.key = u.role_key
     WHERE u.id = $1`,
    [userId]
  );
  const member = members[0];
  if (!member) return { error: "Member not found." };

  const [tasks, activity] = await Promise.all([
    getMemberHistoryTasks(userId).catch(() => [] as Task[]),
    getUserActivity(userId).catch(() => [] as ActivityLogRow[]),
  ]);

  return { payload: { member, tasks, activity } };
}