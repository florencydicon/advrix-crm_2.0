"use client";

import { useMemo, useState, useTransition, useRef, useEffect } from "react";
import { Search, Filter, ChevronDown, MoreVertical, Square, CheckSquare } from "lucide-react";
import { StatusBadge, PriorityBadge, EmptyState } from "@/components/ui";
import type { MasterBoardPayload, MasterRow } from "@/lib/actions/masterboard";
import { getMasterBoardAction } from "@/lib/actions/masterboard";
import type { UserRow } from "@/lib/types";
import { formatClientName } from "@/lib/utils";
import TaskDrawer from "@/components/TaskDrawer";
import TaskDetailMobile from "@/components/TaskDetailMobile";

type ViewTab = "all" | "mine";
type PriorityFilter = "all" | "low" | "medium" | "high";

function taskTypeLabel(groupKey: string | null): string {
  if (!groupKey || groupKey === "manual") return "Task";
  return groupKey
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

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
  const [project, setProject] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileOpenId, setMobileOpenId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();

  const clients = useMemo(() => {
    const map = new Map<string, { id: string; name: string; company: string | null }>();
    for (const r of rows) {
      if (!map.has(r.client_id))
        map.set(r.client_id, {
          id: r.client_id,
          name: r.client_name,
          company: r.client_company,
        });
    }
    return [...map.values()].sort((a, b) =>
      formatClientName(a.company, a.name).localeCompare(formatClientName(b.company, b.name))
    );
  }, [rows]);

  const projects = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const r of rows) {
      if (!map.has(r.project_id))
        map.set(r.project_id, { id: r.project_id, name: r.project_name });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuFor(null);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

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
    if (project !== "all") list = list.filter((r) => r.project_id === project);
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
  }, [rows, view, priority, group, client, project, userId, search]);

  const filteredIds = useMemo(
    () => new Set(filtered.map((r) => r.id)),
    [filtered]
  );

  const allChecked = filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        filtered.forEach((r) => next.delete(r.id));
      } else {
        filtered.forEach((r) => next.add(r.id));
      }
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const active =
    rows.find((r) => r.id === activeId) || initial.rows.find((r) => r.id === activeId) || null;

  const mobileActive =
    rows.find((r) => r.id === mobileOpenId) || initial.rows.find((r) => r.id === mobileOpenId) || null;

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
              <option value="all">Task Type: All</option>
              {groups.map((g) => (
                <option key={g} value={g}>
                  {taskTypeLabel(g)}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Filter className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
            <select
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="input !py-1.5 !pl-8 !pr-6 !text-xs appearance-none max-w-[180px]"
            >
              <option value="all">Project: All</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
            <select
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="input !py-1.5 !pl-3 !pr-6 !text-xs appearance-none max-w-[180px]"
            >
              <option value="all">Client Group: All</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {formatClientName(c.company, c.name)}
                </option>
              ))}
            </select>
          </div>

          <span className="ml-auto text-[11px] text-slate-500 tabular-nums">
            {filtered.length} task{filtered.length === 1 ? "" : "s"}
            {selected.size > 0 && (
              <span className="ml-2 text-brand-300">· {selected.size} selected</span>
            )}
          </span>
        </div>

        {/* Grid (desktop, md and up) */}
        <div className="hidden md:block flex-1 overflow-auto">
          <table className="w-full border-collapse min-w-[1240px]">
            <thead className="sticky top-0 z-10 bg-night-850">
              <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                <th className="px-3 py-2.5 w-9">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAll();
                    }}
                    className="text-slate-400 hover:text-white transition-colors"
                    title="Select all visible"
                  >
                    {allChecked ? (
                      <CheckSquare className="h-4 w-4 text-brand-300" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="px-3 py-2.5 w-44">Client</th>
                <th className="px-3 py-2.5 w-44">Project</th>
                <th className="px-3 py-2.5 min-w-[220px] sticky left-0 bg-night-850 z-10">Task</th>
                <th className="px-3 py-2.5 min-w-[130px] whitespace-nowrap">Task Type</th>
                <th className="px-3 py-2.5 min-w-[130px] whitespace-nowrap">Status</th>
                <th className="px-3 py-2.5 min-w-[130px] whitespace-nowrap">Priority</th>
                <th className="px-3 py-2.5 w-40">Assignee</th>
                <th className="px-3 py-2.5 w-32">Deadline</th>
                <th className="px-3 py-2.5 w-12">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setActiveId(r.id)}
                  className={`border-b border-white/[0.04] cursor-pointer hover:bg-white/[0.03] transition-colors group ${
                    selected.has(r.id) ? "bg-brand-300/[0.04]" : ""
                  }`}
                >
                  <td
                    className="px-3 py-2.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => toggleOne(r.id)}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      {selected.has(r.id) ? (
                        <CheckSquare className="h-4 w-4 text-brand-300" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-medium text-brand-300/90 truncate block">
                      {formatClientName(r.client_company, r.client_name)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs text-slate-300 truncate block">
                      {r.project_name || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 sticky left-0 bg-night-850 group-hover:bg-white/[0.03] z-[5]">
                    <p className="text-sm text-white font-medium leading-tight truncate max-w-[220px]">{r.title}</p>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="badge bg-white/5 text-slate-300 border border-white/[0.06]">
                      {taskTypeLabel(r.group_key)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <PriorityBadge priority={r.priority} />
                  </td>
                  <td className="px-3 py-2.5">
                    {r.assignee_name ? (
                      <div className="flex items-center gap-1.5">
                        <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] shrink-0 ${avatarClass(r.assignee_name)}`}>
                          {initials(r.assignee_name)}
                        </span>
                        <span className="text-xs text-slate-300 truncate">{r.assignee_name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600">Unassigned</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`text-xs tabular-nums ${
                        r.overdue ? "text-rose-300 font-medium" : "text-slate-400"
                      }`}
                    >
                      {r.due_date ? r.due_date.slice(0, 10) : "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 relative">
                    <div ref={menuFor === r.id ? menuRef : undefined} className="relative inline-block">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuFor((m) => (m === r.id ? null : r.id));
                        }}
                        className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {menuFor === r.id && (
                        <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-white/10 bg-night-800 shadow-2xl z-20 py-1 text-xs">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuFor(null);
                              setActiveId(r.id);
                            }}
                            className="w-full text-left px-3 py-2 text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                          >
                            Open details
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleOne(r.id);
                              setMenuFor(null);
                            }}
                            className="w-full text-left px-3 py-2 text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                          >
                            {selected.has(r.id) ? "Deselect" : "Select"}
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10}>
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

      {/* Mobile task card list (below md) */}
      <div className="md:hidden flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {filtered.map((r) => (
          <button
            key={r.id}
            onClick={() => setMobileOpenId(r.id)}
            className="w-full text-left rounded-xl border border-white/10 bg-night-800 p-4 shadow-lg shadow-black/20 active:scale-[0.99] transition-transform"
          >
            <p className="text-[11px] text-slate-500 truncate mb-2">
              {formatClientName(r.client_company, r.client_name)}
              <span className="mx-1 opacity-50">/</span>
              {r.project_name || "No project"}
            </p>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-white leading-snug">{r.title}</p>
              {r.assignee_name ? (
                <span
                  className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-[11px] ${avatarClass(r.assignee_name)}`}
                >
                  {initials(r.assignee_name)}
                </span>
              ) : (
                <span className="shrink-0 h-8 w-8 rounded-full border border-white/10 flex items-center justify-center text-slate-600">—</span>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <StatusBadge status={r.status} />
                {r.group_key && r.group_key !== "manual" && (
                  <span className="badge bg-white/5 text-slate-300 border border-white/[0.06]">
                    {taskTypeLabel(r.group_key)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {r.overdue ? (
                  <span className="text-[11px] font-medium text-rose-300">Overdue</span>
                ) : (
                  <span className="text-[11px] tabular-nums text-slate-400">
                    {r.due_date ? r.due_date.slice(5, 10) : "—"}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="p-6">
            <EmptyState title="No tasks match" subtitle="Adjust your filters or view selection." />
          </div>
        )}
      </div>

      <TaskDrawer
        task={active}
        team={team}
        canManage={initial.canManage}
        onClose={() => setActiveId(null)}
        onChanged={refresh}
        containerClass="hidden md:block"
      />

      <TaskDetailMobile
        task={mobileActive}
        team={team}
        canManage={initial.canManage}
        onClose={() => setMobileOpenId(null)}
        onChanged={refresh}
      />
    </div>
  );
}
