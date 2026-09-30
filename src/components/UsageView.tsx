"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, Download, Gauge, Printer, Server, TrendingUp } from "lucide-react";
import type {
  ActivityReport,
  ResourceUsage,
  UsageDayRow,
  UsageEndpointRow,
} from "@/lib/types";
import { ACTIVITY_METRICS } from "@/lib/types";
import { useToast } from "@/components/Toast";

function fmtBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const val = bytes / Math.pow(1024, i);
  return `${val >= 100 || i === 0 ? Math.round(val) : val.toFixed(1)} ${units[i]}`;
}

function statusOf(used: number, limit: number): { cls: string; label: string } {
  if (limit <= 0) return { cls: "bg-white/5 text-slate-400", label: "No limit" };
  const pct = (used / limit) * 100;
  if (pct >= 100) return { cls: "bg-rose-400/10 text-rose-300", label: "Exhausted" };
  if (pct >= 80) return { cls: "bg-amber-400/10 text-amber-300", label: "Near limit" };
  return { cls: "bg-emerald-400/10 text-emerald-300", label: "Healthy" };
}

function Meter({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const tone = pct >= 100 ? "bg-rose-400" : pct >= 80 ? "bg-amber-400" : "bg-brand-300";
  return (
    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

const PRESETS: {
  label: string;
  from?: string;
  to?: string;
  relative?: "last30" | "month";
}[] = [
  { label: "Last 30 days", relative: "last30" },
  { label: "This month", relative: "month" },
  { label: "1 – 20 Sep 2026", from: "2026-09-01", to: "2026-09-20" },
  { label: "20 – 30 Sep 2026", from: "2026-09-20", to: "2026-09-30" },
];

/** Resolved on click only, so SSR and client clocks can never disagree. */
function resolvePreset(p: (typeof PRESETS)[number]): { from: string; to: string } {
  const today = new Date();
  if (p.relative === "last30") {
    return {
      from: new Date(today.getTime() - 29 * 86400000).toISOString().slice(0, 10),
      to: today.toISOString().slice(0, 10),
    };
  }
  if (p.relative === "month") {
    const d = today.toISOString().slice(0, 10);
    return { from: `${d.slice(0, 8)}01`, to: d };
  }
  return { from: p.from!, to: p.to! };
}

export default function UsageView({
  from,
  to,
  resources,
  tracked,
  activity,
}: {
  from: string;
  to: string;
  resources: ResourceUsage;
  tracked: { byEndpoint: UsageEndpointRow[]; byDay: UsageDayRow[] };
  activity: ActivityReport;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  // The page is a server component: `from`/`to` change only after the new
  // report has rendered, so that is when the loading state must end.
  useEffect(() => {
    setBusy(false);
  }, [from, to]);

  function applyRange(nextFrom: string, nextTo: string) {
    if (nextFrom > nextTo) {
      toast("The start date must be on or before the end date.", "error");
      return;
    }
    setBusy(true);
    router.push(`/usage?from=${nextFrom}&to=${nextTo}`);
  }

  const storage = resources.storage;
  const transfer = resources.transfer;
  const storageStatus = statusOf(storage.used, storage.limit);
  const transferStatus = statusOf(transfer.used, transfer.limit);

  const metricTotals = ACTIVITY_METRICS.map((m) => ({ ...m, value: activity.totals[m.key] ?? 0 }));
  const totalActions = activity.totals.activity_events ?? 0;

  function exportCsv() {
    const lines: string[] = [];
    lines.push(`Usage & Analytics,${from} to ${to}`);
    lines.push("");
    lines.push("Resource,Used,Limit,Status");
    lines.push(`Storage,${fmtBytes(storage.used)},${fmtBytes(storage.limit)},${storageStatus.label}`);
    lines.push(`App-measured payload,${fmtBytes(transfer.used)},${fmtBytes(transfer.limit)},${transferStatus.label}`);
    lines.push("");
    lines.push("Traffic by endpoint,Requests,Rows,Approx bytes,Avg ms");
    for (const r of tracked.byEndpoint) {
      lines.push(`${r.endpoint},${r.requests},${r.rows_returned},${r.approx_bytes},${r.avg_ms}`);
    }
    lines.push("");
    lines.push("Day," + ACTIVITY_METRICS.map((m) => m.label).join(","));
    for (const d of activity.byDay) {
      lines.push(d.day + "," + ACTIVITY_METRICS.map((m) => d.counts[m.key] ?? 0).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `usage-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Usage CSV downloaded.", "success");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Usage &amp; Analytics</h1>
          <p className="text-sm text-slate-400">
            Plan limits, database traffic and day-by-day CRM activity.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => applyRange(e.target.value, to)}
            className="input !py-1.5 text-xs"
            aria-label="From date"
          />
          <span className="text-slate-500 text-xs">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => applyRange(from, e.target.value)}
            className="input !py-1.5 text-xs"
            aria-label="To date"
          />
          <button
            onClick={exportCsv}
            className="btn-secondary !py-1.5 !px-3 text-xs justify-center"
          >
            <Download className="h-3.5 w-3.5" /> Excel
          </button>
          <button onClick={() => window.print()} className="btn-secondary !py-1.5 !px-3 text-xs justify-center">
            <Printer className="h-3.5 w-3.5" /> PDF
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {PRESETS.map((p) => {
          const r = resolvePreset(p);
          const active = r.from === from && r.to === to;
          return (
            <button
              key={p.label}
              onClick={() => applyRange(r.from, r.to)}
              disabled={busy}
              className={`badge !px-3 !py-1.5 transition-colors disabled:opacity-50 ${
                active ? "bg-brand-300 text-night-950" : "bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              {p.label}
            </button>
          );
        })}
        {busy && <span className="text-[11px] text-slate-400">Loading report…</span>}
      </div>

      {/* ---- Resource limits ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-brand-300" />
            <h2 className="font-semibold text-sm">Database storage</h2>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold text-white">{fmtBytes(storage.used)}</p>
            <span className={`badge ${storageStatus.cls}`}>{storageStatus.label}</span>
          </div>
          <Meter used={storage.used} limit={storage.limit} />
          <p className="text-[11px] text-slate-500">
            Limit {fmtBytes(storage.limit)} ·{" "}
            {((storage.used / (storage.limit || 1)) * 100).toFixed(2)}% used
          </p>
        </div>

        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand-300" />
            <h2 className="font-semibold text-sm">App-measured payload volume</h2>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold text-white">{fmtBytes(transfer.used)}</p>
            <span className={`badge ${transferStatus.cls}`}>{transferStatus.label}</span>
          </div>
          <Meter used={transfer.used} limit={transfer.limit} />
          <p className="text-[11px] text-slate-500">
            Reference limit {fmtBytes(transfer.limit)} ·{" "}
            {((transfer.used / (transfer.limit || 1)) * 100).toFixed(1)}% of the reference cap
          </p>
          {transfer.trackedFrom ? (
            <p className="text-[11px] text-slate-500">
              Tracking since {transfer.trackedFrom} · {resources.activeDays} active day(s) in range
            </p>
          ) : (
            <p className="text-[11px] text-amber-300/80">
              No tracked traffic recorded in this period — instrumentation started{" "}
              {from > to ? "later" : "with this feature"}. Use the Activity report below for
              historical data.
            </p>
          )}
        </div>
      </div>

      <div className="card p-4 flex items-start gap-3">
        <Gauge className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
        <p className="text-[11px] text-slate-400 leading-relaxed">
          <span className="text-slate-300 font-medium">How to read this.</span> Storage is exact
          (measured by Postgres). Payload volume and active days are{" "}
          <span className="text-slate-300">app-measured</span> — they show which screens generate
          the most traffic, so you can cut it. Neon&apos;s billable figures (CU-hours and billable
          network transfer) are billed server-side and are only exact in the Neon console; use this
          page to find and remove the causes.
        </p>
      </div>

      {/* ---- Traffic by endpoint ---- */}
      <div className="card overflow-x-auto">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-semibold text-sm">Read traffic by endpoint</h2>
          <span className="badge bg-white/5 text-slate-400">{tracked.byEndpoint.length} tracked</span>
        </div>
        {tracked.byEndpoint.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">
            No tracked traffic for this period yet.
          </p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Endpoint</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Requests</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Rows</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Approx size</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Avg ms</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {tracked.byEndpoint.map((r) => (
                <tr key={r.endpoint} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-2 font-medium text-white">{r.endpoint}</td>
                  <td className="px-3 py-2 text-right text-slate-200">{r.requests.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-slate-300">{r.rows_returned.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-slate-300">{fmtBytes(r.approx_bytes)}</td>
                  <td className="px-3 py-2 text-right text-slate-400">{r.avg_ms}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ---- Historical CRM activity ---- */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="card p-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Days in range</p>
            <p className="text-xl font-bold text-white mt-1">{activity.dayCount}</p>
          </div>
          <div className="card p-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Active users</p>
            <p className="text-xl font-bold text-white mt-1">{activity.activeUsers}</p>
          </div>
          <div className="card p-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Actions logged</p>
            <p className="text-xl font-bold text-white mt-1">{totalActions.toLocaleString()}</p>
          </div>
          {metricTotals.slice(0, 3).map((m) => (
            <div key={m.key} className="card p-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">{m.label}</p>
              <p className="text-xl font-bold text-white mt-1">{m.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        <div className="card overflow-x-auto">
          <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand-300" />
            <h2 className="font-semibold text-sm">
              CRM activity — {from} to {to}
            </h2>
            {activity.sourcesTotal != null && activity.sourcesFound !== activity.sourcesTotal && (
              <span
                className="badge bg-amber-400/10 text-amber-300"
                title="Some report sources are missing from the connected database, so their columns cannot be counted."
              >
                {activity.sourcesFound}/{activity.sourcesTotal} sources available
              </span>
            )}
          </div>
          {activity.sourcesTotal != null && activity.sourcesFound === 0 && (
            <p className="px-4 py-3 text-xs text-amber-300/80 border-b border-white/10">
              No activity tables were found in the connected database, so every column below is
              zero. This usually means the server is pointed at a different Neon branch or database
              than the one holding the CRM data.
            </p>
          )}
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Day</th>
                {ACTIVITY_METRICS.map((m) => (
                  <th
                    key={m.key}
                    className="px-3 py-2 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap"
                  >
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {activity.byDay.map((d) => {
                const dayTotal = ACTIVITY_METRICS.reduce((sum, m) => sum + (d.counts[m.key] ?? 0), 0);
                return (
                  <tr key={d.day} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-2 font-medium text-white whitespace-nowrap">
                      {d.day}
                      {dayTotal === 0 && (
                        <span className="ml-2 badge bg-white/5 text-slate-500">no activity</span>
                      )}
                    </td>
                    {ACTIVITY_METRICS.map((m) => (
                      <td key={m.key} className="px-3 py-2 text-right text-slate-300">
                        {(d.counts[m.key] ?? 0) || <span className="text-slate-600">—</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/10 bg-white/[0.03]">
                <td className="px-4 py-2 font-semibold text-white">Total</td>
                {ACTIVITY_METRICS.map((m) => (
                  <td key={m.key} className="px-3 py-2 text-right font-semibold text-white">
                    {activity.totals[m.key]?.toLocaleString() ?? 0}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
