/**
 * Server-side translation of the AdvancedFilterBar state into SQL.
 *
 * The filter bar mirrors every select into URL params (?clientId=&project=
 * &stage=&deadline=&status=&priority=) and the free-text box into ?q=. This
 * module turns those into WHERE fragments so filtering happens in Postgres
 * across the WHOLE dataset instead of only the rows on the current page —
 * which is what makes a search actually find a task sitting on page 4.
 *
 * Both callers alias the task/project/client tables as `t`, `p` and `c`
 * (see PIPELINE_TASK_SELECT and TASK_SELECT), so the fragments are shared.
 */

export interface TaskFilterState {
  /** Free-text search (?q=). */
  q?: string;
  /** Client uuid. */
  clientId?: string;
  /** Project name. */
  project?: string;
  /** Assignee / current stage name, or "Unassigned". */
  stage?: string;
  /** overdue | today | this_week | next_week */
  deadline?: string;
  status?: string;
  priority?: string;
}

export interface BuiltFilter {
  /** AND-joined SQL fragment with a leading AND, or "" when nothing is set. */
  sql: string;
  /** Values to append to the query's parameter array, in order. */
  params: unknown[];
}

const EMPTY: BuiltFilter = { sql: "", params: [] };

/** ISO day (UTC) n days from today. */
function addDays(days: number): string {
  const t = new Date();
  t.setUTCHours(0, 0, 0, 0);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
}

/** Monday of the current week (UTC) — mirrors startOfWeekIso() in the filter bar. */
function startOfWeek(): string {
  const dow = (new Date().getUTCDay() + 6) % 7; // Mon = 0
  return addDays(-dow);
}

/**
 * Builds the AND-joined WHERE fragment. `startIndex` is the next free `$N`
 * placeholder in the caller's parameter array.
 */
export function buildTaskFilterSql(f: TaskFilterState, startIndex: number): BuiltFilter {
  const parts: string[] = [];
  const params: unknown[] = [];
  let i = startIndex;
  const next = () => `$${i++}`;

  if (f.clientId) {
    parts.push(`AND c.id = ${next()}`);
    params.push(f.clientId);
  }

  if (f.project) {
    parts.push(`AND p.name = ${next()}`);
    params.push(f.project);
  }

  if (f.stage) {
    // Mirrors taskStageValues(): the current holder plus every assignee, or
    // "Unassigned" when the task has no assignee rows at all. The same value is
    // bound once and reused via a CTE-free repeated placeholder.
    const p1 = next();
    const p2 = next();
    params.push(f.stage, f.stage);
    parts.push(
      `AND (
         EXISTS (
           SELECT 1 FROM task_assignees sfa
           JOIN users sfu ON sfu.id = sfa.user_id
           WHERE sfa.task_id = t.id AND sfu.full_name = ${p1}
         )
         OR (
           ${p2} = 'Unassigned'
           AND NOT EXISTS (SELECT 1 FROM task_assignees sfa2 WHERE sfa2.task_id = t.id)
         )
       )`
    );
  }

  if (f.status) {
    parts.push(`AND t.status = ${next()}`);
    params.push(f.status);
  }

  if (f.priority) {
    parts.push(`AND t.priority = ${next()}`);
    params.push(f.priority);
  }

  if (f.deadline) {
    const today = addDays(0);
    if (f.deadline === "overdue") {
      parts.push(
        `AND t.due_date IS NOT NULL AND t.due_date::date < ${next()} AND t.status <> 'completed'`
      );
      params.push(today);
    } else if (f.deadline === "today") {
      parts.push(`AND t.due_date::date = ${next()}`);
      params.push(today);
    } else if (f.deadline === "this_week" || f.deadline === "next_week") {
      const weekStart = startOfWeek();
      const from = f.deadline === "this_week" ? weekStart : addDays(7);
      const to = f.deadline === "this_week" ? addDays(7) : addDays(14);
      parts.push(`AND t.due_date::date >= ${next()} AND t.due_date::date < ${next()}`);
      params.push(from, to);
    }
  }

  const q = (f.q || "").trim();
  if (q) {
    const like = `%${q}%`;
    parts.push(
      `AND (
         t.title ILIKE ${next()}
         OR p.name ILIKE ${next()}
         OR c.name ILIKE ${next()}
         OR c.company ILIKE ${next()}
         OR t.status ILIKE ${next()}
         OR t.priority ILIKE ${next()}
         OR COALESCE(t.due_date::text, '') ILIKE ${next()}
         OR EXISTS (
           SELECT 1 FROM task_assignees sqa
           JOIN users squ ON squ.id = sqa.user_id
           WHERE sqa.task_id = t.id AND squ.full_name ILIKE ${next()}
         )
       )`
    );
    for (let k = 0; k < 8; k++) params.push(like);
  }

  if (parts.length === 0) return EMPTY;
  return { sql: `\n  ${parts.join("\n  ")}`, params };
}

/** True when any filter or search term is active. */
export function hasActiveTaskFilter(f: TaskFilterState): boolean {
  return Boolean(
    (f.q || "").trim() ||
      f.clientId ||
      f.project ||
      f.stage ||
      f.deadline ||
      f.status ||
      f.priority
  );
}

/**
 * Exact per-category totals backing the quick-filter chips
 * (Active / Awaiting Review / Upload Done / Completed / History).
 * Always computed with the current search + filters EXCEPT status itself, so
 * every number a user sees is exact across the whole dataset — for every role.
 */
export interface QuickCounts {
  active: number;
  awaiting: number;
  uploadDone: number;
  completed: number;
  history: number;
}

export const EMPTY_QUICK_COUNTS: QuickCounts = {
  active: 0,
  awaiting: 0,
  uploadDone: 0,
  completed: 0,
  history: 0,
};