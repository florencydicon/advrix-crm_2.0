import { randomUUID } from "crypto";
import * as XLSX from "xlsx";
import { query, transactionQueries } from "@/lib/db";
import { logActivity } from "@/lib/activity";

/**
 * Full-database Excel backup + two-way sync.
 *
 * One workbook contains one sheet per business table. Row IDs are kept exactly
 * as they are in Postgres so an edited file can be diffed against the live DB
 * cell-by-cell. Only changed cells are written back.
 *
 * Deliberately excluded (security / operational data):
 *   users.password_hash, users.password_enc
 *   db_backups, app_settings, client_shares, push_subscriptions, fcm_tokens,
 *   login_attempts, activity_log, app_usage_daily, neon_auth.*
 */

type TableConfig = {
  table: string;
  label: string;
  /** Columns never written to the Excel file. */
  skip?: string[];
  /** Exported but never changed by an import (workflow identity keys). */
  immutable?: string[];
};

/** Parent-first order. Reverse of this list is used for deletions. */
const EXPORT_TABLES: TableConfig[] = [
  { table: "roles", label: "Roles", immutable: ["key"] },
  {
    table: "users",
    label: "Users",
    skip: ["password_hash", "password_enc"],
  },
  { table: "clients", label: "Clients" },
  { table: "projects", label: "Projects" },
  { table: "deliverable_types", label: "Deliverable Types", immutable: ["key"] },
  { table: "project_deliverables", label: "Project Deliverables" },
  { table: "deliverable_assignees", label: "Deliverable Assignees" },
  { table: "assignments", label: "Assignments" },
  { table: "workflow_steps", label: "Workflow Steps" },
  { table: "attendance_settings", label: "Attendance Settings" },
  { table: "tasks", label: "Tasks / Subtasks" },
  { table: "task_assignees", label: "Task Assignees" },
  { table: "task_contributions", label: "Task Contributions" },
  { table: "leads", label: "Leads" },
  { table: "attendance", label: "Attendance" },
  { table: "leaves", label: "Leaves" },
  { table: "notifications", label: "Notifications" },
  { table: "contents", label: "Content Library" },
  { table: "daily_work_logs", label: "Daily Work Logs" },
];

const TABLE_LABELS: Record<string, string> = Object.fromEntries(
  EXPORT_TABLES.map((t) => [t.table, t.label])
);

type ColumnInfo = {
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: boolean;
  has_default: boolean;
};

type Change = {
  column: string;
  from: string;
  to: string;
};

type TableDiff = {
  table: string;
  label: string;
  rowsInExcel: number;
  rowsInDb: number;
  updates: number;
  inserts: number;
  deletes: number;
  samples: { id: string; changes: Change[] }[];
};

type Statement = {
  kind: "update" | "insert" | "delete";
  table: string;
  id?: string;
  text: string;
  params: any[];
};

export type BackupPlan = {
  tables: TableDiff[];
  totals: { updates: number; inserts: number; deletes: number };
  warnings: string[];
  statements: Statement[];
};

/* ------------------------------------------------------------------ */
/* Schema helpers                                                      */
/* ------------------------------------------------------------------ */

async function loadSchema(): Promise<Record<string, ColumnInfo[]>> {
  const names = EXPORT_TABLES.map((t) => t.table);
  const rows = await query<any>(
    `SELECT table_name, column_name, data_type, udt_name,
            (is_nullable = 'YES') AS is_nullable,
            (column_default IS NOT NULL) AS has_default
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = ANY($1)
     ORDER BY table_name, ordinal_position`,
    [names]
  );
  const schema: Record<string, ColumnInfo[]> = {};
  for (const r of rows) {
    (schema[r.table_name] ||= []).push({
      column_name: r.column_name,
      data_type: r.data_type,
      udt_name: r.udt_name,
      is_nullable: !!r.is_nullable,
      has_default: !!r.has_default,
    });
  }
  return schema;
}

async function loadPrimaryKeys(): Promise<Record<string, string[]>> {
  const names = EXPORT_TABLES.map((t) => t.table);
  const rows = await query<{ table_name: string; column_name: string }>(
    `SELECT tc.table_name, kcu.column_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
     WHERE tc.constraint_type = 'PRIMARY KEY'
       AND tc.table_schema = 'public'
       AND tc.table_name = ANY($1)
     ORDER BY tc.table_name, kcu.ordinal_position`,
    [names]
  );
  const map: Record<string, string[]> = {};
  for (const r of rows) (map[r.table_name] ||= []).push(r.column_name);
  for (const cfg of EXPORT_TABLES) if (!map[cfg.table]) map[cfg.table] = ["id"];
  return map;
}

