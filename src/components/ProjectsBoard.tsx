"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Trash2, Users, ChevronRight } from "lucide-react";
import {
  approveProjectAction,
  rejectProjectAction,
  deleteProjectAction,
  updateTaskStatusAction,
  assignProjectTeamAction,
} from "@/lib/actions/projects";
import type { ProjectRow, UserRow } from "@/lib/types";
import { ProjectStatusBadge, StatusBadge } from "@/components/ui";
import SmartTable, { type Column, type FilterTab } from "@/components/SmartTable";
import QuickAssignFullTeam from "@/components/QuickAssignFullTeam";

export default function ProjectsBoard({
  projects,
  team,
  roleKey,
  page,
  pageSize,
  total,
  totalPages,
  search,
  statusFilter,
  filterTabs,
  basePath,
}: {
  projects: ProjectRow[];
  team: UserRow[];
  roleKey: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  search: string;
  statusFilter: string;
  filterTabs: FilterTab[];
  basePath: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [allocDraft, setAllocDraft] = useState<Record<string, Record<string, string>>>({});

  const canManage = roleKey === "PROJECT_MANAGER" || roleKey === "SUPER_ADMIN";
  const canDelete = roleKey === "SUPER_ADMIN";

  function run(fn: () => Promise<unknown>) {
    start(async () => {
      await fn();
      router.refresh();
    });
  }

  function saveAllocations(p: ProjectRow, roleKeys: string[]) {
    const allocations = roleKeys.map((r) => ({
      role_key: r,
      user_id: allocDraft[p.id]?.[r] || null,
    }));
    run(() => assignProjectTeamAction(p.id, allocations));
  }

  const columns: Column<ProjectRow>[] = [
    {
      key: "name",
      label: "Project",
      render: (p) => (
        <div>
          <p className="font-medium text-slate-800 text-xs">{p.name}</p>
          <p className="text-[11px] text-slate-400">{p.client_name}</p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      className: "w-[130px]",
      render: (p) => <ProjectStatusBadge status={p.status} />,
    },
    {
      key: "tasks",
      label: "Progress",
      className: "w-[80px] text-center",
      render: (p) => (
        <span className="text-[11px] text-slate-600">
          {p.total_tasks > 0 ? `${p.completed_tasks}/${p.total_tasks}` : "—"}
        </span>
      ),
    },
    {
      key: "deadline",
      label: "Deadline",
      className: "w-[100px]",
      render: (p) => (
        <span className="text-[11px] text-slate-500">
          {p.deadline ? new Date(p.deadline).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "w-[160px]",
      render: (p) => (
        <div className="flex items-center gap-1 justify-end">
          {canManage && p.status === "pending_approval" && (
            <>
              <button
                className="btn-primary !py-1 !px-2 text-[11px]"
                disabled={pending}
                onClick={(e) => { e.stopPropagation(); run(() => approveProjectAction(p.id)); }}
              >
                <Check className="h-3 w-3" /> Approve
              </button>
              <button
                className="btn-ghost !text-rose-600 !py-1 !px-1.5 text-[11px]"
                disabled={pending}
                onClick={(e) => { e.stopPropagation(); run(() => rejectProjectAction(p.id)); }}
              >
                <X className="h-3 w-3" />
              </button>
            </>
          )}
          {canManage && p.status === "in_progress" && (
            <button
              className="btn-secondary !py-1 !px-2 text-[11px]"
              onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === p.id ? null : p.id); }}
            >
              <Users className="h-3 w-3" /> Team
            </button>
          )}
          {canDelete && (
            <button
              className="btn-ghost !text-rose-600 !py-1 !px-1.5 text-[11px]"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete "${p.name}"?`)) run(() => deleteProjectAction(p.id));
              }}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      ),
    },
  ];

  if (projects.length === 0 && !search && !statusFilter) {
    return (
      <div className="card flex flex-col items-center justify-center py-10 text-center">
        <p className="text-sm font-medium text-slate-600">No projects yet</p>
        <p className="text-xs text-slate-400 mt-1">Sales briefs will land here for approval.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Project Pipeline</h1>
        <p className="text-sm text-slate-500">From brief to delivery — approve, allocate, and track.</p>
      </div>

      {expandedId && (() => {
        const p = projects.find((pr) => pr.id === expandedId);
        if (!p) return null;

        return (
          <div className="card p-4 space-y-3 border-brand-200 bg-brand-50/30">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-slate-800">{p.name} — Team Allocation</h3>
              <button className="btn-ghost !py-0.5 !px-2 text-[11px]" onClick={() => setExpandedId(null)}>Close</button>
            </div>

            {p.brief && (
              <div className="text-xs text-slate-600">{p.brief}</div>
            )}

            {canManage && p.status === "in_progress" && (
              <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-3">
                <QuickAssignFullTeam
                  project={p}
                  team={team}
                  onAssignAll={(assignments) => run(() => assignProjectTeamAction(p.id, assignments))}
                  pending={pending}
                />
              </div>
            )}
          </div>
        );
      })()}

      <SmartTable
        columns={columns}
        data={projects}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        searchPlaceholder="Search projects…"
        filterTabs={filterTabs}
        filterParam="status"
        searchParam="search"
        basePath={basePath}
        emptyTitle="No matching projects"
        emptySubtitle="Try a different search or filter."
      />

      <div className="text-xs text-slate-400 text-center py-2">
        Click "Team" on any in_progress project to assign team members
      </div>
    </div>
  );
}
