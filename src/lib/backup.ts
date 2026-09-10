import { query } from "@/lib/db";
import { notifyRoles } from "@/lib/notifications";

// Tables that are operational (not user data). Excluded from dumps so a
// restore never wipes the backup history itself or the storage config.
const OPERATIONAL_TABLES = new Set(["db_backups", "app_settings"]);

export type BackupKind = "manual" | "monthly";

export interface BackupRow {
  id: string;
  kind: BackupKind;
  filename: string;
  size_bytes: number;
  created_by: string | null;
  created_at: string;
}

export interface StorageInfo {
  used_bytes: number;
  limit_bytes: number;
  alert_pct: number;
  used_pct: number;
  last_alert_at: string | null;
  checked_at: string | null;
}

/* ---------------- Full SQL dump ---------------- */

/**
 * Generate a complete SQL dump of the database (schema + data) ready to be
 * replayed with a Postgres client. Mirrors scripts/backup_full.mjs but runs
 * through the app's serverless query() helper so it works on any serverless
 * deployment (Vercel/Neon HTTP).
 */
export async function generateDatabaseDump(): Promise<string> {
  const out: string[] = [];
  out.push(`-- Advrix CRM full backup`);
  out.push(`-- Generated: ${new Date().toISOString()}`);
  out.push(``);
  out.push(`SET statement_timeout = 0;`);
  out.push(`SET lock_timeout = 0;`);
  out.push(`SET client_encoding = 'UTF8';`);
  out.push(``);

  // Extensions
  const exts = await query<{ extname: string }>(
    `SELECT extname FROM pg_extension WHERE extname NOT IN ('plpgsql') ORDER BY extname`
  );
  for (const e of exts) {
    out.push(`CREATE EXTENSION IF NOT EXISTS "${e.extname}" WITH SCHEMA public;`);
  }
  if (exts.length) out.push(``);

  // Tables (user data only, excludes operational tables)
  const tables = await query<{ schemaname: string; tablename: string }>(
    `SELECT schemaname, tablename FROM pg_tables
     WHERE schemaname NOT IN ('pg_catalog','information_schema','pg_toast')
     ORDER BY schemaname, tablename`
  );

  const dataTables = tables.filter((t) => !OPERATIONAL_TABLES.has(t.tablename));

  // Collect FK dependency order so INSERTs never violate child-before-parent.
  const order = await topologicalTableOrder(dataTables.map((t) => t.tablename));

  for (const name of order) {
    const table = tables.find((t) => t.tablename === name)!;
    const fq = `"${table.schemaname}"."${table.tablename}"`;

    out.push(``);
    out.push(`-- Table: ${fq}`);
    out.push(`DROP TABLE IF EXISTS ${fq} CASCADE;`);

    const cols = await query<any>(
      `SELECT column_name, udt_name, character_maximum_length, numeric_precision,
              numeric_scale, is_nullable, column_default, data_type
       FROM information_schema.columns
       WHERE table_schema=$1 AND table_name=$2
       ORDER BY ordinal_position`,
      [table.schemaname, table.tablename]
    );

    const colDefs = cols.map((c: any) => {
      let typ = c.udt_name;
      if (typ.startsWith("_")) typ = `${typ.slice(1)}[]`;
      if (c.character_maximum_length && (typ === "varchar" || typ === "bpchar"))
        typ = `${typ}(${c.character_maximum_length})`;
      else if (typ === "numeric" && c.numeric_precision)
        typ = `numeric(${c.numeric_precision},${c.numeric_scale})`;
      let def = `  "${c.column_name}" ${typ}`;
      if (c.is_nullable === "NO") def += " NOT NULL";
      if (c.column_default) {
        // gen_random_uuid() and now() survive restore as-is; nextval/sequences
        // do too because we re-create tables empty first, then insert rows with
        // explicit ids.
        def += ` DEFAULT ${c.column_default}`;
      }
      return def;
    });

    out.push(`CREATE TABLE ${fq} (`);
    out.push(colDefs.join(",\n"));
    out.push(`);`);

    // Constraints (primary key, unique, fk, check)
    const cons = await query<{ conname: string; contype: string; def: string }>(
      `SELECT conname, contype, pg_get_constraintdef(oid)::text AS def
       FROM pg_constraint
       WHERE conrelid = $1::regclass
       ORDER BY conname`,
      [`${table.schemaname}.${table.tablename}`]
    );
    for (const c of cons) {
      out.push(`ALTER TABLE ONLY ${fq} ADD CONSTRAINT "${c.conname}" ${c.def};`);
    }

    // Indexes (excluding constraint-backed ones)
    const idx = await query<{ indexname: string; indexdef: string }>(
      `SELECT indexname, indexdef FROM pg_indexes
       WHERE schemaname=$1 AND tablename=$2
       ORDER BY indexname`,
      [table.schemaname, table.tablename]
    );
    for (const i of idx) {
      const isConstraintBacked = cons.some(
        (c) => i.indexdef.includes(`"${c.conname}"`) || i.indexdef.includes(c.conname)
      );
      if (!isConstraintBacked) out.push(`${i.indexdef};`);
    }

    // Data
    const rows = await query<any>(`SELECT * FROM ${fq}`);
    if (rows.length === 0) {
      out.push(`-- no rows in ${fq}`);
      continue;
    }
    const colNames = cols.map((c: any) => `"${c.column_name}"`).join(", ");
    out.push(`-- Data: ${rows.length} rows`);
    const batchSize = 500;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const vals = batch.map((row: any) => {
        const inner = cols.map((c: any) => sqlValue(row[c.column_name], c.udt_name));
        return `(${inner.join(", ")})`;
      });
      out.push(`INSERT INTO ${fq} (${colNames}) VALUES`);
      out.push(vals.join(",\n") + ";");
    }
  }

  out.push(``);
  out.push(`-- Done`);
  return out.join("\n");
}

