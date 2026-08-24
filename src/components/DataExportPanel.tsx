"use client";

import { useState } from "react";
import { Download, Database, FileSpreadsheet } from "lucide-react";

const DATASETS = [
  { key: "clients", label: "Clients" },
  { key: "projects", label: "Projects" },
  { key: "tasks", label: "Tasks" },
  { key: "attendance", label: "Attendance" },
  { key: "leaves", label: "Leaves" },
  { key: "leads", label: "Leads" },
  { key: "users", label: "Users" },
];

type Mode = "" | "all" | "day" | "month" | "year";

export default function DataExportPanel() {
  const [mode, setMode] = useState<Mode>("all");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [error, setError] = useState<string | null>(null);

  function exportDataset(dataset: string) {
    setError(null);
    let dateParam = "";
    if (mode === "day") {
      if (!day) return setError("Pick a date first.");
      dateParam = day;
    } else if (mode === "month") {
      if (!/^\d{4}-\d{2}$/.test(month)) return setError("Pick a month first.");
      dateParam = `${month}-01`;
    } else if (mode === "year") {
      if (!/^\d{4}$/.test(year)) return setError("Enter a valid year.");
      dateParam = `${year}-01-01`;
    }
    const qs = new URLSearchParams({ dataset, mode: mode || "all" });
    if (dateParam) qs.set("date", dateParam);
    window.open(`/api/export?${qs.toString()}`, "_blank");
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-brand-300" />
        <h2 className="font-semibold">Data Export</h2>
        <span className="badge bg-brand-300/10 text-brand-300 ml-auto">Super Admin</span>
      </div>
      <p className="text-xs text-slate-500">
        Download agency data as Excel-compatible CSV — everything at once, or filtered to a specific day, month, or year.
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Date range</label>
          <select
            value={mode}
            onChange={(e) => { setMode(e.target.value as Mode); setError(null); }}
            className="input"
          >
            <option value="all">All time</option>
            <option value="day">Specific day</option>
            <option value="month">Specific month</option>
            <option value="year">Specific year</option>
          </select>
        </div>
        <div>
          <label className="label">Pick period</label>
          {mode === "day" && (
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="input" />
          )}
          {mode === "month" && (
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input" />
          )}
          {mode === "year" && (
            <input
              type="number"
              min={2020}
              max={2100}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="input"
              placeholder="e.g. 2026"
            />
          )}
          {(mode === "all" || mode === "") && (
            <input className="input opacity-50" value="Entire history" disabled />
          )}
        </div>
      </div>

      {error && <p className="rounded-lg bg-rose-400/10 text-rose-300 text-xs px-3 py-2">{error}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {DATASETS.map((d) => (
          <button
            key={d.key}
            onClick={() => exportDataset(d.key)}
            className="btn-secondary !justify-start !px-3 text-xs"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-brand-300 shrink-0" />
            {d.label}
          </button>
        ))}
      </div>

      <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
        <Download className="h-3 w-3" />
        Files download straight from the server — nothing is stored in the browser.
      </p>
    </div>
  );
}
