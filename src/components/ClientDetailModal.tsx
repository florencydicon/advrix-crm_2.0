"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { X, Search, FolderKanban, Layers, ExternalLink, CalendarDays, Pencil, Trash2, Check } from "lucide-react";
import type { ClientCard, ClientDetailProject, ClientDetailTask } from "@/lib/data";
import { getClientDetailAction, updateProjectAction, deleteProjectAction } from "@/lib/actions/projects";
import { StatusBadge, PriorityBadge } from "@/components/ui";
import { useToast } from "@/components/Toast";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]?.toUpperCase()||"").join("");
}

export default function ClientDetailModal({
  client,
  open,
  onClose,
}: {
  client: ClientCard | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [projects, setProjects] = useState<ClientDetailProject[]>([]);
  const [tasks, setTasks] = useState<ClientDetailTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !client) return;
    setSearch("");
    setLoading(true);
    getClientDetailAction(client.id).then((res: any) => {
      if (res.ok) {
        setProjects(res.projects || []);
        setTasks(res.tasks || []);
      }
      setLoading(false);
    });
  }, [open, client]);

  // Lock body scroll + Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  const refreshDetail = async () => {
    if (!client) return;
    const res: any = await getClientDetailAction(client.id);
    if (res.ok) {
      setProjects(res.projects || []);
      setTasks(res.tasks || []);
      router.refresh();
    }
  };

  const handleEditProject = async (id: string) => {
    const clean = editName.trim();
    if (!clean || clean.length < 3) { toast("Project name too short.", "error"); return; }
    setSaving(true);
    const res: any = await updateProjectAction(id, { name: clean });
    setSaving(false);
    if (res.error) { toast(res.error, "error"); return; }
    toast("Project updated.", "success");
    setEditingId(null);
    setEditName("");
    await refreshDetail();
  };

  const handleDeleteProject = async (p: ClientDetailProject) => {
    if (!window.confirm(`Delete project "${p.name}" and all its ${p.total_tasks} task(s)? This cannot be undone.`)) return;
    setSaving(true);
    const res: any = await deleteProjectAction(p.id);
    setSaving(false);
    if (res.error) { toast(res.error, "error"); return; }
    toast("Project deleted.", "success");
    await refreshDetail();
  };

  const q = search.trim().toLowerCase();
  const filteredProjects = useMemo(() => {
    if (!q) return projects;
    return projects.filter(p => `${p.name} ${p.status}`.toLowerCase().includes(q));
  }, [projects, q]);
  const filteredTasks = useMemo(() => {
    if (!q) return tasks;
    return tasks.filter(t => `${t.title} ${t.project_name} ${t.status}`.toLowerCase().includes(q));
  }, [tasks, q]);

  if (!open || !client) return null;

  const goPipeline = (params: string) => {
    onClose();
    router.push(`/projects${params}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:justify-center md:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative flex w-full max-h-[92dvh] md:max-h-[85vh] md:max-w-2xl flex-col overflow-hidden rounded-t-2xl md:rounded-2xl bg-night-850 shadow-2xl shadow-black/50 ring-1 ring-white/10">
        {/* Drag handle mobile */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>
        {/* Header */}
        <div className="shrink-0 flex items-start gap-3 px-5 py-4 border-b border-white/[0.06]">
          <div className="h-10 w-10 rounded-xl bg-brand-300/10 flex items-center justify-center shrink-0 text-brand-300 font-bold text-sm">
            {initials(client.company || client.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm text-white truncate">{client.company || client.name}</h3>
            <p className="text-xs text-slate-400 truncate">
              {client.company ? `Contact: ${client.name}` : client.email || client.phone || ""} · <span className="text-slate-500">{client.total_projects} projects · {client.active_projects} active</span>
            </p>
          </div>
          <button onClick={onClose} className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors shrink-0" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="shrink-0 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects, tasks..."
              className="w-full rounded-lg border border-white/10 bg-night-900 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-300/20"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-500 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 pb-24 md:pb-4">
          {loading ? (
            <div className="py-10 text-center">
              <div className="h-6 w-6 border-2 border-brand-300 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 mt-2">Loading projects & tasks...</p>
            </div>
          ) : (
            <>
              {/* Projects */}
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <FolderKanban className="h-3.5 w-3.5 text-brand-300" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Projects</h4>
                  <span className="badge bg-white/5 text-slate-400">{filteredProjects.length}/{projects.length}</span>
                </div>
                {filteredProjects.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2">{q ? "No projects match search." : "No projects for this client yet."}</p>
                ) : (
                  <div className="space-y-1.5">
                    {filteredProjects.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-xl border border-white/10 bg-white/[0.03] p-3 hover:bg-white/[0.06] transition-colors"
                      >
                        {editingId === p.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") handleEditProject(p.id); if (e.key === "Escape") { setEditingId(null); setEditName(""); } }}
                              className="input !py-1 text-sm flex-1"
                              autoFocus
                              placeholder="Project name"
                            />
                            <button onClick={() => handleEditProject(p.id)} disabled={saving} className="btn-primary !py-1 !px-2 text-xs shrink-0">
                              <Check className="h-3.5 w-3.5" /> Save
                            </button>
                            <button onClick={() => { setEditingId(null); setEditName(""); }} className="btn-ghost !py-1 !px-2 text-xs shrink-0">Cancel</button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => goPipeline(`?clientId=${client.id}&project=${encodeURIComponent(p.name)}`)}
                              className="w-full text-left"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium text-white truncate pr-2">{p.name}</p>
                                <span className={`badge shrink-0 text-[10px] ${p.status === "completed" ? "bg-emerald-400/10 text-emerald-300" : p.status === "in_progress" ? "bg-brand-300/10 text-brand-300" : "bg-white/10 text-slate-400"}`}>{p.status}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                                <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {p.total_tasks} tasks</span>
                                <span>· {p.completed_tasks} done</span>
                                {p.deadline && <span className="ml-auto flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {p.deadline.slice(0,10)}</span>}
                                <ExternalLink className="h-3 w-3 text-slate-600 ml-auto" />
                              </div>
                            </button>
                            <div className="flex items-center gap-1.5 mt-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditingId(p.id); setEditName(p.name); }}
                                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/10 transition-colors"
                              >
                                <Pencil className="h-3 w-3" /> Edit
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteProject(p); }}
                                disabled={saving}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-300 hover:bg-rose-500/20 disabled:opacity-50 transition-colors"
                              >
                                <Trash2 className="h-3 w-3" /> Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Tasks */}
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="h-3.5 w-3.5 text-violet-300" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tasks</h4>
                  <span className="badge bg-white/5 text-slate-400">{filteredTasks.length}/{tasks.length}</span>
                </div>
                {filteredTasks.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2">{q ? "No tasks match search." : "No tasks yet — create via Add Tasks."}</p>
                ) : (
                  <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
                    {filteredTasks.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => goPipeline(`?taskId=${t.id}`)}
                        className="w-full text-left rounded-xl border border-white/10 bg-white/[0.03] p-3 hover:bg-white/[0.06] transition-colors"
                      >
                        <p className="text-sm font-medium text-white truncate pr-2">{t.title}</p>
                        <p className="text-xs text-slate-500 truncate">{t.project_name}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <StatusBadge status={t.status} />
                          <PriorityBadge priority={t.priority} />
                          {t.due_date && <span className="ml-auto text-[11px] text-slate-500">{t.due_date.slice(0,10)}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center gap-2 px-5 py-3 border-t border-white/[0.06] bg-white/[0.02]">
          <button onClick={() => goPipeline(`?clientId=${client.id}`)} className="btn-primary flex-1 !py-2 text-xs">
            <ExternalLink className="h-3.5 w-3.5" /> View in Pipeline
          </button>
          <button onClick={onClose} className="btn-ghost">Close</button>
        </div>
      </div>

      {/* Mobile FAB */}
      <button onClick={onClose} aria-label="Close" className="md:hidden fixed bottom-24 right-6 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-gray-800 text-white shadow-2xl border border-gray-600 active:scale-95 transition-transform">
        <X className="h-6 w-6" />
      </button>
    </div>
  );
}
