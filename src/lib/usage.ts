import { query } from "@/lib/db";
import type {
  ActivityDayRow,
  ActivityMetricKey,
  ActivityReport,
  ResourceUsage,
  UsageDayRow,
  UsageEndpointRow,
} from "@/lib/types";
import { ACTIVITY_METRICS } from "@/lib/types";

export type {
  ActivityDayRow,
  ActivityMetricKey,
  ActivityReport,
  ResourceUsage,
  UsageDayRow,
  UsageEndpointRow,
};
export { ACTIVITY_METRICS };

/* ---------------- Usage & analytics ----------------
 *
 * Two independent data sources feed the reports:
 *
 * 1. `app_usage_daily` — per-day instrumentation of the app's own read
 *    traffic (requests, rows returned, approx. payload bytes). This is
 *    APP-MEASURED data, not Neon's billable figure: it tells you *where*
 *    the traffic comes from so it can be trimmed.
 *
 * 2. Existing business tables (notifications, tasks, attendance, ...) —
 *    real historical CRM activity by their own timestamps. Available for
 *    any past period, including dates before this feature existed.
 */

export interface UsageLimits {
  computeHours: number;
  storageBytes: number;
  transferBytes: number;
}
/**
 * Plan ceilings. Defaults match the Neon Free plan; override with env vars so
 * this stays correct if the plan changes.
 */
export const PLAN_LIMITS: UsageLimits = {
  computeHours: Number(process.env.NEON_COMPUTE_LIMIT_HOURS || 100),
  storageBytes: Number(process.env.NEON_STORAGE_LIMIT_BYTES || 536870912), // 500 MB
  transferBytes: Number(process.env.NEON_TRANSFER_LIMIT_BYTES || 5910732800), // 5.5 GB
};

let _schemaReady = false;

/** Idempotent: creates the per-day usage table. Never throws. */
export async function ensureUsageSchema(): Promise<void> {
  if (_schemaReady) return;
  _schemaReady = true;
  try {
    await query(
      `CREATE TABLE IF NOT EXISTS app_usage_daily (
         day DATE NOT NULL,
         endpoint TEXT NOT NULL,
         requests INT NOT NULL DEFAULT 0,
         rows_returned BIGINT NOT NULL DEFAULT 0,
         approx_bytes BIGINT NOT NULL DEFAULT 0,
         duration_ms BIGINT NOT NULL DEFAULT 0,
         PRIMARY KEY (day, endpoint)
       )`
    );
    await query(`CREATE INDEX IF NOT EXISTS idx_app_usage_daily_day ON app_usage_daily(day DESC)`);
  } catch {
    _schemaReady = false;
  }
}

/**
 * Record one read request. Best-effort and never throws — instrumentation must
 * never break a page. Aggregated per day+endpoint so the table stays tiny.
 */
export async function recordUsage(params: {
  endpoint: string;
  rows?: number;
  bytes?: number;
  durationMs?: number;
}): Promise<void> {
  try {
    await ensureUsageSchema();
    const istDay = `(now() AT TIME ZONE 'Asia/Kolkata')::date`;
    await query(
      `INSERT INTO app_usage_daily (day, endpoint, requests, rows_returned, approx_bytes, duration_ms)
       VALUES (${istDay}, $1, 1, $2, $3, $4)
       ON CONFLICT (day, endpoint) DO UPDATE SET
         requests = app_usage_daily.requests + 1,
         rows_returned = app_usage_daily.rows_returned + EXCLUDED.rows_returned,
         approx_bytes = app_usage_daily.approx_bytes + EXCLUDED.approx_bytes,
         duration_ms = app_usage_daily.duration_ms + EXCLUDED.duration_ms`,
      [
        params.endpoint,
        Math.max(0, Math.round(params.rows || 0)),
        Math.max(0, Math.round(params.bytes || 0)),
        Math.max(0, Math.round(params.durationMs || 0)),
      ]
    );
  } catch {
    // Never surface instrumentation failures.
  }
}

// ---------- Resource usage (current + tracked period) ----------

export async function getResourceUsage(start: string, end: string): Promise<ResourceUsage> {
  const limits = PLAN_LIMITS;

  // Live storage — exact, straight from Postgres.
  let dbSizeBytes = 0;
  try {
    const rows = await query<{ bytes: string }>(`SELECT pg_database_size(current_database())::text AS bytes`);
    dbSizeBytes = Number(rows[0]?.bytes || 0);
  } catch {}

  // App-measured payload volume for the window (NOT Neon's billable figure).
  let used = 0;
  let activeDays = 0;
  let trackedFrom: string | null = null;
  try {
    await ensureUsageSchema();
    const rows = await query<{ bytes: string; days: string; first_day: string }>(
      `SELECT COALESCE(SUM(approx_bytes), 0)::text AS bytes,
              COUNT(DISTINCT day)::text AS days,
              MIN(day)::text AS first_day
       FROM app_usage_daily
       WHERE day BETWEEN $1 AND $2`,
      [start, end]
    );
    used = Number(rows[0]?.bytes || 0);
    activeDays = Number(rows[0]?.days || 0);
    trackedFrom = rows[0]?.first_day || null;
  } catch {}

  const startD = new Date(`${start}T00:00:00`);
  const endD = new Date(`${end}T00:00:00`);
  const totalDays =
    isNaN(startD.getTime()) || isNaN(endD.getTime()) || endD < startD
      ? 0
      : Math.round((endD.getTime() - startD.getTime()) / 86400000) + 1;

  return {
    storage: { used: dbSizeBytes, limit: limits.storageBytes },
    transfer: { used, limit: limits.transferBytes, trackedFrom },
    activeDays,
    totalDays,
  };
}

