import Link from "next/link";
import { AlertTriangle, FolderKanban, Users, CheckCircle2 } from "lucide-react";
import { getSession } from "@/lib/session";
import { getMyTasks, getBottlenecks, getProjects, getTeam } from "@/lib/data";
import StaffDashboard from "@/components/StaffDashboard";
import { Stat, ProjectStatusBadge, EmptyState } from "@/components/ui";

const STAFF_ROLES = ["WRITER", "DESIGNER", "EDITOR", "SMM"];

export default async function DashboardPage() {
  const session = (await getSession())!;

  if (STAFF_ROLES.includes(session.role_key)) {
    const tasks = await getMyTasks(session.sub);
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold">My Workspace</h1>
          <p className="text-sm text-slate-500">Welcome back, {session.name.split(" ")[0]}. Here are your assignments.</p>
        </div>
        <StaffDashboard tasks={tasks} roleKey={session.role_key} />
      </div>
    );
  }

  if (session.role_key === "SALES") {
    const projects = await getProjects();
    const mine = projects.filter((p) => p.created_by === session.sub);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Business Development</h1>
            <p className="text-sm text-slate-500">Your briefs and their approval status.</p>
          </div>
          <Link href="/clients" className="btn-primary">
            + New Brief
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Your Briefs" value={mine.length} />
          <Stat label="Awaiting Approval" value={mine.filter((p) => p.status === "pending_approval").length} accent="text-amber-600" />
          <Stat label="In Production" value={mine.filter((p) => p.status === "in_progress").length} accent="text-brand-600" />
          <Stat label="Delivered" value={mine.filter((p) => p.status === "completed").length} accent="text-emerald-600" />
        </div>

        {mine.length === 0 ? (
          <EmptyState title="No briefs yet" subtitle="Create your first client brief from the Clients page." />
        ) : (
          <div className="card divide-y divide-slate-100">
            {mine.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-400 truncate">{p.brief}</p>
                </div>
                <ProjectStatusBadge status={p.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // PROJECT_MANAGER + SUPER_ADMIN command center
  const projects = await getProjects();
  const bottlenecks = await getBottlenecks();
  const team = await getTeam();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Command Center</h1>
        <p className="text-sm text-slate-500">Live overview of every active campaign.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Active Campaigns" value={projects.filter((p) => p.status === "in_progress").length} accent="text-brand-600" />
        <Stat label="Awaiting Approval" value={projects.filter((p) => p.status === "pending_approval").length} accent="text-amber-600" />
        <Stat label="Completed" value={projects.filter((p) => p.status === "completed").length} accent="text-emerald-600" />
        <Stat label="Team Members" value={team.length} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h2 className="font-semibold">Bottlenecks — holding up production</h2>
          </div>
          {bottlenecks.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-400">Nothing blocking the pipeline right now.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {bottlenecks.map((b) => (
                <div key={b.task_id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{b.title}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {b.project_name} · {b.assignee_name || "Unassigned"} {b.role_label ? `(${b.role_label})` : ""}
                    </p>
                  </div>
                  <span className={`badge shrink-0 ${b.days_open > 5 ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                    {b.days_open}d open
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <h2 className="font-semibold">Awaiting your approval</h2>
          </div>
          {projects.filter((p) => p.status === "pending_approval").length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-400">No briefs waiting for approval.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {projects.filter((p) => p.status === "pending_approval").map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                    <p className="text-xs text-slate-400 truncate">{p.client_name}</p>
                  </div>
                  <Link href="/projects" className="btn-secondary !py-1.5 text-xs shrink-0">
                    Review
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Link href="/projects" className="btn-secondary">
        <FolderKanban className="h-4 w-4" />
        Open full pipeline board
      </Link>
    </div>
  );
}