/** Escape + format a single SQL value for a dump. */
function sqlValue(v: unknown, udt: string): string {
  if (v === null || v === undefined) return "NULL";
  if (udt === "bool") return v ? "true" : "false";
  if (["int2", "int4", "int8", "float4", "float8", "numeric", "money"].includes(udt))
    return String(v);
  if (v instanceof Date) return `'${v.toISOString()}'`;
  if (Array.isArray(v)) {
    const inner = v.map((x) =>
      x === null ? "NULL" : `'${String(x).replace(/'/g, "''")}'`
    );
    const arrType = udt.startsWith("_") ? `${udt.slice(1)}[]` : udt;
    return `ARRAY[${inner.join(", ")}]::${arrType}`;
  }
  if (typeof v === "object" && udt === "jsonb") {
    return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  }
  if (typeof v === "object" && udt === "json") {
    return `'${JSON.stringify(v).replace(/'/g, "''")}'::json`;
  }
  const s = String(v).replace(/'/g, "''").replace(/\r?\n/g, " ");
  return `'${s}'`;
}

/** Topologically order tables so parents come before children (INSERT order). */
async function topologicalTableOrder(tableNames: string[]): Promise<string[]> {
  const deps = new Map<string, Set<string>>();
  for (const name of tableNames) deps.set(name, new Set());

  const fk = await query<{ child: string; parent: string }>(
    `SELECT DISTINCT c.relname AS child, p.relname AS parent
     FROM pg_constraint k
     JOIN pg_class c ON c.oid = k.conrelid
     JOIN pg_class p ON p.oid = k.confrelid
     WHERE k.contype = 'f'`
  );
  for (const r of fk) {
    if (deps.has(r.child) && deps.has(r.parent)) deps.get(r.child)!.add(r.parent);
  }

  const sorted: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(n: string) {
    if (visited.has(n)) return;
    if (visiting.has(n)) return; // cycle — fall back to current order
    visiting.add(n);
    for (const d of deps.get(n)!) {
      if (!visited.has(d)) visit(d);
    }
    visiting.delete(n);
    visited.add(n);
    sorted.push(n);
  }
  for (const n of tableNames) visit(n);
  return sorted;
}

/* ---------------- Storage monitoring ---------------- */

export async function getStorageInfo(): Promise<StorageInfo> {
  // Ensure settings row exists (re-run idempotent insert from migration).
  await query(`INSERT INTO app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`);

  const sizeRows = await query<{ bytes: string }>(
    `SELECT pg_database_size(current_database())::text AS bytes`
  );
  const used_bytes = Number(sizeRows[0]?.bytes || 0);

  const cfg = await query<any>(`SELECT * FROM app_settings WHERE id = 1`);
  const limit_bytes = Number(cfg[0]?.max_storage_bytes ?? 536870912);
  const alert_pct = Number(cfg[0]?.storage_alert_pct ?? 90);
  const used_pct = limit_bytes > 0 ? Math.round((used_bytes / limit_bytes) * 10000) / 100 : 0;

  return {
    used_bytes,
    limit_bytes,
    alert_pct,
    used_pct,
    last_alert_at: cfg[0]?.last_storage_alert_at ?? null,
    checked_at: cfg[0]?.storage_checked_at ?? null,
  };
}

/**
 * Measure DB size and send a SUPER_ADMIN notification when storage is at/over
 * the alert threshold. Deduplicated so it only re-fires after recovering below
 * the threshold (edge-triggered). Message per requirement.
 */
export async function checkStorageAndAlert(): Promise<StorageInfo> {
  const info = await getStorageInfo();
  const overThreshold = info.used_pct >= info.alert_pct || info.used_bytes >= info.limit_bytes;

  if (overThreshold && !info.last_alert_at) {
    try {
      await notifyRoles(["SUPER_ADMIN"], {
        type: "system",
        title: "Database storage nearly full",
        body: "database almost full need cleanup. kindly backup your data and clean it.",
        link: "/settings",
      });
      await query(`UPDATE app_settings SET last_storage_alert_at = now() WHERE id = 1`);
    } catch (e) {
      console.error("checkStorageAndAlert notify failed:", e);
    }
  } else if (!overThreshold) {
    // Clear the flag so the alert fires again on the next crossing.
    await query(`UPDATE app_settings SET last_storage_alert_at = NULL WHERE id = 1`);
  }

  await query(`UPDATE app_settings SET storage_checked_at = now() WHERE id = 1`);
  return { ...info, last_alert_at: overThreshold ? new Date().toISOString() : null, checked_at: new Date().toISOString() };
}

/** Manual "check now" used by the Settings BackupPanel. */
export async function updateStorageLimit(bytes: number) {
  const safe = Math.max(1, Math.floor(bytes));
  await query(`UPDATE app_settings SET max_storage_bytes = $1, updated_at = now() WHERE id = 1`, [safe]);
}

/* ---------------- Backup snapshot CRUD ---------------- */

export async function createBackupSnapshot(kind: BackupKind, createdBy: string | null = null): Promise<BackupRow> {
  const sql = await generateDatabaseDump();
  const filename = `advrix-backup-${new Date().toISOString().slice(0, 16).replace(/[T:]/g, "-")}.sql`;
  const rows = await query<BackupRow>(
    `INSERT INTO db_backups (kind, filename, size_bytes, sql_content, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, kind, filename, size_bytes, created_by, created_at`,
    [kind, filename, Buffer.byteLength(sql), sql, createdBy]
  );
  return rows[0];
}

export async function listBackups(): Promise<BackupRow[]> {
  return query<BackupRow>(
    `SELECT id, kind, filename, size_bytes, created_by, created_at
     FROM db_backups ORDER BY created_at DESC LIMIT 60`
  );
}

export async function getBackupSql(id: string): Promise<{ row: BackupRow; sql: string } | null> {
  const rows = await query<BackupRow & { sql_content: string }>(
    `SELECT id, kind, filename, size_bytes, created_by, created_at, sql_content
     FROM db_backups WHERE id = $1`,
    [id]
  );
  if (!rows[0]) return null;
  const { sql_content, ...row } = rows[0];
  return { row, sql: sql_content };
}

export async function deleteBackup(id: string) {
  await query(`DELETE FROM db_backups WHERE id = $1`, [id]);
}

/* ---------------- Restore ---------------- */

/**
 * Split a SQL backup on top-level semicolons (quote-aware) so each statement
 * can be run individually through the serverless driver.
 */
export function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inString = false;
  let inDollar: string | null = null;
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (inDollar) {
      current += ch;
      if (sql.startsWith(inDollar, i)) {
        current += inDollar;
        i += inDollar.length;
        inDollar = null;
        continue;
      }
      i++;
      continue;
    }

    if (ch === "$") {
      const m = /^\$[a-zA-Z_0-9]*\$/.exec(sql.slice(i));
      if (m) {
        inDollar = m[0];
        current += m[0];
        i += m[0].length;
        continue;
      }
    }

    if (inString) {
      current += ch;
      if (ch === "'") {
        if (next === "'") {
          current += next;
          i += 2;
          continue;
        }
        inString = false;
      }
      i++;
      continue;
    }

    if (ch === "'") {
      inString = true;
      current += ch;
      i++;
      continue;
    }

    if (ch === ";" && next === "\n") {
      const cleaned = cleanStatement(current);
      if (cleaned) statements.push(cleaned);
      current = "";
      i += 2;
      continue;
    }

    current += ch;
    i++;
  }

  const tail = cleanStatement(current);
  if (tail) statements.push(tail);
  return statements;
}

