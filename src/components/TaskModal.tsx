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
  MessageSquare,
  Flag,
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
  bulkSetPipelineDeadlineAction,
  getPipelineBoardAction,
  setPipelineTaskReferenceLinksAction,
  sendBackWithClientFeedbackAction,
  startPipelineTaskAction,
  setPipelineTaskPlatformsAction,
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

function isManagerRole(roleKey?: string | null): boolean {
  if (!roleKey) return false;
  const r = roleKey.toUpperCase();
  return r === "SUPER_ADMIN" || r === "PROJECT_MANAGER" || r === "ADMIN" || r === "PM";
}

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

function fmtDate(v?: string | null) {
  if (!v) return "No deadline set";
  const d = new Date(`${v.slice(0, 10)}T00:00:00Z`);
  if (isNaN(d.getTime())) return "No deadline set";
  return d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function MarqueeHeading({ text }: { text: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  const needsMarquee = words.length > 4 || text.length > 28;
  if (!needsMarquee) return <div className="marquee-static" title={text}>{text}</div>;
  const sep = "  •  ";
  return (
    <div className="marquee-clip" title={text}>
      <div className="marquee-track marquee-moving">
        <span className="pr-6">{text}{sep}{text}</span>
      </div>
    </div>
  );
}

type SectionKey = "deadline" | "title" | "priority" | "content" | "remarks" | "links" | "upload" | "team" | null;

export default function TaskModal({
  task: initialTask,
  team,
  isMobile,
  canManageTeam,
  canApprove,
  roleKey,
  onClose,
  refresh,
  siblingTasks,
  embedded,
  onBack,
}: {
  task: Task;
  team: UserRow[];
  isMobile: boolean;
  canManageTeam: boolean;
  canApprove: boolean;
  roleKey?: string | null;
  onClose: () => void;
  refresh: () => Promise<void>;
  siblingTasks?: Task[];
  embedded?: boolean;
  onBack?: () => void;
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
  const [openSection, setOpenSection] = useState<SectionKey>(null);
  const [bulkDeadline, setBulkDeadline] = useState(false);

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
  // Super admin / PM can edit title explicitly
  const canEditTitle = isManagerRole(roleKey) || canApprove;

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
      const res = await setPipelineTaskRemarksAction(taskRef.current.id, remarksRef.current);
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
      const res = await setPipelineTaskContentAction(taskRef.current.id, contentRef.current);
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

  const persistDeadline = (v: string) => {
    if (!canEditDeadline) return;
    const clean = v || null;
    setDeadlineDraft(v);
    // single update path - bulk handled via Save button
    if (!bulkDeadline) {
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
    }
  };

  const saveBulkDeadline = () => {
    const v = deadlineDraft || null;
    const ids = bulkDeadline && siblingTasks?.length
      ? siblingTasks.map((t) => t.id)
      : [taskRef.current.id];
    // include current if not in sibling list
    if (bulkDeadline && siblingTasks && !ids.includes(taskRef.current.id)) ids.push(taskRef.current.id);
    startTransition(async () => {
      if (bulkDeadline && ids.length > 1) {
        const res = await bulkSetPipelineDeadlineAction(ids, v);
        if (!res.ok) { toast(res.error || "Could not update deadlines.", "error"); return; }
        toast(`Deadline updated for ${res.count} tasks.`);
      } else {
        const res = await setPipelineTaskDeadlineAction(taskRef.current.id, v);
        if (!res.ok) { toast(res.error || "Could not update deadline.", "error"); return; }
        setTask((prev) => ({ ...prev, due_date: res.due_date ?? prev.due_date }));
        toast(v ? "Deadline updated." : "Deadline cleared.");
      }
      await refresh();
    });
  };

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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const toggleMember = (id: string) => {
    setTeamDraft((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
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
      const fresh = (await getPipelineBoardAction()).active.find((t) => t.id === task.id);
      if (fresh) setTask(fresh);
      setTeamOpen(false);
      setOpenSection(null);
    });
  };

  const sendBack = () => {
    startTransition(async () => {
      const res = await sendBackPipelineTaskAction(task.id, remarksRef.current);
      if (!res.ok) { toast(res.error || "Could not send back.", "error"); return; }
      await refresh();
      const fresh = (await getPipelineBoardAction()).active.find((t) => t.id === task.id);
      if (fresh) applyFresh(fresh);
      toast("Sent back for rework.");
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
    setPlatformsDraft(prev => prev.includes(p) ? prev.filter(x=>x!==p) : [...prev, p]);
  };

  const markUploaded = () => {
    if (platformsDraft.length === 0) { toast("Select at least one platform.", "error"); return; }
    startTransition(async () => {
      const res = await markPipelineTaskUploadedAction(task.id, platformsDraft);
      if (!res.ok) { toast(res.error || "Could not mark uploaded.", "error"); return; }
      await refresh();
      const fresh = (await getPipelineBoardAction()).active.find((t) => t.id === task.id) || (await getPipelineBoardAction()).completed.find((t) => t.id === task.id);
      if (fresh) applyFresh(fresh);
      else onClose();
      toast("Marked as uploaded.");
    });
  };

  const submitWork = () => {
    startTransition(async () => {
      await persistRemarks(true);
      const res = await submitPipelineTaskAction(task.id, remarksRef.current);
      if (!res.ok) { toast(res.error || "Could not submit.", "error"); return; }
      await refresh();
      const fresh = (await getPipelineBoardAction()).active.find((t) => t.id === task.id);
      if (fresh) applyFresh(fresh);
      toast("Submitted for QC review.");
    });
  };

  const approveWork = () => {
    startTransition(async () => {
      await persistRemarks(true);
      const res = await approvePipelineTaskAction(task.id);
      if (!res.ok) { toast(res.error || "Could not approve.", "error"); return; }
      await refresh();
      toast("Advanced to the next stage.");
      onClose();
    });
  };

  const deleteTask = () => {
    if (!window.confirm(`Delete "${titleDraft.trim() || task.title || "this task"}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await deletePipelineTaskAction(task.id);
      if (!res.ok) { toast(res.error || "Could not delete the task.", "error"); return; }
      toast("Task deleted.");
      await refresh();
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
  const isLastStage = seq.length > 0 && activeIdx === seq.length - 1;
  const siblingCount = siblingTasks?.length || 1;

  const toggleSection = (k: SectionKey) => setOpenSection((prev) => (prev === k ? null : k));

  const iconBtn = (active: boolean, onClick: () => void, Icon: any, label: string) => (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`h-9 w-9 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
        active ? "bg-brand-300 text-night-950 border-brand-300" : "bg-white/[0.04] text-slate-400 border-white/10 hover:bg-white/[0.08] hover:text-slate-200"
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  if (embedded) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {/* Header with Back */}
        <div className="sticky top-0 z-10 bg-night-850/95 backdrop-blur px-4 py-3 border-b border-white/10 flex items-center gap-3">
          {onBack && (
            <button type="button" onClick={onBack} className="h-8 w-8 rounded-lg bg-white/[0.06] hover:bg-white/10 border border-white/10 flex items-center justify-center shrink-0" aria-label="Back">
              <ChevronRight className="h-4 w-4 text-slate-300 rotate-180" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-400 truncate">{task.client_name} / {task.project_name}</div>
            <div className="text-base font-bold text-white leading-snug"><MarqueeHeading text={heading} /></div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0"><StatusBadge status={task.status} /><PriorityBadge priority={task.priority} /></div>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-lg bg-white/[0.06] hover:bg-white/10 border border-white/10 flex items-center justify-center shrink-0" aria-label="Close"><X className="h-4 w-4 text-slate-300" /></button>
        </div>
        {/* Icon bar */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/10 bg-white/[0.02] overflow-x-auto scrollbar-thin">
          {iconBtn(openSection === "deadline", () => toggleSection("deadline"), CalendarDays, "Deadline")}
          {iconBtn(openSection === "title", () => toggleSection("title"), FileText, "Task Title")}
          {iconBtn(openSection === "priority", () => toggleSection("priority"), Flag, "Priority")}
          {iconBtn(openSection === "content", () => toggleSection("content"), Layers, "Content / Copy")}
          {iconBtn(openSection === "remarks", () => toggleSection("remarks"), MessageSquare, "Remarks / Feedback")}
          {iconBtn(openSection === "team", () => toggleSection("team"), Users, "Team Assignment")}
          <div className="ml-auto flex items-center gap-1.5 pl-2 border-l border-white/10">
            {isGatekeeper ? (
              <button type="button" disabled={isPending} onClick={approveWork} title={isLastStage ? "Complete (last stage)" : "Complete & advance"} className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${isLastStage ? "bg-emerald-500 text-white" : "bg-brand-300 text-night-950"}`}><Check className="h-4 w-4" /></button>
            ) : isSubmitted ? (
              <span className="h-9 w-9 rounded-lg bg-violet-400/10 border border-violet-300/30 flex items-center justify-center shrink-0"><Clock className="h-4 w-4 text-violet-300" /></span>
            ) : (
              <button type="button" disabled={isPending} onClick={submitWork} className="h-9 w-9 rounded-lg bg-brand-300 text-night-950 flex items-center justify-center shrink-0"><Check className="h-4 w-4" /></button>
            )}
            {(canManageTeam || isManagerRole(roleKey)) && (
              <button type="button" disabled={isPending} onClick={deleteTask} className="h-9 w-9 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0"><Trash2 className="h-4 w-4" /></button>
            )}
          </div>
        </div>
        {/* Stage stepper */}
        <div className="px-4 py-2 border-b border-white/10 bg-white/[0.02]">
          <div className="flex flex-wrap items-center gap-1.5">
            {seq.length === 0 ? <span className="text-xs text-slate-500">No stages — unassigned</span> : seq.map((a,i)=>{const done=i<step;const isActive=i===activeIdx;return <span key={a.id} className="flex items-center gap-1.5">{i>0 && <ArrowRight className="h-3 w-3 text-slate-600" />}<span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold border ${isActive ? "border-brand-300 bg-brand-300 text-night-950" : done ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-white/[0.03] text-slate-500"}`}><span className="text-[10px] opacity-70">{i+1}.</span><span className="max-w-[90px] truncate">{a.name}</span>{done && <Check className="h-3 w-3" />}{isActive && !done && !isLastStage && <ArrowRight className="h-3 w-3" />}{isActive && isLastStage && <Check className="h-3 w-3" />}</span></span>})}
          </div>
          {activeMember && <p className="text-[11px] text-slate-500 mt-1">Current stage: <span className="text-brand-300 font-medium">{activeMember}</span> {isLastStage ? "· last stage" : `· stage ${activeIdx+1} of ${seq.length}`}</p>}
        </div>
        <div className="p-3 space-y-3 overflow-y-auto flex-1">
          {openSection === "deadline" && (
            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-brand-300" /> Deadline</p>
              {canEditDeadline ? (<><DatePicker value={deadlineDraft} onChange={persistDeadline} placeholder="Set a deadline…" />{siblingCount>1 && <label className="flex items-center gap-2 mt-2 text-xs text-slate-400 cursor-pointer"><input type="checkbox" checked={bulkDeadline} onChange={e=>setBulkDeadline(e.target.checked)} className="h-3.5 w-3.5 accent-brand-300" />Apply to all {siblingCount} subtasks in this project</label>}<button type="button" disabled={isPending} onClick={saveBulkDeadline} className="btn-primary w-full mt-2 !py-2 text-sm"><Save className="h-4 w-4" /> Save Deadline {bulkDeadline && siblingCount>1 ? `for ${siblingCount} tasks` : ""}</button></>) : <p className="text-sm text-slate-200 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">{fmtDate(task.due_date)}</p>}
              {isOverdue(task) && <div className="mt-2 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2"><AlertTriangle className="h-4 w-4 text-rose-300" /><p className="text-xs text-rose-200">Overdue — auto-flagged as <span className="font-semibold">Urgent</span>.</p></div>}
            </section>
          )}
          {openSection === "title" && (
            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-brand-300" /> Task Title</p>
              {canEditTitle ? (<><input value={titleDraft} onChange={e=>setTitleDraft(e.target.value)} placeholder="Task title…" className="input !py-2.5 text-sm w-full" /><button type="button" disabled={isPending} onClick={()=>persistTitle(false)} className="btn-primary w-full mt-2 !py-2 text-sm"><Save className="h-4 w-4" /> Save Title</button></>) : <p className="text-sm text-slate-200 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 break-words">{titleDraft || "Untitled task"}</p>}
            </section>
          )}
          {openSection === "priority" && (
            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5"><Flag className="h-3.5 w-3.5 text-brand-300" /> Priority</p>
              {canEditDeadline ? <div className="flex gap-2">{(["low","medium","high","urgent"]).map(p=><button key={p} type="button" disabled={isPending} onClick={()=>persistPriority(p)} className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold border ${priorityDraft===p ? (p==="urgent" ? "border-rose-500/60 bg-rose-500/15 text-rose-300" : p==="high" ? "border-rose-400/50 bg-rose-400/10 text-rose-300" : p==="medium" ? "border-sky-400/50 bg-sky-400/10 text-sky-300" : "border-white/20 bg-white/[0.06] text-slate-200") : "border-white/10 bg-white/[0.02] text-slate-500"}`}>{p}</button>)}</div> : <PriorityBadge priority={priorityDraft} />}
            </section>
          )}
          {openSection === "content" && (
            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Content / Copy</p>
              {canEditContent ? (<><textarea value={contentDraft} onChange={e=>setContentDraft(e.target.value)} rows={4} placeholder="Draft the content / copy…" className="input !py-2.5 text-sm resize-none" /><button type="button" disabled={isPending} onClick={()=>persistContent(false)} className="btn-primary w-full mt-2 !py-2 text-sm"><Save className="h-4 w-4" /> Save Content</button></>) : contentDraft ? <p className="text-sm text-slate-300 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 whitespace-pre-wrap break-words">{contentDraft}</p> : <p className="text-xs text-slate-500">No content written yet.</p>}
            </section>
          )}
          {openSection === "remarks" && (
            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Remarks / Feedback</p>
              <textarea value={remarks} onChange={e=>setRemarks(e.target.value)} rows={3} placeholder="Notes, feedback…" className="input !py-2.5 text-sm resize-none" />
              <button type="button" disabled={isPending} onClick={()=>persistRemarks(false)} className="btn-primary w-full mt-2 !py-2 text-sm"><Save className="h-4 w-4" /> Save Remarks</button>
              <p className="text-xs text-slate-400 truncate mt-1.5">{editedBy ? <>Last updated by: <span className="text-slate-200 font-medium">{editedBy.name.split(" ")[0]}</span> ({editedBy.role}) at <span className="text-slate-300">{fmtTimeOnly(editedBy.at)}</span></> : <>Auto-saves as you type</>}</p>
              {task.client_feedback && <div className="mt-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2"><p className="text-[11px] font-semibold text-amber-300">Client Feedback</p><p className="text-xs text-amber-100 mt-1 whitespace-pre-wrap">{task.client_feedback}</p></div>}
              <div className="mt-3 p-3 rounded-lg border border-white/10 bg-white/[0.02]">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Client Feedback (SMM → Designer)</p>
                <textarea value={clientFeedback} onChange={e=>setClientFeedback(e.target.value)} rows={2} placeholder="Client ne su kidhu te lakho..." className="input !py-2 text-xs resize-none" />
                <button type="button" disabled={isPending} onClick={sendBackClient} className="btn-ghost w-full mt-2 !py-1.5 text-xs border border-amber-400/30 text-amber-300"><Undo2 className="h-3.5 w-3.5" /> Send Back with Client Feedback</button>
              </div>
            </section>
          )}
          {openSection === "links" && (
            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Reference Links / Google Drive</p>
              <p className="text-[11px] text-slate-500 mb-2">Paste reference URLs, Drive links – one per line. Designer ne easy rese.</p>
              <textarea value={referenceLinks} onChange={e=>setReferenceLinks(e.target.value)} rows={3} placeholder="https://drive.google.com/...&#10;https://reference-link.com/..." className="input !py-2.5 text-sm resize-none" />
              <button type="button" disabled={isPending} onClick={()=>persistLinks(false)} className="btn-primary w-full mt-2 !py-2 text-sm"><Save className="h-4 w-4" /> Save Links</button>
              {referenceLinks.trim() && <div className="mt-2 space-y-1">{referenceLinks.split("\n").filter(Boolean).map((l: string,i: number)=><a key={i} href={l.trim()} target="_blank" rel="noopener noreferrer" className="block text-xs text-brand-300 hover:text-brand-200 truncate underline">{l.trim()}</a>)}</div>}
            </section>
          )}
          {openSection === "upload" && (
            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Uploaded Platforms</p>
              <div className="grid grid-cols-2 gap-2">
                {["Instagram","Facebook","YouTube","LinkedIn","Twitter/X","Pinterest","Threads","Website"].map((pl: string)=>(
                  <label key={pl} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs cursor-pointer ${platformsDraft.includes(pl) ? "border-brand-300 bg-brand-300/10 text-brand-300" : "border-white/10 bg-white/[0.02] text-slate-400"}`}>
                    <input type="checkbox" checked={platformsDraft.includes(pl)} onChange={()=>togglePlatform(pl)} className="h-3.5 w-3.5 accent-brand-300" />
                    {pl}
                  </label>
                ))}
              </div>
              <button type="button" disabled={isPending} onClick={markUploaded} className="btn-primary w-full mt-3 !py-2 text-sm"><Check className="h-4 w-4" /> Mark as Uploaded</button>
              {task.platforms?.length ? <p className="text-[11px] text-slate-500 mt-2">Current: {task.platforms.join(", ")}</p> : null}
              {task.status === "approved" && <button type="button" disabled={isPending} onClick={startTask} className="btn-ghost w-full mt-2 !py-2 text-sm"><Layers className="h-4 w-4" /> Start Task</button>}
            </section>
          )}
          {openSection === "team" && (
            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-brand-300" /> Team Assignment</p>
              <div className="mb-2 flex items-center gap-2 rounded-lg border border-brand-300/40 bg-brand-300/10 px-3 py-2"><Users className="h-4 w-4 text-brand-300" /><span className="text-sm text-slate-200">Current Stage: <span className="font-semibold text-brand-300">{activeMember || "Unassigned"}</span></span></div>
              {canManageTeam && (<><div className="flex flex-wrap gap-1.5 mb-2">{teamDraft.length===0 && <span className="text-xs text-slate-500">No members assigned.</span>}{teamDraft.map(id=>{const m=team.find(u=>u.id===id); if(seq.some(s=>s.id===id)) return null; return <span key={id} className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/10 pl-0.5 pr-1.5 py-0.5"><span className="h-5 w-5 rounded-full bg-brand-300/15 flex items-center justify-center text-[8px] font-bold text-brand-300">{initials(m?.full_name)}</span><span className="text-xs text-slate-200 max-w-[90px] truncate">{m?.full_name || "?"}</span><button type="button" onClick={()=>toggleMember(id)} className="text-slate-400 hover:text-rose-300 ml-0.5"><X className="h-3.5 w-3.5" /></button></span>})}</div><button type="button" onClick={()=>setTeamOpen(v=>!v)} className="w-full flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-300"><span className="flex items-center gap-2"><Plus className="h-4 w-4 text-brand-300" /> Add member</span>{teamOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button>{teamOpen && <div className="mt-1.5 rounded-lg border border-white/10 bg-night-900 max-h-44 overflow-y-auto">{team.filter(u=>u.is_active).map(u=>{const on=teamDraft.includes(u.id); return <button key={u.id} type="button" onClick={()=>toggleMember(u.id)} className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm ${on ? "bg-brand-300/10 text-brand-200" : "text-slate-300"}`}><span className="h-5 w-5 rounded-full bg-brand-300/15 flex items-center justify-center text-[8px] font-bold text-brand-300">{initials(u.full_name)}</span><span className="flex-1 text-left truncate">{u.full_name}</span>{on && <Check className="h-4 w-4 text-brand-300" />}</button>})}</div>}<button type="button" disabled={isPending} onClick={saveTeam} className="btn-primary w-full mt-2 !py-2.5 text-sm">Save Team</button></>)}
            </section>
          )}
          {isGatekeeper && isSubmitted && <div className="flex justify-end"><button type="button" disabled={isPending} onClick={sendBack} className="btn-ghost text-sm !px-3 !py-2"><Undo2 className="h-4 w-4" /> Send Back</button></div>}
          {task.status === "approved" && (
            <div className="flex justify-center">
              <button type="button" disabled={isPending} onClick={startTask} className="btn-primary !py-2 text-sm w-full"><Layers className="h-4 w-4" /> Start Task</button>
            </div>
          )}
          {task.status === "client_feedback" && <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-center"><span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-1 text-xs font-semibold text-amber-300">Client Feedback</span><p className="text-xs text-amber-200 mt-1">{(task as any).client_feedback || task.remarks}</p></div>}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex md:items-center md:justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={`relative w-full bg-night-850 border-white/10 shadow-2xl flex flex-col ${
          isMobile ? "bottom-sheet h-[100dvh] max-h-[100dvh] border-t md:hidden rounded-t-2xl" : "modal-pop rounded-2xl border max-w-lg md:max-h-[85vh]"
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-night-850/95 backdrop-blur px-4 py-3 border-b border-white/10 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-400 truncate">
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
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg bg-white/[0.06] hover:bg-white/10 border border-white/10 flex items-center justify-center shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-slate-300" />
          </button>
        </div>

        {/* Icon bar */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/10 bg-white/[0.02] overflow-x-auto scrollbar-thin">
          {iconBtn(openSection === "deadline", () => toggleSection("deadline"), CalendarDays, "Deadline")}
          {iconBtn(openSection === "title", () => toggleSection("title"), FileText, "Task Title")}
          {iconBtn(openSection === "priority", () => toggleSection("priority"), Flag, "Priority")}
          {iconBtn(openSection === "content", () => toggleSection("content"), Layers, "Content / Copy")}
          {iconBtn(openSection === "remarks", () => toggleSection("remarks"), MessageSquare, "Remarks / Feedback")}
          {iconBtn(openSection === "links", () => toggleSection("links"), FileText, "Reference Links")}
          {iconBtn(openSection === "upload", () => toggleSection("upload"), FileText, "Upload")}
          {iconBtn(openSection === "team", () => toggleSection("team"), Users, "Team Assignment")}
          <div className="ml-auto flex items-center gap-1.5 pl-2 border-l border-white/10">
            {/* Complete / Submit - green icon */}
            {isGatekeeper ? (
              <button
                type="button"
                disabled={isPending}
                onClick={approveWork}
                title={isLastStage ? "Complete (last stage)" : "Complete & advance to next stage"}
                className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isLastStage ? "bg-emerald-500 text-white" : "bg-brand-300 text-night-950"} hover:brightness-110`}
              >
                {isLastStage ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
              </button>
            ) : isSubmitted ? (
              <span title="Awaiting review" className="h-9 w-9 rounded-lg bg-violet-400/10 border border-violet-300/30 flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 text-violet-300" />
              </span>
            ) : (
              <button
                type="button"
                disabled={isPending}
                onClick={submitWork}
                title="Submit for Review"
                className="h-9 w-9 rounded-lg bg-brand-300 text-night-950 flex items-center justify-center shrink-0 hover:brightness-110"
              >
                <Check className="h-4 w-4" />
              </button>
            )}
            {(canManageTeam || isManagerRole(roleKey)) && (
              <button
                type="button"
                disabled={isPending}
                onClick={deleteTask}
                title="Delete Sub-Task"
                className="h-9 w-9 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0 hover:bg-rose-500/20"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Stage stepper - always visible */}
        <div className="px-4 py-2 border-b border-white/10 bg-white/[0.02]">
          <div className="flex flex-wrap items-center gap-1.5">
            {seq.length === 0 ? (
              <span className="text-xs text-slate-500">No stages — unassigned</span>
            ) : (
              seq.map((a, i) => {
                const done = i < step;
                const isActive = i === activeIdx;
                return (
                  <span key={a.id} className="flex items-center gap-1.5">
                    {i > 0 && <ArrowRight className="h-3 w-3 text-slate-600" />}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold border ${
                        isActive
                          ? "border-brand-300 bg-brand-300 text-night-950"
                          : done
                            ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-300"
                            : "border-white/10 bg-white/[0.03] text-slate-500"
                      }`}
                      title={`${i + 1}. ${a.name}`}
                    >
                      <span className="text-[10px] opacity-70">{i + 1}.</span>
                      <span className="max-w-[90px] truncate">{a.name}</span>
                      {done && <Check className="h-3 w-3" />}
                      {isActive && !done && !isLastStage && <ArrowRight className="h-3 w-3" />}
                      {isActive && isLastStage && <Check className="h-3 w-3" />}
                    </span>
                  </span>
                );
              })
            )}
          </div>
          {activeMember && (
            <p className="text-[11px] text-slate-500 mt-1">
              Current stage: <span className="text-brand-300 font-medium">{activeMember}</span> {isLastStage ? "· last stage" : `· stage ${activeIdx + 1} of ${seq.length}`}
            </p>
          )}
        </div>

        <div className="p-4 space-y-4 overflow-y-auto pb-28 md:pb-4">
          {/* Deadline */}
          {openSection === "deadline" && (
            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-brand-300" /> Deadline
              </p>
              {canEditDeadline ? (
                <>
                  <DatePicker value={deadlineDraft} onChange={persistDeadline} placeholder="Set a deadline…" />
                  {siblingCount > 1 && (
                    <label className="flex items-center gap-2 mt-2 text-xs text-slate-400 cursor-pointer">
                      <input type="checkbox" checked={bulkDeadline} onChange={(e) => setBulkDeadline(e.target.checked)} className="h-3.5 w-3.5 accent-brand-300" />
                      Apply to all {siblingCount} subtasks in this project
                    </label>
                  )}
                  <button type="button" disabled={isPending} onClick={saveBulkDeadline} className="btn-primary w-full mt-2 !py-2 text-sm">
                    <Save className="h-4 w-4" /> Save Deadline {bulkDeadline && siblingCount > 1 ? `for ${siblingCount} tasks` : ""}
                  </button>
                </>
              ) : (
                <p className="text-sm text-slate-200 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">{fmtDate(task.due_date)}</p>
              )}
              {isOverdue(task) && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2">
                  <AlertTriangle className="h-4 w-4 text-rose-300 shrink-0" />
                  <p className="text-xs text-rose-200">Overdue — auto-flagged as <span className="font-semibold">Urgent</span>.</p>
                </div>
              )}
            </section>
          )}

          {/* Task Title */}
          {openSection === "title" && (
            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-brand-300" /> Task Title
              </p>
              {canEditTitle ? (
                <>
                  <input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} placeholder="Task title…" className="input !py-2.5 text-sm w-full" />
                  <button type="button" disabled={isPending} onClick={() => persistTitle(false)} className="btn-primary w-full mt-2 !py-2 text-sm">
                    <Save className="h-4 w-4" /> Save Title
                  </button>
                </>
              ) : (
                <p className="text-sm text-slate-200 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 break-words">{titleDraft || "Untitled task"}</p>
              )}
            </section>
          )}

          {/* Priority */}
          {openSection === "priority" && (
            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Flag className="h-3.5 w-3.5 text-brand-300" /> Priority
              </p>
              {canEditDeadline ? (
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
              ) : (
                <PriorityBadge priority={priorityDraft} />
              )}
            </section>
          )}

          {/* Content / Copy */}
          {openSection === "content" && (
            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Content / Copy</p>
              {canEditContent ? (
                <>
                  <textarea value={contentDraft} onChange={(e) => setContentDraft(e.target.value)} rows={4} placeholder="Draft the content / copy for this task…" className="input !py-2.5 text-sm resize-none" />
                  <button type="button" disabled={isPending} onClick={() => persistContent(false)} className="btn-primary w-full mt-2 !py-2 text-sm">
                    <Save className="h-4 w-4" /> Save Content
                  </button>
                </>
              ) : contentDraft ? (
                <p className="text-sm text-slate-300 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 whitespace-pre-wrap break-words">{contentDraft}</p>
              ) : (
                <p className="text-xs text-slate-500">No content written yet.</p>
              )}
            </section>
          )}

          {/* Remarks / Feedback */}
          {openSection === "remarks" && (
            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Remarks / Feedback</p>
              <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} placeholder="Notes, feedback or handoff context…" className="input !py-2.5 text-sm resize-none" />
              <button type="button" disabled={isPending} onClick={() => persistRemarks(false)} className="btn-primary w-full mt-2 !py-2 text-sm">
                <Save className="h-4 w-4" /> Save Remarks
              </button>
              <p className="text-xs text-slate-400 truncate mt-1.5">
                {editedBy ? (
                  <>Last updated by: <span className="text-slate-200 font-medium">{editedBy.name.split(" ")[0] || editedBy.name}</span> ({editedBy.role}) at <span className="text-slate-300">{fmtTimeOnly(editedBy.at)}</span></>
                ) : (
                  <>Auto-saves as you type</>
                )}
              </p>
              {(task as any).client_feedback && <div className="mt-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2"><p className="text-[11px] font-semibold text-amber-300">Client Feedback</p><p className="text-xs text-amber-100 mt-1 whitespace-pre-wrap">{(task as any).client_feedback}</p></div>}
              <div className="mt-3 p-3 rounded-lg border border-white/10 bg-white/[0.02]">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Client Feedback (SMM → Designer)</p>
                <textarea value={clientFeedback} onChange={e=>setClientFeedback(e.target.value)} rows={2} placeholder="Client ne su kidhu te lakho..." className="input !py-2 text-xs resize-none" />
                <button type="button" disabled={isPending} onClick={sendBackClient} className="btn-ghost w-full mt-2 !py-1.5 text-xs border border-amber-400/30 text-amber-300"><Undo2 className="h-3.5 w-3.5" /> Send Back with Client Feedback</button>
              </div>
            </section>
          )}

          {openSection === "links" && (
            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Reference Links / Google Drive</p>
              <p className="text-[11px] text-slate-500 mb-2">Paste reference URLs, Drive links – one per line.</p>
              <textarea value={referenceLinks} onChange={e=>setReferenceLinks(e.target.value)} rows={3} placeholder="https://drive.google.com/...&#10;https://reference-link.com/..." className="input !py-2.5 text-sm resize-none" />
              <button type="button" disabled={isPending} onClick={()=>persistLinks(false)} className="btn-primary w-full mt-2 !py-2 text-sm"><Save className="h-4 w-4" /> Save Links</button>
              {referenceLinks.trim() && <div className="mt-2 space-y-1">{referenceLinks.split("\n").filter(Boolean).map((l: string,i: number)=><a key={i} href={l.trim()} target="_blank" rel="noopener noreferrer" className="block text-xs text-brand-300 hover:text-brand-200 truncate underline">{l.trim()}</a>)}</div>}
            </section>
          )}

          {openSection === "upload" && (
            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Uploaded Platforms</p>
              <div className="grid grid-cols-2 gap-2">
                {["Instagram","Facebook","YouTube","LinkedIn","Twitter/X","Pinterest","Threads","Website"].map((pl: string)=>(
                  <label key={pl} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs cursor-pointer ${platformsDraft.includes(pl) ? "border-brand-300 bg-brand-300/10 text-brand-300" : "border-white/10 bg-white/[0.02] text-slate-400"}`}>
                    <input type="checkbox" checked={platformsDraft.includes(pl)} onChange={()=>togglePlatform(pl)} className="h-3.5 w-3.5 accent-brand-300" />
                    {pl}
                  </label>
                ))}
              </div>
              <button type="button" disabled={isPending} onClick={markUploaded} className="btn-primary w-full mt-3 !py-2 text-sm"><Check className="h-4 w-4" /> Mark as Uploaded</button>
              {task.platforms?.length ? <p className="text-[11px] text-slate-500 mt-2">Current: {task.platforms.join(", ")}</p> : null}
              {task.status === "approved" && <button type="button" disabled={isPending} onClick={startTask} className="btn-ghost w-full mt-2 !py-2 text-sm"><Layers className="h-4 w-4" /> Start Task</button>}
            </section>
          )}

          {/* Team Assignment */}
          {openSection === "team" && (
            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-brand-300" /> Team Assignment
              </p>
              <div className="mb-2 flex items-center gap-2 rounded-lg border border-brand-300/40 bg-brand-300/10 px-3 py-2">
                <Users className="h-4 w-4 text-brand-300 shrink-0" />
                <span className="text-sm text-slate-200">
                  Current Stage: <span className="font-semibold text-brand-300">{activeMember || "Unassigned"}</span>
                </span>
              </div>
              {canManageTeam && (
                <>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {teamDraft.length === 0 && <span className="text-xs text-slate-500">No members assigned.</span>}
                    {teamDraft.map((id) => {
                      const m = team.find((u) => u.id === id);
                      if (seq.some((s) => s.id === id)) return null;
                      return (
                        <span key={id} className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/10 pl-0.5 pr-1.5 py-0.5">
                          <span className="h-5 w-5 rounded-full bg-brand-300/15 flex items-center justify-center text-[8px] font-bold text-brand-300">{initials(m?.full_name)}</span>
                          <span className="text-xs text-slate-200 max-w-[90px] truncate">{m?.full_name || "?"}</span>
                          <button type="button" onClick={() => toggleMember(id)} className="text-slate-400 hover:text-rose-300 ml-0.5">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                  <button type="button" onClick={() => setTeamOpen((v) => !v)} className="w-full flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06]">
                    <span className="flex items-center gap-2"><Plus className="h-4 w-4 text-brand-300" /> Add member</span>
                    {teamOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  {teamOpen && (
                    <div className="mt-1.5 rounded-lg border border-white/10 bg-night-900 max-h-44 overflow-y-auto">
                      {team.filter((u) => u.is_active).map((u) => {
                        const on = teamDraft.includes(u.id);
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => toggleMember(u.id)}
                            className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm ${on ? "bg-brand-300/10 text-brand-200" : "text-slate-300 hover:bg-white/[0.06]"}`}
                          >
                            <span className="h-5 w-5 rounded-full bg-brand-300/15 flex items-center justify-center text-[8px] font-bold text-brand-300">{initials(u.full_name)}</span>
                            <span className="flex-1 text-left truncate">{u.full_name}</span>
                            <span className="text-xs text-slate-500">{u.role_label}</span>
                            {on && <Check className="h-4 w-4 text-brand-300" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <button type="button" disabled={isPending} onClick={saveTeam} className="btn-primary w-full mt-2 !py-2.5 text-sm">
                    Save Team
                  </button>
                </>
              )}
            </section>
          )}

          {/* Send Back - always visible for gatekeeper when submitted */}
          {isGatekeeper && isSubmitted && (
            <div className="flex justify-end">
              <button type="button" disabled={isPending} onClick={sendBack} className="btn-ghost text-sm !px-3 !py-2">
                <Undo2 className="h-4 w-4" /> Send Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
