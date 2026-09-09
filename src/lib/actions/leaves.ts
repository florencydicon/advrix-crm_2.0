"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { createNotification, notifyHrManagers } from "@/lib/notifications";
import { logActivity } from "@/lib/activity";
import { ensureAttendanceSettingsTable } from "@/lib/data";
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

  // Leave-quota engine: paid leave types consume the monthly paid-leave quota
  // (attendance_settings.monthly_paid_leaves). Any leave request that would
  // exceed the quota is recorded as Leave Without Pay (is_paid = false).
  const PAID_TYPES: LeaveType[] = ["sick", "casual", "earned", "emergency"];
  let isPaid = true;
  if (!PAID_TYPES.includes(leaveType)) {
    isPaid = false;
  } else {
    await ensureAttendanceSettingsTable();
    const monthly = (
      await query<{ monthly_paid_leaves: number }>(`SELECT monthly_paid_leaves FROM attendance_settings WHERE id = 1`)
    )[0];
    const quota = monthly?.monthly_paid_leaves ?? 1;
    const monthPrefix = startDate.slice(0, 7);
    const used = (
      await query<{ used: string }>(
        `SELECT COALESCE(SUM(days), 0)::text AS used FROM leaves
         WHERE user_id = $1 AND is_paid = true AND to_char(start_date, 'YYYY-MM') = $2`,
        [session.sub, monthPrefix]
      )
    )[0];
    const usedDays = Number(used?.used || 0);
    if (usedDays + days > quota) isPaid = false;
  }

  await query(
    `INSERT INTO leaves (user_id, leave_type, start_date, end_date, days, reason, is_paid) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [session.sub, leaveType, startDate, endDate, days, reason.trim(), isPaid]
  );

  try {
    await notifyHrManagers(session.sub, {
      type: "leave",
      title: "New leave request",
      body: `${session.name} requested ${days} day(s) of ${leaveType} leave from ${startDate} to ${endDate}.`,
      link: "/attendance",
    });
  } catch {}

  await logActivity({
    action: "leave_requested",
    entityType: "leave",
    entityId: session.sub,
    metadata: { leave_type: leaveType, start_date: startDate, end_date: endDate, days, reason: reason.trim() },
  });

  revalidatePath("/attendance");
  revalidatePath("/leaves");
  return { ok: true };
}

export async function approveLeaveAction(leaveId: string) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };
  if (!hasPermission(session.permissions, "leaves:approve")) return { error: "Only the Super Admin can approve leaves" };

  const leave = await query<{
    user_id: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    days: number;
    reason: string;
    phone: string | null;
  }>(
    `SELECT l.user_id, l.leave_type, l.start_date, l.end_date, l.days, l.reason, u.phone
     FROM leaves l JOIN users u ON u.id = l.user_id
     WHERE l.id = $1`,
    [leaveId]
  );

  if (!leave[0]) return { error: "Leave not found." };

  await query(
    `UPDATE leaves SET status = 'approved', approved_by = $1, approved_at = now() WHERE id = $2`,
    [session.sub, leaveId]
  );

  // Create/update attendance rows for every day in the leave range → disables punch for those dates
  try {
    const start = new Date(leave[0].start_date);
    const end = new Date(leave[0].end_date);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      await query(
        `INSERT INTO attendance (user_id, date, status, hours_worked)
         VALUES ($1, $2, 'on_leave', 0)
         ON CONFLICT (user_id, date) DO UPDATE SET status = 'on_leave'`,
        [leave[0].user_id, dateStr]
      );
    }
  } catch {}

  await createNotification({
    userId: leave[0].user_id,
    type: "leave",
    title: "Leave approved",
    body: `Your ${leave[0].leave_type} leave (${leave[0].start_date} to ${leave[0].end_date}) was approved.`,
    link: "/attendance",
  });

  await logActivity({
    action: "leave_approved",
    entityType: "leave",
    entityId: leaveId,
    metadata: {
      employee_id: leave[0].user_id,
      leave_type: leave[0].leave_type,
      start_date: leave[0].start_date,
      end_date: leave[0].end_date,
      days: leave[0].days,
      approved_by: session.name,
    },
  });

  revalidatePath("/attendance");
  revalidatePath("/leaves");
  return { ok: true };
}

export async function rejectLeaveAction(leaveId: string, rejectionReason: string) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };
  if (!hasPermission(session.permissions, "leaves:approve")) return { error: "Only the Super Admin can reject leaves" };

  if (!rejectionReason?.trim()) {
    return { error: "Please provide a reason for rejection" };
  }

  const leave = await query<{
    user_id: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    days: number;
    reason: string;
    phone: string | null;
  }>(
    `SELECT l.user_id, l.leave_type, l.start_date, l.end_date, l.days, l.reason, u.phone
     FROM leaves l JOIN users u ON u.id = l.user_id
     WHERE l.id = $1`,
    [leaveId]
  );

  if (!leave[0]) return { error: "Leave not found." };

  await query(
    `UPDATE leaves SET status = 'rejected', approved_by = $1, approved_at = now(), rejection_reason = $2 WHERE id = $3`,
    [session.sub, rejectionReason.trim(), leaveId]
  );

  await createNotification({
    userId: leave[0].user_id,
    type: "leave",
    title: "Leave rejected",
    body: `Your ${leave[0].leave_type} leave (${leave[0].start_date} to ${leave[0].end_date}) was rejected.`,
    link: "/attendance",
  });

  await logActivity({
    action: "leave_rejected",
    entityType: "leave",
    entityId: leaveId,
    metadata: {
      employee_id: leave[0].user_id,
      leave_type: leave[0].leave_type,
      start_date: leave[0].start_date,
      end_date: leave[0].end_date,
      days: leave[0].days,
      rejection_reason: rejectionReason.trim(),
      rejected_by: session.name,
    },
  });

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
