"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, CalendarRange, ClipboardCheck, Wand2 } from "lucide-react";
import {
  generateCopyAction,
  summarizeBriefAction,
  reviewContentAction,
  estimateDeadlinesAction,
  approveAllBriefsAction,
} from "@/lib/actions/projects";
import { useToast } from "@/components/Toast";

function AiToggle({ spinning, label }: { spinning: boolean; label: string }) {
  return (
    <>
      {spinning ? (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-300 border-t-transparent" />
      ) : (
        <Sparkles className="h-3 w-3 text-brand-300" />
      )}
      {spinning ? "Thinking…" : label}
    </>
  );
}

/** AI copy generation — one click fills the current task's content with a draft. */
export function GenerateCopyButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await generateCopyAction(taskId);
          if (res.error) toast(res.error, "error");
          else {
            toast("AI draft ready in the editor — refine it, then submit.", "success");
            if (res.draft) toast(res.draft.slice(0, 160) + (res.draft.length > 160 ? "…" : ""), "info");
          }
          router.refresh();
        })
      }
      className="btn-secondary !py-1 text-[11px]"
      title="Generate a draft with AI"
    >
      <AiToggle spinning={pending} label="AI draft" />
    </button>
  );
}

/** AI brief summarizer — converts a raw brief into a structured summary. */
export function SummarizeBriefButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await summarizeBriefAction(taskId);
          if (res.error) toast(res.error, "error");
          else toast("Brief summarized — the team now reads a structured brief.", "success");
          router.refresh();
        })
      }
      className="btn-secondary !py-1 text-[11px]"
      title="Structured summary of the brief"
    >
      <AiToggle spinning={pending} label="Summarize brief" />
    </button>
  );
}

/** AI content review — instant QA check of a submitted draft (read-only). */
export function ReviewContentButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await reviewContentAction(taskId);
          if (res.error) toast(res.error, "error");
          else {
            toast("AI reviewed the draft:", "info");
            if (res.report) toast(res.report.slice(0, 300) + (res.report.length > 300 ? "…" : ""), "info");
          }
          router.refresh();
        })
      }
      className="btn-secondary !py-1 text-[11px]"
      title="AI QA check"
    >
      <AiToggle spinning={pending} label="AI review" />
    </button>
  );
}

/** Smart deadline estimation — schedules every open task via learned durations. */
export function EstimateDeadlinesButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await estimateDeadlinesAction(projectId);
          if (res.error) toast(res.error, "error");
          else toast(`${res.scheduled ?? 0} task deadline${res.scheduled === 1 ? "" : "s"} estimated from historical team velocity.`, "success");
          router.refresh();
        })
      }
      className="btn-secondary !py-1 text-[11px]"
      title="Estimate deadlines from historical velocity"
    >
      {pending ? (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-300 border-t-transparent" />
      ) : (
        <CalendarRange className="h-3 w-3 text-brand-300" />
      )}
      {pending ? "Estimating…" : "Estimate deadlines"}
    </button>
  );
}

/** Small inline hint showing what a given AI feature does (used in headers). */
export function AiHint({ text }: { text: string }) {
  return (
    <span className="text-[10px] text-slate-500 flex items-center gap-1">
      <Wand2 className="h-3 w-3 text-brand-300/70" />
      {text}
    </span>
  );
}

/** Approve All — bulk-approve every pending brief of a project (PM/Admin only). */
export function ApproveAllButton({
  projectId,
  pendingCount,
}: {
  projectId: string;
  pendingCount: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending || pendingCount === 0}
      onClick={() =>
        start(async () => {
          const res = await approveAllBriefsAction(projectId);
          if (res.error) toast(res.error, "error");
          else toast(`${res.approved ?? 0} brief${res.approved === 1 ? "" : "s"} approved — sequences kicked off.`, "success");
          router.refresh();
        })
      }
      className="btn-secondary !py-1 text-[11px]"
      title="Approves every pending brief in this project at once"
    >
      {pending ? (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-300 border-t-transparent" />
      ) : (
        <ClipboardCheck className="h-3 w-3 text-brand-300" />
      )}
      {pending ? "Approving…" : pendingCount > 0 ? `Approve all (${pendingCount})` : "Approve all"}
    </button>
  );
}