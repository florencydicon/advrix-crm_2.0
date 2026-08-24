import Link from "next/link";
import { FolderKanban, CheckCircle2, Sparkles, Target, ClipboardList, Briefcase } from "lucide-react";
import { getSession } from "@/lib/session";
import { getMyTasks, getProjects, getLeadStats, getTaskStatusCounts } from "@/lib/data";
import StaffDashboard from "@/components/StaffDashboard";
import SmmDashboard from "@/components/SmmDashboard";
import { Stat, ProjectStatusBadge, EmptyState, STATUS_META } from "@/components/ui";
import { LEAD_STATUSES } from "@/lib/types";

const STAFF_ROLES = ["WRITER", "DESIGNER", "EDITOR", "SMM"];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const session = (await getSession())!;
  const firstName = session.name.split(" ")[0];

  if (STAFF_ROLES.includes(session.role_key)) {
    const tasks = await getMyTasks(session.sub);
    const open = tasks.filter((t) => t.status !== "completed");
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="rounded-2xl bg-gradient-to-br from-brand-300 to-brand-500 p-6 text-night-950 shadow-lg shadow-brand-300/20">
          <div className="flex items-center gap-2 text-night-950/70">
            <Sparkles className="h-4 w-4" />
            <p className="text-sm font-medium">{greeting()}, {firstName}</p>
          </div>
          <h1 className="text-2xl font-bold mt-1 tracking-tight">My Workspace</h1>
          <p className="text-sm text-night-950/70 mt-1">
            {open.length > 0
              ? `You have ${open.length} open task${open.length === 1 ? "" : "s"} waiting for you.`
              : "All clear — no open tasks assigned to you."}
          </p>
        </div>
        {session.role_key === "SMM" ? (
          <SmmDashboard tasks={tasks} userId={session.sub} />
        ) : (
          <StaffDashboard tasks={tasks} roleKey={session.role_key} userId={session.sub} />
        )}
      </div>
    );
  }

  if (session.role_key === "SALES") {
    const projects = await getProjects();
    const mine = projects.filter((p) => p.created_by === session.sub);
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Business Development</h1>
            <p className="text-sm text-slate-400">Your projects and their approval status.</p>
          </div>
          <Link href="/clients" className="btn-primary">
            + Add Tasks
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="My Projects" value={mine.length} />
          <Stat label="Awaiting Approval" value={mine.filter((p) => p.status === "pending_approval").length} accent="text-amber-400" />
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
  const [projects, leadStats, taskCounts] = await Promise.all([
    getProjects(),
    isSuperAdmin ? getLeadStats(null) : Promise.resolve(null as any),
    isSuperAdmin ? getTaskStatusCounts() : Promise.resolve({} as Record<string, number>),
  ]);
  const pending = projects.filter((p) => p.status === "pending_approval");
  const active = projects.filter((p) => p.status === "in_progress");

  // Super Admin — three distinct cards
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
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Command Center</h1>
          <p className="text-sm text-slate-400">Super Admin overview — projects, tasks & leads at a glance.</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Card 1 — Projects */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-7 w-7 rounded-lg bg-brand-300/15 flex items-center justify-center"><Briefcase className="h-3.5 w-3.5 text-brand-300" /></span>
              <h2 className="text-sm font-semibold text-white">Projects</h2>
            </div>
            <div className="flex items-center justify-center gap-4">
              <div className="rounded-lg bg-white/[0.04] border border-white/10 p-3 flex-1 min-w-[120px] text-center">
                <p className="text-[11px] text-slate-400">Total Projects</p>
                <p className="text-xl font-bold text-white mt-0.5">{projects.length}</p>
              </div>
              <div className="rounded-lg bg-amber-400/10 border border-amber-400/20 p-3 flex-1 min-w-[120px] text-center">
                <p className="text-[11px] text-amber-300">Pending Approval</p>
                <p className="text-xl font-bold text-amber-300 mt-0.5">{pending.length}</p>
              </div>
              <div className="rounded-lg bg-brand-300/10 border border-brand-300/20 p-3 flex-1 min-w-[120px] text-center">
                <p className="text-[11px] text-brand-300">In Progress</p>
                <p className="text-xl font-bold text-brand-300 mt-0.5">{active.length}</p>
              </div>
              <div className="rounded-lg bg-emerald-400/10 border border-emerald-400/20 p-3 flex-1 min-w-[120px] text-center">
                <p className="text-[11px] text-emerald-300">Completed</p>
                <p className="text-xl font-bold text-emerald-300 mt-0.5">{projects.filter((p) => p.status === "completed").length}</p>
              </div>
            </div>
          </div>

          {/* Card 2 — All Tasks Status */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-7 w-7 rounded-lg bg-sky-400/15 flex items-center justify-center"><ClipboardList className="h-3.5 w-3.5 text-sky-300" /></span>
              <h2 className="text-sm font-semibold text-white">All Tasks</h2>
              <span className="ml-auto text-xs text-slate-500">{totalTasks} total</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(STATUS_META).map(([key, meta]) => {
                const count = taskCounts[key] || 0;
                const Icon = meta.Icon;
                return (
                  <div key={key} className={`rounded-lg border p-2.5 flex flex-col gap-1 ${meta.cls} bg-opacity-10 border-white/10`}>
                    <span className="flex items-center gap-1 text-[10px] leading-none opacity-80"><Icon className="h-3 w-3" />{meta.label}</span>
                    <span className="text-lg font-bold leading-none">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 3 — Leads */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-7 w-7 rounded-lg bg-violet-400/15 flex items-center justify-center"><Target className="h-3.5 w-3.5 text-violet-300" /></span>
              <h2 className="text-sm font-semibold text-white">Leads</h2>
              <Link href="/leads" className="ml-auto text-[11px] text-violet-300 hover:text-violet-200">View →</Link>
            </div>
            <div className="rounded-lg bg-violet-400/10 border border-violet-400/20 p-3 mb-2">
              <p className="text-[11px] text-violet-300">Total Leads</p>
              <p className="text-2xl font-bold text-white mt-0.5">{leadStats?.total || 0}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {LEAD_STATUSES.map((s) => (
                <div key={s.key} className="rounded-lg bg-white/[0.04] border border-white/10 p-2 text-center">
                  <p className="text-[10px] text-slate-400 leading-none">{s.label}</p>
                  <p className="text-sm font-bold text-white mt-1">{leadByStatus[s.key] ?? 0}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06]">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <h2 className="font-semibold">Projects awaiting approval</h2>
            <span className="badge bg-amber-400/10 text-amber-300 ml-auto">{pending.length}</span>
          </div>
          {pending.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">Nothing waiting for approval.</p>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {pending.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-white/[0.04] transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{p.name}</p>
                    <p className="text-xs text-slate-500 truncate">{p.client_name}</p>
                  </div>
                  <Link href="/projects" className="btn-secondary !py-1.5 text-xs shrink-0">Review</Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <Link href="/projects" className="btn-secondary">
          <FolderKanban className="h-4 w-4" /> Open full pipeline board
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Command Center</h1>
        <p className="text-sm text-slate-400">Live overview of every active campaign.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total Projects" value={projects.length} />
        <Stat label="Pending Approval" value={pending.length} accent="text-amber-400" />
        <Stat label="In Progress" value={active.length} accent="text-brand-300" />
        <Stat label="Completed" value={projects.filter((p) => p.status === "completed").length} accent="text-emerald-400" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06]">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <h2 className="font-semibold">Projects awaiting approval</h2>
          <span className="badge bg-amber-400/10 text-amber-300 ml-auto">{pending.length}</span>
        </div>
        {pending.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">Nothing waiting for approval.</p>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {pending.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-white/[0.04] transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{p.name}</p>
                  <p className="text-xs text-slate-500 truncate">{p.client_name}</p>
                </div>
                <Link href="/projects" className="btn-secondary !py-1.5 text-xs shrink-0">
                  Review
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link href="/projects" className="btn-secondary">
        <FolderKanban className="h-4 w-4" />
        Open full pipeline board
      </Link>
    </div>
  );
}