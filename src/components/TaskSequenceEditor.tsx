"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown, Check, X, ClipboardList, Loader2, Users } from "lucide-react";
import type { Task } from "@/lib/types";
import { setTaskSequenceAction, approveTaskBriefAction, rejectTaskBriefAction } from "@/lib/actions/projects";
import { useToast } from "@/components/Toast";

const initials = (name: string) =>
  (name || "")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/**
 * Step 3 — Team Allotment per task. Lets the PM set the EXACT ordered sequence
 * of project members who work on a unified task. The first member starts, each
 * approval hands off to the next, and the task auto-completes at the end.
 */
export function TaskSequenceEditor({
  task,
  available,
}: {
  task: Task;
  available: { id: string; name: string; role_label?: string | null }[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [order, setOrder] = useState<string[]>(() =>
    (task.assignees || [])
      .map((a) => a.id)
      .filter((id) => available.some((a) => a.id === id))
  );

  function toggle(id: string) {
    setOrder((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function move(index: number, dir: -1 | 1) {
    setOrder((prev) => {
      const j = index + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }
  function save() {
    start(async () => {
      const res = await setTaskSequenceAction(task.id, order);
      if (res.error) toast(res.error, "error");
      else toast("Sequence saved — the task now flows member to member.", "success");
      router.refresh();
    });
  }

  const memberOf = (id: string) => available.find((a) => a.id === id);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2 space-y-2">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1">
        <Users className="h-3 w-3" /> Team sequence — order the members who work on this task
      </p>
      <div className="flex flex-wrap gap-1.5">
        {available.map((a) => {
          const selected = order.includes(a.id);
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => toggle(a.id)}
              className={`badge cursor-pointer transition-colors ${
                selected
                  ? "bg-brand-300/15 text-brand-200 border border-brand-300/40"
                  : "bg-white/10 text-slate-400 hover:bg-white/15 border border-white/10"
              }`}
            >
              {a.name}
            </button>
          );
        })}
      </div>
      {order.length === 0 ? (
        <p className="text-[10px] text-slate-500">No members yet. Tap members above in the order they should work.</p>
      ) : (
        <ol className="space-y-1">
          {order.map((id, i) => {
            const m = memberOf(id);
            return (
              <li
                key={id}
                className={`flex items-center gap-2 rounded-md border px-1.5 py-1 ${
                  i === 0 ? "border-brand-300/40 bg-brand-300/[0.06]" : i === task.current_step ? "border-violet-400/40 bg-violet-400/[0.06]" : "border-white/10 bg-night-850"
                }`}
              >
                <span className="w-5 text-center text-[10px] font-bold text-slate-500">{i + 1}</span>
                <span className="h-5 w-5 rounded-full bg-brand-300/15 flex items-center justify-center text-[8px] font-bold text-brand-300 shrink-0">
                  {initials(m?.name || "")}
                </span>
                <span className="text-[11px] text-slate-200 truncate flex-1">{m?.name}</span>
                {m?.role_label && <span className="badge !px-1.5 !py-0 text-[9px]">{m.role_label}</span>}
                <button type="button" disabled={i === 0 || pending} onClick={() => move(i, -1)} className="p-0.5 text-slate-500 hover:text-brand-300 disabled:opacity-30">
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button type="button" disabled={i === order.length - 1 || pending} onClick={() => move(i, 1)} className="p-0.5 text-slate-500 hover:text-brand-300 disabled:opacity-30">
                  <ArrowDown className="h-3 w-3" />
                </button>
              </li>
            );
          })}
        </ol>
      )}
      <button type="button" onClick={save} disabled={pending || order.length === 0} className="btn-primary !py-1 text-[11px]">
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        {pending ? "Saving…" : "Save sequence"}
      </button>
    </div>
  );
}

/**
 * Step 2 — Initial brief approval / rejection of a unified task.
 * Nothing else is unlocked until the brief is approved.
 */
export function TaskBriefManager({ task }: { task: Task }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");

  function approve() {
    start(async () => {
      const res = await approveTaskBriefAction(task.id);
      if (res.error) toast(res.error, "error");
      router.refresh();
    });
  }
  function reject() {
    start(async () => {
      const res = await rejectTaskBriefAction(task.id, reason);
      if (res.error) toast(res.error, "error");
      else setReason("");
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-2 space-y-2">
      <p className="text-[10px] font-semibold text-amber-300 uppercase tracking-wide flex items-center gap-1">
        <ClipboardList className="h-3 w-3" /> Brief approval — this unlocks the team sequence
      </p>
      <p className="text-[11px] text-slate-400">Everything is blocked until a manager approves the brief.</p>
      {task.status === "rejected" && task.review_comment && (
        <p className="text-[11px] text-rose-300 bg-rose-400/10 rounded px-2 py-1">Rejected: {task.review_comment}</p>
      )}
      <div className="flex items-center gap-1.5">
        <button className="btn-primary !py-1 text-[11px]" onClick={approve} disabled={pending}>
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Approve Brief
        </button>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="input !py-1 !text-[11px] flex-1"
          placeholder="Reason to reject…"
        />
        <button className="btn-secondary !text-rose-400 !py-1 text-[11px]" onClick={reject} disabled={pending} title="Reject brief">
          <X className="h-3 w-3" /> Reject
        </button>
      </div>
    </div>
  );
}