function visibleColumns(cfg: TableConfig, schema: Record<string, ColumnInfo[]>) {
  return (schema[cfg.table] || []).filter(
    (c) => !(cfg.skip || []).includes(c.column_name)
  );
}

/* ------------------------------------------------------------------ */
/* Value conversion                                                    */
/* ------------------------------------------------------------------ */

function toCell(v: unknown): any {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return { t: "s", v: v.toISOString(), z: "@" };
  if (typeof v === "boolean") return { t: "s", v: String(v), z: "@" };
  if (Array.isArray(v) || typeof v === "object") {
    return { t: "s", v: JSON.stringify(v), z: "@" };
  }
  // Every cell is text: Excel's General format rounds long floats and can
  // reinterpret IDs/dates. Text cells round-trip byte-for-byte.
  return { t: "s", v: String(v), z: "@" };
}

/**
 * Neon returns date/timestamptz/numeric columns as JS objects/strings that do
 * not round-trip through Excel. Cast them to plain SQL text on the way out so
 * the workbook holds the exact database value.
 */
function selectList(cols: ColumnInfo[]): string {
  return cols
    .map((c) => {
      const dt = (c.data_type || "").toLowerCase();
      if (dt === "date" || dt.startsWith("timestamp") || dt === "numeric") {
        return `"${c.column_name}"::text AS "${c.column_name}"`;
      }
      return `"${c.column_name}"`;
    })
    .join(", ");
}

function castFor(col: ColumnInfo): string {
  const dt = (col.data_type || "").toLowerCase();
  if (dt === "array" || col.udt_name?.startsWith("_")) return "::text[]";
  if (dt === "jsonb") return "::jsonb";
  if (dt === "json") return "::json";
  if (dt === "uuid") return "::uuid";
  if (dt === "date") return "::date";
  if (dt.startsWith("timestamp")) return "::timestamptz";
  if (dt === "boolean") return "::boolean";
  if (dt === "numeric") return "::numeric";
  if (dt === "integer") return "::integer";
  if (dt === "bigint") return "::bigint";
  if (dt === "smallint") return "::smallint";
  return "";
}

function parseCell(raw: unknown, col: ColumnInfo): unknown {
  if (raw === null || raw === undefined || raw === "") return null;
  // Two single quotes is the documented way to store a real empty string.
  if (typeof raw === "string" && raw === "''") return "";

  const dt = (col.data_type || "").toLowerCase();
  if (dt === "array" || col.udt_name?.startsWith("_")) {
    if (Array.isArray(raw)) return raw;
    const s = String(raw).trim();
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* fall through to comma-separated format */
    }
    return s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  if (dt === "jsonb" || dt === "json") {
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        throw new Error(`Invalid JSON in column "${col.column_name}"`);
      }
    }
    return raw;
  }
  if (dt === "boolean") {
    const s = String(raw).trim().toLowerCase();
    if (["true", "t", "1", "yes", "y"].includes(s)) return true;
    if (["false", "f", "0", "no", "n"].includes(s)) return false;
    throw new Error(`Invalid true/false value in column "${col.column_name}"`);
  }
  if (
    ["smallint", "integer", "bigint", "numeric", "real", "double precision"].includes(dt)
  ) {
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      throw new Error(`Invalid number in column "${col.column_name}"`);
    }
    return n;
  }
  if (dt === "uuid" && typeof raw === "string") {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw.trim())) {
      throw new Error(`Invalid UUID in column "${col.column_name}"`);
    }
  }
  return String(raw);
}

