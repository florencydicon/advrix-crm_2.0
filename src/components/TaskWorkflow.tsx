"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Save, CheckCircle2, Undo2, Upload, Users, MessageSquare, PenLine, Eye, ClipboardList, FileText, Loader2 } from "lucide-react";
import {
  startTaskAction,
  submitTaskAction,
  reviewTaskAction,
  clientFeedbackAction,
  approveClientAction,
  completeTaskWithPlatformsAction,
  updateTaskContentAction,
} from "@/lib/actions/projects";
import type { Task } from "@/lib/types";
import { useToast } from "@/components/Toast";
import { PLATFORMS } from "@/components/ui";

const EDITABLE_STATUSES = ["in_progress", "needs_improvement", "client_feedback"];
const CONTENT_ROLES = ["WRITER", "DESIGNER"];

/**
 * Read-only content preview. Shown for completed tasks, and inside review /
 * pipeline views so the actual copy/notes are never hidden.
 */
export function TaskContent({ task, className = "" }: { task: Task; className?: string }) {
  const isWriter = task.role_key === "WRITER";
  const label = isWriter ? "Final copy & script" : "Delivered work / asset notes";
  return (
    <div className={`rounded-xl border border-white/10 bg-night-850 p-3 ${className}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Eye className="h-3.5 w-3.5 text-slate-500" />
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-sm text-slate-200 whitespace-pre-wrap">{task.content || "—"}</p>
    </div>
  );
}

const REVIEWER_ROLES = ["PROJECT_MANAGER", "SUPER_ADMIN"];

/**
 * Standardized accordion body used by every task row across the app (staff
 * dashboards, project pipeline, SMM workspace). Includes the inline editor,
 * approved-copy reference, delivered work, review notes and client feedback,
 * plus the reviewer panel for submitted work.
 */
export function TaskDetails({
  task,
  roleKey,
  userId,
}: {
  task: Task;
  roleKey: string;
  userId: string;
}) {
  const reviewable = task.status === "submitted" && REVIEWER_ROLES.includes(roleKey);
  const showContent =
    task.content &&
    !EDITABLE_STATUSES.includes(task.status) &&
    !(reviewable && task.status === "submitted");

  return (
    <div className="space-y-2">
      {task.remarks && (
        <div className="rounded-lg border border-violet-400/20 bg-violet-400/[0.06] p-2 text-xs">
          <p className="text-[10px] font-semibold text-violet-300 uppercase tracking-wide">Remarks / Brief</p>
          <p className="text-slate-300 mt-0.5 whitespace-pre-wrap">{task.remarks}</p>
        </div>
      )}
      <ContentEditor task={task} roleKey={roleKey} userId={userId} />
      {task.brief_copy && (task.role_key === "DESIGNER" || task.role_key === "EDITOR" || task.role_key === "VIDEOGRAPHER") && (
        <div className="rounded-lg border border-brand-300/30 bg-brand-300/[0.07] p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <FileText className="h-3.5 w-3.5 text-brand-300" />
            <p className="text-[11px] font-semibold text-brand-300 uppercase tracking-wide">
              Sub Task — {task.title.replace(/\s*[—–-]\s*Visual\s*$/i, "").trim()} Content Reference
            </p>
          </div>
          <p className="text-[10px] text-slate-500 mb-1">Approved copy from the content writer — use as reference.</p>
          <p className="text-xs text-slate-300 whitespace-pre-wrap">{task.brief_copy}</p>
        </div>
      )}
      {showContent && <TaskContent task={task} />}
      {reviewable && <ReviewPanel task={task} />}
      {task.review_comment && (
        <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-2 text-xs">
          <p className="text-[10px] font-semibold text-amber-300 uppercase tracking-wide">Review note</p>
          <p className="text-slate-300 mt-0.5">{task.review_comment}</p>
        </div>
      )}
      {task.client_feedback && (
        <div className="rounded-lg border border-sky-400/20 bg-sky-400/[0.06] p-2 text-xs">
          <p className="text-[10px] font-semibold text-sky-300 uppercase tracking-wide">Client feedback</p>
          <p className="text-slate-300 mt-0.5">{task.client_feedback}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Content input for the assignee. Shown once a task is in an editable state
 * (in_progress / needs_improvement / client_feedback). Clicking "Submit for
 * Review" saves the draft AND submits in a single action — no separate Save
 * click required.
 */
export function ContentEditor({ task, roleKey, userId }: { task: Task; roleKey: string; userId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { toast } = useToast();
  const [draft, setDraft] = useState(task.content || "");
  const [saved, setSaved] = useState(false);

  const isProducer = task.role_key === "WRITER" || task.role_key === "DESIGNER" || task.role_key === "EDITOR" || task.role_key === "VIDEOGRAPHER";
  const canManage = roleKey === "SUPER_ADMIN" || roleKey === "PROJECT_MANAGER";
  const isAssignee =
    task.assigned_to === userId ||
    (Array.isArray(task.assignees) && task.assignees.some((a: any) => a.id === userId)) ||
    task.assigned_to === null;
  const editable =
    isProducer &&
    (isAssignee || canManage) &&
    EDITABLE_STATUSES.includes(task.status);

  if (!editable) return null;

  const isWriter = task.role_key === "WRITER";
  const isVisual = task.role_key === "DESIGNER" || task.role_key === "EDITOR" || task.role_key === "VIDEOGRAPHER";
  const isContentRole = CONTENT_ROLES.includes(task.role_key);
  const hasDraft = draft.trim().length > 0;

  function save() {
    start(async () => {
      const res = await updateTaskContentAction(task.id, draft);
      if (res.error) toast(res.error, "error");
      else { setSaved(true); router.refresh(); setTimeout(() => setSaved(false), 2000); }
    });
  }

  function submit() {
    start(async () => {
      const res = await submitTaskAction(task.id, draft);
      if (res.error) toast(res.error, "error");
      router.refresh();
    });
  }

  // Non-content roles (EDITOR, VIDEOGRAPHER): simplified panel — no copywriting Description block.
  if (!isContentRole) {
    return (
      <div className="space-y-2">
        {task.brief_copy && (
          <div className="rounded-lg border border-brand-300/30 bg-brand-300/[0.07] p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <FileText className="h-3.5 w-3.5 text-brand-300" />
              <p className="text-[11px] font-semibold text-brand-300 uppercase tracking-wide">
                Approved copy — reference
              </p>
            </div>
            <p className="text-[10px] text-slate-500 mb-1">Approved copy from the content team — use as reference.</p>
            <p className="text-xs text-slate-300 whitespace-pre-wrap">{task.brief_copy}</p>
          </div>
        )}

        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Asset Notes / Links</p>
            {saved && <span className="text-[10px] text-emerald-400">Saved</span>}
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="input text-xs"
            placeholder="Paste design/video file links, or add asset notes…"
          />
          <div className="flex items-center gap-1.5 flex-wrap">
            <button className="btn-secondary !py-1 text-[11px]" onClick={save} disabled={pending}>
              <Save className="h-3 w-3" /> {pending ? "Saving…" : "Save draft"}
            </button>
            <button
              className="btn-primary !py-1 text-[11px]"
              onClick={submit}
              disabled={pending || !hasDraft}
              title={hasDraft ? undefined : "Add your work before submitting."}
            >
              {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />}
              {pending ? "Submitting…" : "Submit for Review"}
            </button>
          </div>
          {!hasDraft && (
            <p className="text-[10px] text-slate-500">Add your work, then submit.</p>
          )}
        </div>
      </div>
    );
  }

  // Content roles (WRITER, DESIGNER): full content editor.
  return (
    <div className="space-y-2">
      {/* Approved copy reference for the design/editing team */}
      {isVisual && !isWriter && task.brief_copy && (
        <div className="rounded-lg border border-brand-300/30 bg-brand-300/[0.07] p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <FileText className="h-3.5 w-3.5 text-brand-300" />
            <p className="text-[11px] font-semibold text-brand-300 uppercase tracking-wide">Approved copy — reference for design</p>
          </div>
          <p className="text-xs text-slate-300 whitespace-pre-wrap">{task.brief_copy}</p>
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2 space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
            {isWriter ? "Copy & Script Draft" : "Asset Remarks / Links"}
          </p>
          {saved && <span className="text-[10px] text-emerald-400">Saved</span>}
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          className="input text-xs"
          placeholder={
            isWriter
              ? "Draft the captions, copy and script…"
              : "Add your remarks, asset notes, or paste the design / video file link…"
          }
        />
        <div className="flex items-center gap-1.5 flex-wrap">
          <button className="btn-secondary !py-1 text-[11px]" onClick={save} disabled={pending}>
            <Save className="h-3 w-3" /> {pending ? "Saving…" : "Save draft"}
          </button>
          <button
            className="btn-primary !py-1 text-[11px]"
            onClick={submit}
            disabled={pending || !hasDraft}
            title={hasDraft ? undefined : "Add your work before submitting."}
          >
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />}
            {pending ? "Submitting…" : "Submit for Review"}
          </button>
        </div>
        {!hasDraft && (
          <p className="text-[10px] text-slate-500">Add your work, then submit — it is saved automatically.</p>
        )}
      </div>
    </div>
  );
}

/** Reviewer feedback inline form for submitted tasks. */
export function ReviewPanel({ task }: { task: Task }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { toast } = useToast();
  const [comment, setComment] = useState("");
  const [decision, setDecision] = useState<"needs_improvement" | "final" | "approve" | null>(null);

  const isVisual = task.step_key?.includes("_v_") || task.role_key === "DESIGNER" || task.role_key === "EDITOR" || task.role_key === "VIDEOGRAPHER";
  const isWriter = task.role_key === "WRITER";

  function decide(choice: "needs_improvement" | "final" | "approve") {
    if (choice === "needs_improvement" && comment.trim().length < 5) {
      toast("Please provide specific feedback for the improvement.", "error");
      return;
    }
    setDecision(choice);
    start(async () => {
      const res = await reviewTaskAction(task.id, choice, comment);
      if (res.error) toast(res.error, "error");
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-violet-400/20 bg-night-850 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-violet-400/[0.06] border-b border-violet-400/20">
        <CheckCircle2 className="h-3.5 w-3.5 text-violet-300" />
        <p className="text-[11px] font-semibold text-violet-300 uppercase tracking-wide">Review submitted work</p>
      </div>

      <div className="p-3 space-y-2">
        <TaskContent task={task} />

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2 space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
            <MessageSquare className="h-3 w-3" /> Feedback / comment
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="input text-xs"
            placeholder="Comments for the assignee (required for Needs Improvement)…"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button className="btn-secondary !py-1 text-[11px]" onClick={() => decide("needs_improvement")} disabled={pending}>
            {pending && decision === "needs_improvement" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
            {pending && decision === "needs_improvement" ? "Sending…" : "Needs Improvement"}
          </button>
          {isVisual ? (
            <button className="btn-primary !py-1 text-[11px]" onClick={() => decide("approve")} disabled={pending}>
              {pending && decision === "approve" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Users className="h-3 w-3" />}
              {pending && decision === "approve" ? "Sending…" : "Approve → Client"}
            </button>
          ) : (
            <button className="btn-primary !py-1 text-[11px]" onClick={() => decide("final")} disabled={pending}>
              {pending && decision === "final" ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              {pending && decision === "final" ? "Sending…" : "Approve / Final"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** SMM captures client feedback on a visual task and routes it back to the designer. */
export function ClientFeedbackPanel({ task }: { task: Task }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { toast } = useToast();
  const [feedback, setFeedback] = useState("");

  function send() {
    start(async () => {
      const res = await clientFeedbackAction(task.id, feedback);
      if (res.error) toast(res.error, "error");
      router.refresh();
    });
  }

  function approve() {
    start(async () => {
      const res = await approveClientAction(task.id);
      if (res.error) toast(res.error, "error");
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-sky-400/20 bg-night-850 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-sky-400/[0.06] border-b border-sky-400/20">
        <Users className="h-3.5 w-3.5 text-sky-300" />
        <p className="text-[11px] font-semibold text-sky-300 uppercase tracking-wide">Client review</p>
      </div>
      <div className="p-3 space-y-2">
        <TaskContent task={task} />
        <p className="text-xs text-slate-400">
          Take this deliverable to the client. If they approve it, the task moves to <b>Uploading</b> automatically.
        </p>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={2}
          className="input text-xs"
          placeholder="Client's feedback / requested changes (required to send back)…"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <button className="btn-secondary !py-1 text-[11px]" onClick={send} disabled={pending || !feedback.trim()}>
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageSquare className="h-3 w-3" />}
            Send Feedback to Designer
          </button>
          <button className="btn-primary !py-1 text-[11px]" onClick={approve} disabled={pending}>
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
            Client Approved → Upload
          </button>
        </div>
      </div>
    </div>
  );
}

/** SMM publishing: auto-shifted to uploading after client approval. */
export function PublishPanel({ task }: { task: Task }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string[]>(task.platforms || []);

  function toggle(key: string) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function complete() {
    start(async () => {
      const res = await completeTaskWithPlatformsAction(task.id, selected);
      if (res.error) toast(res.error, "error");
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-brand-300/30 bg-night-850 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-brand-300/[0.07] border-b border-brand-300/30">
        <Upload className="h-3.5 w-3.5 text-brand-300" />
        <p className="text-[11px] font-semibold text-brand-300 uppercase tracking-wide">Uploading</p>
        <span className="badge bg-brand-300/10 text-brand-300 ml-auto">Client approved</span>
      </div>
      <div className="p-3 space-y-2">
        <TaskContent task={task} />
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 uppercase tracking-wide mb-1.5">
            <ClipboardList className="h-3 w-3" /> Publish to platforms
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PLATFORMS.map((p) => (
              <button
                key={p.key}
                onClick={() => toggle(p.key)}
                className={`badge cursor-pointer transition-colors ${selected.includes(p.key) ? "bg-brand-300/10 text-brand-300 border border-brand-300/30" : "bg-white/10 text-slate-400 hover:bg-white/15"}`}
              >
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        </div>
        <button className="btn-primary !py-1.5 text-[11px] w-full" onClick={complete} disabled={pending || selected.length === 0}>
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
          {pending ? "Publishing…" : "Mark Published → Upload Done"}
        </button>
      </div>
    </div>
  );
}

/**
 * Role/status-aware action buttons for a task.
 * - Assignee on a pending task: "Start" → opens the content editor inline.
 * - Assignee on an editable task: "Draft & Submit" → opens the content editor inline.
 * - Reviewer on a submitted task: ReviewPanel.
 * - SMM: client review → auto-uploading → publish/complete.
 */
export function TaskActions({
  task,
  roleKey,
  userId,
  onExpand,
}: {
  task: Task;
  roleKey: string;
  userId: string;
  onExpand?: (taskId: string) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { toast } = useToast();

  const isReviewer = roleKey === "PROJECT_MANAGER" || roleKey === "SUPER_ADMIN";
  const isSmm = roleKey === "SMM";
  const isAssignee =
    task.assigned_to === userId ||
    (Array.isArray(task.assignees) && task.assignees.some((a: any) => a.id === userId)) ||
    (task.assigned_to === null && task.status === "pending");
  const isProducer = task.role_key === "WRITER" || task.role_key === "DESIGNER" || task.role_key === "EDITOR" || task.role_key === "VIDEOGRAPHER";

  function run(fn: () => Promise<{ ok?: boolean; error?: string }>, expand = false) {
    start(async () => {
      const res = await fn();
      if (res.error) toast(res.error, "error");
      else if (expand) onExpand?.(task.id);
      router.refresh();
    });
  }

  // Reviewer panel for submitted tasks.
  if (task.status === "submitted" && isReviewer) {
    return <ReviewPanel task={task} />;
  }

  // // Completed tasks: read-only view is opened via the row accordion.
  if (task.status === "completed") {
    return null;
  }

  // SMM stage: client review -> uploading (auto after client approval) -> publish.
  if (isSmm) {
    if (task.status === "client_review") {
      return <ClientFeedbackPanel task={task} />;
    }
    if (task.status === "uploading") {
      return <PublishPanel task={task} />;
    }
    if (task.status === "client_approved") {
      // Legacy rows caught mid-flow: auto-shift them to uploading.
      return (
        <button className="btn-secondary !py-1 !px-2 text-[11px]" onClick={() => run(() => approveClientAction(task.id))} disabled={pending}>
          <Upload className="h-3 w-3" /> Shift to Uploading
        </button>
      );
    }
  }

  // Assignee: start or continue work — opens the content editor inline.
  if (isAssignee && isProducer && (task.status === "pending" || EDITABLE_STATUSES.includes(task.status))) {
    if (task.status === "pending") {
      return (
        <button className="btn-primary !py-1 !px-2 text-[11px]" onClick={() => run(() => startTaskAction(task.id), true)} disabled={pending}>
          Start <ArrowRight className="h-3 w-3" />
        </button>
      );
    }
    return (
      <button className="btn-secondary !py-1 !px-2 text-[11px]" onClick={() => onExpand?.(task.id)} disabled={pending}>
        <PenLine className="h-3 w-3" /> Draft & Submit
      </button>
    );
  }

  return null;
}
