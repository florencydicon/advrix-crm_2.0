import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";

/**
 * Super Admin data export (CSV).
 * GET /api/export?dataset=clients|projects|tasks|attendance|leaves|leads|users
 *               &mode=all|day|month|year&date=YYYY-MM-DD
 */

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (session.role_key !== "SUPER_ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const dataset = sp.get("dataset") || "";
  const mode = sp.get("mode") || "all";
  const dateRaw = sp.get("date") || "";

  const DATASETS: Record<string, (from: string | null, to: string | null) => Promise<string>> = {
    clients,
    projects,
    tasks,
    attendance,
    leaves,
    leads,
    users,
  };

  if (!DATASETS[dataset]) {
    return Response.json({ error: "Unknown dataset." }, { status: 400 });
  }

  // Compute the [from, to] window from mode + anchor date.
  let from: string | null = null;
  let to: string | null = null;
  if (mode !== "all") {
    const d = new Date(`${dateRaw}T00:00:00`);
    if (!dateRaw || isNaN(d.getTime())) {
      return Response.json({ error: "A valid date is required for this range." }, { status: 400 });
    }
    const pad = (n: number) => String(n).padStart(2, "0");
    const iso = (x: Date) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
    if (mode === "day") {
      from = to = iso(d);
    } else if (mode === "month") {
      from = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
      to = iso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    } else if (mode === "year") {
      from = `${d.getFullYear()}-01-01`;
      to = `${d.getFullYear()}-12-31`;
    } else {
      return Response.json({ error: "Invalid mode." }, { status: 400 });
    }
  }

  const csv = await DATASETS[dataset](from, to);
  const suffix =
    mode === "all"
      ? "all"
      : mode === "year"
      ? String(new Date(`${dateRaw}T00:00:00`).getFullYear())
      : dateRaw;

  return new Response("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="advrix-${dataset}-${suffix}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

/* ---------------- CSV helpers ---------------- */

/** Neutralize CSV/Excel formula injection and quotes/newlines. */
function f(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

function toCsv(header: string[], rows: unknown[][]): string {
  return [header.map(f).join(","), ...rows.map((r) => r.map(f).join(","))].join("\r\n");
}

/** WHERE clause fragment for the given column + window. Params are appended. */
function windowWhere(col: string, from: string | null, to: string | null, params: unknown[]): string {
  if (!from || !to) return "";
  // DATE-safe comparison: cast timestamps to date.
  params.push(from, to);
  const n = params.length;
  return ` AND (${col}::date >= $${n - 1} AND ${col}::date <= $${n})`;
}

/* ---------------- Datasets ---------------- */

async function clients(from: string | null, to: string | null): Promise<string> {
  const params: unknown[] = [];
  const rows = await query<Record<string, unknown>>(
    `SELECT c.name, c.company, c.email, c.phone,
            (SELECT COUNT(*)::int FROM projects p WHERE p.client_id = c.id) AS total_projects,
            c.created_at::text AS created_at
     FROM clients c WHERE true${windowWhere("c.created_at", from, to, params)}
     ORDER BY c.created_at DESC`,
    params
  );
  return toCsv(
    ["Client", "Company", "Email", "Phone", "Total Projects", "Created"],
    rows.map((r) => [r.name, r.company, r.email, r.phone, r.total_projects, r.created_at])
  );
}

async function projects(from: string | null, to: string | null): Promise<string> {
  const params: unknown[] = [];
  const rows = await query<Record<string, unknown>>(
    `SELECT cl.name AS client_name, p.name, p.status, p.deadline::text AS deadline,
            u.full_name AS created_by_name,
            (SELECT COUNT(*)::int FROM tasks t WHERE t.project_id = p.id) AS total_tasks,
            (SELECT COUNT(*)::int FROM tasks t WHERE t.project_id = p.id AND t.status = 'completed') AS completed_tasks,
            p.created_at::text AS created_at
     FROM projects p
     JOIN clients cl ON cl.id = p.client_id
     LEFT JOIN users u ON u.id = p.created_by
     WHERE true${windowWhere("p.created_at", from, to, params)}
     ORDER BY p.created_at DESC`,
    params
  );
  return toCsv(
    ["Client", "Project", "Status", "Deadline", "Created By", "Tasks", "Completed", "Created"],
    rows.map((r) => [r.client_name, r.name, r.status, r.deadline, r.created_by_name, r.total_tasks, r.completed_tasks, r.created_at])
  );
}

async function tasks(from: string | null, to: string | null): Promise<string> {
  const params: unknown[] = [];
  const rows = await query<Record<string, unknown>>(
    `SELECT cl.name AS client_name, p.name AS project_name, t.title,
            r.label AS role_label, u.full_name AS assignee_name, t.status,
            t.due_date::text AS due_date, t.completed_at::text AS completed_at, t.created_at::text AS created_at
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     JOIN clients cl ON cl.id = p.client_id
     LEFT JOIN users u ON u.id = t.assigned_to
     LEFT JOIN roles r ON r.key = t.role_key
     WHERE true${windowWhere("t.created_at", from, to, params)}
     ORDER BY t.created_at DESC`,
    params
  );
  return toCsv(
    ["Client", "Project", "Task", "Role", "Assignee", "Status", "Due Date", "Completed At", "Created"],
    rows.map((r) => [r.client_name, r.project_name, r.title, r.role_label, r.assignee_name, r.status, r.due_date, r.completed_at, r.created_at])
  );
}

async function attendance(from: string | null, to: string | null): Promise<string> {
  const params: unknown[] = [];
  const rows = await query<Record<string, unknown>>(
    `SELECT u.full_name, r.label AS role_label, a.date::text AS date,
            a.punch_in::text AS punch_in, a.punch_out::text AS punch_out,
            a.status, a.hours_worked, a.note
     FROM attendance a
     JOIN users u ON u.id = a.user_id
     JOIN roles r ON r.id = u.role_id
     WHERE true${windowWhere("a.date", from, to, params)}
     ORDER BY a.date DESC, u.full_name ASC`,
    params
  );
  return toCsv(
    ["Employee", "Role", "Date", "Punch In", "Punch Out", "Status", "Hours", "Note"],
    rows.map((r) => [r.full_name, r.role_label, r.date, r.punch_in, r.punch_out, r.status, r.hours_worked, r.note])
  );
}

async function leaves(from: string | null, to: string | null): Promise<string> {
  const params: unknown[] = [];
  const rows = await query<Record<string, unknown>>(
    `SELECT u.full_name, l.leave_type, l.start_date::text AS start_date, l.end_date::text AS end_date,
            l.days, l.reason, l.status, au.full_name AS approved_by_name, l.rejection_reason
     FROM leaves l
     JOIN users u ON u.id = l.user_id
     LEFT JOIN users au ON au.id = l.approved_by
     WHERE true${windowWhere("l.start_date", from, to, params)}
     ORDER BY l.start_date DESC`,
    params
  );
  return toCsv(
    ["Employee", "Type", "From", "To", "Days", "Reason", "Status", "Approved By", "Rejection Reason"],
    rows.map((r) => [r.full_name, r.leave_type, r.start_date, r.end_date, r.days, r.reason, r.status, r.approved_by_name, r.rejection_reason])
  );
}

async function leads(from: string | null, to: string | null): Promise<string> {
  const params: unknown[] = [];
  const rows = await query<Record<string, unknown>>(
    `SELECT l.name, l.company, l.email, l.phone, l.source, l.status, l.deal_value,
            ow.full_name AS owner_name, l.next_follow_up::text AS next_follow_up, l.notes,
            l.converted_client_id IS NOT NULL AS converted, l.created_at::text AS created_at
     FROM leads l
     JOIN users ow ON ow.id = l.owner_id
     WHERE true${windowWhere("l.created_at", from, to, params)}
     ORDER BY l.created_at DESC`,
    params
  );
  return toCsv(
    ["Lead", "Company", "Email", "Phone", "Source", "Status", "Deal Value", "Owner", "Follow-up", "Converted", "Notes", "Created"],
    rows.map((r) => [r.name, r.company, r.email, r.phone, r.source, r.status, r.deal_value, r.owner_name, r.next_follow_up, r.converted ? "yes" : "no", r.notes, r.created_at])
  );
}

async function users(_from: string | null, _to: string | null): Promise<string> {
  const rows = await query<Record<string, unknown>>(
    `SELECT u.full_name, u.email, r.label AS role_label, u.is_active, u.created_at::text AS created_at
     FROM users u JOIN roles r ON r.id = u.role_id
     ORDER BY u.created_at ASC`
  );
  return toCsv(
    ["Name", "Email", "Role", "Active", "Joined"],
    rows.map((r) => [r.full_name, r.email, r.role_label, r.is_active ? "yes" : "no", r.created_at])
  );
}
