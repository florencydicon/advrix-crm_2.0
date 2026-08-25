"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Clock,
  MapPin,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Calendar,
  ExternalLink,
} from "lucide-react";
import type {
  EmployeeAttendanceDetail as AttDetail,
  EmployeeAttendanceSummary,
} from "@/lib/data";

const RANGES = [
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "quarter", label: "Last 3 Months" },
  { key: "year", label: "This Year" },
  { key: "custom", label: "Custom" },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

function rangeDates(key: RangeKey, customStart: string, customEnd: string) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  let start: string;
  let end: string = fmt(now);

  if (key === "week") {
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1; // Monday start
    const mon = new Date(now);
    mon.setDate(now.getDate() - diff);
    start = fmt(mon);
  } else if (key === "month") {
    start = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  } else if (key === "quarter") {
    const qStart = new Date(now);
    qStart.setMonth(now.getMonth() - 3);
    start = fmt(qStart);
  } else if (key === "year") {
    start = `${now.getFullYear()}-01-01`;
  } else {
    start = customStart || fmt(new Date(now.getFullYear(), now.getMonth(), 1));
    end = customEnd || fmt(now);
  }

  return { start, end };
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

function formatDate(d: string) {
  try {
    const dt = d.includes("T") ? new Date(d) : new Date(d + "T00:00:00");
    if (isNaN(dt.getTime())) return "—";
    return dt.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

function mapsLink(lat: number | null, lng: number | null) {
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

const STATUS_META: Record<string, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  present: { label: "Present", cls: "bg-emerald-400/10 text-emerald-300", icon: CheckCircle2 },
  late: { label: "Late", cls: "bg-amber-400/10 text-amber-300", icon: AlertCircle },
  absent: { label: "Absent", cls: "bg-rose-400/10 text-rose-300", icon: XCircle },
  half_day: { label: "Half Day", cls: "bg-sky-400/10 text-sky-300", icon: Clock },
  on_leave: { label: "On Leave", cls: "bg-violet-400/10 text-violet-300", icon: Calendar },
};

interface Props {
  userId: string;
  userName: string;
  userRole: string;
  onClose: () => void;
}

export default function EmployeeAttendanceDetail({ userId, userName, userRole, onClose }: Props) {
  const [range, setRange] = useState<RangeKey>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [records, setRecords] = useState<AttDetail[]>([]);
  const [summary, setSummary] = useState<EmployeeAttendanceSummary | null>(null);
  const [leaves, setLeaves] = useState<{ id: string; leave_type: string; start_date: string; end_date: string; days: number; reason: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const { start, end } = rangeDates(range, customStart, customEnd);

  useEffect(() => {
    setLoading(true);
    const controller = new AbortController();
    fetch(`/api/attendance/employee?userId=${userId}&start=${start}&end=${end}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        setRecords(data.records || []);
        setSummary(data.summary || null);
        setLeaves(data.leaves || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [userId, start, end]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-white truncate">{userName}</h2>
          <p className="text-xs text-slate-400">{userRole}</p>
        </div>
      </div>

      {/* Range selector */}
      <div className="flex flex-wrap items-center gap-1.5">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              range === r.key
                ? "bg-brand-300 text-night-950 shadow-sm"
                : "bg-white/5 border border-white/10 text-slate-300 hover:border-brand-300/50"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Custom range */}
      {range === "custom" && (
        <div className="flex items-center gap-2 flex-wrap">
          <div>
            <label className="label text-[10px]">From</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="input !py-1.5 text-xs !w-auto"
            />
          </div>
          <div>
            <label className="label text-[10px]">To</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="input !py-1.5 text-xs !w-auto"
            />
          </div>
        </div>
      )}

      {/* Period label */}
      <p className="text-xs text-slate-500">
        {formatDate(start)} — {formatDate(end)}
      </p>

      {loading ? (
        <div className="card p-8 text-center text-sm text-slate-500">Loading…</div>
      ) : (
        <>
          {/* Summary cards */}
          {summary && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { label: "Present", value: summary.present, cls: "text-emerald-300 bg-emerald-400/10" },
                { label: "Late", value: summary.late, cls: "text-amber-300 bg-amber-400/10" },
                { label: "Half Day", value: summary.half_days, cls: "text-sky-300 bg-sky-400/10" },
                { label: "Absent", value: summary.absent, cls: "text-rose-300 bg-rose-400/10" },
                { label: "On Leave", value: summary.on_leave, cls: "text-violet-300 bg-violet-400/10" },
                { label: "Total Hours", value: `${summary.total_hours.toFixed(1)}h`, cls: "text-brand-300 bg-brand-300/10" },
              ].map((s) => (
                <div key={s.label} className={`card p-3 text-center ${s.cls}`}>
                  <p className="text-xl font-bold leading-none">{s.value}</p>
                  <p className="text-[9px] md:text-[10px] font-medium mt-1 opacity-80">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Day-by-day records */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
              <Clock className="h-4 w-4 text-brand-300" />
              <h3 className="font-semibold text-sm">Daily Attendance</h3>
              <span className="ml-auto text-xs text-slate-500">{records.length} day{records.length === 1 ? "" : "s"}</span>
            </div>
            {records.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">No attendance records in this period.</div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {records.map((r) => {
                  const meta = STATUS_META[r.status] || STATUS_META.absent;
                  const StatusIcon = meta.icon;
                  const link = mapsLink(r.latitude, r.longitude);
                  return (
                    <div key={r.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-white">{formatDate(r.date)}</p>
                            <span className={`badge text-[10px] ${meta.cls}`}>
                              <StatusIcon className="h-3 w-3" />
                              {meta.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-400">
                            <span>In: <span className="text-white font-medium">{formatTime(r.punch_in)}</span></span>
                            <span>Out: <span className="text-white font-medium">{formatTime(r.punch_out)}</span></span>
                            {r.hours_worked > 0 && (
                              <span className="text-brand-300 font-medium">{r.hours_worked}h</span>
                            )}
                          </div>
                          {r.location_text && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
                              <p className="text-[11px] text-slate-500 truncate">{r.location_text}</p>
                              {link && (
                                <a href={link} target="_blank" rel="noopener noreferrer" className="text-brand-300 hover:text-brand-200 shrink-0">
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          )}
                          {r.latitude != null && r.longitude != null && (
                            <p className="text-[10px] text-slate-600 mt-0.5">
                              📍 {r.latitude.toFixed(6)}, {r.longitude.toFixed(6)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Leaves in this period */}
          {leaves.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
                <Calendar className="h-4 w-4 text-violet-400" />
                <h3 className="font-semibold text-sm">Leaves in Period</h3>
                <span className="ml-auto text-xs text-slate-500">{leaves.length}</span>
              </div>
              <div className="divide-y divide-white/[0.06]">
                {leaves.map((l) => (
                  <div key={l.id} className="px-4 py-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs text-white">
                        <span className="capitalize font-medium">{l.leave_type}</span>
                        <span className="text-slate-500"> · {l.days}d</span>
                      </p>
                      <p className="text-[10px] text-slate-500">{formatDate(l.start_date)} — {formatDate(l.end_date)}</p>
                      {l.reason && <p className="text-[10px] text-slate-600 truncate mt-0.5">{l.reason}</p>}
                    </div>
                    <span className={`badge text-[10px] ${
                      l.status === "approved" ? "bg-emerald-400/10 text-emerald-300"
                      : l.status === "rejected" ? "bg-rose-400/10 text-rose-300"
                      : "bg-amber-400/10 text-amber-300"
                    }`}>
                      {l.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
