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
 * Overdue — the task deadline is in the past and the task is not completed.
 * Matches `new Date() > new Date(task.deadline)` semantics, normalized to
 * UTC-midnight so the client and the server DB flag stay in lock-step.
 */
export function isOverdue(task: DeadlineShape): boolean {
  if (!task.due_date || task.status === "completed") return false;
  const d = deadlineMs(task.due_date);
  return d !== null && d < Date.now();
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