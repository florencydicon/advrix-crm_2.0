import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAnalytics, getBottlenecks } from "@/lib/data";
import { Stat, ProjectStatusBadge } from "@/components/ui";

export const metadata = { title: "Analytics — Advrix CRM" };

export default async function AnalyticsPage() {
  const session = (await getSession())!;
  if (!["SUPER_ADMIN", "PROJECT_MANAGER"].includes(session.role_key)) redirect("/dashboard");

  const [analytics, bottlenecks] = await Promise.all([getAnalytics(), getBottlenecks()]);
  const completionRate = analytics.totalTasks ? Math.round((analytics.completedTasks / analytics.totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Agency Analytics</h1>
        <p className="text-sm text-slate-500">High-level output, throughput, and pipeline health.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total Projects" value={analytics.totalProjects} />
        <Stat label="In Production" value={analytics.inProgress} accent="text-brand-600" />
        <Stat label="Delivered" value={analytics.completedProjects} accent="text-emerald-600" />
        <Stat label="Awaiting Approval" value={analytics.pendingApproval} accent="text-amber-600" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-semibold mb-4">Task completion by department</h2>
          <div className="space-y-3">
            {analytics.tasksByRole.map((r) => {
              const pct = r.total ? Math.round((r.completed / r.total) * 100) : 0;
              return (
                <div key={r.role_label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-700 font-medium">{r.role_label}</span>
                    <span className="text-slate-400 text-xs">{r.completed}/{r.total} · {pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-600">Overall throughput</span>
            <span className="text-sm font-bold text-ink">{completionRate}%</span>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold mb-4">Current bottlenecks</h2>
          {bottlenecks.length === 0 ? (
            <p className="text-sm text-slate-400">No open blockers — pipeline is flowing.</p>
          ) : (
            <div className="space-y-2">
              {bottlenecks.map((b) => (
                <div key={b.task_id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{b.title}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {b.project_name} · {b.assignee_name || "Unassigned"}
                    </p>
                  </div>
                  <span className="badge shrink-0 bg-amber-100 text-amber-700">{b.days_open}d</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold">Recent campaigns</h2>
          <Link href="/projects" className="text-sm text-brand-600 flex items-center gap-1">
            Pipeline board <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {analytics.recentProjects.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                <p className="text-xs text-slate-400 truncate">{p.client_name} · {new Date(p.created_at).toLocaleDateString()}</p>
              </div>
              <ProjectStatusBadge status={p.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}