import Link from "next/link";
import { redirect } from "next/navigation";
import {
  FolderKanban, Sparkles, Target, ClipboardList, Briefcase,
  Download, Users, Layers, ChevronRight, ListTodo,
} from "lucide-react";
import { getSession } from "@/lib/session";
import {
  getMyTasks, getProjects, getLeadStats, getTaskStatusCounts, getSubtaskStatusCounts,
  getSubmittedTasks, getTeam, getClients, getClientWorkload,
  type ClientWorkload,
} from "@/lib/data";
import { getRecentActivity, type ActivityLogRow } from "@/lib/activity";
import { DashboardActivityLogTrigger } from "@/components/DashboardActivityLog";
import PushNotificationPrompt from "@/components/PushNotificationPrompt";
import StaffDashboard from "@/components/StaffDashboard";
import SmmDashboard from "@/components/SmmDashboard";
import SubmittedTaskReview from "@/components/SubmittedTaskReview";
import { Stat, ProjectStatusBadge, EmptyState } from "@/components/ui";
import { LEAD_STATUSES } from "@/lib/types";
import { Greeting, TodayBadge } from "@/components/DashboardHeader";

const STAFF_ROLES = ["WRITER", "DESIGNER", "EDITOR", "SMM", "VIDEOGRAPHER"];

