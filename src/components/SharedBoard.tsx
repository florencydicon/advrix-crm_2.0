"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { StatusBadge, EmptyState } from "@/components/ui";
import type { MasterRow } from "@/lib/actions/masterboard";

export default function SharedBoard({
  clientName,
  clientCompany,
  rows,
}: {
  clientName: string;
  clientCompany: string | null;
  rows: MasterRow[];
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");

  const statuses = useMemo(() => {
    return [...new Set(rows.map((r) => r.status))].sort();
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (status !== "all") list = list.filter((r) => r.status === status);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) => r.title.toLowerCase().includes(q) || (r.project_name || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, status, search]);

  const total = rows.length;
  const completed = rows.filter((r) => r.completed).length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <main className="min-h-screen bg-night-900">
      <header className="border-b border-white/[0.06] bg-night-850 px-6 py-5">
        <p className="text-[11px] text-brand-300/80 uppercase tracking-widest font-semibold">
          Advrix · Project Dashboard
        </p>
        <h1 className="text-2xl font-bold text-white mt-1">{clientName}</h1>
        {clientCompany && <p className="text-sm text-slate-500 mt-0.5">{clientCompany}</p>}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 max-w-[280px]">
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-300 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <span className="text-sm text-slate-400 tabular-nums">
            {completed}/{total} complete · {progress}%
          </span>
        </div>
      </header>

      <div className="px-6 py-4 flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] px-2 py-1.5">
          <Search className="h-3.5 w-3.5 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="bg-transparent text-xs text-white outline-none w-48 placeholder:text-slate-600"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="input !py-1.5 !text-xs"
        >
          <option value="all">Status: All</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="px-6 pb-10">
        <div className="rounded-xl border border-white/[0.06] overflow-hidden">
          <table className="w-full border-collapse">
            <thead className="bg-white/[0.02]">
              <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Due date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-white/[0.04]">
                  <td className="px-4 py-3 text-sm text-white font-medium">{r.title}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{r.project_name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400 tabular-nums">
                    {r.due_date ? r.due_date.slice(0, 10) : "—"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6">
                    <EmptyState title="No tasks to show yet" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-[11px] text-slate-600">
          You are viewing a secure, read-only snapshot shared by the Advrix team. Internal
          notes and deadlines for the team are not shown here.
        </p>
      </div>
    </main>
  );
}
