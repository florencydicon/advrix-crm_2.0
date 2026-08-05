"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Trash2, Users, ChevronDown, ChevronRight, UserPlus } from "lucide-react";
import {
  approveProjectAction,
  rejectProjectAction,
  deleteProjectAction,
  updateTaskStatusAction,
  setTaskAssigneeAction,
  assignProjectTeamAction,
  extendDeadlineAction,
} from "@/lib/actions/projects";
import type { ProjectDetail, ProjectRow, UserRow } from "@/lib/types";
import { ProjectStatusBadge, StatusBadge } from "@/components/ui";
import DataTable, { type Column, type FilterTab } from "@/components/DataTable";

const STATUS_FILTERS: FilterTab[] = [
  { key: "", label: "All" },
  { key: "pending_approval", label: "Awaiting Approval" },
  { key: "in_progress", label: "In Production" },
  { key: "completed", label: "Completed" },
  { key: "rejected", label: "Rejected" },
];

const QUICK_ASSIGN_ROLES = [
  { key: "WRITER", label: "Content Writer", icon: "✍️" },
  { key: "DESIGNER", label: "Graphic Designer", icon: "🎨" },
  { key: "EDITOR", label: "Video Editor", icon: "🎬" },
  { key: "SMM", label: "Social Media Manager", icon: "📱" },
];

