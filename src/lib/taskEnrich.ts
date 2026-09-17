import { query } from "@/lib/db";
import type { Task, TaskAssignee, TaskContribution } from "@/lib/types";

interface AssigneeRow {
  task_id: string;
  id: string;
  name: string;
  role_key: string | null;
  role_label: string | null;
}

interface ContributionRow {
  task_id: string;
  id: string;
  step: number;
  user_id: string | null;
  user_name: string | null;
  role_label: string | null;
  content: string | null;
  status: "submitted" | "needs_improvement" | "approved";
  review_comment: string | null;
  reviewed_by: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

/**
 * Replaces the two per-row correlated `json_agg` subqueries that used to live in
 * TASK_SELECT / PIPELINE_TASK_SELECT. For a board of N tasks that was N×(2+)
 * subquery executions inside one statement. Here we run TWO batched queries
 * (one for assignees, one for contributions) against every task id at once and
 * fold the results back onto the rows — index-backed, single pass, same shape.
 */
export async function attachTaskDetails<T extends Task>(tasks: T[]): Promise<T[]> {
  if (!tasks || tasks.length === 0) return tasks;
  const ids = tasks.map((t) => t.id);

  let aRows: AssigneeRow[] = [];
  let cRows: ContributionRow[] = [];
  try {
    [aRows, cRows] = await Promise.all([
      query<AssigneeRow>(
        `SELECT ta.task_id, ta.user_id AS id, ua.full_name AS name,
                r2.key AS role_key, r2.label AS role_label
         FROM task_assignees ta
         JOIN users ua ON ua.id = ta.user_id
         LEFT JOIN roles r2 ON r2.id = ua.role_id
         WHERE ta.task_id = ANY($1)
         ORDER BY ta.task_id, ta.position ASC, ta.added_at ASC`,
        [ids]
      ),
      query<ContributionRow>(
        `SELECT tc.task_id, tc.id, tc.step, tc.user_id, tc.user_name, tc.role_label,
                tc.content, tc.status, tc.review_comment, tc.reviewed_by,
                tc.submitted_at::text AS submitted_at, tc.reviewed_at::text AS reviewed_at
         FROM task_contributions tc
         WHERE tc.task_id = ANY($1)
         ORDER BY tc.task_id, tc.step ASC, tc.submitted_at ASC`,
        [ids]
      ),
    ]);
  } catch {
    // If the auxiliary tables are ever missing, degrade to empty lists rather
    // than breaking the board (mirrors the pre-existing assignments fallback).
  }

  const aByTask = new Map<string, TaskAssignee[]>();
  for (const r of aRows) {
    let arr = aByTask.get(r.task_id);
    if (!arr) {
      arr = [];
      aByTask.set(r.task_id, arr);
    }
    arr.push({ id: r.id, name: r.name, role_key: r.role_key, role_label: r.role_label });
  }

  const cByTask = new Map<string, TaskContribution[]>();
  for (const r of cRows) {
    let arr = cByTask.get(r.task_id);
    if (!arr) {
      arr = [];
      cByTask.set(r.task_id, arr);
    }
    arr.push({
      id: r.id,
      step: r.step,
      user_id: r.user_id,
      user_name: r.user_name,
      role_label: r.role_label,
      content: r.content,
      status: r.status,
      review_comment: r.review_comment,
      reviewed_by: r.reviewed_by,
      submitted_at: r.submitted_at,
      reviewed_at: r.reviewed_at,
    });
  }

  for (const t of tasks) {
    (t as Task).assignees = aByTask.get(t.id) ?? [];
    (t as Task).contributions = cByTask.get(t.id) ?? [];
  }
  return tasks;
}