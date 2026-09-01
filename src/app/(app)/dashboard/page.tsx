import Link from "next/link";
import { redirect } from "next/navigation";
import {
  FolderKanban, CheckCircle2, Sparkles, Target, ClipboardList, Briefcase,
  Download,
} from "lucide-react";
import { getSession } from "@/lib/session";
import {
  getMyTasks, getProjects, getLeadStats, getTaskStatusCounts,
  getSubmittedTasks, getAllLeaves, getBottlenecks, getTeam,
} from "@/lib/data";
import StaffDashboard from "@/components/StaffDashboard";
import SmmDashboard from "@/components/SmmDashboard";
import ActionCenter from "@/components/ActionCenter";
import { Stat, ProjectStatusBadge, EmptyState } from "@/components/ui";
import { LEAD_STATUSES } from "@/lib/types";
import { Greeting, TodayBadge } from "@/components/DashboardHeader";

const STAFF_ROLES = ["WRITER", "DESIGNER", "EDITOR", "SMM", "VIDEOGRAPHER"];

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const firstName = session.name.split(" ")[0];

  if (STAFF_ROLES.includes(session.role_key) || session.dashboard === "staff") {
    const tasks = await getMyTasks(session.sub).catch(() => [] as import("@/lib/types").Task[]);
    const team = await getTeam().catch(() => [] as import("@/lib/types").UserRow[]);
    const open = tasks.filter((t: import("@/lib/types").Task) => t.status !== "completed");
    return (
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
        <div className="rounded-2xl bg-gradient-to-br from-brand-300 to-brand-500 p-5 md:p-6 text-night-950 shadow-lg shadow-brand-300/20">
          <div className="flex items-center gap-2 text-night-950/70">
            <Sparkles className="h-4 w-4" />
            <p className="text-sm font-medium"><Greeting firstName={firstName} /></p>
          </div>
          <h1 className="text-xl md:text-2xl font-bold mt-1 tracking-tight">My Workspace</h1>
          <p className="text-sm text-night-950/70 mt-1">
            {open.length > 0
              ? `You have ${open.length} open task${open.length === 1 ? "" : "s"} waiting for you.`
              : "All clear — no open tasks assigned to you."}
          </p>
        </div>
        {session.role_key === "SMM" ? (
          <SmmDashboard tasks={tasks} team={team} userId={session.sub} permissions={session.permissions} />
        ) : (
          <StaffDashboard tasks={tasks} team={team} roleKey={session.role_key} userId={session.sub} permissions={session.permissions} />
        )}
      </div>
    );
  }

  if (session.role_key === "SALES" || session.dashboard === "sales") {
    const projects = await getProjects();
    const mine = projects.filter((p) => p.created_by === session.sub);
    return (
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Business Development</h1>
            <p className="text-sm text-slate-400">Your projects and their production status.</p>
          </div>
          <Link href="/clients" className="btn-primary !py-2 text-xs">
            + Add Tasks
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <Stat label="My Projects" value={mine.length} />
          <Stat label="In Production" value={mine.filter((p) => p.status === "in_progress").length} accent="text-brand-300" />
          <Stat label="Delivered" value={mine.filter((p) => p.status === "completed").length} accent="text-emerald-400" />
        </div>

        {mine.length === 0 ? (
          <EmptyState title="No projects yet" subtitle="Create tasks for a client from the Clients page." />
        ) : (
          <div className="card divide-y divide-white/[0.06] overflow-hidden">
            {mine.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-white/[0.04] transition-colors">
                <div className="min-w-0">
                  <p className="font-medium text-white">{p.name}</p>
                  <p className="text-xs text-slate-500 truncate">{p.brief}</p>
                </div>
                <ProjectStatusBadge status={p.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

const isSuperAdmin = session.role_key === "SUPER_ADMIN";
  let projects: any[] = [];
  let leadStats: any = null;
  let taskCounts: Record<string, number> = {};
  let submittedTasks: any[] = [];
  let pendingLeaves: any[] = [];
  let bottlenecks: any[] = [];
  try {
    [projects, leadStats, taskCounts, submittedTasks, pendingLeaves, bottlenecks] = await Promise.all([
      getProjects().catch(() => [] as any),
      isSuperAdmin ? getLeadStats(null).catch(() => null as any) : Promise.resolve(null as any),
      isSuperAdmin ? getTaskStatusCounts().catch(() => ({} as Record<string, number>)) : Promise.resolve({} as Record<string, number>),
      getSubmittedTasks().catch(() => [] as any),
      getAllLeaves({ status: "pending" }).catch(() => [] as any),
      isSuperAdmin ? getBottlenecks().catch(() => [] as any) : Promise.resolve([] as any),
    ]);
  } catch {
    // Fallback: individual catches already return safe defaults, this is absolute safety
    projects = projects || [];
  }
  const active = projects.filter((p) => p.status === "in_progress");

  type ActionItem = {
    id: string;
    type: "project" | "task" | "leave" | "bottleneck";
    title: string;
    subtitle: string;
    href: string;
  };
  const actionItems: ActionItem[] = [
    ...submittedTasks.map((t): ActionItem => ({
      id: `task-${t.id}`,
      type: "task",
      title: t.title,
      subtitle: `${t.project_name} — ${t.role_label || t.role_key}`,
      href: `/projects/${t.project_id}?project=${t.project_id}&task=${t.step_key}`,
    })),
    ...pendingLeaves.map((l): ActionItem => ({
      id: `leave-${l.id}`,
      type: "leave",
      title: `${l.full_name} — ${l.leave_type.charAt(0).toUpperCase() + l.leave_type.slice(1)} Leave`,
      subtitle: `${l.days}d  ${l.start_date} to ${l.end_date}`,
      href: "/attendance",
    })),
    ...bottlenecks.map((b: any): ActionItem => ({
      id: `bn-${b.task_id}`,
      type: "bottleneck",
      title: b.title,
      subtitle: `${b.assignee_name || "Unassigned"} — ${b.days_open}d open`,
      href: `/projects/${b.project_id}?project=${b.project_id}`,
    })),
  ];
  const totalActionCount = actionItems.length;

  // Super Admin — Command Center dashboard
  if (isSuperAdmin) {
    const leadByStatus: Record<string, number> = {
      new: leadStats?.newCount || 0,
      contacted: (leadStats as any)?.contacted || 0,
      follow_up: (leadStats as any)?.followUp || 0,
      proposal: (leadStats as any)?.proposal || 0,
      won: leadStats?.won || 0,
      lost: leadStats?.lost || 0,
    };
    const totalTasks = Object.values(taskCounts).reduce((a, b) => a + b, 0);

    return (
      <div className="space-y-4 md:space-y-5">
        {/* ── Header: greeting + date + Export ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              <Greeting firstName={firstName} />! <span role="img" aria-label="wave">👋</span>
            </h1>
            <p className="text-sm text-slate-400">Projects, tasks & leads at a glance.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <TodayBadge />
            <Link href="/settings" className="btn-secondary !py-2 text-xs">
              <Download className="h-3.5 w-3.5" /> Export Report
            </Link>
          </div>
        </div>

        {/* ── Row 1: 4 project stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <div className="card p-3 md:p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-7 w-7 rounded-lg bg-violet-400/15 flex items-center justify-center">
                <Briefcase className="h-3.5 w-3.5 text-violet-400" />
              </span>
              <p className="text-xs text-slate-400">Total Projects</p>
            </div>
            <p className="text-2xl md:text-3xl font-bold tracking-tight text-white">{projects.length}</p>
          </div>
          <div className="card p-3 md:p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-7 w-7 rounded-lg bg-brand-300/15 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-brand-300" />
              </span>
              <p className="text-xs text-brand-300">In Progress</p>
            </div>
            <p className="text-2xl md:text-3xl font-bold tracking-tight text-brand-300">{active.length}</p>
          </div>
          <div className="card p-3 md:p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-7 w-7 rounded-lg bg-emerald-400/15 flex items-center justify-center">
                <FolderKanban className="h-3.5 w-3.5 text-emerald-400" />
              </span>
              <p className="text-xs text-emerald-300">Completed</p>
            </div>
            <p className="text-2xl md:text-3xl font-bold tracking-tight text-emerald-300">{projects.filter((p) => p.status === "completed").length}</p>
          </div>
        </div>

        {/* ── Row 2: All Tasks + Leads (side by side on desktop, stacked on mobile) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* All Tasks */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-7 w-7 rounded-lg bg-sky-400/15 flex items-center justify-center">
                <ClipboardList className="h-3.5 w-3.5 text-sky-300" />
              </span>
              <h2 className="text-sm font-semibold text-white">All Tasks</h2>
              <span className="ml-auto text-xs text-slate-500">{totalTasks} Total</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {[
                { key: "pending", label: "Pending", cls: "bg-white/[0.04] border-white/10 text-slate-300" },
                { key: "in_progress", label: "In Process", cls: "bg-brand-300/10 border-brand-300/20 text-brand-300" },
                { key: "completed", label: "Completed", cls: "bg-emerald-400/10 border-emerald-400/20 text-emerald-300" },
                { key: "upload_done", label: "Upload Done", cls: "bg-sky-400/10 border-sky-400/20 text-sky-300" },
              ].map((s) => (
                <div key={s.key} className={`rounded-xl border p-3 text-center ${s.cls}`}>
                  <p className="text-[10px] md:text-[11px] opacity-80 leading-tight">{s.label}</p>
                  <p className="text-lg md:text-xl font-bold text-white mt-1">{taskCounts[s.key] || 0}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Leads Overview */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-7 w-7 rounded-lg bg-violet-400/15 flex items-center justify-center">
                <Target className="h-3.5 w-3.5 text-violet-300" />
              </span>
              <h2 className="text-sm font-semibold text-white">Leads Overview</h2>
              <Link href="/leads" className="ml-auto text-[11px] text-violet-300 hover:text-violet-200">View all →</Link>
            </div>
            <div className="rounded-xl bg-violet-400/10 border border-violet-400/20 p-3 mb-3">
              <p className="text-[11px] text-violet-300">Total Leads ({leadStats?.total || 0})</p>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
              {LEAD_STATUSES.map((s) => (
                <div key={s.key} className="rounded-xl bg-white/[0.04] border border-white/10 p-2 text-center">
                  <p className="text-[10px] text-slate-400 leading-none">{s.label}</p>
                  <p className="text-sm font-bold text-white mt-1">{leadByStatus[s.key] ?? 0}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Row 3: Action & Approval Center ── */}
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 px-4 md:px-5 py-3 md:py-4 border-b border-white/[0.06]">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <h2 className="font-semibold text-sm">Action & Approval Center</h2>
            <span className="badge bg-amber-400/10 text-amber-300 ml-auto">{totalActionCount}</span>
          </div>
          <ActionCenter items={actionItems} />
        </div>
      </div>
    );
  }

  // PROJECT_MANAGER fallback
  return (
    <div className="space-y-4 md:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            <Greeting firstName={firstName} />! <span role="img" aria-label="wave">👋</span>
          </h1>
          <p className="text-sm text-slate-400">Live overview of every active campaign.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <TodayBadge />
          <Link href="/settings" className="btn-secondary !py-2 text-xs">
            <Download className="h-3.5 w-3.5" /> Export Report
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <Stat label="Total Projects" value={projects.length} />
        <Stat label="In Progress" value={active.length} accent="text-brand-300" />
        <Stat label="Completed" value={projects.filter((p) => p.status === "completed").length} accent="text-emerald-400" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 px-4 md:px-5 py-3 md:py-4 border-b border-white/[0.06]">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <h2 className="font-semibold text-sm">Action & Approval Center</h2>
          <span className="badge bg-amber-400/10 text-amber-300 ml-auto">{totalActionCount}</span>
        </div>
        <ActionCenter items={actionItems} />
      </div>
    </div>
  );
}