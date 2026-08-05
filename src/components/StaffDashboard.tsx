"use client";

import { useState, useTransition, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Save, FileText } from "lucide-react";
import { updateTaskStatusAction, updateTaskContentAction } from "@/lib/actions/projects";
import type { Task } from "@/lib/types";
import { StatusBadge, PriorityBadge } from "@/components/ui";
import type { Column } from "@/components/SmartTable";

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

function StatusFlow({ task }: { task: Task }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const actions: Record<string, { label: string; to: string; cls: string }> = {
    pending: { label: "Start", to: "in_progress", cls: "btn-primary" },
    in_progress: { label: "Review", to: "review", cls: "btn-secondary" },
    review: { label: "Complete", to: "completed", cls: "btn-primary" },
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
    return <span className="text-[11px] text-slate-400">{task.completed_at ? new Date(task.completed_at).toLocaleDateString() : ""}</span>;
  }

  const action = actions[task.status];
  return (
    <button className={`${action.cls} !py-1 !px-2 text-[11px]`} onClick={go} disabled={pending}>
      {action.label} <ArrowRight className="h-3 w-3" />
    </button>
  );
}

export default function StaffDashboard({ tasks, roleKey }: { tasks: Task[]; roleKey: string }) {
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return t.title.toLowerCase().includes(q) || t.project_name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [tasks, statusFilter, search]);

  const counts = STATUS_FILTERS.map((f) => ({
    ...f,
    count: f.key === "" ? tasks.length : tasks.filter((t) => t.status === f.key).length,
  }));

  const columns: Column<Task>[] = [
    {
      key: "task",
      label: "Task",
      render: (t) => (
        <div>
          <p className="font-medium text-xs text-slate-800">{t.title}</p>
          <p className="text-[11px] text-slate-400">{t.project_name} · {t.client_name}</p>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      className: "w-[80px]",
      render: (t) => t.role_label ? <span className="badge bg-slate-100 text-slate-500">{t.role_label}</span> : null,
    },
    {
      key: "priority",
      label: "Priority",
      className: "w-[70px]",
      render: (t) => <PriorityBadge priority={t.priority} />,
    },
    {
      key: "status",
      label: "Status",
      className: "w-[80px]",
      render: (t) => <StatusBadge status={t.status} />,
    },
    {
      key: "action",
      label: "",
      className: "w-[80px]",
      render: (t) => <StatusFlow task={t} />,
    },
  ];

  if (tasks.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm font-medium text-slate-600">No assignments yet</p>
        <p className="text-xs text-slate-400 mt-1">New tasks will appear here automatically.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…" className="input !py-1.5 text-xs" />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {counts.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key === statusFilter ? "" : f.key)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                statusFilter === f.key ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label} <span className="opacity-70">({f.count})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">No tasks match your filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60">
                  {columns.map((col) => (
                    <th key={col.key} className={`px-4 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider ${col.className || ""}`}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((t) => (
                  <Fragment key={t.id}>
                    <tr className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}>
                      {columns.map((col) => (
                        <td key={col.key} className={`px-4 py-2 ${col.className || ""}`}>
                          {col.render(t)}
                        </td>
                      ))}
                    </tr>
                    {expandedId === t.id && (
                      <tr className="bg-slate-50/30">
                        <td colSpan={5} className="px-4 py-2">
                          <ContentEditor task={t} roleKey={roleKey} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