/** Postgres array literal, e.g. {"a","b"} — not JSON. */
function pgArrayLiteral(values: unknown[]): string {
  return `{${values
    .map((v) => {
      if (v === null || v === undefined) return "NULL";
      return `"${String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    })
    .join(",")}}`;
}

function toParam(v: unknown, col: ColumnInfo): any {
  if (v === null || v === undefined) return null;
  const dt = (col.data_type || "").toLowerCase();
  if (dt === "array" || col.udt_name?.startsWith("_")) {
    return pgArrayLiteral(Array.isArray(v) ? v : [v]);
  }
  if (dt === "jsonb" || dt === "json") return JSON.stringify(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return v;
}

/** Compare an Excel value with the live DB value without false positives. */
function canonical(v: unknown, col: ColumnInfo): string {
  if (v === null || v === undefined) return "";
  const dt = (col.data_type || "").toLowerCase();
  if (Array.isArray(v) || typeof v === "object") return JSON.stringify(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  const s = String(v);
  if (dt === "date") return s.slice(0, 10);
  if (dt.startsWith("timestamp")) {
    const ms = Date.parse(s.replace(" ", "T"));
    return Number.isFinite(ms) ? new Date(ms).toISOString() : s;
  }
  if (
    ["smallint", "integer", "bigint", "numeric", "real", "double precision"].includes(dt)
  ) {
    const n = Number(s);
    return Number.isFinite(n) ? String(n) : s;
  }
  if (dt === "boolean") {
    return ["true", "t", "1"].includes(s.toLowerCase()) ? "true" : "false";
  }
  return s;
}

function display(v: unknown): string {
  if (v === null || v === undefined) return "(empty)";
  if (typeof v === "object") return JSON.stringify(v);
  const s = String(v);
  return s.length > 90 ? `${s.slice(0, 90)}…` : s;
}

function pkValue(row: Record<string, unknown>, pks: string[]): string | null {
  const parts = pks.map((c) => row[c]);
  if (parts.some((v) => v === null || v === undefined || v === "")) return null;
  return parts.map((v) => String(v)).join("\u0001");
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

function moveSheetFirst(wb: XLSX.WorkBook, name: string) {
  wb.SheetNames = [name, ...wb.SheetNames.filter((n) => n !== name)];
  const sheets = (wb.Workbook as any)?.Sheets as any[] | undefined;
  if (sheets) {
    (wb.Workbook as any).Sheets = [
      ...sheets.filter((s) => s.name === name),
      ...sheets.filter((s) => s.name !== name),
    ];
  }
}

export async function buildBackupWorkbook(): Promise<Buffer> {
  const [schema, pks] = await Promise.all([loadSchema(), loadPrimaryKeys()]);
  const wb = XLSX.utils.book_new();
  const counts: { table: string; label: string; rows: number }[] = [];

  for (const cfg of EXPORT_TABLES) {
    const cols = visibleColumns(cfg, schema);
    if (!cols.length) continue; // table not present in this deployment
    const rows = await query<Record<string, unknown>>(
      `SELECT ${selectList(cols)} FROM "${cfg.table}"`
    );
    const aoa: any[][] = [cols.map((c) => c.column_name)];
    for (const row of rows) aoa.push(cols.map((c) => toCell(row[c.column_name])));
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    (ws as any)["!cols"] = cols.map((c) => ({
      wch: Math.min(70, Math.max(14, c.column_name.length + 4)),
    }));
    XLSX.utils.book_append_sheet(wb, ws, cfg.table);
    counts.push({ table: cfg.table, label: cfg.label, rows: rows.length });
  }

  const now = new Date().toISOString();
  const readme: string[][] = [
    ["Advrix CRM — Full Data Backup (Excel)"],
    [`Generated: ${now}`],
    [""],
    ["HOW TO USE"],
    ["1. Edit cell values in the table sheets below. Keep sheet names and column headers EXACTLY as they are."],
    ["2. Do NOT change the ID column — it tells us which row to update. Leave it as it is."],
    ["3. Blank cell = NULL. To store a real empty text value, type two single quotes: ''"],
    ["4. Arrays / JSON must be valid JSON text, e.g. [\"a\",\"b\"] or {\"key\":1}. Dates: YYYY-MM-DD."],
    ["5. Upload this workbook in Settings → Excel Backup & Sync, review the preview, then type APPLY."],
    ["6. Only changed cells are written back to the live database. Unchanged rows are never touched."],
    [""],
    ["SECURITY / SCOPE"],
    ["Password hashes, auth tokens, internal audit logs and backup history are intentionally excluded."],
    ["This file contains live business data — store it securely and do not share it."],
    [""],
    ["SHEETS & ROW COUNTS"],
    ["Sheet", "Rows"],
    ...counts.map((c) => [c.table, String(c.rows)]),
  ];
  const readmeWs = XLSX.utils.aoa_to_sheet(readme);
  (readmeWs as any)["!cols"] = [{ wch: 118 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, readmeWs, "README");
  moveSheetFirst(wb, "README");

  return Buffer.from(
    XLSX.write(wb, { type: "buffer", bookType: "xlsx", compression: true })
  );
}

/* ------------------------------------------------------------------ */
/* Diff / import                                                       */
/* ------------------------------------------------------------------ */

function readWorkbook(buf: Buffer): XLSX.WorkBook {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buf as any, { type: "buffer", cellDates: false });
  } catch {
    throw new Error("This file is not a valid Excel (.xlsx) workbook.");
  }
  if (!wb.SheetNames.includes("README")) {
    throw new Error("Not an Advrix backup file — the README sheet is missing.");
  }
  return wb;
}

function readSheetRows(
  wb: XLSX.WorkBook,
  cfg: TableConfig,
  cols: ColumnInfo[]
): Record<string, unknown>[] {
  if (!wb.SheetNames.includes(cfg.table)) {
    throw new Error(`The sheet "${cfg.table}" is missing from this file.`);
  }
  const grid = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[cfg.table], {
    header: 1,
    raw: false,
    defval: null,
    blankrows: false,
  });
  const header = (grid[0] || []).map((h) => String(h ?? "").trim());
  const expected = cols.map((c) => c.column_name);
  if (header.join("\u0001") !== expected.join("\u0001")) {
    throw new Error(
      `The columns of sheet "${cfg.table}" were changed. Restore the original headers and try again.`
    );
  }
  return grid
    .slice(1)
    .filter((r) => r.some((v) => v !== null && v !== undefined && v !== ""))
    .map((r) => {
      const obj: Record<string, unknown> = {};
      expected.forEach((name, i) => {
        obj[name] = r[i] === undefined ? null : r[i];
      });
      return obj;
    });
}

export async function inspectWorkbook(
  buf: Buffer,
  allowDelete: boolean
): Promise<BackupPlan> {
  const wb = readWorkbook(buf);
  const [schema, pks] = await Promise.all([loadSchema(), loadPrimaryKeys()]);
  const plan: BackupPlan = {
    tables: [],
    totals: { updates: 0, inserts: 0, deletes: 0 },
    warnings: [],
    statements: [],
  };

  const insertStatements: Statement[] = [];
  const updateStatements: Statement[] = [];
  const deleteStatements: Statement[] = [];

  for (const cfg of EXPORT_TABLES) {
    const cols = visibleColumns(cfg, schema);
    if (!cols.length) continue;
    const colMap = new Map(cols.map((c) => [c.column_name, c]));
    const keyCols = pks[cfg.table] || ["id"];
    const immutable = new Set([...keyCols, ...(cfg.immutable || [])]);

    const excelRows = readSheetRows(wb, cfg, cols);
    const liveRows = await query<Record<string, unknown>>(
      `SELECT ${selectList(cols)} FROM "${cfg.table}"`
    );
    const liveByKey = new Map<string, Record<string, unknown>>();
    for (const row of liveRows) {
      const key = pkValue(row, keyCols);
      if (key) liveByKey.set(key, row);
    }

    const diff: TableDiff = {
      table: cfg.table,
      label: TABLE_LABELS[cfg.table] || cfg.table,
      rowsInExcel: excelRows.length,
      rowsInDb: liveRows.length,
      updates: 0,
      inserts: 0,
      deletes: 0,
      samples: [],
    };
    const seen = new Set<string>();
    let ignoredEdits = 0;

    for (const row of excelRows) {
      const key = pkValue(row, keyCols);
      if (key && liveByKey.has(key)) {
        seen.add(key);
        const live = liveByKey.get(key)!;
        const changes: Change[] = [];
        const parsed: { col: ColumnInfo; value: unknown }[] = [];
        for (const col of cols) {
          if (immutable.has(col.column_name)) {
            const incoming = parseCell(row[col.column_name], col);
            if (canonical(incoming, col) !== canonical(live[col.column_name], col)) {
              ignoredEdits++;
            }
            continue;
          }
          const value = parseCell(row[col.column_name], col);
          parsed.push({ col, value });
          if (canonical(value, col) !== canonical(live[col.column_name], col)) {
            changes.push({
              column: col.column_name,
              from: display(live[col.column_name]),
              to: display(value),
            });
          }
        }
        if (!changes.length) continue;

        const params: any[] = [];
        const sets = parsed
          .filter((p) =>
            changes.some((c) => c.column === p.col.column_name)
          )
          .map((p, i) => {
            params.push(toParam(p.value, p.col));
            return `"${p.col.column_name}" = $${i + 1}${castFor(p.col)}`;
          });
        const where = keyCols
          .map((kc, i) => {
            params.push(toParam(row[kc], colMap.get(kc)!));
            return `"${kc}" = $${params.length}${castFor(colMap.get(kc)!)}`;
          })
          .join(" AND ");
        updateStatements.push({
          kind: "update",
          table: cfg.table,
          id: key || undefined,
          text: `UPDATE "${cfg.table}" SET ${sets.join(", ")} WHERE ${where}`,
          params,
        });
        diff.updates++;
        if (diff.samples.length < 5) {
          diff.samples.push({ id: key || "(new row)", changes });
        }
      } else {
        // New row. Generate a UUID when the ID cell was left blank.
        const values: { col: ColumnInfo; value: unknown }[] = [];
        for (const kc of keyCols) {
          const col = colMap.get(kc)!;
          let v = parseCell(row[kc], col);
          if ((v === null || v === "") && col.data_type === "uuid") v = randomUUID();
          values.push({ col, value: v });
        }
        for (const col of cols) {
          if (immutable.has(col.column_name)) continue;
          const v = parseCell(row[col.column_name], col);
          if (v === null && !col.is_nullable && !col.has_default) {
            throw new Error(
              `Row in sheet "${cfg.table}" has an empty value for required column "${col.column_name}".`
            );
          }
          if (v !== null) values.push({ col, value: v });
        }
        const names: string[] = [];
        const marks: string[] = [];
        const params: any[] = [];
        for (const v of values) {
          names.push(`"${v.col.column_name}"`);
          params.push(toParam(v.value, v.col));
          marks.push(`$${params.length}${castFor(v.col)}`);
        }
        insertStatements.push({
          kind: "insert",
          table: cfg.table,
          id: pkValue(
            Object.fromEntries(values.map((v) => [v.col.column_name, v.value])),
            keyCols
          ) || undefined,
          text: `INSERT INTO "${cfg.table}" (${names.join(", ")}) VALUES (${marks.join(", ")})`,
          params,
        });
        diff.inserts++;
        if (diff.samples.length < 5) {
          diff.samples.push({
            id: "(new row)",
            changes: values.slice(0, 6).map((v) => ({
              column: v.col.column_name,
              from: "(new)",
              to: display(v.value),
            })),
          });
        }
      }
    }

    if (allowDelete) {
      for (const [key, live] of liveByKey) {
        if (seen.has(key)) continue;
        const params: any[] = [];
        const where = keyCols
          .map((kc) => {
            params.push(toParam(live[kc], colMap.get(kc)!));
            return `"${kc}" = $${params.length}${castFor(colMap.get(kc)!)}`;
          })
          .join(" AND ");
        deleteStatements.push({
          kind: "delete",
          table: cfg.table,
          id: key,
          text: `DELETE FROM "${cfg.table}" WHERE ${where}`,
          params,
        });
        diff.deletes++;
      }
    } else {
      const missing = liveRows.length - seen.size;
      if (missing > 0) {
        plan.warnings.push(
          `${cfg.label}: ${missing} database row${missing === 1 ? "" : "s"} missing from the Excel file (not deleted).`
        );
      }
    }

    if (ignoredEdits > 0) {
      plan.warnings.push(
        `${cfg.label}: ${ignoredEdits} edit(s) to ID / identity columns were ignored (they identify the row).`
      );
    }

    plan.tables.push(diff);
    plan.totals.updates += diff.updates;
    plan.totals.inserts += diff.inserts;
    plan.totals.deletes += diff.deletes;
  }

  // Deletes must run children-first, inserts parents-first. Updates are safe
  // anywhere in between because all target rows already exist.
  plan.statements = [...deleteStatements.reverse(), ...insertStatements, ...updateStatements];
  return plan;
}

export async function applyWorkbook(
  buf: Buffer,
  allowDelete: boolean
): Promise<{ ok: boolean; applied: BackupPlan["totals"]; statements: number }> {
  const plan = await inspectWorkbook(buf, allowDelete);
  if (plan.statements.length) {
    await transactionQueries(
      plan.statements.map((s) => ({ text: s.text, params: s.params }))
    );
  }
  await logActivity({
    action: "excel_backup_sync",
    entityType: "system",
    metadata: {
      ...plan.totals,
      allowDelete,
      statements: plan.statements.length,
    },
  });
  return {
    ok: true,
    applied: plan.totals,
    statements: plan.statements.length,
  };
}

/** Public summary for the preview endpoint (no SQL statements leaked). */
export function publicPlan(plan: BackupPlan) {
  return {
    tables: plan.tables,
    totals: plan.totals,
    warnings: plan.warnings,
  };
}
