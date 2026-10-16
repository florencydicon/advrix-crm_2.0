"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  ClipboardPaste,
  Save,
  FolderKanban,
  CalendarDays,
  FileText,
} from "lucide-react";
import type { WriterBoardClient, WriterBoardTask } from "@/lib/data";
import { CONTENT_STATUSES } from "@/lib/types";
import { StatusBadge } from "@/components/ui";
import {
  bulkSetPipelineContentsAction,
  setPipelineTaskContentAction,
  setPipelineTaskContentStatusAction,
} from "@/lib/actions/pipeline";
import { useToast } from "@/components/Toast";

function initials(name: string) {
  return (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function fmtDue(v?: string | null) {
  if (!v) return "—";
  const d = new Date(`${v.slice(0, 10)}T00:00:00`);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

function isOverdue(v?: string | null) {
  if (!v) return false;
  return v.slice(0, 10) < new Date().toISOString().slice(0, 10);
}

function contentLabel(status?: string | null) {
  return CONTENT_STATUSES.find((s) => s.key === (status || "pending"))?.label || "Pending";
}

export default function ContentBoard({
  initial,
  manageAll,
  userName,
}: {
  initial: WriterBoardClient[];
  manageAll: boolean;
  userName: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [board, setBoard] = useState(initial);
  const [query, setQuery] = useState("");
  const [openClients, setOpenClients] = useState<Set<string>>(
    () => new Set(initial.slice(0, 1).map((c) => c.client_id))
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkText, setBulkText] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Server re-render (router.refresh) swaps the prop — adopt it, prune selection.
  const [seenBoard, setSeenBoard] = useState(initial);
  if (seenBoard !== initial) {
    setSeenBoard(initial);
    setBoard(initial);
    setSelected((prev) => {
      const ids = new Set(initial.flatMap((c) => c.projects.flatMap((p) => p.tasks.map((t) => t.id))));
      return new Set([...prev].filter((id) => ids.has(id)));
    });
  }

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return board;
    return board
      .map((c) => {
        const clientHit = `${c.client_company || ""} ${c.client_name}`.toLowerCase().includes(q);
        const projects = c.projects
          .map((p) => {
            if (clientHit || p.project_name.toLowerCase().includes(q)) return p;
            const tasks = p.tasks.filter((t) => t.title.toLowerCase().includes(q));
            return tasks.length ? { ...p, tasks } : null;
          })
          .filter(Boolean) as typeof c.projects;
        return projects.length ? { ...c, projects } : null;
      })
      .filter(Boolean) as WriterBoardClient[];
  }, [board, q]);

  const allTasks: WriterBoardTask[] = useMemo(
    () => filtered.flatMap((c) => c.projects.flatMap((p) => p.tasks)),
    [filtered]
  );
  const orderedSelected = useMemo(
    () => allTasks.filter((t) => selected.has(t.id)),
    [allTasks, selected]
  );
  const totalTasks = board.reduce((s, c) => s + c.projects.reduce((a, p) => a + p.tasks.length, 0), 0);
  const totalProjects = board.reduce((s, c) => s + c.projects.length, 0);
  const withoutContent = allTasks.filter((t) => !(t.content || "").trim()).length;
  const overwriteCount = orderedSelected.filter((t) => (t.content || "").trim()).length;
  const bulkLines = bulkText.split("\n");
  const bulkFillCount = bulkLines.filter((l) => l.trim()).length;

  const toggleClient = (id: string) =>
    setOpenClients((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const toggleProjectAll = (tasks: WriterBoardTask[]) => {
    const ids = tasks.map((t) => t.id);
    const allOn = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const n = new Set(prev);
      if (allOn) ids.forEach((id) => n.delete(id));
      else ids.forEach((id) => n.add(id));
      return n;
    });
  };

  const applyBulk = async () => {
    if (orderedSelected.length === 0 || bulkFillCount === 0 || bulkBusy) return;
    if (
      overwriteCount > 0 &&
      !window.confirm(
        `${overwriteCount} selected task${overwriteCount === 1 ? "" : "s"} already ha${overwriteCount === 1 ? "s" : "ve"} content. Overwrite with pasted lines? Empty lines are skipped.`
      )
    )
      return;
    setBulkBusy(true);
    try {
      const res = await bulkSetPipelineContentsAction(
        orderedSelected.map((t) => t.id),
        bulkLines
      );
      if (!res.ok) {
        toast(res.error || "Bulk upload failed.", "error");
        return;
      }
      toast(`Content saved on ${res.count} task${res.count === 1 ? "" : "s"}.`, "success");
      setSelected(new Set());
      setBulkText("");
      router.refresh();
    } finally {
      setBulkBusy(false);
    }
  };

  const saveSingle = async (t: WriterBoardTask) => {
    if (busyId) return;
    setBusyId(t.id);
    try {
      const res = await setPipelineTaskContentAction(t.id, editDraft);
      if (!res.ok) {
        toast(res.error || "Could not save content.", "error");
        return;
      }
      toast("Content saved.", "success");
      setEditingId(null);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  const changeContentStatus = async (t: WriterBoardTask, v: string) => {
    if (busyId) return;
    setBusyId(t.id);
    try {
      const res = await setPipelineTaskContentStatusAction(t.id, v as any);
      if (!res.ok) toast(res.error || "Could not update status.", "error");
      else {
        toast("Content status updated.", "success");
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Content Hub</h1>
        <p className="text-sm text-slate-500">
          {manageAll ? "Every open subtask across the team." : `${userName.split(" ")[0]} — your open subtasks, client-wise.`}
        </p>
      </div>

      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search client, project, subtask…"
          aria-label="Search content tasks"
          className="input !pl-8 !py-1.5 text-xs"
        />
      </div>

      <p className="text-[11px] text-slate-500">
        {board.length} client{board.length === 1 ? "" : "s"} · {totalProjects} project{totalProjects === 1 ? "" : "s"} ·{" "}
        {totalTasks} open subtask{totalTasks === 1 ? "" : "s"}
        {withoutContent > 0 && <span className="text-amber-300"> · {withoutContent} without content</span>}
      </p>

      {/* Bulk upload panel */}
      {selected.size > 0 && (
        <div className="card p-3 md:p-4 space-y-2 border-brand-300/30">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-300 text-night-950 px-2.5 py-1 text-xs font-bold">
              <ClipboardPaste className="h-3.5 w-3.5" /> {orderedSelected.length} selected
            </span>
            <button type="button" onClick={() => { setSelected(new Set()); setBulkText(""); }} className="text-[11px] text-slate-400 hover:text-white">
              Clear
            </button>
            <span className="ml-auto text-[11px] text-slate-500 hidden sm:inline">
              Paste from Sheet — line <b className="text-slate-300">N</b> goes to subtask <b className="text-slate-300">N</b>
            </span>
          </div>
          <textarea
            rows={4}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={"Diwali dhamaka sale is live!\nFlat 20% off on all services\nOffer valid till Sunday"}
            className="w-full rounded-lg border border-white/10 bg-night-900 px-2.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-300/40"
          />
          {bulkFillCount > 0 && (
            <div className="rounded-lg border border-white/10 bg-night-900/60 px-2.5 py-2 space-y-1 max-h-32 overflow-y-auto">
              {orderedSelected.slice(0, 8).map((t, i) => (
                <p key={t.id} className="text-[11px] text-slate-400 truncate">
                  <span className="text-brand-300 font-semibold">{i + 1}.</span>{" "}
                  {(bulkLines[i] || "").trim() ? (
                    <><span className="text-slate-200">“{(bulkLines[i] || "").trim().slice(0, 60)}”</span> → {t.title}</>
                  ) : (
                    <><span className="text-slate-600">(skipped)</span> → {t.title}</>
                  )}
                </p>
              ))}
              {orderedSelected.length > 8 && (
                <p className="text-[10px] text-slate-600">+ {orderedSelected.length - 8} more…</p>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            <p className="text-[10px] text-slate-500 flex-1">Empty lines are skipped · extra subtasks untouched{overwriteCount > 0 ? ` · ${overwriteCount} already have content (will ask)` : ""}</p>
            <button
              type="button"
              disabled={bulkBusy || orderedSelected.length === 0 || bulkFillCount === 0}
              onClick={applyBulk}
              className="btn-primary !py-2 !px-4 text-xs disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" /> {bulkBusy ? "Saving…" : `Upload to ${orderedSelected.length}`}
            </button>
          </div>
        </div>
      )}

      {/* Client cards */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pb-4">
        {filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <FileText className="h-8 w-8 text-brand-300/40 mx-auto mb-2" />
            <p className="font-medium text-slate-200">{totalTasks === 0 ? "All caught up — no open content tasks." : "No matches for this search."}</p>
            <p className="text-xs text-slate-500 mt-1">{totalTasks === 0 ? "New assignments will appear here." : "Try a different search term."}</p>
          </div>
        ) : (
          filtered.map((c) => {
            const open = q ? true : openClients.has(c.client_id);
            const cTasks = c.projects.reduce((s, p) => s + p.tasks.length, 0);
            const cNoContent = c.projects.reduce((s, p) => s + p.tasks.filter((t) => !(t.content || "").trim()).length, 0);
            return (
              <div key={c.client_id} className="card overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleClient(c.client_id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors"
                >
                  <span className="hidden sm:flex h-9 w-9 rounded-lg bg-brand-300/10 items-center justify-center shrink-0 text-brand-300 text-xs font-bold">
                    {initials(c.client_company || c.client_name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-white truncate">{c.client_company || c.client_name}</span>
                    {c.client_company && <span className="block text-[11px] text-slate-500 truncate">{c.client_name}</span>}
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-slate-300 shrink-0">
                    {cTasks} subtask{cTasks === 1 ? "" : "s"}
                  </span>
                  {cNoContent > 0 && (
                    <span className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300 shrink-0">
                      {cNoContent} need content
                    </span>
                  )}
                  {open ? <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />}
                </button>

                {open && (
                  <div className="border-t border-white/[0.06] divide-y divide-white/[0.06]">
                    {c.projects.map((p) => {
                      const allOn = p.tasks.every((t) => selected.has(t.id));
                      return (
                        <div key={p.project_id} className="px-3 sm:px-4 py-2.5">
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="checkbox"
                              checked={p.tasks.length > 0 && allOn}
                              onChange={() => toggleProjectAll(p.tasks)}
                              aria-label={`Select all in ${p.project_name}`}
                              className="h-4 w-4 accent-emerald-400 cursor-pointer shrink-0"
                            />
                            <FolderKanban className="h-3.5 w-3.5 text-brand-300 shrink-0" />
                            <p className="text-xs font-semibold text-white truncate flex-1">{p.project_name}</p>
                            <span className="text-[10px] text-slate-500 shrink-0">{p.tasks.length}</span>
                          </div>
                          <div className="space-y-1.5">
                            {p.tasks.map((t) => {
                              const overdue = isOverdue(t.due_date) && t.status !== "completed";
                              const hasContent = !!(t.content || "").trim();
                              const isEditing = editingId === t.id;
                              return (
                                <div key={t.id} className={`rounded-xl border p-2.5 transition-colors ${selected.has(t.id) ? "border-brand-300/40 bg-brand-300/[0.05]" : "border-white/10 bg-white/[0.02]"}`}>
                                  <div className="flex items-start gap-2">
                                    <input
                                      type="checkbox"
                                      checked={selected.has(t.id)}
                                      onChange={() => toggleSelect(t.id)}
                                      aria-label={`Select ${t.title}`}
                                      className="h-4 w-4 mt-0.5 accent-emerald-400 cursor-pointer shrink-0"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[13px] font-medium text-white leading-snug">{t.title}</p>
                                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                                        <StatusBadge status={t.status} />
                                        <select
                                          value={t.content_status || "pending"}
                                          disabled={busyId === t.id}
                                          onChange={(e) => changeContentStatus(t, e.target.value)}
                                          className="rounded-md bg-night-900 border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-300 focus:outline-none disabled:opacity-50"
                                          title="Content status"
                                          aria-label={`Content status for ${t.title}`}
                                        >
                                          {CONTENT_STATUSES.map((s) => (
                                            <option key={s.key} value={s.key}>{s.label}</option>
                                          ))}
                                        </select>
                                        <span className={`inline-flex items-center gap-1 text-[10px] ${overdue ? "text-rose-300 font-semibold" : "text-slate-500"}`}>
                                          <CalendarDays className="h-3 w-3" /> {fmtDue(t.due_date)}
                                        </span>
                                        {manageAll && t.assignee_name && (
                                          <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{t.assignee_name}</span>
                                        )}
                                        <span className={`text-[10px] font-medium ${hasContent ? "text-emerald-300" : "text-slate-600"}`}>
                                          {hasContent ? "● has content" : "○ no content"}
                                        </span>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isEditing) setEditingId(null);
                                        else { setEditingId(t.id); setEditDraft(t.content || ""); }
                                      }}
                                      className="btn-ghost !px-2 !py-1 text-[11px] shrink-0"
                                    >
                                      {isEditing ? <X className="h-3 w-3" /> : "Edit"}
                                    </button>
                                  </div>
                                  {isEditing ? (
                                    <div className="mt-2 space-y-1.5">
                                      <textarea
                                        rows={4}
                                        value={editDraft}
                                        onChange={(e) => setEditDraft(e.target.value)}
                                        placeholder="Write content here…"
                                        className="w-full rounded-lg border border-white/10 bg-night-900 px-2.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-300/40"
                                      />
                                      <div className="flex gap-2">
                                        <button type="button" onClick={() => setEditingId(null)} className="btn-ghost flex-1 !py-1.5 text-xs">Cancel</button>
                                        <button type="button" disabled={busyId === t.id} onClick={() => saveSingle(t)} className="btn-primary flex-1 !py-1.5 text-xs disabled:opacity-50">
                                          <Save className="h-3.5 w-3.5" /> {busyId === t.id ? "Saving…" : "Save content"}
                                        </button>
                                      </div>
                                    </div>
                                  ) : hasContent ? (
                                    <p className="mt-1.5 text-[11px] text-slate-500 line-clamp-2 whitespace-pre-wrap">{t.content}</p>
                                  ) : null}
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
          })
        )}
      </div>
    </div>
  );
}