/** Trim a candidate statement and drop leading comment/blank lines. */
function cleanStatement(raw: string): string {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("--"));
  const body = lines.join("\n").trim();
  if (!body || /^SET\s/i.test(body)) return "";
  return body;
}

/**
 * Replay a backup's SQL statements in order. Destructive — the caller must
 * confirm. Returns how many statements ran and whether all succeeded.
 */
export async function restoreFromSql(sql: string): Promise<{ ok: boolean; executed: number; error?: string }> {
  const statements = splitStatements(sql);
  let executed = 0;
  for (const stmt of statements) {
    try {
      await query(stmt);
      executed++;
    } catch (e: any) {
      console.error("restoreFromSql failed at statement", executed + 1, e);
      return {
        ok: false,
        executed,
        error: `Statement ${executed + 1} failed: ${e?.message || e}`,
      };
    }
  }

  // Serial/idendity columns reference sequences that get dropped with the
  // table. Re-sync every serial sequence to MAX(id)+1 so future inserts work.
  try {
    await syncSerialSequences();
  } catch (e: any) {
    console.error("sequence sync failed (non-fatal):", e);
  }

  return { ok: true, executed };
}

/** Point every serial/bigserial sequence at the next id so inserts keep working. */
async function syncSerialSequences() {
  const cols = await query<{ table_schema: string; table_name: string; column_name: string }>(
    `SELECT table_schema, table_name, column_name
     FROM information_schema.columns
     WHERE column_default LIKE 'nextval(%'`
  );
  for (const c of cols) {
    try {
      const seq = await query<{ seq: string }>(
        `SELECT pg_get_serial_sequence($1, $2) AS seq`,
        [`${c.table_schema}.${c.table_name}`, c.column_name]
      );
      if (!seq[0]?.seq) continue;
      // DROP TABLE ... CASCADE removed the owned sequence — recreate it first.
      await query(`CREATE SEQUENCE IF NOT EXISTS ${seq[0].seq}`);
      const nextRows = await query<{ next: string }>(
        `SELECT COALESCE(MAX(${`"${c.column_name}"`}) , 0) + 1::bigint AS next FROM ${`"${c.table_schema}"."${c.table_name}"`}`
      );
      await query(`SELECT setval($1, $2, false)`, [seq[0].seq, Number(nextRows[0]?.next || 1)]);
    } catch (e) {
      console.error(`syncSerialSequences failed for ${c.table_schema}.${c.table_name}:`, e);
    }
  }
}