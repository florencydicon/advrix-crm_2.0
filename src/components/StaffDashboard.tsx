"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, ArrowRight, Save } from "lucide-react";
import { updateTaskStatusAction, updateTaskContentAction } from "@/lib/actions/projects";
import type { Task } from "@/lib/types";
import { StatusBadge, PriorityBadge, EmptyState } from "@/components/ui";

function ContentEditor({ task, roleKey }: { task: Task; roleKey: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState(task.content || "");
  const [saved, setSaved] = useState(false);

  const isWriter = roleKey === "WRITER" || roleKey === "SUPER_ADMIN";
  if (!isWriter || !task.deliverable_id) return null;

  function save() {
    start(async () => {
      const res = await updateTaskContentAction(task.id, draft);
      if (res.error) {
        alert(res.error);
      } else {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Copy &amp; Script Draft</p>
        {saved && <span className="text-xs text-emerald-600">Saved</span>}
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={4}
        className="input text-sm"
        placeholder="Draft the captions, copy and script for this deliverable here…"
      />
      <button className="btn-secondary !py-1.5 text-xs mt-2" onClick={save} disabled={pending}>
        <Save className="h-3.5 w-3.5" /> {pending ? "Saving…" : "Save draft"}
      </button>
    </div>
  );
}

function StatusFlow({ task, roleKey }: { task: Task; roleKey: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const actions: Record<string, { label: string; to: string; cls: string }> = {
    pending: { label: "Start Work", to: "in_progress", cls: "btn-primary" },
    in_progress: { label: "Send to Review", to: "review", cls: "btn-secondary" },
    review: { label: "Mark Completed", to: "completed", cls: "btn-primary" },
  };

  function go() {
    const action = actions[task.status];
    if (!action) return;
    start(async () => {
      const res = await updateTaskStatusAction(task.id, action.to);
      if (res.error) alert(res.error);
      router.refresh();
    });
  }

  if (task.status === "completed") {
    return (
      <div className="flex items-center gap-2">
        <StatusBadge status={task.status} />
        <span className="text-xs text-slate-400">
          {task.completed_at ? new Date(task.completed_at).toLocaleDateString() : ""}
        </span>
      </div>
    );
  }

  const action = actions[task.status];
  return (
    <div className="flex items-center gap-2">
      <button className={action.cls} onClick={go} disabled={pending}>
        {action.label}
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function StaffDashboard({ tasks, roleKey }: { tasks: Task[]; roleKey: string }) {
  const grouped: Record<string, { project_name: string; client_name: string; tasks: Task[] }> = {};
  for (const t of tasks) {
    if (!grouped[t.project_id]) {
      grouped[t.project_id] = { project_name: t.project_name, client_name: t.client_name, tasks: [] };
    }
    grouped[t.project_id].tasks.push(t);
  }

  const pendingCount = tasks.filter((t) => t.status !== "completed").length;

  if (tasks.length === 0) {
    return <EmptyState title="No assignments yet" subtitle="New tasks will appear here automatically as projects move through the pipeline." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {pendingCount} open task{pendingCount === 1 ? "" : "s"} · {tasks.length} total
        </p>
      </div>

      {Object.values(grouped).map((g) => (
        <div key={g.project_name} className="card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 bg-slate-50/60">
            <div className="h-9 w-9 rounded-lg bg-brand-600/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-brand-700" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">{g.project_name}</p>
              <p className="text-xs text-slate-400">{g.client_name}</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {g.tasks.map((t) => (
              <div key={t.id} className="px-5 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-800">{t.title}</p>
                      <PriorityBadge priority={t.priority} />
                      {t.role_label && (
                        <span className="badge bg-slate-100 text-slate-500">{t.role_label}</span>
                      )}
                    </div>
                    {t.description && (
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">{t.description}</p>
                    )}
                    {t.due_date && (
                      <p className="text-xs text-slate-400 mt-1">Due {new Date(t.due_date).toLocaleDateString()}</p>
                    )}
                  </div>
                  <StatusFlow task={t} roleKey={roleKey} />
                </div>
                <ContentEditor task={t} roleKey={roleKey} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
