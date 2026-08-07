"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Save, CheckCircle2, Undo2, Upload, Users, MessageSquare } from "lucide-react";
import {
  startTaskAction,
  submitTaskAction,
  reviewTaskAction,
  clientFeedbackAction,
  approveClientAction,
  startUploadTaskAction,
  completeTaskWithPlatformsAction,
  updateTaskContentAction,
} from "@/lib/actions/projects";
import type { Task } from "@/lib/types";
import { PLATFORMS } from "@/components/ui";

export function ContentEditor({ task, roleKey }: { task: Task; roleKey: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState(task.content || "");
  const [saved, setSaved] = useState(false);

  const isWriter = roleKey === "WRITER" || roleKey === "SUPER_ADMIN";
  const canEdit =
    task.role_key === "WRITER" &&
    task.deliverable_id &&
    ["in_progress", "needs_improvement"].includes(task.status);

  if (!isWriter || !canEdit) return null;

  function save() {
    start(async () => {
      const res = await updateTaskContentAction(task.id, draft);
      if (res.error) alert(res.error);
      else { setSaved(true); router.refresh(); setTimeout(() => setSaved(false), 2000); }
    });
  }

  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Copy & Script Draft</p>
        {saved && <span className="text-[10px] text-emerald-600">Saved</span>}
      </div>
      <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} className="input text-xs" placeholder="Draft the captions, copy and script…" />
      <button className="btn-secondary !py-1 text-[11px] mt-1.5" onClick={save} disabled={pending}>
        <Save className="h-3 w-3" /> {pending ? "Saving…" : "Save draft"}
      </button>
    </div>
  );
}

/** Reviewer feedback inline form for submitted tasks. */
export function ReviewPanel({ task }: { task: Task }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [comment, setComment] = useState("");

  const isVisual = task.sequence === 2 && (task.role_key === "DESIGNER" || task.role_key === "EDITOR");

  function run(decision: "needs_improvement" | "final" | "approve") {
    start(async () => {
      const res = await reviewTaskAction(task.id, decision, comment);
      if (res.error) alert(res.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2">
      <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Review</p>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} className="input text-xs" placeholder="Feedback for the assignee (required for Needs Improvement)…" />
      <div className="flex items-center gap-1.5 flex-wrap">
        <button className="btn-secondary !py-1 text-[11px]" onClick={() => run("needs_improvement")} disabled={pending}>
          <Undo2 className="h-3 w-3" /> Needs Improvement
        </button>
        {isVisual ? (
          <button className="btn-primary !py-1 text-[11px]" onClick={() => run("approve")} disabled={pending}>
            <Users className="h-3 w-3" /> Approve → Client
          </button>
        ) : (
          <button className="btn-primary !py-1 text-[11px]" onClick={() => run("final")} disabled={pending}>
            <CheckCircle2 className="h-3 w-3" /> Final
          </button>
        )}
      </div>
    </div>
  );
}

/** SMM captures client feedback on a visual task and routes it back to the designer. */
export function ClientFeedbackPanel({ task }: { task: Task }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [feedback, setFeedback] = useState("");

  function send() {
    start(async () => {
      const res = await clientFeedbackAction(task.id, feedback);
      if (res.error) alert(res.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2">
      <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Client Review</p>
      <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={2} className="input text-xs" placeholder="Client's feedback / requested changes…" />
      <div className="flex items-center gap-1.5 flex-wrap">
        <button className="btn-secondary !py-1 text-[11px]" onClick={send} disabled={pending}>
          <MessageSquare className="h-3 w-3" /> Send Feedback to Designer
        </button>
        <button className="btn-primary !py-1 text-[11px]" onClick={() => { start(async () => { const res = await approveClientAction(task.id); if (res.error) alert(res.error); router.refresh(); }); }} disabled={pending}>
          <CheckCircle2 className="h-3 w-3" /> Client Approved
        </button>
      </div>
    </div>
  );
}

/** SMM publishing: complete with platform selection. */
export function PublishPanel({ task }: { task: Task }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<string[]>(task.platforms || []);

  function toggle(key: string) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function complete() {
    start(async () => {
      const res = await completeTaskWithPlatformsAction(task.id, selected);
      if (res.error) alert(res.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2">
      <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Publish</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        {PLATFORMS.map((p) => (
          <button
            key={p.key}
            onClick={() => toggle(p.key)}
            className={`badge cursor-pointer transition-colors ${selected.includes(p.key) ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500"}`}
          >
            {p.icon} {p.label}
          </button>
        ))}
      </div>
      <button className="btn-primary !py-1 text-[11px]" onClick={complete} disabled={pending || selected.length === 0}>
        <Upload className="h-3 w-3" /> {pending ? "Publishing…" : "Mark Published"}
      </button>
    </div>
  );
}

/** Role/status-aware action buttons for a task. */
export function TaskActions({ task, roleKey, userId }: { task: Task; roleKey: string; userId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const isReviewer = roleKey === "PROJECT_MANAGER" || roleKey === "SUPER_ADMIN";
  const isSmm = roleKey === "SMM";
  const isAssignee = task.assigned_to === userId;

  function run(fn: () => Promise<{ ok?: boolean; error?: string }>) {
    start(async () => {
      const res = await fn();
      if (res.error) alert(res.error);
      router.refresh();
    });
  }

  // Reviewer panel for submitted tasks.
  if (task.status === "submitted" && isReviewer) {
    return <ReviewPanel task={task} />;
  }

  // SMM stage: client review -> approve or route feedback; client_approved -> uploading; uploading -> publish.
  if (isSmm) {
    if (task.status === "client_review") {
      return <ClientFeedbackPanel task={task} />;
    }
    if (task.status === "client_approved") {
      return (
        <button className="btn-secondary !py-1 !px-2 text-[11px]" onClick={() => run(() => startUploadTaskAction(task.id))} disabled={pending}>
          <Upload className="h-3 w-3" /> Start Upload
        </button>
      );
    }
    if (task.status === "uploading") {
      return <PublishPanel task={task} />;
    }
  }

  // Assignee actions.
  if (isAssignee && task.status === "pending") {
    return (
      <button className="btn-primary !py-1 !px-2 text-[11px]" onClick={() => run(() => startTaskAction(task.id))} disabled={pending}>
        Start <ArrowRight className="h-3 w-3" />
      </button>
    );
  }
  if (isAssignee && ["in_progress", "needs_improvement", "client_feedback"].includes(task.status)) {
    return (
      <button className="btn-secondary !py-1 !px-2 text-[11px]" onClick={() => run(() => submitTaskAction(task.id))} disabled={pending}>
        <ArrowRight className="h-3 w-3" /> Submit for Review
      </button>
    );
  }

  return null;
}
