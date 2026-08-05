"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Save, FileText } from "lucide-react";
import { updateTaskStatusAction, updateTaskContentAction } from "@/lib/actions/projects";
import type { Task } from "@/lib/types";
import { StatusBadge, PriorityBadge } from "@/components/ui";

const STATUS_FILTERS = [
  { key: "", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "completed", label: "Completed" },
];

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

function StatusFlow({ task }: { task: Task }) {
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
      <span className="text-xs text-slate-400">
        {task.completed_at ? new Date(task.completed_at).toLocaleDateString() : ""}
      </span>
    );
  }

  const action = actions[task.status];
  return (
    <button className={action.cls} onClick={go} disabled={pending}>
      {action.label}
      <ArrowRight className="h-3.5 w-3.5" />
    </button>
  );
}

export default function StaffDashboard({ tasks, roleKey }: { tasks: Task[]; roleKey: string }) {
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = tasks.filter((t) => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.project_name.toLowerCase().includes(q);
    }
    return true;
  });

  const pendingCount = tasks.filter((t) => t.status !== "completed").length;
  const counts = STATUS_FILTERS.map((f) => ({
    ...f,
    count: f.key === "" ? tasks.length : tasks.filter((t) => t.status === f.key).length,
  }));

  if (tasks.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center p-10 text-center">
        <p className="font-medium text-slate-700">No assignments yet</p>
        <p className="text-sm text-slate-400 mt-1">New tasks will appear here automatically as projects move through the pipeline.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="input !py-1.5 text-sm"
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {counts.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === f.key
                  ? "bg-brand-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label}
              <span className="ml-1 opacity-70">({f.count})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Task</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">
                    No tasks match your filter.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <>
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-800">{t.title}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">
                        <p>{t.project_name}</p>
                        <p className="text-slate-400">{t.client_name}</p>
                      </td>
                      <td className="px-5 py-3">
                        {t.role_label && <span className="badge bg-slate-100 text-slate-500">{t.role_label}</span>}
                      </td>
                      <td className="px-5 py-3"><PriorityBadge priority={t.priority} /></td>
                      <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
                      <td className="px-5 py-3 text-right">
                        <StatusFlow task={t} />
                      </td>
                    </tr>
                    {expandedId === t.id && (
                      <tr key={`${t.id}-expanded`}>
                        <td colSpan={6} className="px-5 py-3 bg-slate-50/30">
                          <ContentEditor task={t} roleKey={roleKey} />
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
