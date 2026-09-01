"use client";

import { useState, useEffect, useRef, type DragEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import type { Task, TaskStatus } from "@/lib/types";
import { PriorityBadge } from "@/components/ui";

interface BoardColumn {
  key: string;
  label: string;
  drop: TaskStatus | null;
  statuses: TaskStatus[];
  dot: string;
  count: string;
}

/** Linear pipeline order — columns follow the pipeline strictly. */
const BOARD_COLUMNS: BoardColumn[] = [
  {
    key: "approved",
    label: "Ready to Start",
    drop: null,
    statuses: ["approved"],
    dot: "bg-slate-400",
    count: "text-slate-400",
  },
  {
    key: "in_progress",
    label: "In Progress",
    drop: "in_progress",
    statuses: ["in_progress", "needs_improvement", "client_feedback"],
    dot: "bg-brand-300",
    count: "text-brand-300",
  },
  {
    key: "submitted",
    label: "Submitted",
    drop: "submitted",
    statuses: ["submitted"],
    dot: "bg-amber-300",
    count: "text-amber-300",
  },
  {
    key: "client_review",
    label: "Client Review",
    drop: "client_review",
    statuses: ["client_review"],
    dot: "bg-sky-300",
    count: "text-sky-300",
  },
  {
    key: "uploading",
    label: "Uploading",
    drop: "uploading",
    statuses: ["uploading", "upload_done"],
    dot: "bg-violet-300",
    count: "text-violet-300",
  },
  {
    key: "completed",
    label: "Completed",
    drop: "completed",
    statuses: ["completed"],
    dot: "bg-emerald-300",
    count: "text-emerald-300",
  },
];

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function KanbanBoard({
  tasks,
  canManage,
  openTaskId,
  onToggleOpen,
  onMove,
  renderExpanded,
}: {
  tasks: Task[];
  canManage: boolean;
  openTaskId: string | null;
  onToggleOpen: (taskId: string) => void;
  onMove: (taskId: string, status: TaskStatus) => void;
  renderExpanded: (task: Task) => ReactNode;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set(BOARD_COLUMNS.map((c) => c.key)));
  const [activeFilter, setActiveFilter] = useState<string>("");
  const [isMobile, setIsMobile] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  const toggleKey = (key: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filteredCols = BOARD_COLUMNS.filter((c) => {
    if (!visibleKeys.has(c.key)) return false;
    if (activeFilter && c.key !== activeFilter) return false;
    return true;
  });

  function handleDrop(e: DragEvent, col: BoardColumn) {
    e.preventDefault();
    setOverCol(null);
    if (!col.drop) return;
    const id = e.dataTransfer.getData("text/plain") || dragId;
    if (!id || !canManage) return;
    onMove(id, col.drop);
    setDragId(null);
  }

  function scroll(dir: number) {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth;
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  }

  return (
    <div className="relative">
      {/* Desktop controls: column toggle + status filter */}
      {!isMobile && canManage && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button
            type="button"
            onClick={() => setColPickerOpen((v) => !v)}
            className="btn-ghost !px-2 !py-1 text-[10px]"
          >
            Columns {visibleKeys.size < BOARD_COLUMNS.length ? `(${visibleKeys.size})` : ""}
          </button>
          {colPickerOpen && (
            <div className="absolute left-0 top-full mt-1 rounded-lg border border-white/10 bg-night-850 p-2 shadow-xl z-20 min-w-[180px]">
              {BOARD_COLUMNS.map((col) => {
                const on = visibleKeys.has(col.key);
                return (
                  <button
                    key={col.key}
                    type="button"
                    onClick={() => toggleKey(col.key)}
                    className="flex w-full items-center gap-2 px-2 py-1.5 rounded text-[11px] text-slate-300 hover:bg-white/[0.06] transition-colors"
                  >
                    <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                    <span className="flex-1 text-left">{col.label}</span>
                    {on && <Check className="h-3 w-3 text-brand-300" />}
                  </button>
                );
              })}
            </div>
          )}
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="input !w-auto !text-[10px] !py-1"
          >
            <option value="">All statuses</option>
            {BOARD_COLUMNS.map((col) => (
              <option key={col.key} value={col.key}>
                {col.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {!isMobile && canManage && colPickerOpen && <div className="fixed inset-0 z-10" onClick={() => setColPickerOpen(false)} />}

      {/* Mobile: one full-width column at a time, swipeable */}
      {isMobile ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => scroll(-1)}
              className="btn-ghost !px-2 !py-1 text-[10px]"
              disabled={filteredCols.length === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              {filteredCols[0]?.label ?? "Select a column"}
            </span>
            <button
              type="button"
              onClick={() => scroll(1)}
              className="btn-ghost !px-2 !py-1 text-[10px]"
              disabled={filteredCols.length === 0}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {filteredCols.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
              No columns selected — use the Columns picker above.
            </div>
          ) : (
            <div
              ref={scrollRef}
              className="flex overflow-x-auto snap-x snap-mandatory -mx-1 px-1 scrollbar-hide"
              style={{ scrollbarWidth: "none" }}
            >
              {filteredCols.map((col) => {
                const colTasks = tasks.filter((t) => col.statuses.includes(t.status));
                const highlighted = overCol === col.key && col.drop && canManage;
                return (
                  <div
                    key={col.key}
                    onDragOver={(e) => {
                      if (!col.drop || !canManage) return;
                      e.preventDefault();
                      setOverCol(col.key);
                    }}
                    onDragLeave={() => setOverCol((c) => (c === col.key ? null : c))}
                    onDrop={(e) => handleDrop(e, col)}
                    className={`shrink-0 w-full snap-start flex flex-col rounded-xl border transition-colors min-h-[120px] mx-1 ${highlighted ? "border-brand-300/60 bg-brand-300/[0.06]" : "border-white/10 bg-white/[0.02]"}`}
                  >
                    <div className="flex items-center gap-1.5 px-2.5 py-2 border-b border-white/[0.06]">
                      <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">{col.label}</p>
                      <span className={`ml-auto text-[10px] font-semibold ${col.count}`}>{colTasks.length}</span>
                    </div>
                    <div className="p-1.5 space-y-1.5 flex-1">
                      {colTasks.length === 0 && (
                        <p className="text-[10px] text-slate-600 text-center py-4 select-none">
                          {col.drop && canManage ? "Drop tasks here" : "Empty"}
                        </p>
                      )}
                      {colTasks.map((t) => {
                        const members = t.assignees?.length ? t.assignees : t.assignee_name ? [{ id: t.assigned_to || "", name: t.assignee_name }] : [];
                        const open = openTaskId === t.id;
                        return (
                          <div key={t.id} className={`rounded-lg border border-white/10 bg-night-850 overflow-hidden ${open ? "ring-1 ring-brand-300/40" : ""}`}>
                            <div
                              draggable={canManage}
                              onDragStart={(e) => {
                                e.dataTransfer.setData("text/plain", t.id);
                                setDragId(t.id);
                              }}
                              onDragEnd={() => setDragId(null)}
                              onClick={() => onToggleOpen(t.id)}
                              className={`px-2 py-1.5 cursor-pointer hover:bg-white/[0.04] transition-colors ${dragId === t.id ? "opacity-40" : ""}`}
                            >
                              <p className="text-[11px] font-medium text-white leading-tight line-clamp-2">{t.title}</p>
                              <div className="flex flex-wrap items-center gap-1 mt-1">
                                {members.map((m) => (
                                  <span key={m.id} className="inline-flex items-center gap-0.5 rounded-full bg-white/[0.06] border border-white/10 pl-0.5 pr-1 py-0.5">
                                    <span className="h-3 w-3 rounded-full bg-brand-300/15 flex items-center justify-center text-[6px] font-bold text-brand-300">{initials(m.name)}</span>
                                    <span className="text-[8px] text-slate-300 max-w-[50px] truncate">{m.name}</span>
                                  </span>
                                ))}
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                <PriorityBadge priority={t.priority} />
                                {t.due_date && (
                                  <span className="text-[8px] text-slate-500">
                                    {new Date(t.due_date).toLocaleDateString([], { day: "numeric", month: "short" })}
                                  </span>
                                )}
                              </div>
                            </div>
                            {open && <div className="border-t border-white/10 p-2">{renderExpanded(t)}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Desktop: multi-column grid */
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
          {filteredCols.map((col) => {
            const colTasks = tasks.filter((t) => col.statuses.includes(t.status));
            const highlighted = overCol === col.key && col.drop && canManage;
            return (
              <div
                key={col.key}
                onDragOver={(e) => {
                  if (!col.drop || !canManage) return;
                  e.preventDefault();
                  setOverCol(col.key);
                }}
                onDragLeave={() => setOverCol((c) => (c === col.key ? null : c))}
                onDrop={(e) => handleDrop(e, col)}
                className={`rounded-xl border transition-colors min-h-[120px] flex flex-col ${
                  highlighted ? "border-brand-300/60 bg-brand-300/[0.06]" : "border-white/10 bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center gap-1.5 px-2.5 py-2 border-b border-white/[0.06]">
                  <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">{col.label}</p>
                  <span className={`ml-auto text-[10px] font-semibold ${col.count}`}>{colTasks.length}</span>
                </div>
                <div className="p-1.5 space-y-1.5 flex-1">
                  {colTasks.length === 0 && (
                    <p className="text-[10px] text-slate-600 text-center py-4 select-none">
                      {col.drop && canManage ? "Drop tasks here" : "Empty"}
                    </p>
                  )}
                  {colTasks.map((t) => {
                    const members = t.assignees?.length ? t.assignees : t.assignee_name ? [{ id: t.assigned_to || "", name: t.assignee_name }] : [];
                    const open = openTaskId === t.id;
                    return (
                      <div key={t.id} className={`rounded-lg border border-white/10 bg-night-850 overflow-hidden ${open ? "ring-1 ring-brand-300/40" : ""}`}>
                        <div
                          draggable={canManage}
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", t.id);
                            setDragId(t.id);
                          }}
                          onDragEnd={() => setDragId(null)}
                          onClick={() => onToggleOpen(t.id)}
                          className={`px-2 py-1.5 cursor-pointer hover:bg-white/[0.04] transition-colors ${dragId === t.id ? "opacity-40" : ""}`}
                        >
                          <p className="text-[11px] font-medium text-white leading-tight line-clamp-2">{t.title}</p>
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            {members.map((m) => (
                              <span key={m.id} className="inline-flex items-center gap-0.5 rounded-full bg-white/[0.06] border border-white/10 pl-0.5 pr-1 py-0.5">
                                <span className="h-3 w-3 rounded-full bg-brand-300/15 flex items-center justify-center text-[6px] font-bold text-brand-300">{initials(m.name)}</span>
                                <span className="text-[8px] text-slate-300 max-w-[50px] truncate">{m.name}</span>
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <PriorityBadge priority={t.priority} />
                            {t.due_date && (
                              <span className="text-[8px] text-slate-500">
                                {new Date(t.due_date).toLocaleDateString([], { day: "numeric", month: "short" })}
                              </span>
                            )}
                          </div>
                        </div>
                        {open && <div className="border-t border-white/10 p-2">{renderExpanded(t)}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}