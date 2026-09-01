"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  Layers,
  Check,
  Undo2,
  X,
  ChevronDown,
  ChevronRight,
  Plus,
  Save,
  Users,
} from "lucide-react";
import type { Task, UserRow } from "@/lib/types";
import { StatusBadge, PriorityBadge } from "@/components/ui";
import {
  completePipelineTaskAction,
  sendBackPipelineTaskAction,
  setPipelineTaskRemarksAction,
  updatePipelineTaskTeamAction,
  getPipelineBoardAction,
} from "@/lib/actions/pipeline";

function initials(name?: string | null) {
  return (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function fmtTimeOnly(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** 5–6 word limit; longer text becomes a seamless CSS marquee. */
function MarqueeHeading({ text }: { text: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  const needsMarquee = words.length > 6;
  if (!needsMarquee) {
    return <div className="marquee-static">{text}</div>;
  }
  const sep = "  •  ";
  return (
    <div className="marquee-clip">
      <div className="marquee-track marquee-moving">
        <span className="pr-6">{text}{sep}{text}</span>
      </div>
    </div>
  );
}

/**
 * Ultra-lean unified Task Modal. Shared by the Project Pipeline and the
 * Employee Dashboard: the Task heading displays the remarks live (CSS marquee
 * when long, defaulting to the task name when empty), the Team Assignment
 * section highlights the current stage, and only "Complete" (forward) and
 * "Send Back" (backward) remain — there is no Review action.
 */
export default function TaskModal({
  task: initialTask,
  team,
  isMobile,
  canManageTeam,
  onClose,
  refresh,
}: {
  task: Task;
  team: UserRow[];
  isMobile: boolean;
  canManageTeam: boolean;
  onClose: () => void;
  refresh: () => Promise<void>;
}) {
  const [task, setTask] = useState<Task>(initialTask);
  const [remarks, setRemarks] = useState(initialTask.remarks || "");
  const [editedBy, setEditedBy] = useState<{ name: string; role: string; at: string } | null>(
    initialTask.remarks_edited_by_name
      ? {
          name: initialTask.remarks_edited_by_name,
          role: initialTask.remarks_edited_by_role || "",
          at: initialTask.remarks_edited_at || "",
        }
      : null
  );
  const [teamDraft, setTeamDraft] = useState<string[]>(
    (initialTask.assignees || []).map((m) => m.id)
  );
  const [teamOpen, setTeamOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  const taskRef = useRef(task);
  taskRef.current = task;
  const remarksRef = useRef(remarks);
  remarksRef.current = remarks;

  const persistRemarks = useCallback(
    async (silent: boolean) => {
      const res = await setPipelineTaskRemarksAction(
        taskRef.current.id,
        remarksRef.current
      );
      if (res.ok) {
        setEditedBy({
          name: res.editedByName || "",
          role: res.editedByRole || "",
          at: res.editedAt || new Date().toISOString(),
        });
        if (!silent) notify("Remarks saved.");
      } else {
        notify(res.error || "Could not save remarks.");
      }
    },
    [notify]
  );

  // Auto-save ~1 second after the user stops typing.
  useEffect(() => {
    const t = window.setTimeout(() => persistRemarks(true), 1000);
    return () => window.clearTimeout(t);
  }, [remarks, persistRemarks]);

  const saveText = () => persistRemarks(false);

  const toggleMember = (id: string) => {
    setTeamDraft((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const saveTeam = () => {
    startTransition(async () => {
      const res = await updatePipelineTaskTeamAction(task.id, teamDraft);
      if (!res.ok) {
        notify(res.error || "Could not update team.");
        return;
      }
      notify("Team updated.");
      await refresh();
      const fresh = (await getPipelineBoardAction()).active.find(
        (t) => t.id === task.id
      );
      if (fresh) setTask(fresh);
      setTeamOpen(false);
    });
  };

  // Send Back: persist current remarks to the server (which prepends the
  // author signature), re-sync the fresh task, and refresh the parent board.
  const sendBack = () => {
    startTransition(async () => {
      const res = await sendBackPipelineTaskAction(
        task.id,
        remarksRef.current
      );
      if (!res.ok) {
        notify(res.error || "Could not send back.");
        return;
      }
      await refresh();
      const fresh = (await getPipelineBoardAction()).active.find(
        (t) => t.id === task.id
      );
      if (fresh) {
        setTask(fresh);
        setRemarks(fresh.remarks || "");
        setEditedBy(
          fresh.remarks_edited_by_name
            ? {
                name: fresh.remarks_edited_by_name,
                role: fresh.remarks_edited_by_role || "",
                at: fresh.remarks_edited_at || "",
              }
            : null
        );
        setTeamDraft((fresh.assignees || []).map((m) => m.id));
      }
      notify("Sent back a stage.");
    });
  };

  // Complete: persist remarks first, then advance/complete and close.
  const complete = () => {
    startTransition(async () => {
      await persistRemarks(true);
      const res = await completePipelineTaskAction(task.id);
      if (!res.ok) {
        notify(res.error || "Could not complete.");
        return;
      }
      await refresh();
      notify("Task advanced.");
      onClose();
    });
  };

  const heading = remarks.trim() ? remarks.trim() : task.title;
  const step = task.current_step ?? 0;
  const seq = task.assignees || [];
  const activeIdx = seq.length === 0 ? 0 : Math.min(step, seq.length - 1);
  const activeMember = seq[activeIdx]?.name || null;

  return (
    <div className="fixed inset-0 z-50 flex md:items-center md:justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={`relative w-full bg-night-850 border-white/10 shadow-2xl flex flex-col ${
          isMobile
            ? "bottom-sheet h-[100dvh] max-h-[100dvh] border-t md:hidden rounded-t-2xl"
            : "modal-pop rounded-2xl border max-w-lg md:max-h-[85vh]"
        }`}
      >
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] rounded-lg border border-brand-300/40 bg-night-850 px-4 py-2 text-sm text-white shadow-xl">
            {toast}
          </div>
        )}

        {/* Sticky header with back/close */}
        <div className="sticky top-0 z-10 bg-night-850/95 backdrop-blur px-4 py-3 border-b border-white/10 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 btn-ghost !px-2.5 !py-2 text-sm shrink-0"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
            <span className="md:hidden font-medium">Back</span>
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-400 mb-0.5">
              {task.client_name} / {task.project_name}
            </div>
            <div className="text-base font-bold text-white leading-snug">
              <MarqueeHeading text={heading} />
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>
        </div>

        <div className="p-4 space-y-5 overflow-y-auto">
          {/* ---- Team Assignment + Current Stage ---- */}
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-brand-300" /> Team Assignment
            </p>

            {/* Current stage banner */}
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-brand-300/40 bg-brand-300/10 px-3 py-2">
              <Users className="h-4 w-4 text-brand-300 shrink-0" />
              <span className="text-sm text-slate-200">
                Current Stage:{" "}
                <span className="font-semibold text-brand-300">
                  {activeMember || "Unassigned"}
                </span>
              </span>
            </div>

            {/* Ordered stage chips */}
            {seq.length === 0 ? (
              <p className="text-xs text-slate-500 mb-2">No members assigned.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {seq.map((a, i) => {
                  const done = i < step;
                  const isActive = i === activeIdx && !done;
                  return (
                    <span
                      key={a.id}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold border transition-colors ${
                        isActive
                          ? "border-brand-300 bg-brand-300 text-night-950"
                          : done
                            ? "border-white/10 bg-white/[0.03] text-slate-500 line-through decoration-slate-600"
                            : "border-white/10 bg-white/[0.03] text-slate-500"
                      }`}
                    >
                      {done ? (
                        <Check className={`h-3 w-3 ${isActive ? "text-night-950" : "text-emerald-400"}`} />
                      ) : (
                        <span className="w-3 text-center">{i + 1}</span>
                      )}
                      <span className="max-w-[90px] truncate">{a.name}</span>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Editable team management (manager only) with persisted order */}
            {canManageTeam && (
              <>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {teamDraft.length === 0 && (
                    <span className="text-xs text-slate-500">No members assigned.</span>
                  )}
                  {teamDraft.map((id) => {
                    const m = team.find((u) => u.id === id);
                    // skip duplicate chips already shown in ordered stage list
                    if (seq.some((s) => s.id === id)) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/10 pl-0.5 pr-1.5 py-0.5"
                      >
                        <span className="h-5 w-5 rounded-full bg-brand-300/15 flex items-center justify-center text-[8px] font-bold text-brand-300">
                          {initials(m?.full_name)}
                        </span>
                        <span className="text-xs text-slate-200 max-w-[90px] truncate">
                          {m?.full_name || "?"}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleMember(id)}
                          className="text-slate-400 hover:text-rose-300 transition-colors ml-0.5"
                          aria-label={`Remove ${m?.full_name || "member"}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setTeamOpen((v) => !v)}
                  className="w-full flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-brand-300" /> Add member
                  </span>
                  {teamOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                {teamOpen && (
                  <div className="mt-1.5 rounded-lg border border-white/10 bg-night-900 max-h-44 overflow-y-auto">
                    {team
                      .filter((u) => u.is_active)
                      .map((u) => {
                        const on = teamDraft.includes(u.id);
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => toggleMember(u.id)}
                            className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                              on ? "bg-brand-300/10 text-brand-200" : "text-slate-300 hover:bg-white/[0.06]"
                            }`}
                          >
                            <span className="h-5 w-5 rounded-full bg-brand-300/15 flex items-center justify-center text-[8px] font-bold text-brand-300">
                              {initials(u.full_name)}
                            </span>
                            <span className="flex-1 text-left truncate">{u.full_name}</span>
                            <span className="text-xs text-slate-500">{u.role_label}</span>
                            {on && <Check className="h-4 w-4 text-brand-300" />}
                          </button>
                        );
                      })}
                  </div>
                )}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={saveTeam}
                  className="btn-primary w-full mt-2 !py-2.5 text-sm"
                >
                  Save Team
                </button>
              </>
            )}
          </section>

          {/* ---- Remarks / Content ---- */}
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Remarks / Content
            </p>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              onBlur={() => persistRemarks(true)}
              rows={3}
              placeholder="Type content or remarks here… the task heading above updates live."
              className="input !py-2.5 text-sm resize-none"
            />
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <p className="text-xs text-slate-400 min-w-0 truncate">
                {editedBy ? (
                  <>
                    Last updated by:{" "}
                    <span className="text-slate-200 font-medium">
                      {editedBy.name.split(" ")[0] || editedBy.name}
                    </span>{" "}
                    ({editedBy.role}) at{" "}
                    <span className="text-slate-300">{fmtTimeOnly(editedBy.at)}</span>
                  </>
                ) : (
                  <>Auto-saves as you type</>
                )}
              </p>
              <button
                type="button"
                disabled={isPending}
                onClick={saveText}
                className="btn-ghost !px-2.5 !py-1.5 text-xs shrink-0"
              >
                <Save className="h-3.5 w-3.5" /> Save Text
              </button>
            </div>
          </section>

          {/* ---- Actions: Complete (forward) + Send Back (backward) only ---- */}
          <section className="space-y-2.5">
            <div className="rounded-xl border border-brand-300/30 bg-brand-300/[0.06] p-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-white flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-brand-300" /> Done / Complete
                </p>
                <p className="text-xs text-slate-500">
                  Mark complete (auto-assigns next stage A→B→C).
                </p>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={complete}
                className="btn-primary !py-2 text-sm shrink-0"
              >
                <Check className="h-4 w-4" /> Complete
              </button>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                disabled={isPending}
                onClick={sendBack}
                className="btn-ghost text-sm !px-3 !py-2"
              >
                <Undo2 className="h-4 w-4" /> Send Back
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