/** Per-endpoint and per-day breakdown of tracked read traffic. */
export async function getTrackedUsage(
  start: string,
  end: string
): Promise<{ byEndpoint: UsageEndpointRow[]; byDay: UsageDayRow[] }> {
  const byEndpoint: UsageEndpointRow[] = [];
  const byDay: UsageDayRow[] = [];
  try {
    await ensureUsageSchema();
    const eps = await query<{
      endpoint: string;
      requests: string;
      rows_returned: string;
      approx_bytes: string;
      duration_ms: string;
    }>(
      `SELECT endpoint,
              SUM(requests)::bigint::text AS requests,
              SUM(rows_returned)::text AS rows_returned,
              SUM(approx_bytes)::text AS approx_bytes,
              SUM(duration_ms)::text AS duration_ms
       FROM app_usage_daily
       WHERE day BETWEEN $1 AND $2
       GROUP BY endpoint
       ORDER BY SUM(approx_bytes) DESC`,
      [start, end]
    );
    for (const r of eps) {
      const requests = Number(r.requests || 0);
      const duration = Number(r.duration_ms || 0);
      byEndpoint.push({
        endpoint: r.endpoint,
        requests,
        rows_returned: Number(r.rows_returned || 0),
        approx_bytes: Number(r.approx_bytes || 0),
        avg_ms: requests > 0 ? Math.round(duration / requests) : 0,
      });
    }

    const days = await query<{ day: string; requests: string; rows_returned: string; approx_bytes: string }>(
      `SELECT day::text AS day,
              SUM(requests)::bigint::text AS requests,
              SUM(rows_returned)::text AS rows_returned,
              SUM(approx_bytes)::text AS approx_bytes
       FROM app_usage_daily
       WHERE day BETWEEN $1 AND $2
       GROUP BY day
       ORDER BY day ASC`,
      [start, end]
    );
    for (const d of days) {
      byDay.push({
        day: d.day,
        requests: Number(d.requests || 0),
        rows_returned: Number(d.rows_returned || 0),
        approx_bytes: Number(d.approx_bytes || 0),
      });
    }
  } catch {}

  return { byEndpoint, byDay };
}

// ---------- Historical CRM activity (real data, any past period) ----------

function emptyCounts(): Record<ActivityMetricKey, number> {
  return {
    activity_events: 0,
    notifications: 0,
    tasks_created: 0,
    tasks_completed: 0,
    projects_created: 0,
    clients_created: 0,
    leaves_requested: 0,
    attendance_days: 0,
    daily_logs: 0,
  };
}

/**
 * IST day boundaries as half-open UTC instants. Filtering on
 * `col >= $lo AND col < $hi` keeps the query sargable so a created_at index
 * is used; only the GROUP BY needs the timezone conversion.
 *
 * `hi` is midnight IST of the day AFTER `end`, so the final day is included.
 */
function istBounds(start: string, end: string): { lo: string; hi: string } {
  const dayAfter = new Date(`${end}T00:00:00Z`);
  dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);
  const endInclusive = dayAfter.toISOString().slice(0, 10);
  return {
    lo: new Date(`${start}T00:00:00+05:30`).toISOString(),
    hi: new Date(`${endInclusive}T00:00:00+05:30`).toISOString(),
  };
}

const cache = new Map<string, { at: number; report: ActivityReport }>();
const ACTIVITY_TTL_MS = 5 * 60 * 1000;

/**
 * Which report sources actually exist in the connected database.
 *
 * Production databases are not all identical: a branch may never have had a
 * migration applied, and the 9-metric UNION would fail as a whole on the
 * first missing relation. So the sources are probed once and only the ones
 * present are queried — the report then degrades gracefully instead of
 * returning nothing at all.
 */
const METRIC_SOURCES: {
  metric: ActivityMetricKey;
  table: string;
  column: string;
}[] = [
  { metric: "activity_events", table: "activity_log", column: "created_at" },
  { metric: "notifications", table: "notifications", column: "created_at" },
  { metric: "tasks_created", table: "tasks", column: "created_at" },
  { metric: "tasks_completed", table: "tasks", column: "completed_at" },
  { metric: "projects_created", table: "projects", column: "created_at" },
  { metric: "clients_created", table: "clients", column: "created_at" },
  { metric: "leaves_requested", table: "leaves", column: "created_at" },
  { metric: "attendance_days", table: "attendance", column: "date" },
  { metric: "daily_logs", table: "daily_work_logs", column: "created_at" },
];

