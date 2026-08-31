"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Filter, ChevronDown } from "lucide-react";
import { StatusBadge, PriorityBadge, EmptyState } from "@/components/ui";
import type { MasterBoardPayload, MasterRow } from "@/lib/actions/masterboard";
import { getMasterBoardAction } from "@/lib/actions/masterboard";
import type { UserRow } from "@/lib/types";
import TaskDrawer from "@/components/TaskDrawer";

type ViewTab = "all" | "mine";
type PriorityFilter = "all" | "low" | "medium" | "high";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = [
  "bg-emerald-500/20 text-emerald-300",
  "bg-sky-500/20 text-sky-300",
  "bg-violet-500/20 text-violet-300",
  "bg-rose-500/20 text-rose-300",
  "bg-amber-500/20 text-amber-300",
  "bg-teal-500/20 text-teal-300",
];
function avatarClass(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function MasterBoard({
  initial,
  userId,
  team,
}: {
  initial: MasterBoardPayload;
  userId: string;
  team: UserRow[];
}) {
  const [rows, setRows] = useState<MasterRow[]>(initial.rows);
  const [view, setView] = useState<ViewTab>("all");
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const [group, setGroup] = useState<string>("all");
  const [client, setClient] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const clients = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const r of rows) {
      if (!map.has(r.client_id)) map.set(r.client_id, { id: r.client_id, name: r.client_name });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const groups = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.group_key) set.add(r.group_key);
    return [...set].sort();
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (view === "mine") list = list.filter((r) => r.assigned_to === userId);
    if (priority !== "all") list = list.filter((r) => r.priority === priority);
    if (group !== "all") list = list.filter((r) => r.group_key === group);
    if (client !== "all") list = list.filter((r) => r.client_id === client);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.client_name.toLowerCase().includes(q) ||
          (r.project_name || "").toLowerCase().includes(q) ||
          (r.assignee_name || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, view, priority, group, client, userId, search]);

  const active =
    rows.find((r) => r.id === activeId) || initial.rows.find((r) => r.id === activeId) || null;

  function refresh() {
    startTransition(async () => {
      try {
        const data = await getMasterBoardAction();
        if (data) setRows(data.rows);
      } catch {
        // ignore
      }
    });
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Toolbar / filter bar */}
        <div className="px-3 py-2 flex items-center gap-2 border-b border-white/[0.06] flex-wrap">
          <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg p-0.5">
            <button
              onClick={() => setView("all")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${view === "all" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"}`}
            >
              All
            </button>
            <button
              onClick={() => setView("mine")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${view === "mine" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"}`}
            >
              My tasks
            </button>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] px-2 py-1.5">
            <Search className="h-3.5 w-3.5 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="bg-transparent text-xs text-white outline-none w-40 placeholder:text-slate-600"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as PriorityFilter)}
              className="input !py-1.5 !pl-8 !pr-6 !text-xs appearance-none"
            >
              <option value="all">Priority: All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="relative">
            <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="input !py-1.5 !pl-7 !pr-6 !text-xs appearance-none"
            >
              <option value="all">Group: All</option>
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g === "manual" ? "Manual" : g}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
            <select
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="input !py-1.5 !pl-3 !pr-6 !text-xs appearance-none"
            >
              <option value="all">Client: All</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <span className="ml-auto text-[11px] text-slate-500 tabular-nums">
            {filtered.length} task{filtered.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse min-w-[720px]">
            <thead className="sticky top-0 z-10 bg-night-850">
              <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                <th className="px-4 py-2.5">Task</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Priority</th>
                <th className="px-3 py-2.5">Assignee</th>
                <th className="px-3 py-2.5">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setActiveId(r.id)}
                  className="border-b border-white/[0.04] cursor-pointer hover:bg-white/[0.03] transition-colors group"
                >
                  <td className="px-4 py-2.5">
                    <p className="text-sm text-white font-medium leading-tight">{r.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      <span className="text-brand-300/90">{r.client_name}</span>
                      {r.project_name && (
                        <>
                          <span className="mx-1 opacity-50">·</span>
                          {r.project_name}
                        </>
                      )}
                    </p>
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-3 py-2.5">
                    <PriorityBadge priority={r.priority} />
                  </td>
                  <td className="px-3 py-2.5">
                    {r.assignee_name ? (
                      <div className="flex items-center gap-1.5">
                        <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] shrink-0 ${avatarClass(r.assignee_name)}`}>
                          {initials(r.assignee_name)}
                        </span>
                        <span className="text-xs text-slate-300">{r.assignee_name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600">Unassigned</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`text-xs tabular-nums ${r.overdue ? "text-rose-300 font-medium" : "text-slate-400"}`}
                    >
                      {r.due_date ? r.due_date.slice(0, 10) : "—"}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="p-6">
                      <EmptyState
                        title="No tasks match"
                        subtitle="Adjust your filters or view selection."
                      />
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TaskDrawer
        task={active}
        team={team}
        canManage={initial.canManage}
        onClose={() => setActiveId(null)}
        onChanged={refresh}
      />
    </div>
  );
}