function QuickAssignFullTeam({
  project,
  team,
  roles,
  existingAlloc,
  allocDraft,
  setAllocDraft,
  onAssignAll,
  pending,
}: {
  project: ProjectDetail;
  team: UserRow[];
  roles: string[];
  existingAlloc: Record<string, string>;
  allocDraft: Record<string, Record<string, string>>;
  setAllocDraft: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>;
  onAssignAll: (assignments: { role_key: string; user_id: string | null }[]) => void;
  pending: boolean;
}) {
  const [quickDraft, setQuickDraft] = useState<Record<string, string>>({});

  const applicableRoles = QUICK_ASSIGN_ROLES.filter((qr) => roles.includes(qr.key));

  function assignAll() {
    const assignments: { role_key: string; user_id: string | null }[] = [];
    for (const r of roles) {
      const userId = quickDraft[r] || existingAlloc[r] || "";
      assignments.push({ role_key: r, user_id: userId || null });
    }
    onAssignAll(assignments);
  }

  if (applicableRoles.length === 0) return null;

  return (
    <div className="rounded-lg border border-brand-200 bg-brand-50/40 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-brand-700" />
        <p className="text-sm font-semibold text-brand-800">Quick Assign Full Team</p>
      </div>
      <p className="text-xs text-slate-500">Assign all key roles at once — tasks auto-assign to each member.</p>
      <div className="grid grid-cols-2 gap-3">
        {applicableRoles.map((qr) => {
          const assignedUser = team.find((u) => u.id === (quickDraft[qr.key] || existingAlloc[qr.key]));
          return (
            <div key={qr.key} className="space-y-1">
              <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                <span>{qr.icon}</span>
                {qr.label}
              </label>
              <select
                className="input !py-1.5 text-sm"
                value={quickDraft[qr.key] !== undefined ? quickDraft[qr.key] : (existingAlloc[qr.key] || "")}
                onChange={(e) =>
                  setQuickDraft((prev) => ({
                    ...prev,
                    [qr.key]: e.target.value,
                  }))
                }
              >
                <option value="">Select member…</option>
                {team
                  .filter((u) => u.role_key === qr.key && u.is_active)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name}
                    </option>
                  ))}
              </select>
              {assignedUser && (
                <p className="text-[10px] text-brand-600">→ {assignedUser.full_name}</p>
              )}
            </div>
          );
        })}
      </div>
      <button
        className="btn-primary !py-1.5 text-xs w-full"
        disabled={pending}
        onClick={assignAll}
      >
        <UserPlus className="h-3.5 w-3.5" /> Assign Full Team &amp; Auto-Assign Tasks
      </button>
    </div>
  );
}

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
  onPageChange,
  onSearch,
  onFilterChange,
}: {
  projects: ProjectDetail[];
  team: UserRow[];
  roleKey: string;
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  search?: string;
  statusFilter?: string;
  onPageChange?: (p: number) => void;
  onSearch?: (q: string) => void;
  onFilterChange?: (s: string) => void;
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

  function saveAllocations(p: ProjectDetail) {
    const roles = [...new Set(p.groups.flatMap((g) => g.tasks.map((t) => t.role_key)))];
    const allocations = roles.map((r) => ({
      role_key: r,
      user_id: allocDraft[p.id]?.[r] || null,
    }));
    run(() => assignProjectTeamAction(p.id, allocations));
  }

  const columns: Column<ProjectDetail>[] = [
    {
      key: "name",
      label: "Project",
      sortable: true,
      render: (p) => (
        <div>
          <p className="font-medium text-slate-800">{p.name}</p>
          <p className="text-xs text-slate-400">{p.client_name}</p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (p) => <ProjectStatusBadge status={p.status} />,
    },
    {
      key: "tasks",
      label: "Progress",
      className: "text-center",
      render: (p) => {
        const total = p.groups.reduce((s, g) => s + g.tasks.length, 0);
        const done = p.groups.reduce((s, g) => s + g.tasks.filter((t) => t.status === "completed").length, 0);
        return (
          <span className="text-xs text-slate-600">
            {total > 0 ? `${done}/${total}` : "—"}
          </span>
        );
      },
    },
    {
      key: "deadline",
      label: "Deadline",
      sortable: true,
      render: (p) => (
        <span className="text-xs text-slate-500">
          {p.deadline ? new Date(p.deadline).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "w-[180px]",
      render: (p) => (
        <div className="flex items-center gap-2 justify-end">
          {canManage && p.status === "pending_approval" && (
            <>
              <button
                className="btn-primary !py-1 !px-2.5 text-xs"
                disabled={pending}
                onClick={(e) => { e.stopPropagation(); run(() => approveProjectAction(p.id)); }}
              >
                <Check className="h-3.5 w-3.5" /> Approve
              </button>
              <button
                className="btn-ghost !text-rose-600 !py-1 !px-2.5 text-xs"
                disabled={pending}
                onClick={(e) => { e.stopPropagation(); run(() => rejectProjectAction(p.id)); }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          {canManage && p.status === "in_progress" && (
            <button
              className="btn-secondary !py-1 !px-2.5 text-xs"
              onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === p.id ? null : p.id); }}
            >
              <Users className="h-3.5 w-3.5" /> Team
            </button>
          )}
          {canManage && p.groups.length > 0 && (
            <button
              className="btn-ghost !py-1 !px-2 text-xs"
              onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === p.id ? null : p.id); }}
            >
              <ChevronRight className={`h-4 w-4 transition-transform ${expandedId === p.id ? "rotate-90" : ""}`} />
            </button>
          )}
          {canDelete && (
            <button
              className="btn-ghost !text-rose-600 !py-1 !px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete project "${p.name}" and all its tasks?`)) run(() => deleteProjectAction(p.id));
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const filterTabs = STATUS_FILTERS.map((t) => ({
    ...t,
    count: t.key === "" ? total : undefined,
  }));

  if (projects.length === 0 && !search && !statusFilter) {
    return (
      <div className="card flex flex-col items-center justify-center p-10 text-center">
        <p className="font-medium text-slate-700">No projects yet</p>
        <p className="text-sm text-slate-400 mt-1">Sales briefs will land here for approval.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={projects}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        search={search}
        searchPlaceholder="Search projects…"
        filterTabs={filterTabs}
        activeFilter={statusFilter}
        onSearch={onSearch}
        onPageChange={onPageChange}
        onFilterChange={onFilterChange}
        emptyTitle="No matching projects"
        emptySubtitle="Try a different search or filter."
      />

      {expandedId && (() => {
        const p = projects.find((pr) => pr.id === expandedId);
        if (!p) return null;
        const roles = [...new Set(p.groups.flatMap((g) => g.tasks.map((t) => t.role_key)))];
        const draft = allocDraft[p.id] || {};
        const existingAlloc: Record<string, string> = {};
        for (const a of p.assignments) existingAlloc[a.role_key] = a.user_id;

        return (
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">{p.name} — Details</h3>
              <button className="btn-ghost !py-1 text-xs" onClick={() => setExpandedId(null)}>Close</button>
            </div>

            {p.brief && (
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Brief</p>
                <p className="text-sm text-slate-600 mt-1">{p.brief}</p>
              </div>
            )}

            {canManage && p.status === "in_progress" && roles.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-brand-700" />
                  <p className="text-sm font-semibold text-slate-700">Team Allocation</p>
                </div>

                <QuickAssignFullTeam
                  project={p}
                  team={team}
                  roles={roles}
                  existingAlloc={existingAlloc}
                  allocDraft={allocDraft}
                  setAllocDraft={setAllocDraft}
                  onAssignAll={(assignments) => run(() => assignProjectTeamAction(p.id, assignments))}
                  pending={pending}
                />

                <div className="border-t border-slate-200 pt-3">
                  <p className="text-xs font-medium text-slate-500 mb-2">Fine-tune individual roles</p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {roles.map((r) => (
                      <div key={r}>
                        <label className="label">{r.replace(/_/g, " ").toLowerCase()}</label>
                        <select
                          className="input !py-1.5 text-sm"
                          value={draft[r] !== undefined ? draft[r] : (existingAlloc[r] || "")}
                          onChange={(e) =>
                            setAllocDraft((prev) => ({
                              ...prev,
                              [p.id]: { ...(prev[p.id] || {}), [r]: e.target.value },
                            }))
                          }
                        >
                          <option value="">Unassigned</option>
                          {team.map((u) => (
                            <option key={u.id} value={u.id}>{u.full_name}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  <button
                    className="btn-secondary !py-1.5 text-xs mt-3"
                    disabled={pending}
                    onClick={() => saveAllocations(p)}
                  >
                    Apply individual allocation
                  </button>
                </div>
              </div>
            )}

            {p.groups.length > 0 && (
              <div className="space-y-3">
                {p.groups.map((g) => (
                  <div key={g.group_key} className={`rounded-xl border p-4 ${g.completed ? "bg-emerald-50/50 border-emerald-200" : "bg-slate-50/60 border-slate-200"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-slate-700">{g.name}</p>
                      {g.completed && <StatusBadge status="completed" />}
                    </div>
                    <div className="space-y-2">
                      {g.tasks.map((t) => (
                        <div key={t.id} className="flex flex-wrap items-center gap-3 bg-white rounded-lg border border-slate-200 px-3 py-2.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800">{t.title}</p>
                            <p className="text-xs text-slate-400">
                              {t.role_label || t.role_key} · {t.assignee_name || "Unassigned"}
                            </p>
                          </div>
                          <StatusBadge status={t.status} />
                          {canManage && t.status !== "completed" && (
                            <button
                              className="btn-secondary !py-1 text-xs"
                              onClick={() => run(() => updateTaskStatusAction(t.id, "completed"))}
                            >
                              <Check className="h-3.5 w-3.5" /> Complete
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
