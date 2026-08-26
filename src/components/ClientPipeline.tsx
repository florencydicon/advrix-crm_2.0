"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, FolderKanban, Search, Users } from "lucide-react";
import type { PipelineClient } from "@/lib/data";
import { ProjectStatusBadge } from "@/components/ui";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

export default function ClientPipeline({ pipeline }: { pipeline: PipelineClient[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const enriched = useMemo(
    () =>
      pipeline.map((c) => {
        const totalTasks = c.projects.reduce((n, p) => n + p.total_tasks, 0);
        const doneTasks = c.projects.reduce((n, p) => n + p.completed_tasks, 0);
        return {
          ...c,
          totalTasks,
          doneTasks,
          activeProjects: c.projects.filter((p) => p.status === "in_progress").length,
          pendingProjects: c.projects.filter((p) => p.status === "pending_approval").length,
          completedProjects: c.projects.filter((p) => p.status === "completed").length,
          progress: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
        };
      }),
    [pipeline]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return enriched;
    return enriched.filter(
      (c) =>
        c.client_name.toLowerCase().includes(q) ||
        c.projects.some(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.tasks.some((t) => t.title?.toLowerCase().includes(q))
        )
    );
  }, [enriched, query]);

  const totalProjects = pipeline.reduce((n, c) => n + c.projects.length, 0);
  const totalActive = pipeline.reduce(
    (n, c) => n + c.projects.filter((p) => p.status === "in_progress").length,
    0
  );

  if (pipeline.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-10 text-center">
        <FolderKanban className="h-8 w-8 text-slate-300 mb-2" />
        <p className="text-sm font-medium text-slate-300">No projects yet</p>
        <p className="text-xs text-slate-500 mt-1">Sales requests will land here for approval.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Project Pipeline</h1>
          <p className="text-sm text-slate-400">From request to delivery — pick a client to manage their projects.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge bg-white/10 text-slate-300">{totalProjects} projects</span>
          <span className="badge bg-brand-300/10 text-brand-300">{totalActive} in production</span>
        </div>
      </div>

      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clients or projects…"
          className="input !pl-8 !py-1.5 text-xs"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card py-8 text-center text-xs text-slate-500">No clients match your search.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((c) => (
            <button
              key={c.client_id}
              onClick={() => router.push(`/projects/${c.client_id}`)}
              className="card card-hover p-4 text-left overflow-hidden"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-brand-300/10 flex items-center justify-center shrink-0 text-brand-300 font-bold">
                  {initials(c.client_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white truncate">{c.client_name}</p>
                  <p className="text-[11px] text-slate-500">
                    {c.projects.length} project{c.projects.length === 1 ? "" : "s"}
                    {c.pendingProjects > 0 && (
                      <span className="text-amber-300"> · {c.pendingProjects} awaiting approval</span>
                    )}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500 shrink-0 mt-1" />
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-white/[0.04] py-1.5">
                  <p className="text-sm font-bold text-white">{c.activeProjects}</p>
                  <p className="text-[9px] uppercase tracking-wider text-slate-500">active</p>
                </div>
                <div className="rounded-lg bg-white/[0.04] py-1.5">
                  <p className="text-sm font-bold text-emerald-300">{c.doneTasks}</p>
                  <p className="text-[9px] uppercase tracking-wider text-slate-500">done</p>
                </div>
                <div className="rounded-lg bg-white/[0.04] py-1.5">
                  <p className="text-sm font-bold text-slate-200">{c.totalTasks}</p>
                  <p className="text-[9px] uppercase tracking-wider text-slate-500">tasks</p>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                  <span>Task progress</span>
                  <span>{c.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-300 transition-all"
                    style={{ width: `${c.progress}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {c.projects.slice(0, 3).map((p) => (
                  <ProjectStatusBadge key={p.id} status={p.status} />
                ))}
                {c.projects.length > 3 && (
                  <span className="badge bg-white/10 text-slate-400">+{c.projects.length - 3} more</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Team allocation hint */}
      <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
        <Users className="h-3 w-3" />
        Open a client to allocate teams, adjust deadlines and manage emergency leaves.
      </p>
    </div>
  );
}
