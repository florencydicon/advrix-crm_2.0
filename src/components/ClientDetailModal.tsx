"use client";

import { useEffect, useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Search, FolderKanban, Layers, ExternalLink, CalendarDays, Pencil, Trash2, Check, ArrowLeft, Plus, Tags } from "lucide-react";
import type { ClientCard, ClientDetailProject, ClientDetailTask } from "@/lib/data";
import type { DeliverableType } from "@/lib/types";
import { getClientDetailAction, updateProjectAction, deleteProjectAction, getProjectEditDataAction, addTasksToProjectAction } from "@/lib/actions/projects";
import { StatusBadge, PriorityBadge } from "@/components/ui";
import { SearchableSelect } from "@/components/SearchableSelect";
import { DatePicker } from "@/components/DatePicker";
import { useToast } from "@/components/Toast";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]?.toUpperCase()||"").join("");
}

function DeliverablesPicker({
  types,
  quantities,
  setQuantities,
  custom,
  setCustom,
  customLabel,
  setCustomLabel,
  customQty,
  setCustomQty,
  taskTitles,
  setTaskTitles,
}: {
  types: DeliverableType[];
  quantities: Record<string, number>;
  setQuantities: (fn: (prev: Record<string, number>) => Record<string, number>) => void;
  custom: boolean;
  setCustom: (v: boolean) => void;
  customLabel: string;
  setCustomLabel: (v: string) => void;
  customQty: number;
  setCustomQty: (v: number) => void;
  taskTitles?: Record<string, string[]>;
  setTaskTitles?: (fn: (prev: Record<string, string[]>) => Record<string, string[]>) => void;
}) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const selected = [
    ...types.filter((t) => (quantities[t.key] || 0) > 0).map((t) => ({ key: t.key, label: t.label, quantity: quantities[t.key] || 0, isCustom: false })),
    ...(custom && customLabel.trim() && customQty > 0 ? [{ key: "custom", label: customLabel.trim(), quantity: customQty, isCustom: true }] : []),
  ];
  const total = selected.reduce((s, d) => s + d.quantity, 0);
  const ensureTitles = (key: string, qty: number, label: string) => {
    if (!setTaskTitles) return;
    setTaskTitles((prev) => {
      const cur = prev[key] || [];
      if (cur.length === qty) return prev;
      const next = [...cur];
      if (next.length < qty) {
        for (let i = next.length; i < qty; i++) next.push(`${label} ${pad(i + 1)}`);
      } else {
        next.length = qty;
      }
      return { ...prev, [key]: next };
    });
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {types.map((t) => {
          const q = quantities[t.key] || 0;
          return (
            <div key={t.key} className="rounded-lg border border-white/10 p-2 bg-white/[0.03]">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-slate-200">{t.label}</p>
                <input
                  type="number"
                  min={0}
                  max={500}
                  value={q}
                  onChange={(e) => {
                    const v = Math.max(0, Math.min(500, Number(e.target.value) || 0));
                    setQuantities((prev) => ({ ...prev, [t.key]: v }));
                    if (setTaskTitles) ensureTitles(t.key, v, t.label);
                  }}
                  className="input !w-14 !py-0.5 text-center text-xs"
                />
              </div>
              {q > 0 && <p className="text-[10px] text-brand-300 mt-1">{q} task{q === 1 ? "" : "s"} will be added</p>}
            </div>
          );
        })}
      </div>
      <div className="rounded-lg border border-dashed border-white/10 p-2 space-y-1.5">
        <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
          <input
            type="checkbox"
            checked={custom}
            onChange={(e) => {
              const v = e.target.checked;
              setCustom(v);
              if (setTaskTitles) {
                if (v && customLabel.trim()) ensureTitles("custom", customQty, customLabel.trim());
                else if (!v) setTaskTitles((prev) => { const n = { ...prev }; delete n["custom"]; return n; });
              }
            }}
            className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-brand-300"
          />
          Other (custom task)
        </label>
        {custom && (
          <div className="flex items-center gap-2">
            <input
              value={customLabel}
              onChange={(e) => {
                const v = e.target.value;
                setCustomLabel(v);
                if (setTaskTitles && v.trim()) ensureTitles("custom", customQty, v.trim());
              }}
              className="input !py-1 text-xs flex-1"
              placeholder="e.g. Festival Reel, Story..."
            />
            <input
              type="number"
              min={1}
              max={500}
              value={customQty}
              onChange={(e) => {
                const v = Math.max(1, Math.min(500, Number(e.target.value) || 1));
                setCustomQty(v);
                if (setTaskTitles && customLabel.trim()) ensureTitles("custom", v, customLabel.trim());
              }}
              className="input !w-14 !py-1 text-center text-xs shrink-0"
            />
          </div>
        )}
      </div>
      <div className="rounded-lg bg-brand-300/10 border border-brand-300/20 p-3">
        <div className="flex items-center gap-1.5 mb-1.5"><Tags className="h-3.5 w-3.5 text-brand-300" /><p className="text-xs font-semibold text-brand-200">Generated Tasks Preview — tap to rename</p></div>
        {total === 0 ? (
          <p className="text-[11px] text-slate-500">Set quantities above to preview tasks.</p>
        ) : (
          <div className="space-y-2 max-h-[32vh] overflow-y-auto pr-1">
            {selected.map((d) => (
              <div key={d.key} className="space-y-1">
                <p className="text-[10px] font-medium text-slate-400">{d.label} × {d.quantity}</p>
                <div className="grid grid-cols-1 gap-1">
                  {Array.from({ length: d.quantity }, (_, i) => {
                    const key = d.key;
                    const current = taskTitles?.[key]?.[i] ?? `${d.label} ${pad(i + 1)}`;
                    return (
                      <input
                        key={`${d.key}-${i}`}
                        value={current}
                        onChange={(e) => {
                          if (!setTaskTitles) return;
                          const v = e.target.value;
                          setTaskTitles((prev) => {
                            const arr = [...(prev[key] || Array.from({ length: d.quantity }, (_, k) => `${d.label} ${pad(k + 1)}`))];
                            while (arr.length < d.quantity) arr.push(`${d.label} ${pad(arr.length + 1)}`);
                            arr[i] = v;
                            return { ...prev, [key]: arr };
                          });
                        }}
                        placeholder={`${d.label} ${pad(i + 1)}`}
                        className="w-full rounded-lg border border-white/10 bg-night-900 px-2.5 py-1 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-300/30"
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        {total > 0 && <p className="text-[10px] text-brand-300 mt-1.5">{total} task(s) — titles are editable above.</p>}
      </div>
    </div>
  );
}

export default function ClientDetailModal({
  client,
  open,
  onClose,
  deliverableTypes = [],
}: {
  client: ClientCard | null;
  open: boolean;
  onClose: () => void;
  deliverableTypes?: DeliverableType[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [projects, setProjects] = useState<ClientDetailProject[]>([]);
  const [tasks, setTasks] = useState<ClientDetailTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editingProject, setEditingProject] = useState<ClientDetailProject | null>(null);
  const [editName, setEditName] = useState("");
  const [editBrief, setEditBrief] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editPriority, setEditPriority] = useState("medium");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [custom, setCustom] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customQty, setCustomQty] = useState(1);
  const [taskTitles, setTaskTitles] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  const refreshDetail = async () => {
    if (!client) return;
    const res: any = await getClientDetailAction(client.id);
    if (res.ok) {
      setProjects(res.projects || []);
      setTasks(res.tasks || []);
      router.refresh();
    }
  };

  useEffect(() => {
    if (!open || !client) return;
    setSearch("");
    setEditingProject(null);
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
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { if (editingProject) setEditingProject(null); else onClose(); } };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose, editingProject]);

  const startEdit = async (p: ClientDetailProject) => {
    setEditingProject(p);
    setEditName(p.name);
    setEditBrief("");
    setEditDeadline(p.deadline ? p.deadline.slice(0,10) : "");
    setEditPriority("medium");
    setQuantities({});
    setTaskTitles({});
    setCustom(false);
    setCustomLabel("");
    setCustomQty(1);
    const res: any = await getProjectEditDataAction(p.id);
    if (res.ok) {
      setEditName(res.project.name || p.name);
      setEditBrief(res.project.brief || "");
      setEditDeadline(res.project.deadline ? res.project.deadline.slice(0,10) : "");
      const q: Record<string, number> = {};
      const titles: Record<string, string[]> = {};
      let foundCustom = false;
      const projTasks = tasks.filter((t) => t.project_name === p.name);
      let taskIdx = 0;
      for (const d of res.deliverables || []) {
        const label = d.is_custom && d.custom_label ? d.custom_label : d.category_label;
        if (d.is_custom) {
          if (!foundCustom) {
            setCustom(true);
            setCustomLabel(d.custom_label || d.category_label || "");
            setCustomQty(d.quantity || 1);
            foundCustom = true;
            const arr: string[] = [];
            for (let i = 0; i < d.quantity; i++) {
              if (taskIdx < projTasks.length) arr.push(projTasks[taskIdx++].title);
              else arr.push(`${label} ${String(i + 1).padStart(2, "0")}`);
            }
            titles["custom"] = arr;
          }
        } else {
          q[d.category_key] = d.quantity;
          const arr: string[] = [];
          for (let i = 0; i < d.quantity; i++) {
            if (taskIdx < projTasks.length) arr.push(projTasks[taskIdx++].title);
            else arr.push(`${label} ${String(i + 1).padStart(2, "0")}`);
          }
          titles[d.category_key] = arr;
        }
      }
      setQuantities(q);
      if (Object.keys(titles).length > 0) setTaskTitles(titles);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingProject) return;
    const cleanName = editName.trim();
    if (!cleanName || cleanName.length < 3) { toast("Project name too short.", "error"); return; }
    setSaving(true);
    const resName: any = await updateProjectAction(editingProject.id, { name: cleanName, brief: editBrief || null, deadline: editDeadline || null });
    if (resName.error) { toast(resName.error, "error"); setSaving(false); return; }
    // Add / update tasks — include title overrides so sub-task rename works (e.g., 3 -> 4 with custom titles)
    const hasTasks = Object.values(quantities).some((v) => v > 0) || (custom && customLabel.trim() && customQty > 0) || Object.keys(taskTitles).length > 0;
    if (hasTasks) {
      const deliverables = [
        ...deliverableTypes.filter((t) => (quantities[t.key] || 0) > 0).map((t) => ({ key: t.key, label: t.label, quantity: quantities[t.key] || 0, isCustom: false })),
        ...(custom && customLabel.trim() && customQty > 0 ? [{ key: "custom", label: customLabel.trim(), quantity: customQty, isCustom: true, customLabel: customLabel.trim() }] : []),
      ];
      // If user only renamed titles without changing quantity, deliverables may be empty — still need to send titles
      // For that case, send current deliverables (so quantity stays) + titles
      let deliverablesToSend = deliverables;
      if (deliverables.length === 0 && Object.keys(taskTitles).length > 0) {
        // No quantity change but titles edited — send existing deliverables snapshot so backend can update titles
        deliverablesToSend = Object.entries(taskTitles).map(([k, arr]) => {
          const isCustomKey = k === "custom";
          const label = isCustomKey ? (customLabel || k) : (deliverableTypes.find((t) => t.key === k)?.label || k);
          return { key: isCustomKey ? "custom" : k, label, quantity: arr.length, isCustom: isCustomKey, customLabel: isCustomKey ? label : undefined };
        });
        if (deliverablesToSend.length === 0) deliverablesToSend = deliverables;
      }
      const titlesMap: Record<string, string[]> = {};
      for (const [k, arr] of Object.entries(taskTitles)) {
        const clean = arr.map((s) => String(s || "").trim()).filter(Boolean);
        if (clean.length) titlesMap[k] = clean;
      }
      const resTasks: any = await addTasksToProjectAction(
        editingProject.id,
        JSON.stringify(deliverablesToSend.length ? deliverablesToSend : deliverables),
        Object.keys(titlesMap).length ? JSON.stringify(titlesMap) : undefined,
        editPriority
      );
      if (resTasks.error) { toast(resTasks.error, "error"); setSaving(false); return; }
    }
    toast("Project updated.", "success");
    setSaving(false);
    setEditingProject(null);
    setQuantities({});
    setTaskTitles({});
    setCustom(false);
    setCustomLabel("");
    setCustomQty(1);
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

  const isEditing = !!editingProject;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:justify-center md:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative flex w-full max-h-[92dvh] md:max-h-[85vh] md:max-w-2xl flex-col overflow-hidden rounded-t-2xl md:rounded-2xl bg-night-850 shadow-2xl shadow-black/50 ring-1 ring-white/10">
        {/* Drag handle mobile */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>
        {/* Header with back nav when editing */}
        <div className="shrink-0 flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
          {isEditing ? (
            <>
              <button onClick={() => setEditingProject(null)} className="p-1.5 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white" aria-label="Back">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm text-white truncate">Edit Project</h3>
                <p className="text-xs text-slate-500 truncate">{editingProject?.name}</p>
              </div>
              <button onClick={onClose} className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <div className="h-10 w-10 rounded-xl bg-brand-300/10 flex items-center justify-center shrink-0 text-brand-300 font-bold text-sm">
                {initials(client.company || client.name)}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm text-white truncate">{client.company || client.name}</h3>
                <p className="text-xs text-slate-400 truncate">
                  {client.company ? `Contact: ${client.name}` : client.email || client.phone || ""} · <span className="text-slate-500">{client.total_projects} projects · {client.active_projects} active</span>
                </p>
              </div>
              <button onClick={onClose} className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white shrink-0" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {isEditing ? (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 pb-24 md:pb-4">
              <div>
                <label className="label">Project name</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="input" placeholder="Project name" />
              </div>
              <div>
                <label className="label">Task details <span className="text-slate-500 font-normal">(optional)</span></label>
                <textarea value={editBrief} onChange={(e) => setEditBrief(e.target.value)} rows={2} className="input" placeholder="Campaign goal, tone, audience..." />
              </div>
              <div>
                <label className="label">Add new posts / reels to this project</label>
                <p className="text-xs text-slate-500 mb-2">Existing data pre-filled (e.g., Static Post 3). Change to 4 to add one more — titles below are editable.</p>
                <DeliverablesPicker
                  types={deliverableTypes}
                  quantities={quantities}
                  setQuantities={setQuantities}
                  custom={custom}
                  setCustom={setCustom}
                  customLabel={customLabel}
                  setCustomLabel={setCustomLabel}
                  customQty={customQty}
                  setCustomQty={setCustomQty}
                  taskTitles={taskTitles}
                  setTaskTitles={setTaskTitles}
                />
              </div>
              <div>
                <label className="label">Deadline</label>
                <input type="date" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Priority <span className="text-slate-500 font-normal">(applies to this project's tasks)</span></label>
                <div className="flex gap-2">
                  {(["low", "medium", "high", "urgent"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setEditPriority(p)}
                      className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold border transition-colors ${
                        editPriority === p
                          ? p === "urgent"
                            ? "border-rose-500/60 bg-rose-500/15 text-rose-300"
                            : p === "high"
                              ? "border-rose-400/50 bg-rose-400/10 text-rose-300"
                              : p === "medium"
                                ? "border-sky-400/50 bg-sky-400/10 text-sky-300"
                                : "border-white/20 bg-white/[0.06] text-slate-200"
                          : "border-white/10 bg-white/[0.02] text-slate-500 hover:bg-white/[0.05] hover:text-slate-300"
                      }`}
                    >
                      {p === "low" ? "Low" : p === "medium" ? "Medium" : p === "high" ? "High" : "Urgent"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2 px-5 py-3 border-t border-white/[0.06] bg-white/[0.02]">
              <button onClick={() => setEditingProject(null)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={handleSaveEdit} disabled={saving || isPending} className="btn-primary flex-1 !py-2 text-sm">
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </>
        ) : (
          <>
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
                                onClick={(e) => { e.stopPropagation(); setEditingProject(p); setEditName(p.name); }}
                                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/10"
                              >
                                <Pencil className="h-3 w-3" /> Edit
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); (async () => {
                                  if (!window.confirm(`Delete project "${p.name}" and all its ${p.total_tasks} task(s)? This cannot be undone.`)) return;
                                  setSaving(true);
                                  const res: any = await deleteProjectAction(p.id);
                                  setSaving(false);
                                  if (res.error) { toast(res.error, "error"); return; }
                                  toast("Project deleted.", "success");
                                  // refresh modal data + parent
                                  const r: any = await getClientDetailAction(client.id);
                                  if (r.ok) { setProjects(r.projects||[]); setTasks(r.tasks||[]); }
                                  router.refresh();
                                })(); }}
                                disabled={saving}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
                              >
                                <Trash2 className="h-3 w-3" /> Delete
                              </button>
                            </div>
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
          </>
        )}
      </div>

      {/* Mobile FAB */}
      <button onClick={onClose} aria-label="Close" className="md:hidden fixed bottom-24 right-6 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-gray-800 text-white shadow-2xl border border-gray-600 active:scale-95 transition-transform">
        <X className="h-6 w-6" />
      </button>
    </div>
  );
}
