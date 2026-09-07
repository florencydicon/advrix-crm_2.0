export interface DeadlineShape {
  status?: string | null;
  due_date?: string | null;
}

/** Deadline UTC-midnight as a millisecond timestamp (date-only normalization). */
function deadlineMs(dueDate: string): number | null {
  const t = new Date(`${dueDate.slice(0, 10)}T00:00:00Z`);
  if (isNaN(t.getTime())) return null;
  return t.getTime();
}

/**
 * Overdue — the due DATE has already passed (i.e. it was due on a previous
 * day) and the task is not completed. A task due today is not yet overdue: it
 * becomes overdue at 00:00 UTC on the following day. This keeps the client and
 * the server DB flag in lock-step.
 */
export function isOverdue(task: DeadlineShape): boolean {
  if (!task.due_date || task.status === "completed") return false;
  const due = task.due_date.slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  return due < today;
}

/**
 * Due within the next 24 hours — not yet overdue, but the deadline is closing.
 */
export function isDueSoon(task: DeadlineShape): boolean {
  if (!task.due_date || task.status === "completed") return false;
  const d = deadlineMs(task.due_date);
  if (d === null) return false;
  const gap = d - Date.now();
  return gap > 0 && gap <= 24 * 60 * 60 * 1000;
}

export type DeadlineKind = "overdue" | "soon" | null;

export function deadlineKind(task: DeadlineShape): DeadlineKind {
  if (isOverdue(task)) return "overdue";
  if (isDueSoon(task)) return "soon";
  return null;
}