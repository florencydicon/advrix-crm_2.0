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
  Trash2,
  CalendarDays,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import type { Task, UserRow } from "@/lib/types";
import { StatusBadge, PriorityBadge } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { DatePicker } from "@/components/DatePicker";
import { isOverdue, isDueSoon } from "@/lib/deadlines";
import {
  submitPipelineTaskAction,
  approvePipelineTaskAction,
  sendBackPipelineTaskAction,
  setPipelineTaskRemarksAction,
  setPipelineTaskTitleAction,
  setPipelineTaskContentAction,
  setPipelineTaskDeadlineAction,
  setPipelineTaskPriorityAction,
  updatePipelineTaskTeamAction,
  deletePipelineTaskAction,
  getPipelineBoardAction,
  bulkSetPipelineStageAction,
  bulkMoveBackToStageAction,
  reopenPipelineTaskAction,
  startPipelineTaskAction,
  setPipelineTaskReferenceLinksAction,
  sendBackWithClientFeedbackAction,
  markPipelineTaskUploadedAction,
} from "@/lib/actions/pipeline";

function initials(name?: string | null) {
  return (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Admin/PM/Super-Admin-like roles act as gatekeepers and Complete this task. */
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

/** SMM stage handles client feedback and the uploaded-platforms handoff. */
function isSmmRole(roleKey?: string | null): boolean {
  const r = (roleKey || "").toUpperCase();
  return r === "SMM";
}

function fmtTimeOnly(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(v?: string | null) {
  if (!v) return "No deadline set";
  const d = new Date(`${v.slice(0, 10)}T00:00:00Z`);
  if (isNaN(d.getTime())) return "No deadline set";
  return d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function MarqueeHeading({ text }: { text: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  const needsMarquee = words.length > 4 || text.length > 28;
  if (!needsMarquee) {
    return <div className="marquee-static" title={text}>{text}</div>;
  }
  const sep = "  •  ";
  return (
    <div className="marquee-clip" title={text}>
      <div className="marquee-track marquee-moving">
        <span className="pr-6">{text}{sep}{text}</span>
      </div>
    </div>
  );
}

/**
 * Ultra-lean unified Task Modal. Shared by the Project Pipeline, the Employee
 * Dashboard and the SMM Dashboard:
 *  - Task Title input - renames the sub-task live (Content editors only).
 *  - Content / Copy textarea - the draft work body (Content editors only).
 *  - Remarks / Feedback textarea - free-form notes for every role (auto-saves).
 * Actions are role-gated:
 *  - Employees can only "Submit for Review" (status -> submitted, no advance).
 *  - Admin/PM gatekeepers can "Complete this task" (next team member) or
 *    "Send Back" (keep assignee, needs_improvement).
 */
export default function TaskModal({
  task: initialTask,
  team,
  isMobile,
  canManageTeam,
  canApprove,
  roleKey,
  userId,
  onClose,
  refresh,
}: {
  task: Task;
  team: UserRow[];
  isMobile: boolean;
  canManageTeam: boolean;
  canApprove: boolean;
  roleKey?: string | null;
  userId?: string | null;
  onClose: () => void;
  refresh: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [task, setTask] = useState<Task>(initialTask);
  const [titleDraft, setTitleDraft] = useState(initialTask.title || "");
  const [contentDraft, setContentDraft] = useState(initialTask.content || "");
  const [remarks, setRemarks] = useState(initialTask.remarks || "");
  const [referenceLinks, setReferenceLinks] = useState((initialTask as any).reference_links || "");
  const [clientFeedback, setClientFeedback] = useState("");
  const [platformsDraft, setPlatformsDraft] = useState<string[]>(initialTask.platforms || []);
  const [deadlineDraft, setDeadlineDraft] = useState(initialTask.due_date || "");
  const [priorityDraft, setPriorityDraft] = useState(initialTask.priority || "medium");
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
  const linksRef = useRef(referenceLinks);
  linksRef.current = referenceLinks;

  const canEditContent = canApprove || isContentEditor(roleKey) || isManagerRole(roleKey);
  const canEditDeadline = canApprove || isManagerRole(roleKey) || canManageTeam;

  const applyFresh = (fresh: Task) => {
    setTask(fresh);
    setTitleDraft(fresh.title || "");
    setContentDraft(fresh.content || "");
    setRemarks(fresh.remarks || "");
    setReferenceLinks((fresh as any).reference_links || "");
    setPlatformsDraft(fresh.platforms || []);
    setDeadlineDraft(fresh.due_date || "");
    setPriorityDraft(fresh.priority || "medium");
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

  const persistLinks = useCallback(
    async (silent: boolean) => {
      if (linksRef.current === (taskRef.current as any).reference_links) return;
      const res = await setPipelineTaskReferenceLinksAction(taskRef.current.id, linksRef.current);
      if (res.ok) {
        setTask((prev) => ({ ...prev, reference_links: linksRef.current } as any));
        if (!silent) toast("Reference links saved.");
      } else {
        toast(res.error || "Could not save links.", "error");
      }
    },
    [toast]
  );

  /** Deadline is saved immediately on pick/clear (managers only). */
  const persistDeadline = (v: string) => {
    if (!canEditDeadline) return;
    const clean = v || null;
    setDeadlineDraft(v);
    startTransition(async () => {
      const res = await setPipelineTaskDeadlineAction(taskRef.current.id, clean);
      if (!res.ok) {
        setDeadlineDraft(taskRef.current.due_date || "");
        toast(res.error || "Could not update the deadline.", "error");
        return;
      }
      setTask((prev) => ({ ...prev, due_date: res.due_date ?? prev.due_date }));
      toast(clean ? "Deadline updated." : "Deadline cleared.");
      await refresh();
    });
  };

  /** Priority is saved immediately on change (managers only). */
  const persistPriority = (v: string) => {
    if (!canEditDeadline) return;
    setPriorityDraft(v);
    startTransition(async () => {
      const res = await setPipelineTaskPriorityAction(taskRef.current.id, v);
      if (!res.ok) {
        setPriorityDraft(taskRef.current.priority || "medium");
        toast(res.error || "Could not update priority.", "error");
        return;
      }
      setTask((prev) => ({ ...prev, priority: v }));
      toast("Priority updated.");
      await refresh();
    });
  };

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

  // Send Back (Admin/PM): reject the submitted work - keeps the current assignee,
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

  const startTask = () => {
    startTransition(async () => {
      const res = await startPipelineTaskAction(task.id);
      if (!res.ok) { toast(res.error || "Could not start.", "error"); return; }
      await refresh();
      const fresh = (await getPipelineBoardAction()).active.find((t) => t.id === task.id);
      if (fresh) applyFresh(fresh);
      toast("Task started.");
    });
  };

  const togglePlatform = (p: string) => {
    setPlatformsDraft((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  const markUploaded = () => {
    if (platformsDraft.length === 0) { toast("Select at least one platform.", "error"); return; }
    startTransition(async () => {
      const res = await markPipelineTaskUploadedAction(task.id, platformsDraft);
      if (!res.ok) { toast(res.error || "Could not mark uploaded.", "error"); return; }
      await refresh();
      const fresh = (await getPipelineBoardAction()).active.find((t) => t.id === task.id)
        || (await getPipelineBoardAction()).completed.find((t) => t.id === task.id);
      if (fresh) applyFresh(fresh);
      else onClose();
      toast("Marked as uploaded.");
    });
  };

  const sendBackClient = () => {
    if (!clientFeedback.trim()) {
      toast("Please enter client feedback.", "error");
      return;
    }
    startTransition(async () => {
      const res = await sendBackWithClientFeedbackAction(task.id, clientFeedback);
      if (!res.ok) { toast(res.error || "Could not send back.", "error"); return; }
      await refresh();
      const fresh = (await getPipelineBoardAction()).active.find((t) => t.id === task.id);
      if (fresh) applyFresh(fresh);
      setClientFeedback("");
      toast("Client feedback sent back.");
    });
  };

  // Submit for Review (Employee): persist remarks, then flag the task as
  // `submitted` for the QC gatekeeper. The stageIndex does NOT advance - the
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

  // Complete this task (Admin/PM gatekeeper): the only action that pushes the
  // task down its sequence (A->B->C) - auto-assigning the next member, or
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

  // Delete this sub-task (manager gatekeepers only). Destructive - confirms first.
  const deleteTask = () => {
    if (!window.confirm(`Delete "${titleDraft.trim() || task.title || "this task"}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await deletePipelineTaskAction(task.id);
      if (!res.ok) {
        toast(res.error || "Could not delete the task.", "error");
        return;
      }
      toast("Task deleted.");
      await refresh();
      onClose();
    });
  };

  const heading = titleDraft.trim() || task.title || "Untitled task";
  const isGatekeeper = canApprove || isManagerRole(roleKey);
  const isSubmitted = task.status === "submitted";
  const isCompleted = task.status === "completed";
  const isAssignee = !!userId && task.assigned_to === userId;
  const mustStart = task.status === "approved" && isAssignee;
  const isSmm = isSmmRole(roleKey);
  const showUploadedPlatforms = isSmm || isGatekeeper;
  const showClientFeedbackComposer = isSmm || isGatekeeper;
  const step = task.current_step ?? 0;
  const seq = task.assignees || [];
  const activeIdx = seq.length === 0 ? 0 : Math.min(step, seq.length - 1);
  const activeMember = seq[activeIdx]?.name || null;
  const canChangeStage = isManagerRole(roleKey) || canManageTeam;

  const changeStage = (targetUserId: string) => {
    if (!canChangeStage || isPending) return;
    if (seq[activeIdx]?.id === targetUserId) return;
    startTransition(async () => {
      let res: { ok: boolean; error?: string };
      if (isCompleted) {
        // Reopen completed task to chosen stage
        res = await bulkMoveBackToStageAction([task.id], targetUserId);
        if (res.ok) {
          // also handle reopen if bulkMoveBack didn't cover (fallback)
          const r2 = await reopenPipelineTaskAction(task.id);
          if (!r2.ok && (res as any).count === 0) {
            toast(res.error || r2.error || "Could not reopen.", "error");
            return;
          }
        }
      } else {
        res = await bulkSetPipelineStageAction([task.id], targetUserId);
      }
      if (!res.ok) {
        toast(res.error || "Could not change stage.", "error");
        return;
      }
      await refresh();
      const fresh = (await getPipelineBoardAction()).active.find((t) => t.id === task.id)
        || (await getPipelineBoardAction()).completed.find((t) => t.id === task.id);
      if (fresh) applyFresh(fresh);
      else onClose();
      toast(isCompleted ? "Task reopened to selected stage." : "Stage changed.");
    });
  };

  const reopenTask = () => {
    if (!canChangeStage) return;
    startTransition(async () => {
      const res = await reopenPipelineTaskAction(task.id);
      if (!res.ok) {
        toast(res.error || "Could not reopen.", "error");
        return;
      }
      await refresh();
      const fresh = (await getPipelineBoardAction()).active.find((t) => t.id === task.id);
      if (fresh) applyFresh(fresh);
      toast("Task reopened.");
    });
  };

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

        <div className="p-4 space-y-5 overflow-y-auto pb-32 md:pb-4">
          {/* ---- Deadline (managers edit; employees read-only) ---- */}
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-brand-300" /> Deadline
              {!canEditDeadline && (
                <span className="normal-case tracking-normal text-slate-600 text-[10px]">(contact an Admin / PM to change)</span>
              )}
            </p>
            {canEditDeadline ? (
              <DatePicker
                value={deadlineDraft}
                onChange={persistDeadline}
                placeholder="Set a deadline..."
              />
            ) : (
              <p className="text-sm text-slate-200 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
                {fmtDate(task.due_date)}
              </p>
            )}
            {isOverdue(task) ? (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2">
                <AlertTriangle className="h-4 w-4 text-rose-300 shrink-0" />
                <p className="text-xs text-rose-200 leading-snug">
                  This task is overdue - it has been auto-flagged as <span className="font-semibold text-rose-300">Urgent</span>.
                </p>
              </div>
            ) : isDueSoon(task) ? (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2">
                <Clock className="h-4 w-4 text-amber-300 shrink-0" />
                <p className="text-xs text-amber-200 leading-snug">
                  This task is due within the next 24 hours.
                </p>
              </div>
            ) : null}
          </section>

          {/* ---- Task Title + Priority (editable by content editors / managers) ---- */}
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-brand-300" /> Task Title
            </p>
            {canEditContent ? (
              <input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={() => persistTitle(true)}
                placeholder="Task title..."
                className="input !py-2.5 text-sm w-full"
              />
            ) : (
              <p className="text-sm text-slate-200 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 break-words">
                {titleDraft || "Untitled task"}
              </p>
            )}
            {/* Priority dropdown */}
            {canEditDeadline ? (
              <div className="mt-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                  Priority
                </p>
                <div className="flex gap-2">
                  {(["low", "medium", "high", "urgent"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      disabled={isPending}
                      onClick={() => persistPriority(p)}
                      className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold border transition-colors ${
                        priorityDraft === p
                          ? p === "urgent"
                            ? "border-rose-500/60 bg-rose-500/15 text-rose-300"
                            : p === "high"
                              ? "border-rose-400/50 bg-rose-400/10 text-rose-300"
                              : p === "medium"
                                ? "border-sky-400/50 bg-sky-400/10 text-sky-300"
                                : "border-white/20 bg-white/[0.06] text-slate-200"
                          : "border-white/10 bg-white/[0.02] text-slate-500 hover:bg-white/[0.05] hover:text-slate-300"
                      }`}
                    >
                      {p === "low" ? "Low" : p === "medium" ? "Medium" : p === "high" ? "High" : "Urgent"}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Priority</p>
                <PriorityBadge priority={priorityDraft} />
              </div>
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
                placeholder="Draft the content / copy for this task..."
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
              placeholder="Notes, feedback or handoff context... auto-saves as you type."
              className="input !py-2.5 text-sm resize-none"
            />
            <p className="text-xs text-slate-400 truncate mt-1.5">
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
          </section>

          {/* ---- Reference Links / Google Drive ---- */}
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Reference Links / Google Drive
            </p>
            <p className="text-[11px] text-slate-500 mb-2">Paste reference URLs, Drive links – one per line.</p>
            <textarea
              value={referenceLinks}
              onChange={(e) => setReferenceLinks(e.target.value)}
              onBlur={() => persistLinks(true)}
              rows={3}
              placeholder="https://drive.google.com/...
https://reference-link.com/..."
              className="input !py-2.5 text-sm resize-none"
            />
            <button type="button" disabled={isPending} onClick={() => persistLinks(false)} className="btn-primary w-full mt-2 !py-2 text-sm">
              <Save className="h-4 w-4" /> Save Links
            </button>
            {referenceLinks.trim() && (
              <div className="mt-2 space-y-1">
                {referenceLinks.split("\n").filter(Boolean).map((l: string, i: number) => (
                  <a key={i} href={l.trim()} target="_blank" rel="noopener noreferrer" className="block text-xs text-brand-300 hover:text-brand-200 truncate underline">
                    {l.trim()}
                  </a>
                ))}
              </div>
            )}
          </section>

          {/* ---- Uploaded Platforms (SMM / PM / Admin only) ---- */}
          {showUploadedPlatforms && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Uploaded Platforms
              </p>
              <div className="grid grid-cols-2 gap-2">
                {["Instagram", "Facebook", "YouTube", "LinkedIn", "Twitter/X", "Pinterest", "Threads", "Website"].map((pl: string) => (
                  <label key={pl} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs cursor-pointer ${platformsDraft.includes(pl) ? "border-brand-300 bg-brand-300/10 text-brand-300" : "border-white/10 bg-white/[0.02] text-slate-400"}`}>
                    <input type="checkbox" checked={platformsDraft.includes(pl)} onChange={() => togglePlatform(pl)} className="h-3.5 w-3.5 accent-brand-300" />
                    {pl}
                  </label>
                ))}
              </div>
              <button type="button" disabled={isPending} onClick={markUploaded} className="btn-primary w-full mt-3 !py-2 text-sm">
                <Check className="h-4 w-4" /> Mark as Uploaded
              </button>
              {task.platforms?.length ? <p className="text-[11px] text-slate-500 mt-2">Current: {task.platforms.join(", ")}</p> : null}
            </section>
          )}

          {/* ---- Client Feedback (read-only for all; composer only for SMM / PM / Admin) ---- */}
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Client Feedback
            </p>
            {task.client_feedback ? (
              <div className="mb-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2">
                <p className="text-[11px] font-semibold text-amber-300">Previous feedback</p>
                <p className="text-xs text-amber-100 mt-1 whitespace-pre-wrap">{task.client_feedback}</p>
              </div>
            ) : null}
            {showClientFeedbackComposer && !isCompleted && (
              <div className="p-3 rounded-lg border border-white/10 bg-white/[0.02]">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Client Feedback (SMM → Designer)</p>
                <textarea value={clientFeedback} onChange={(e) => setClientFeedback(e.target.value)} rows={2} placeholder="Client ne su kidhu te lakho..." className="input !py-2 text-xs resize-none" />
                <button type="button" disabled={isPending} onClick={sendBackClient} className="btn-ghost w-full mt-2 !py-1.5 text-xs border border-amber-400/30 text-amber-300">
                  <Undo2 className="h-3.5 w-3.5" /> Send Back with Client Feedback
                </button>
              </div>
            )}
          </section>

          {/* ---- Stages (single UI like hiring stages) ---- */}
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-brand-300" /> Stages
              {canChangeStage && seq.length > 0 && <span className="normal-case tracking-normal text-slate-500 text-[10px]">(tap to change stage)</span>}
            </p>

            {/* Current stage banner */}
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-brand-300/40 bg-brand-300/10 px-3 py-2">
              <Users className="h-4 w-4 text-brand-300 shrink-0" />
              <span className="text-sm text-slate-200">
                Current Stage:{" "}
                <span className="font-semibold text-brand-300">
                  {isCompleted ? "Completed" : (activeMember || "Unassigned")}
                </span>
              </span>
              {isCompleted && canChangeStage && (
                <button type="button" disabled={isPending} onClick={reopenTask} className="ml-auto btn-ghost !px-2 !py-1 text-xs">
                  Re-open
                </button>
              )}
            </div>

            {/* Single stages stepper - shows all allotted persons */}
            {seq.length === 0 ? (
              <p className="text-xs text-slate-500 mb-2">No members assigned.</p>
            ) : (
              <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1 scrollbar-thin">
                {seq.map((a, i) => {
                  const done = isCompleted ? true : i < step;
                  const isActive = !isCompleted && i === activeIdx;
                  const clickable = canChangeStage && !isPending;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      disabled={!clickable}
                      onClick={() => clickable && changeStage(a.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold border transition-colors shrink-0 ${
                        isActive
                          ? "border-brand-300 bg-brand-300 text-night-950 shadow"
                          : done
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : "border-white/10 bg-white/[0.03] text-slate-500 hover:bg-white/[0.06] hover:text-slate-300"
                      } ${clickable ? "cursor-pointer" : "cursor-default"}`}
                      title={clickable ? `Move to ${a.name}` : a.name}
                    >
                      <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isActive ? "bg-night-950 text-brand-300" : done ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-slate-400"}`}>
                        {done && !isActive ? <Check className="h-3 w-3" /> : i + 1}
                      </span>
                      <span className="max-w-[90px] truncate">{a.name}</span>
                      {a.role_label && <span className="hidden sm:inline text-[9px] opacity-60 truncate max-w-[60px]">{a.role_label}</span>}
                    </button>
                  );
                })}
              </div>
            )}
            {canChangeStage && seq.length > 0 && (
              <p className="text-[10px] text-slate-500 mb-2">Admin / PM can tap any stage to move the task there. Completed tasks will reopen.</p>
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

          {/* ---- Super Admin / PM 3-button row (old full view) ---- */}
          {isGatekeeper && !isCompleted && (
            <section>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" disabled={isPending} onClick={sendBack} className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-2 py-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/15 transition-colors disabled:opacity-50">
                  <Undo2 className="h-3.5 w-3.5" /> Send Back
                </button>
                <button type="button" disabled={isPending} onClick={approveWork} className="flex items-center justify-center gap-1.5 rounded-xl border border-sky-400/30 bg-sky-400/10 px-2 py-2.5 text-xs font-semibold text-sky-300 hover:bg-sky-400/15 transition-colors disabled:opacity-50">
                  <ArrowRight className="h-3.5 w-3.5" /> Move Forward
                </button>
                <button type="button" disabled={isPending} onClick={approveWork} className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500 text-night-950 px-2 py-2.5 text-xs font-bold hover:bg-emerald-400 transition-colors disabled:opacity-50 shadow-sm">
                  <Check className="h-3.5 w-3.5" /> Complete
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 text-center">Send Back • Move Forward (A→B→C) • Complete this task</p>
            </section>
          )}
          {/* ---- Actions: single contextual action bar row ---- */}
          <section className="space-y-2.5">
            {isCompleted ? (
              <div className="rounded-xl border border-emerald-300/30 bg-emerald-400/[0.07] p-3">
                <p className="text-sm font-medium text-white flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-300" /> Completed
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  This task is completed. {canChangeStage ? "Use Stages above to reopen to any stage." : "Contact Admin/PM to reopen."}
                </p>
                {canChangeStage && (
                  <button type="button" disabled={isPending} onClick={reopenTask} className="btn-primary !py-2 text-sm mt-2">
                    <Check className="h-4 w-4" /> Re-open Task
                  </button>
                )}
              </div>
            ) : mustStart ? (
              <div className="rounded-xl border border-brand-300/40 bg-brand-300/10 p-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-white flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-brand-300" /> Start Task
                  </p>
                  <p className="text-xs text-slate-500">Tap Start to begin work (approved → in_progress). Only the assigned person can start.</p>
                </div>
                <button type="button" disabled={isPending} onClick={startTask} className="btn-primary !py-2 text-sm shrink-0">
                  <Layers className="h-4 w-4" /> Start Task
                </button>
              </div>
            ) : !isGatekeeper && isSubmitted ? (
              <div className="rounded-xl border border-violet-300/30 bg-violet-400/[0.07] p-3">
                <p className="text-sm font-medium text-white flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-violet-300" /> Submitted - Awaiting Review
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

          {/* ---- Danger zone: delete sub-task (manager gatekeepers only) ---- */}
          {(canManageTeam || isManagerRole(roleKey)) && (
            <section className="pt-2">
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.05] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-rose-300 flex items-center gap-1.5">
                      <Trash2 className="h-4 w-4" /> Delete Sub-Task
                    </p>
                    <p className="text-xs text-slate-500">
                      Permanently removes this task and its work history.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={deleteTask}
                    className="btn-ghost !text-rose-400 !py-1.5 !px-3 text-sm shrink-0 whitespace-nowrap"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Mobile FAB - bottom-right close on small screens, desktop uses the header X */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close modal"
        className="md:hidden fixed bottom-24 right-6 z-[100] flex h-14 w-14 items-center justify-center rounded-full bg-gray-800 text-white shadow-2xl shadow-black/60 border border-gray-600 active:scale-95 transition-transform"
      >
        <X size={28} />
      </button>
    </div>
  );
}
