/**
 * Reports exact Neon compute / storage / network-transfer usage for a date
 * window using the Neon Management API. This is the ONLY source of the real
 * billable numbers - they are never stored in the application database.
 *
 *   NEON_API_KEY=...  NEON_PROJECT_ID=...  node scripts/neon-usage-report.mjs \
 *     --from 2026-09-01 --to 2026-09-20
 *
 * The API is time-series and daily, so a window is served by fetching the
 * enclosing month(s) and taking only the days inside the window.
 */
import fs from "node:fs";

const API = "https://console.neon.tech/api/projects";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  return process.argv[i + 1];
}

function loadDotEnv() {
  for (const f of [".env.local", ".env"]) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  }
}

function ymRange(from, to) {
  const months = new Set();
  const d = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (d <= end) {
    months.add(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return [...months].sort();
}

function fmtBytes(n) {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  const v = n / Math.pow(1024, i);
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(2)} ${u[i]}`;
}

function fmtHours(n) {
  if (!n) return "0 h";
  return n >= 100 ? `${Math.round(n)} h` : `${n.toFixed(2)} h`;
}

function status(pct) {
  if (pct >= 100) return "EXCEEDED";
  if (pct >= 80) return "WARN";
  return "OK";
}

/** Pull every point of every metric for a month. */
async function fetchMonth(apiKey, projectId, month) {
  const [year, mon] = month.split("-");
  const start = `${month}-01T00:00:00Z`;
  const endDate = new Date(Date.UTC(Number(year), Number(mon), 0));
  const end = `${month}-${String(endDate.getUTCDate()).padStart(2, "0")}T23:59:59Z`;

  const url = `${API}/${projectId}/metrics?start_time=${start}&end_time=${end}&granularity=day`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Neon metrics ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = await res.json();
  return json.metrics || json.data || [];
}

/**
 * Normalise the several shapes Neon returns into:
 *   day -> { computeHours, storageBytes, transferBytes }
 */
function normalise(points) {
  const byDay = new Map();
  const add = (day, key, value) => {
    if (!day || typeof value !== "number" || Number.isNaN(value)) return;
    const row = byDay.get(day) || { computeHours: 0, storageBytes: 0, transferBytes: 0 };
    row[key] += value;
    byDay.set(day, row);
  };

  for (const p of points) {
    const ts = p.ts || p.timestamp || p.time || p.date;
    if (!ts) continue;
    const day = String(ts).slice(0, 10);
    const metric = String(p.metric || p.name || p.id || "").toLowerCase();

    if (metric.includes("compute_cu_seconds") || metric.includes("cu_seconds")) {
      add(day, "computeHours", (p.value || 0) / 3600);
    } else if (metric.includes("compute_time") || metric.includes("active_seconds")) {
      add(day, "computeHours", (p.value || 0) / 3600);
    } else if (metric.includes("storage") || metric.includes("lcu")) {
      add(day, "storageBytes", (p.value || 0) * 1024 * 1024);
    } else if (metric.includes("transfer_bytes") || metric.includes("network")) {
      add(day, "transferBytes", p.value || 0);
    } else if (metric.includes("transfer_gb")) {
      add(day, "transferBytes", (p.value || 0) * 1024 * 1024 * 1024);
    } else {
      // Unrecognised metric: keep raw so nothing is silently dropped.
      add(day, `raw_${metric || "unknown"}`, p.value || 0);
    }
  }
  return byDay;
}

function sumWindow(byDay, from, to) {
  const totals = { computeHours: 0, storagePeakBytes: 0, transferBytes: 0, days: 0 };
  for (const [day, row] of byDay) {
    if (day < from || day > to) continue;
    totals.days += 1;
    totals.computeHours += row.computeHours || 0;
    totals.transferBytes += row.transferBytes || 0;
    if ((row.storageBytes || 0) > totals.storagePeakBytes) totals.storagePeakBytes = row.storageBytes || 0;
    for (const [k, v] of Object.entries(row)) {
      if (k.startsWith("raw_")) totals[k] = (totals[k] || 0) + v;
    }
  }
  return totals;
}

async function main() {
  loadDotEnv();
  const apiKey = arg("api-key", process.env.NEON_API_KEY);
  const projectId = arg("project", process.env.NEON_PROJECT_ID);
  const from = arg("from");
  const to = arg("to");

  if (!apiKey) {
    console.error("NEON_API_KEY is required (or --api-key).");
    process.exit(1);
  }
  if (!projectId) {
    console.error("NEON_PROJECT_ID is required (or --project).");
    process.exit(1);
  }
  if (!from || !to) {
    console.error("Both --from and --to (YYYY-MM-DD) are required.");
    process.exit(1);
  }

  const limits = {
    computeHours: Number(process.env.NEON_COMPUTE_LIMIT_HOURS || 100),
    storageBytes: Number(process.env.NEON_STORAGE_LIMIT_BYTES || 536870912),
    transferBytes: Number(process.env.NEON_TRANSFER_LIMIT_BYTES || 5910732800),
  };

  const byDay = new Map();
  for (const month of ymRange(from, to)) {
    const points = await fetchMonth(apiKey, projectId, month);
    console.error(`  fetched ${points.length} metric points for ${month}`);
    for (const [day, row] of normalise(points)) byDay.set(day, row);
  }

  const t = sumWindow(byDay, from, to);
  const metrics = [
    { name: "Compute time", used: t.computeHours, limit: limits.computeHours, fmt: fmtHours },
    { name: "Storage (peak)", used: t.storagePeakBytes, limit: limits.storageBytes, fmt: fmtBytes },
    { name: "Network transfer", used: t.transferBytes, limit: limits.transferBytes, fmt: fmtBytes },
  ];

  console.log(`\nNeon usage report   ${from}  ->  ${to}`);
  console.log(`Project: ${projectId}`);
  console.log(`Days with data: ${t.days}\n`);
  console.log("Metric".padEnd(18) + "Used".padEnd(14) + "Limit".padEnd(14) + "Used %".padEnd(10) + "Status");
  console.log("-".repeat(70));
  for (const m of metrics) {
    const pct = m.limit > 0 ? (m.used / m.limit) * 100 : 0;
    console.log(
      m.name.padEnd(18) +
        m.fmt(m.used).padEnd(14) +
        m.fmt(m.limit).padEnd(14) +
        `${pct.toFixed(1)}%`.padEnd(10) +
        status(pct)
    );
  }
  for (const [k, v] of Object.entries(t)) {
    if (k.startsWith("raw_")) console.log(`\nUnmapped metric ${k.slice(4)}: ${v}`);
  }
  console.log();
}

main().catch((e) => {
  console.error(`\nFailed: ${e.message}`);
  process.exit(1);
});