let sourceCache: { at: number; present: Set<string> } | null = null;
const SOURCE_TTL_MS = 10 * 60 * 1000;

async function availableSources(): Promise<Set<string>> {
  if (sourceCache && Date.now() - sourceCache.at < SOURCE_TTL_MS) return sourceCache.present;
  const present = new Set<string>();
  try {
    const rows = await query<{ table_name: string; column_name: string }>(
      `SELECT table_name, column_name FROM information_schema.columns
       WHERE table_schema = 'public'
         AND (table_name, column_name) IN (
           ${METRIC_SOURCES.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(", ")}
         )`,
      METRIC_SOURCES.flatMap((s) => [s.table, s.column])
    );
    for (const r of rows) present.add(`${r.table_name}.${r.column_name}`);
  } catch {
    // Probe failed: fall back to trying every source.
    for (const s of METRIC_SOURCES) present.add(`${s.table}.${s.column}`);
  }
  sourceCache = { at: Date.now(), present };
  return present;
}

export async function getActivityReport(start: string, end: string): Promise<ActivityReport> {
  const report: ActivityReport = { byDay: [], totals: emptyCounts(), activeUsers: 0, dayCount: 0 };
  const startD = new Date(`${start}T00:00:00`);
  const endD = new Date(`${end}T00:00:00`);
  if (isNaN(startD.getTime()) || isNaN(endD.getTime()) || endD < startD) return report;
  report.dayCount = Math.round((endD.getTime() - startD.getTime()) / 86400000) + 1;

  // The activity report aggregates 9 tables, so memoise it briefly: several
  // admins opening the same window must not each re-run the full scan.
  const memoKey = `${start}|${end}`;
  const hit = cache.get(memoKey);
  if (hit && Date.now() - hit.at < ACTIVITY_TTL_MS) return hit.report;

  // Seed every day so the report table has a complete range. Anchored to UTC
  // so server timezone can never shift the day labels.
  const byDayMap = new Map<string, Record<ActivityMetricKey, number>>();
  const cursor = new Date(`${start}T00:00:00Z`);
  for (let i = 0; i < report.dayCount; i++) {
    byDayMap.set(cursor.toISOString().slice(0, 10), emptyCounts());
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const { lo, hi } = istBounds(start, end);
  const present = await availableSources();
  /** IST day for a timestamp column. */
  const D = (col: string) => `(${col} AT TIME ZONE 'Asia/Kolkata')::date`;

  const branches: string[] = [];
  for (const src of METRIC_SOURCES) {
    if (!present.has(`${src.table}.${src.column}`)) continue;
    if (src.column === "date") {
      branches.push(
        `SELECT '${src.metric}', date, COUNT(*)::bigint FROM ${src.table}
         WHERE date >= $3 AND date <= $4 GROUP BY 2`
      );
    } else {
      branches.push(
        `SELECT '${src.metric}', ${D(src.column)}, COUNT(*)::bigint FROM ${src.table}
         WHERE ${src.column} >= $1 AND ${src.column} < $2 GROUP BY 2`
      );
    }
  }

  if (branches.length > 0) {
    const sql = `SELECT metric, day, SUM(c)::int AS c FROM (
      ${branches.join("\nUNION ALL\n")}
    ) t GROUP BY metric, day ORDER BY day ASC`;
    try {
      const rows = await query<{ metric: string; day: string; c: number }>(sql, [lo, hi, start, end]);
      for (const r of rows) {
        const key = String(r.day).slice(0, 10);
        let bucket = byDayMap.get(key);
        if (!bucket) {
          bucket = emptyCounts();
          byDayMap.set(key, bucket);
        }
        const metric = r.metric as ActivityMetricKey;
        if (metric in bucket) {
          bucket[metric] += Number(r.c || 0);
          report.totals[metric] += Number(r.c || 0);
        }
      }
    } catch {
      // Keep the seeded range; the page still renders.
    }
  }

  report.byDay = [...byDayMap.entries()].map(([day, counts]) => ({ day, counts }));

  if (present.has("activity_log.created_at")) {
    try {
      const users = await query<{ c: string }>(
        `SELECT COUNT(DISTINCT actor_user_id)::text AS c FROM activity_log
         WHERE created_at >= $1 AND created_at < $2 AND actor_user_id IS NOT NULL`,
        [lo, hi]
      );
      report.activeUsers = Number(users[0]?.c || 0);
    } catch {}
  }

  report.sourcesFound = branches.length;
  report.sourcesTotal = METRIC_SOURCES.length;

  cache.set(memoKey, { at: Date.now(), report });
  return report;
}
