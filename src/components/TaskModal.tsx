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
  Clock,
  FileText,
} from "lucide-react";
import type { Task, UserRow } from "@/lib/types";
import { StatusBadge, PriorityBadge } from "@/components/ui";
import { useToast } from "@/components/Toast";
import {
  submitPipelineTaskAction,
  approvePipelineTaskAction,
  sendBackPipelineTaskAction,
  setPipelineTaskRemarksAction,
  setPipelineTaskTitleAction,
  setPipelineTaskContentAction,
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

/** Admin/PM/Super-Admin-like roles act as gatekeepers and Approve & Advance. */
function isManagerRole(roleKey?: string | null): boolean {
  if (!roleKey) return false;
  const r = roleKey.toUpperCase();
  return r === "SUPER_ADMIN" || r === "PROJECT_MANAGER" || r === "ADMIN" || r === "PM";
}

/** Content editors may rename the Task Title and edit the Content/Copy body. */
function isContentEditor(roleKey?: string | null): boolean {
  if (isManagerRole(roleKey)) return true;
  const r = (roleKey || "").toUpperCase();
  return r === "WRITER" || r === "CONTENT_WRITER";
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
 * Ultra-lean unified Task Modal. Shared by the Project Pipeline, the Employee
 * Dashboard and the SMM Dashboard:
 *  - Task Title input — renames the sub-task live (Content editors only).
 *  - Content / Copy textarea — the draft work body (Content editors only).
 *  - Remarks / Feedback textarea — free-form notes for every role (auto-saves).
 * Actions are role-gated:
 *  - Employees can only "Submit for Review" (status → submitted, no advance).
 *  - Admin/PM gatekeepers can "Approve & Advance" (next team member) or
 *    "Send Back" (keep assignee, needs_improvement).
 */
export default function TaskModal({
  task: initialTask,
  team,
  isMobile,
  canManageTeam,
  canApprove,
  roleKey,
  onClose,
  refresh,
}: {
  task: Task;
  team: UserRow[];
  isMobile: boolean;
  canManageTeam: boolean;
  canApprove: boolean;
  roleKey?: string | null;
  onClose: () => void;
  refresh: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [task, setTask] = useState<Task>(initialTask);
  const [titleDraft, setTitleDraft] = useState(initialTask.title || "");
  const [contentDraft, setContentDraft] = useState(initialTask.content || "");
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

  const taskRef = useRef(task);
  taskRef.current = task;
  const titleRef = useRef(titleDraft);
  titleRef.current = titleDraft;
  const contentRef = useRef(contentDraft);
  contentRef.current = contentDraft;
  const remarksRef = useRef(remarks);
  remarksRef.current = remarks;

  const canEditContent = canApprove || isContentEditor(roleKey) || isManagerRole(roleKey);

  const applyFresh = (fresh: Task) => {
    setTask(fresh);
    setTitleDraft(fresh.title || "");
    setContentDraft(fresh.content || "");
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
  };

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
        if (!silent) toast("Remarks saved.");
      } else {
        toast(res.error || "Could not save remarks.", "error");
      }
    },
    [toast]
  );

  const persistTitle = useCallback(
    async (silent: boolean) => {
      const next = titleRef.current.trim();
      if (!next || next === taskRef.current.title) return;
      const res = await setPipelineTaskTitleAction(taskRef.current.id, next);
      if (res.ok && res.title) {
        setTask((prev) => ({ ...prev, title: res.title || prev.title }));
        if (!silent) toast("Task title updated.");
      } else {
        toast(res.error || "Could not save the title.", "error");
      }
    },
    [toast]
  );

  const persistContent = useCallback(
    async (silent: boolean) => {
      if (contentRef.current === taskRef.current.content) return;
      const res = await setPipelineTaskContentAction(
        taskRef.current.id,
        contentRef.current
      );
      if (res.ok) {
        setTask((prev) => ({ ...prev, content: contentRef.current }));
        if (!silent) toast("Content saved.");
      } else {
        toast(res.error || "Could not save the content.", "error");
      }
    },
    [toast]
  );

  // Auto-save ~1 second after the user stops typing (remarks always, title & content for editors).
  useEffect(() => {
    const t = window.setTimeout(() => persistRemarks(true), 1000);
    return () => window.clearTimeout(t);
  }, [remarks, persistRemarks]);

  useEffect(() => {
    if (!canEditContent) return;
    const t = window.setTimeout(() => persistTitle(true), 1000);
    return () => window.clearTimeout(t);
  }, [titleDraft, canEditContent, persistTitle]);

  useEffect(() => {
    if (!canEditContent) return;
    const t = window.setTimeout(() => persistContent(true), 1000);
    return () => window.clearTimeout(t);
  }, [contentDraft, canEditContent, persistContent]);

  // Close the modal on the Escape key (global). Cleanup removes the listener.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const saveAll = () => {
    startTransition(async () => {
      if (canEditContent) {
        await persistTitle(false);
        await persistContent(false);
      }
      await persistRemarks(false);
    });
  };

  const toggleMember = (id: string) => {
    setTeamDraft((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const saveTeam = () => {
    startTransition(async () => {
      const res = await updatePipelineTaskTeamAction(task.id, teamDraft);
      if (!res.ok) {
        toast(res.error || "Could not update team.", "error");
        return;
      }
      toast("Team updated.");
      await refresh();
      const fresh = (await getPipelineBoardAction()).active.find(
        (t) => t.id === task.id
      );
      if (fresh) setTask(fresh);
      setTeamOpen(false);
    });
  };

  // Send Back (Admin/PM): reject the submitted work — keeps the current assignee,
  // flags `needs_improvement`, and prepends the signed feedback to the remarks.
  // Then re-sync the fresh task and refresh the parent board.
  const sendBack = () => {
    startTransition(async () => {
      const res = await sendBackPipelineTaskAction(
        task.id,
        remarksRef.current
      );
      if (!res.ok) {
        toast(res.error || "Could not send back.", "error");
        return;
      }
      await refresh();
      const fresh = (await getPipelineBoardAction()).active.find(
        (t) => t.id === task.id
      );
      if (fresh) applyFresh(fresh);
      toast("Sent back for rework.");
    });
  };

  // Submit for Review (Employee): persist remarks, then flag the task as
  // `submitted` for the QC gatekeeper. The stageIndex does NOT advance — the
  // assignee keeps the task until an Admin/PM approves or rejects it.
  const submitWork = () => {
    startTransition(async () => {
      await persistRemarks(true);
      const res = await submitPipelineTaskAction(task.id, remarksRef.current);
      if (!res.ok) {
        toast(res.error || "Could not submit.", "error");
        return;
      }
      await refresh();
      const fresh = (await getPipelineBoardAction()).active.find(
        (t) => t.id === task.id
      );
      if (fresh) applyFresh(fresh);
      toast("Submitted for QC review.");
    });
  };

  // Approve & Advance (Admin/PM gatekeeper): the only action that pushes the
  // task down its sequence (A→B→C) — auto-assigning the next member, or
  // completing the task after the final stage.
  const approveWork = () => {
    startTransition(async () => {
      await persistRemarks(true);
      const res = await approvePipelineTaskAction(task.id);
      if (!res.ok) {
        toast(res.error || "Could not approve.", "error");
        return;
      }
      await refresh();
      toast("Advanced to the next stage.");
      onClose();
    });
  };

  const heading = titleDraft.trim() || task.title || "Untitled task";
  const isGatekeeper = canApprove || isManagerRole(roleKey);
  const isSubmitted = task.status === "submitted";
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
        {/* Sticky header with back/close */}
        <div className="sticky top-0 z-10 bg-night-850/95 backdrop-blur px-4 py-3 border-b border-white/10 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 btn-ghost !px-2.5 !py-2 text-sm shrink-0 hidden md:flex"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
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
          {/* ---- Task Title (editable by content editors) ---- */}
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-brand-300" /> Task Title
            </p>
            {canEditContent ? (
              <input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={() => persistTitle(true)}
                placeholder="Task title…"
                className="input !py-2.5 text-sm w-full"
              />
            ) : (
              <p className="text-sm text-slate-200 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 break-words">
                {titleDraft || "Untitled task"}
              </p>
            )}
          </section>

          {/* ---- Content / Copy (editable by content editors) ---- */}
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Content / Copy
            </p>
            {canEditContent ? (
              <textarea
                value={contentDraft}
                onChange={(e) => setContentDraft(e.target.value)}
                onBlur={() => persistContent(true)}
                rows={4}
                placeholder="Draft the content / copy for this task…"
                className="input !py-2.5 text-sm resize-none"
              />
            ) : contentDraft ? (
              <p className="text-sm text-slate-300 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 whitespace-pre-wrap break-words">
                {contentDraft}
              </p>
            ) : (
              <p className="text-xs text-slate-500">No content written yet.</p>
            )}
          </section>

          {/* ---- Remarks / Feedback (every role) ---- */}
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Remarks / Feedback
            </p>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              onBlur={() => persistRemarks(true)}
              rows={3}
              placeholder="Notes, feedback or handoff context… auto-saves as you type."
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
                onClick={saveAll}
                className="btn-ghost !px-2.5 !py-1.5 text-xs shrink-0"
              >
                <Save className="h-3.5 w-3.5" /> Save All
              </button>
            </div>
          </section>

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

          {/* ---- Actions: Gatekeeper vs Employee ---- */}
          <section className="space-y-2.5">
            {isGatekeeper ? (
              <>
                <div className="rounded-xl border border-violet-300/30 bg-violet-400/[0.07] p-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-white flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-violet-300" />{" "}
                      {isSubmitted ? "Approve & Advance" : "Complete"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {isSubmitted
                        ? "Approves the submitted work — auto-assigns the next member (A→B→C)."
                        : "Completes this stage — auto-assigns the next member (A→B→C)."}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={approveWork}
                    className="btn-primary !py-2 text-sm shrink-0"
                  >
                    <Check className="h-4 w-4" /> {isSubmitted ? "Approve & Advance" : "Complete"}
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
              </>
            ) : isSubmitted ? (
              <div className="rounded-xl border border-violet-300/30 bg-violet-400/[0.07] p-3">
                <p className="text-sm font-medium text-white flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-violet-300" /> Submitted — Awaiting Review
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your work is with the QC team. It advances only after Admin/PM approval.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-brand-300/30 bg-brand-300/[0.06] p-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-white flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-brand-300" /> Submit for Review
                  </p>
                  <p className="text-xs text-slate-500">
                    Submit work to PM/Admin for approval.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={submitWork}
                  className="btn-primary !py-2 text-sm shrink-0"
                >
                  <Check className="h-4 w-4" /> Submit for Review
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Mobile FAB — bottom-right close on small screens, desktop uses the header × */}
      {isMobile && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="fixed bottom-4 right-4 z-[70] md:hidden rounded-full shadow-lg shadow-black/50 ring-1 ring-white/20 bg-gray-800 flex items-center justify-center h-14 w-14 hover:bg-gray-700 transition-colors"
        >
          <X className="h-6 w-6 text-white" />
        </button>
      )}
    </div>
  );
}