/** Per-client workload tiles that deep-link into a pre-filtered Project Pipeline. */
function ClientWorkloadWidget({ workload }: { workload: ClientWorkload[] }) {
  const active = workload.filter((w) => w.open_tasks > 0 || w.active_projects > 0);
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-7 w-7 rounded-lg bg-brand-300/15 flex items-center justify-center">
          <Briefcase className="h-3.5 w-3.5 text-brand-300" />
        </span>
        <h2 className="text-sm font-semibold text-white">Active Workload by Client</h2>
        <Link href="/projects" className="ml-auto text-[11px] text-brand-300 hover:text-brand-200">View all →</Link>
      </div>
      {active.length === 0 ? (
        <EmptyState title="No active client work" subtitle="Clients with open tasks or in-progress projects will appear here." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
          {active.map((w) => (
            <Link
              key={w.client_id}
              href={`/projects?clientId=${w.client_id}`}
              className="rounded-xl bg-white/[0.03] border border-white/10 p-3 block hover:bg-white/[0.06] hover:border-brand-300/30 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-white truncate">{w.client_company || w.client_name}</p>
                <ChevronRight className="h-3.5 w-3.5 text-slate-600 shrink-0" />
              </div>
              <div className="flex items-center gap-2 mt-2 text-[11px]">
                <span className="badge bg-amber-400/10 text-amber-300">{w.open_tasks} open tasks</span>
                <span className="badge bg-sky-400/10 text-sky-300">{w.subtasks} subtasks</span>
                {w.active_projects > 0 && <span className="badge bg-brand-300/10 text-brand-300">{w.active_projects} active</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const firstName = session.name.split(" ")[0];

  if (STAFF_ROLES.includes(session.role_key) || session.dashboard === "staff") {
    const tasks = await getMyTasks(session.sub).catch(() => [] as import("@/lib/types").Task[]);
    const team = await getTeam().catch(() => [] as import("@/lib/types").UserRow[]);
    const open = tasks.filter((t: import("@/lib/types").Task) => t.status !== "completed");
    return (
      <div className="w-full max-w-none space-y-4 md:space-y-6 overflow-x-hidden">
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
        <PushNotificationPrompt />
        {session.role_key === "SMM" ? (
          <SmmDashboard tasks={tasks} team={team} userId={session.sub} roleKey={session.role_key} permissions={session.permissions} />
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
      <div className="space-y-4 md:space-y-6 overflow-x-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Business Development</h1>
            <p className="text-sm text-slate-400">Your projects and their production status.</p>
          </div>
          <Link href="/clients" className="btn-primary !py-2 text-xs">
            + Add Tasks
          </Link>
        </div>
        <PushNotificationPrompt />

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
  const pmScope = session.role_key === "PROJECT_MANAGER" ? session.sub : null;
  const showTaskMetrics = isSuperAdmin || pmScope !== null;
  let projects: any[] = [];
  let clients: any[] = [];
  let leadStats: any = null;
  let taskCounts: Record<string, number> = {};
  let subtaskCounts: Record<string, number> = {};
  let submittedTasks: any[] = [];
  let workload: ClientWorkload[] = [];
  let activity: ActivityLogRow[] = [];
  try {
    [projects, clients, leadStats, taskCounts, subtaskCounts, submittedTasks, workload] = await Promise.all([
      getProjects(pmScope).catch(() => [] as any),
      getClients(pmScope).catch(() => [] as any),
      isSuperAdmin ? getLeadStats(null).catch(() => null as any) : Promise.resolve(null as any),
      showTaskMetrics ? getTaskStatusCounts(pmScope).catch(() => ({} as Record<string, number>)) : Promise.resolve({} as Record<string, number>),
      showTaskMetrics ? getSubtaskStatusCounts(pmScope).catch(() => ({} as Record<string, number>)) : Promise.resolve({} as Record<string, number>),
      getSubmittedTasks(pmScope).catch(() => [] as any),
      getClientWorkload(pmScope).catch(() => [] as any),
    ]);
    if (isSuperAdmin) {
      activity = await getRecentActivity(60).catch(() => [] as ActivityLogRow[]);
    }
  } catch {
    // Fallback: individual catches already return safe defaults, this is absolute safety
    projects = projects || [];
    clients = clients || [];
  }
  const active = projects.filter((p) => p.status === "in_progress");

  const reviewTasks = submittedTasks.map((t: any): { id: string; title: string; subtitle: string; href: string } => ({
    id: `task-${t.id}`,
    title: t.title,
    subtitle: `${t.project_name} — ${t.role_label || t.role_key}`,
    href: `/projects?taskId=${t.id}`,
  }));

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
    const totalSubtasks = Object.values(subtaskCounts).reduce((a, b) => a + b, 0);

    return (
      <div className="space-y-4 md:space-y-5 overflow-x-hidden">
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
            <DashboardActivityLogTrigger activity={activity} />
            <Link href="/settings" className="btn-secondary !py-2 text-xs">
              <Download className="h-3.5 w-3.5" /> Export Report
            </Link>
          </div>
        </div>
        <PushNotificationPrompt />

        {/* ── Row 1: project + client stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Link href="/projects" className="card p-3 md:p-4 hover:bg-white/[0.06] transition-colors block">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-7 w-7 rounded-lg bg-violet-400/15 flex items-center justify-center">
                <Briefcase className="h-3.5 w-3.5 text-violet-400" />
              </span>
              <p className="text-xs text-slate-400">Total Projects</p>
            </div>
            <p className="text-2xl md:text-3xl font-bold tracking-tight text-white">{projects.length}</p>
          </Link>
          <Link href="/clients" className="card p-3 md:p-4 hover:bg-white/[0.06] transition-colors block">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-7 w-7 rounded-lg bg-sky-400/15 flex items-center justify-center">
                <Users className="h-3.5 w-3.5 text-sky-400" />
              </span>
              <p className="text-xs text-sky-300">Total Clients</p>
            </div>
            <p className="text-2xl md:text-3xl font-bold tracking-tight text-sky-300">{clients.length}</p>
          </Link>
          <Link href="/projects" className="card p-3 md:p-4 hover:bg-white/[0.06] transition-colors block">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-7 w-7 rounded-lg bg-brand-300/15 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-brand-300" />
              </span>
              <p className="text-xs text-brand-300">In Progress</p>
            </div>
            <p className="text-2xl md:text-3xl font-bold tracking-tight text-brand-300">{active.length}</p>
          </Link>
          <Link href="/projects" className="card p-3 md:p-4 hover:bg-white/[0.06] transition-colors block">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-7 w-7 rounded-lg bg-emerald-400/15 flex items-center justify-center">
                <FolderKanban className="h-3.5 w-3.5 text-emerald-400" />
              </span>
              <p className="text-xs text-emerald-300">Completed</p>
            </div>
            <p className="text-2xl md:text-3xl font-bold tracking-tight text-emerald-300">{projects.filter((p) => p.status === "completed").length}</p>
          </Link>
        </div>

        {/* ── Row 2: All Tasks + All Subtasks + Leads ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* All Tasks — tasks */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-7 w-7 rounded-lg bg-sky-400/15 flex items-center justify-center">
                <ClipboardList className="h-3.5 w-3.5 text-sky-300" />
              </span>
              <h2 className="text-sm font-semibold text-white">All Tasks</h2>
              <span className="ml-auto text-xs text-slate-500">{totalTasks} Total</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "approved", label: "Ready to Start", cls: "bg-emerald-400/10 border-emerald-400/20 text-emerald-300" },
                { key: "in_progress", label: "In Process", cls: "bg-brand-300/10 border-brand-300/20 text-brand-300" },
                { key: "completed", label: "Completed", cls: "bg-emerald-400/10 border-emerald-400/20 text-emerald-300" },
                { key: "upload_done", label: "Upload Done", cls: "bg-sky-400/10 border-sky-400/20 text-sky-300" },
              ].map((s) => (
                <Link key={s.key} href="/projects" className={`rounded-xl border p-3 text-center block hover:brightness-125 transition-all ${s.cls}`}>
                  <p className="text-[10px] md:text-[11px] opacity-80 leading-tight">{s.label}</p>
                  <p className="text-lg md:text-xl font-bold text-white mt-1">{taskCounts[s.key] || 0}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* All Subtasks — currently working subtasks */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-7 w-7 rounded-lg bg-amber-400/15 flex items-center justify-center">
                <Layers className="h-3.5 w-3.5 text-amber-300" />
              </span>
              <h2 className="text-sm font-semibold text-white">All Subtasks</h2>
              <span className="ml-auto text-xs text-slate-500">{totalSubtasks} Total</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "approved", label: "Ready to Start", cls: "bg-emerald-400/10 border-emerald-400/20 text-emerald-300" },
                { key: "in_progress", label: "In Process", cls: "bg-brand-300/10 border-brand-300/20 text-brand-300" },
                { key: "completed", label: "Completed", cls: "bg-emerald-400/10 border-emerald-400/20 text-emerald-300" },
                { key: "upload_done", label: "Upload Done", cls: "bg-sky-400/10 border-sky-400/20 text-sky-300" },
              ].map((s) => (
                <Link key={s.key} href="/projects" className={`rounded-xl border p-3 text-center block hover:brightness-125 transition-all ${s.cls}`}>
                  <p className="text-[10px] md:text-[11px] opacity-80 leading-tight">{s.label}</p>
                  <p className="text-lg md:text-xl font-bold text-white mt-1">{subtaskCounts[s.key] || 0}</p>
                </Link>
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
            <Link href="/leads" className="block rounded-xl bg-violet-400/10 border border-violet-400/20 p-3 mb-3 hover:bg-violet-400/15 transition-colors">
              <p className="text-[11px] text-violet-300">Total Leads ({leadStats?.total || 0})</p>
            </Link>
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
              {LEAD_STATUSES.map((s) => (
                <Link key={s.key} href="/leads" className="rounded-xl bg-white/[0.04] border border-white/10 p-2 text-center block hover:bg-white/[0.07] transition-colors">
                  <p className="text-[10px] text-slate-400 leading-none">{s.label}</p>
                  <p className="text-sm font-bold text-white mt-1">{leadByStatus[s.key] ?? 0}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── Row 3: Active Workload by Client ── */}
        <ClientWorkloadWidget workload={workload} />

        {/* ── Row 4: Review submitted tasks ── */}
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 px-4 md:px-5 py-3 md:py-4 border-b border-white/[0.06]">
            <ListTodo className="h-4 w-4 text-sky-400" />
            <h2 className="font-semibold text-sm">Review Submitted Tasks</h2>
            <span className="badge bg-sky-400/10 text-sky-300 ml-auto">{reviewTasks.length}</span>
          </div>
          <SubmittedTaskReview tasks={reviewTasks} />
        </div>
      </div>
    );
  }

  // PROJECT_MANAGER fallback
  return (
    <div className="space-y-4 md:space-y-5 overflow-x-hidden">
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
      <PushNotificationPrompt />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Link href="/projects" className="card card-hover p-3 md:p-5 block hover:bg-white/[0.06] transition-colors">
          <p className="text-[11px] md:text-sm text-slate-400">Total Projects</p>
          <p className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-white">{projects.length}</p>
        </Link>
        <Link href="/clients" className="card card-hover p-3 md:p-5 block hover:bg-white/[0.06] transition-colors">
          <p className="text-[11px] md:text-sm text-slate-400">Total Clients</p>
          <p className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-sky-300">{clients.length}</p>
        </Link>
        <Link href="/projects" className="card card-hover p-3 md:p-5 block hover:bg-white/[0.06] transition-colors">
          <p className="text-[11px] md:text-sm text-slate-400">In Progress</p>
          <p className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-brand-300">{active.length}</p>
        </Link>
        <Link href="/projects" className="card card-hover p-3 md:p-5 block hover:bg-white/[0.06] transition-colors">
          <p className="text-[11px] md:text-sm text-slate-400">Completed</p>
          <p className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-emerald-400">{projects.filter((p) => p.status === "completed").length}</p>
        </Link>
      </div>

      {/* ── Active Workload by Client ── */}
      <ClientWorkloadWidget workload={workload} />

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 px-4 md:px-5 py-3 md:py-4 border-b border-white/[0.06]">
          <ListTodo className="h-4 w-4 text-sky-400" />
          <h2 className="font-semibold text-sm">Review Submitted Tasks</h2>
          <span className="badge bg-sky-400/10 text-sky-300 ml-auto">{reviewTasks.length}</span>
        </div>
        <SubmittedTaskReview tasks={reviewTasks} />
      </div>
    </div>
  );
}