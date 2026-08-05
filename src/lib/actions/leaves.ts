"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";
import type { LeaveType } from "@/lib/types";

export async function applyLeaveAction(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  const leaveType = formData.get("leave_type") as LeaveType;
  const startDate = formData.get("start_date") as string;
  const endDate = formData.get("end_date") as string;
  const reason = formData.get("reason") as string;

  if (!leaveType || !startDate || !endDate || !reason?.trim()) {
    return { error: "All fields are required" };
  }

  if (new Date(endDate) < new Date(startDate)) {
    return { error: "End date cannot be before start date" };
  }

  if (reason.trim().length < 10) {
    return { error: "Please provide a detailed reason (at least 10 characters)" };
  }

  const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1;

  await query(
    `INSERT INTO leaves (user_id, leave_type, start_date, end_date, days, reason) VALUES ($1, $2, $3, $4, $5, $6)`,
    [session.sub, leaveType, startDate, endDate, days, reason.trim()]
  );

  revalidatePath("/attendance");
  revalidatePath("/leaves");
  return { ok: true };
}

export async function approveLeaveAction(leaveId: string) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };
  if (session.role_key !== "SUPER_ADMIN") return { error: "Only Super Admin can approve leaves" };

  await query(
    `UPDATE leaves SET status = 'approved', approved_by = $1, approved_at = now() WHERE id = $2`,
    [session.sub, leaveId]
  );

  revalidatePath("/attendance");
  revalidatePath("/leaves");
  return { ok: true };
}

export async function rejectLeaveAction(leaveId: string, rejectionReason: string) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };
  if (session.role_key !== "SUPER_ADMIN") return { error: "Only Super Admin can reject leaves" };

  if (!rejectionReason?.trim()) {
    return { error: "Please provide a reason for rejection" };
  }

  await query(
    `UPDATE leaves SET status = 'rejected', approved_by = $1, approved_at = now(), rejection_reason = $2 WHERE id = $3`,
    [session.sub, rejectionReason.trim(), leaveId]
  );

  revalidatePath("/attendance");
  revalidatePath("/leaves");
  return { ok: true };
}

export async function cancelLeaveAction(leaveId: string) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  const leaves = await query<{ user_id: string; status: string }>(
    `SELECT user_id, status FROM leaves WHERE id = $1`,
    [leaveId]
  );

  if (!leaves[0] || leaves[0].user_id !== session.sub) {
    return { error: "Leave not found" };
  }

  if (leaves[0].status !== "pending") {
    return { error: "Only pending leaves can be cancelled" };
  }

  await query(`DELETE FROM leaves WHERE id = $1`, [leaveId]);

  revalidatePath("/attendance");
  revalidatePath("/leaves");
  return { ok: true };
}
