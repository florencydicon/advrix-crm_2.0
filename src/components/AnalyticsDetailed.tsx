"use client";

import { useState, useMemo } from "react";
import type { DetailedAnalytics } from "@/lib/data";
import { STATUS_META } from "@/components/ui";
import { Search, Building2, FolderKanban, Users, ChevronDown, Download, FileSpreadsheet, FileText } from "lucide-react";

type ExportSelection = {
  hierarchy: boolean;
  status: boolean;
  employee: boolean;
};

export default function AnalyticsDetailed({ data }: { data: DetailedAnalytics }) {
  const [sel, setSel] = useState<ExportSelection>({ hierarchy: true, status: true, employee: true });
  const [busy, setBusy] = useState<"pdf" | "excel" | null>(null);
  const [personFilter, setPersonFilter] = useState<string>("all");
  const [clientSearch, setClientSearch] = useState("");
  const [expandedClients, setExpandedClients] = useState<Set<string>>(() => new Set(data.clientsHierarchy.slice(0, 3).map((c) => c.id)));
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(() => new Set());

  const toggle = (k: keyof ExportSelection) => setSel((s) => ({ ...s, [k]: !s[k] }));
  const toggleClient = (id: string) =>
    setExpandedClients((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleProject = (id: string) =>
    setExpandedProjects((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const selectedPersonName = useMemo(() => {
    if (personFilter === "all") return null;
    return data.employeeLoad.find((e) => e.user_id === personFilter)?.full_name || null;
  }, [personFilter, data.employeeLoad]);

  // Filtered data for display & export
  const filtered = useMemo(() => {
    if (personFilter === "all" && !clientSearch.trim()) return data;
    const search = clientSearch.trim().toLowerCase();
    // Filter hierarchy
    let hierarchy = data.clientsHierarchy;
    if (search) {
      hierarchy = hierarchy.filter((c) => {
        const hay = `${c.name} ${c.company || ""} ${c.projects.map((p) => p.name).join(" ")}`.toLowerCase();
        return hay.includes(search);
      });
    }
    if (personFilter !== "all") {
      hierarchy = hierarchy
        .map((c) => {
          const projs = c.projects
            .map((p) => {
              const tasks = p.tasks.filter((t) => t.assignee_id === personFilter);
              if (tasks.length === 0) return null;
              const byStatus = new Map<string, number>();
              for (const t of tasks) byStatus.set(t.status, (byStatus.get(t.status) || 0) + 1);
              return { ...p, totalTasks: tasks.length, tasks, tasksByStatus: [...byStatus.entries()].map(([status, count]) => ({ status, count })) };
            })
            .filter(Boolean) as typeof c.projects;
          if (projs.length === 0) return null;
          return { ...c, projects: projs, projectCount: projs.length };
        })
        .filter(Boolean) as typeof data.clientsHierarchy;
    } else if (search) {
      // already filtered by search, keep as is
    }
    // Recalc tasksByStatus from filtered hierarchy when person filter active
    let tasksByStatus = data.tasksByStatus;
    if (personFilter !== "all") {
      const map = new Map<string, number>();
      for (const c of hierarchy) for (const p of c.projects) for (const t of p.tasks) map.set(t.status, (map.get(t.status) || 0) + 1);
      tasksByStatus = [...map.entries()].map(([status, count]) => ({ status, count }));
    }
    // Employee load filtered
    let employeeLoad = data.employeeLoad;
    if (personFilter !== "all") employeeLoad = employeeLoad.filter((e) => e.user_id === personFilter);

    const totalTasks = hierarchy.reduce((a, c) => a + c.projects.reduce((aa, p) => aa + p.totalTasks, 0), 0);
    const totalProjects = hierarchy.reduce((a, c) => a + c.projectCount, 0);
    const totalClients = hierarchy.length;
    return { ...data, clientsHierarchy: hierarchy, tasksByStatus, employeeLoad, totalTasks, totalProjects, totalClients };
  }, [data, personFilter, clientSearch]);

  const statusLabel = (s: string) => (STATUS_META as any)[s]?.label || s;
  const statusColor: Record<string, string> = {
    approved: "bg-sky-500",
    in_progress: "bg-amber-400",
    submitted: "bg-violet-400",
    needs_improvement: "bg-orange-400",
    client_review: "bg-blue-400",
    client_feedback: "bg-pink-400",
    uploading: "bg-cyan-400",
    upload_done: "bg-teal-400",
    completed: "bg-emerald-400",
    ready_to_start: "bg-slate-400",
  };

  async function handleExportPdf() {
    if (!sel.hierarchy && !sel.status && !sel.employee) return;
    setBusy("pdf");
    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      let useGujaratiFont = false;
      try {
        const fontRes = await fetch("/fonts/NotoSansGujarati-Regular.ttf");
        if (fontRes.ok) {
          const buf = await fontRes.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          const b64 = btoa(binary);
          (doc as any).addFileToVFS("NotoSansGujarati-Regular.ttf", b64);
          (doc as any).addFont("NotoSansGujarati-Regular.ttf", "NotoGujarati", "normal");
          (doc as any).addFont("NotoSansGujarati-Regular.ttf", "NotoGujarati", "bold");
          useGujaratiFont = true;
        }
      } catch {}
      const fontName = useGujaratiFont ? "NotoGujarati" : "helvetica";
      let logoBase64: string | null = null;
      try {
        const res = await fetch("/logo-mark.png");
        const blob = await res.blob();
        logoBase64 = await new Promise<string>((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result as string);
          fr.onerror = reject;
          fr.readAsDataURL(blob);
        });
      } catch {}
      const pageW = doc.internal.pageSize.getWidth();
      const addLetterhead = () => {
        if (logoBase64) {
          try { doc.addImage(logoBase64, "PNG", 10, 8, 12, 12); } catch {}
        }
        doc.setFontSize(13);
        doc.setFont(fontName, "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("Advrix Media Pvt. Ltd.", logoBase64 ? 26 : 10, 14);
        doc.setFontSize(8);
        doc.setFont(fontName, "normal");
        doc.setTextColor(100, 116, 139);
        const sub = selectedPersonName ? `Reports — ${selectedPersonName}  •  ` : "Reports  •  ";
        doc.text(sub + new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }), logoBase64 ? 26 : 10, 19);
        doc.setDrawColor(226, 232, 240);
        doc.line(10, 22, pageW - 10, 22);
      };
      const addFooter = () => {
        const h = doc.internal.pageSize.getHeight();
        doc.setFontSize(7);
        doc.setFont(fontName, "normal");
        doc.setTextColor(148, 163, 184);
        doc.text("Advrix Media Pvt. Ltd.  •  Confidential  •  Generated from Advrix CRM", 10, h - 8);
        doc.text(`Page ${doc.getNumberOfPages()}`, pageW - 20, h - 8, { align: "right" } as any);
      };
      addLetterhead();
      let y = 28;
      doc.setFontSize(16);
      doc.setFont(fontName, "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(selectedPersonName ? `Reports — ${selectedPersonName}` : "Reports Overview", 10, y);
      y += 4;
      doc.setFontSize(9);
      doc.setFont(fontName, "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(`Total Clients: ${filtered.totalClients}  •  Total Projects: ${filtered.totalProjects}  •  Total Subtasks: ${filtered.totalTasks}`, 10, y);
      y += 8;
      if (sel.status) {
        doc.setFontSize(11);
        doc.setFont(fontName, "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("Tasks by Status", 10, y);
        y += 2;
        (autoTable as any)(doc, {
          startY: y,
          head: [["Status", "Count"]],
          body: filtered.tasksByStatus.map((r) => [statusLabel(r.status), String(r.count)]),
          theme: "grid",
          headStyles: { font: fontName, fillColor: [16, 185, 129], textColor: 255, fontSize: 9 },
          bodyStyles: { font: fontName, fontSize: 8 },
          margin: { left: 10, right: 10 },
          styles: { font: fontName, cellPadding: 2 },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
        if (y > 270) { doc.addPage(); addLetterhead(); addFooter(); y = 28; }
      }
      if (sel.hierarchy) {
        doc.setFontSize(11);
        doc.setFont(fontName, "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("Clients  →  Projects  →  Subtasks", 10, y);
        y += 2;
        const body: string[][] = [];
        for (const c of filtered.clientsHierarchy) {
          if (c.projects.length === 0) body.push([c.company ? `${c.company} (${c.name})` : c.name, "—", "0", "—"]);
          else for (const p of c.projects) {
            const st = p.tasksByStatus.map((s) => `${statusLabel(s.status)}:${s.count}`).join(", ") || "—";
            body.push([c.company ? `${c.company} (${c.name})` : c.name, p.name, String(p.totalTasks), st]);
          }
        }
        if (body.length === 0) body.push(["—", "—", "0", "—"]);
        (autoTable as any)(doc, {
          startY: y,
          head: [["Client", "Project", "Subtasks", "Status Breakdown"]],
          body,
          theme: "grid",
          headStyles: { font: fontName, fillColor: [15, 23, 42], textColor: 255, fontSize: 8 },
          bodyStyles: { font: fontName, fontSize: 7 },
          columnStyles: { 3: { cellWidth: 55 } },
          margin: { left: 10, right: 10 },
          styles: { font: fontName, cellPadding: 2, overflow: "linebreak" },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
        if (y > 260) { doc.addPage(); addLetterhead(); y = 28; }
        const detailBody: string[][] = [];
        for (const c of filtered.clientsHierarchy) for (const p of c.projects) for (const t of p.tasks) detailBody.push([c.company || c.name, p.name, t.title, statusLabel(t.status), t.priority, t.assignee_name || "Unassigned", t.due_date ? new Date(t.due_date).toLocaleDateString("en-IN") : "—"]);
        if (detailBody.length > 0) {
          if (y > 250) { doc.addPage(); addLetterhead(); y = 28; }
          doc.setFontSize(10);
          doc.setFont(fontName, "bold");
          doc.text("Subtask Details", 10, y);
          y += 2;
          (autoTable as any)(doc, {
            startY: y,
            head: [["Client", "Project", "Subtask", "Status", "Priority", "Assignee", "Due"]],
            body: detailBody,
            theme: "grid",
            headStyles: { font: fontName, fillColor: [51, 65, 85], textColor: 255, fontSize: 7 },
            bodyStyles: { font: fontName, fontSize: 6 },
            margin: { left: 10, right: 10 },
            styles: { font: fontName, cellPadding: 1.5, overflow: "linebreak" },
          });
          y = (doc as any).lastAutoTable.finalY + 8;
        }
      }
      if (sel.employee) {
        if (y > 250) { doc.addPage(); addLetterhead(); y = 28; }
        doc.setFontSize(11);
        doc.setFont(fontName, "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("Employee Load", 10, y);
        y += 2;
        (autoTable as any)(doc, {
          startY: y,
          head: [["Employee", "Role", "Active", "Total", "Completed", "Overdue"]],
          body: filtered.employeeLoad.map((e) => [e.full_name, e.role_label, String(e.activeTasks), String(e.totalAssigned), String(e.completedTasks), String(e.overdueTasks)]),
          theme: "grid",
          headStyles: { font: fontName, fillColor: [59, 130, 246], textColor: 255, fontSize: 8 },
          bodyStyles: { font: fontName, fontSize: 7 },
          margin: { left: 10, right: 10 },
          styles: { font: fontName, cellPadding: 2 },
        });
      }
      addFooter();
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) { doc.setPage(i); if (i !== pages) addFooter(); }
      const suffix = selectedPersonName ? `_${selectedPersonName.replace(/\s+/g, "_")}` : "";
      doc.save(`Advrix_Reports${suffix}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) { console.error(e); alert("PDF export failed."); } finally { setBusy(null); }
  }

  async function handleExportExcel() {
    if (!sel.hierarchy && !sel.status && !sel.employee) return;
    setBusy("excel");
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      if (sel.status) {
        const ws = XLSX.utils.aoa_to_sheet([["Status", "Count"], ...filtered.tasksByStatus.map((r) => [statusLabel(r.status), r.count])]);
        XLSX.utils.book_append_sheet(wb, ws, "Tasks by Status");
      }
      if (sel.hierarchy) {
        const rows: (string | number)[][] = [["Client", "Company", "Project", "Project Status", "Subtasks", "Status Breakdown"]];
        for (const c of filtered.clientsHierarchy) {
          if (c.projects.length === 0) rows.push([c.name, c.company || "", "—", "—", 0, "—"]);
          else for (const p of c.projects) { const st = p.tasksByStatus.map((s) => `${statusLabel(s.status)}:${s.count}`).join(", "); rows.push([c.name, c.company || "", p.name, p.status, p.totalTasks, st]); }
        }
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Clients & Projects");
        const detailRows: (string | number)[][] = [["Client", "Company", "Project", "Subtask", "Status", "Priority", "Assignee", "Due Date"]];
        for (const c of filtered.clientsHierarchy) for (const p of c.projects) for (const t of p.tasks) detailRows.push([c.name, c.company || "", p.name, t.title, statusLabel(t.status), t.priority, t.assignee_name || "Unassigned", t.due_date || ""]);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detailRows), "Subtasks");
      }
      if (sel.employee) {
        const rows: (string | number)[][] = [["Employee", "Role", "Active Tasks", "Total Assigned", "Completed", "Overdue"]];
        for (const e of filtered.employeeLoad) rows.push([e.full_name, e.role_label, e.activeTasks, e.totalAssigned, e.completedTasks, e.overdueTasks]);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Employee Load");
      }
      const overview = XLSX.utils.aoa_to_sheet([["Advrix Media Pvt. Ltd. — Reports"], ["Date", new Date().toLocaleDateString("en-IN")], ...(selectedPersonName ? [["Person", selectedPersonName]] : []), [], ["Total Clients", filtered.totalClients], ["Total Projects", filtered.totalProjects], ["Total Subtasks", filtered.totalTasks]]);
      XLSX.utils.book_append_sheet(wb, overview, "Overview");
      const suffix = selectedPersonName ? `_${selectedPersonName.replace(/\s+/g, "_")}` : "";
      XLSX.writeFile(wb, `Advrix_Reports${suffix}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) { console.error(e); alert("Excel export failed."); } finally { setBusy(null); }
  }

  const handlePersonExport = (userId: string) => {
    setPersonFilter(userId);
    // auto scroll to export controls? just set filter, user can then click Export
  };

  return (
    <div className="space-y-6">
      {/* Top controls: Export + Person filter */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-slate-200">Export what you need:</span>
          <label className="inline-flex items-center gap-1.5 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={sel.hierarchy} onChange={() => toggle("hierarchy")} className="h-4 w-4 accent-brand-300" /> Clients → Projects → Subtasks
          </label>
          <label className="inline-flex items-center gap-1.5 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={sel.status} onChange={() => toggle("status")} className="h-4 w-4 accent-brand-300" /> Status breakdown
          </label>
          <label className="inline-flex items-center gap-1.5 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={sel.employee} onChange={() => toggle("employee")} className="h-4 w-4 accent-brand-300" /> Employee load
          </label>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" disabled={!!busy} onClick={handleExportPdf} className="btn-primary !py-2 text-sm disabled:opacity-50 inline-flex items-center gap-1.5"><FileText className="h-4 w-4" /> {busy === "pdf" ? "Generating…" : "Export PDF"}</button>
            <button type="button" disabled={!!busy} onClick={handleExportExcel} className="btn-ghost !py-2 text-sm disabled:opacity-50 inline-flex items-center gap-1.5"><FileSpreadsheet className="h-4 w-4" /> {busy === "excel" ? "Generating…" : "Export Excel"}</button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-white/10">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Users className="h-4 w-4" />
            <span>Filter by person:</span>
          </div>
          <select value={personFilter} onChange={(e) => setPersonFilter(e.target.value)} className="input !py-1.5 !px-3 text-sm min-w-[180px] bg-night-850">
            <option value="all">All persons — full report</option>
            {data.employeeLoad.map((e) => (
              <option key={e.user_id} value={e.user_id}>{e.full_name} — {e.role_label} ({e.activeTasks} active)</option>
            ))}
          </select>
          {personFilter !== "all" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-300/15 text-brand-300 px-3 py-1 text-xs font-medium">
              Showing only <b>{selectedPersonName}</b>
              <button onClick={() => setPersonFilter("all")} className="ml-1 hover:text-white">✕</button>
            </span>
          )}
          <span className="text-xs text-slate-500 ml-auto hidden sm:inline">Tip: select a person, then Export will contain only that person’s data.</span>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400 uppercase tracking-wider">Total Clients</div>
            <Building2 className="h-4 w-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-white mt-1">{filtered.totalClients}</div>
          <div className="text-xs text-slate-500 mt-1">{personFilter !== "all" ? `with work for ${selectedPersonName}` : `${data.totalClients} total`}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400 uppercase tracking-wider">Total Projects</div>
            <FolderKanban className="h-4 w-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-white mt-1">{filtered.totalProjects}</div>
          <div className="text-xs text-slate-500 mt-1">{filtered.totalProjects} projects</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400 uppercase tracking-wider">Total Subtasks</div>
            <FileText className="h-4 w-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-white mt-1">{filtered.totalTasks}</div>
          <div className="text-xs text-slate-500 mt-1">{personFilter !== "all" ? `assigned to ${selectedPersonName}` : "overall"}</div>
        </div>
        <div className="card p-4 border-brand-300/20">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Completion</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{filtered.tasksByStatus.find((s) => s.status === "completed")?.count || 0}/{filtered.totalTasks}</div>
          <div className="h-1.5 rounded-full bg-white/10 mt-2">
            <div className="h-1.5 rounded-full bg-emerald-400" style={{ width: `${filtered.totalTasks ? Math.round(((filtered.tasksByStatus.find((s) => s.status === "completed")?.count || 0) / filtered.totalTasks) * 100) : 0}%` }} />
          </div>
        </div>
      </div>

      {/* Tasks by Status with visual bars */}
      <div className="card p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-brand-300" /> Tasks by Status {personFilter !== "all" && <span className="text-xs font-normal text-slate-500">— {selectedPersonName}</span>}</h2>
        {filtered.tasksByStatus.length === 0 ? (
          <p className="text-sm text-slate-500">No tasks yet.</p>
        ) : (
          <div className="space-y-2">
            {filtered.tasksByStatus.map((r) => {
              const pct = filtered.totalTasks ? Math.round((r.count / filtered.totalTasks) * 100) : 0;
              return (
                <div key={r.status} className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusColor[r.status] || "bg-slate-500"}`} />
                  <span className="text-sm text-slate-200 w-36 truncate">{statusLabel(r.status)}</span>
                  <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className={`h-2 rounded-full ${statusColor[r.status] || "bg-slate-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-white w-8 text-right">{r.count}</span>
                  <span className="text-xs text-slate-500 w-10 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Clients → Projects → Subtasks - improved hierarchy */}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold flex items-center gap-2"><Building2 className="h-4 w-4 text-brand-300" /> Clients → Projects → Subtasks</h2>
            <p className="text-xs text-slate-500 mt-1">
              {filtered.totalClients} clients • {filtered.totalProjects} projects • {filtered.totalTasks} subtasks
              {personFilter !== "all" && <span className="text-brand-300"> — filtered for {selectedPersonName}</span>}
              <span className="hidden sm:inline"> — click a client to expand projects, click a project to see its subtasks</span>
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} placeholder="Search client or project…" className="input !py-1.5 !pl-8 !pr-3 text-sm w-56" />
          </div>
        </div>
        {filtered.clientsHierarchy.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No results for the current filter.</p>
        ) : (
          <div className="space-y-3">
            {filtered.clientsHierarchy.map((c) => {
              const isOpen = expandedClients.has(c.id);
              const totalSubtasks = c.projects.reduce((a, p) => a + p.totalTasks, 0);
              return (
                <div key={c.id} className="rounded-xl border border-white/10 bg-night-900/40 overflow-hidden">
                  <button type="button" onClick={() => toggleClient(c.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors">
                    <div className="h-9 w-9 rounded-lg bg-brand-300/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4 text-brand-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white truncate">{c.company || c.name}</div>
                      <div className="text-xs text-slate-500 truncate">{c.name}{c.company && c.company !== c.name ? ` • ${c.name}` : ""} — {c.projectCount} project{c.projectCount !== 1 ? "s" : ""}</div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-xs shrink-0">
                      <span className="rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-1 font-medium text-slate-300">{totalSubtasks} subtasks</span>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${totalSubtasks > 0 ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" : "bg-white/5 text-slate-500"}`}>{c.projectCount} projects</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-slate-500 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="border-t border-white/10 bg-white/[0.01]">
                      {c.projects.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-500">No projects.</div>
                      ) : (
                        <div className="divide-y divide-white/[0.06]">
                          {c.projects.map((p) => {
                            const projOpen = expandedProjects.has(p.id);
                            return (
                              <div key={p.id} className="bg-white/[0.01]">
                                <button type="button" onClick={() => toggleProject(p.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors">
                                  <FolderKanban className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                                  <span className="text-sm font-medium text-white truncate flex-1">{p.name}</span>
                                  <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/10 px-2 py-0.5 text-[11px] text-slate-300">
                                    {p.totalTasks} subtasks
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                                    {p.tasksByStatus.slice(0, 2).map((s) => (
                                      <span key={s.status} className="inline-flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${statusColor[s.status] || "bg-slate-500"}`} />{statusLabel(s.status)}: {s.count}</span>
                                    ))}
                                    {p.tasksByStatus.length > 2 && <span className="text-slate-500">+{p.tasksByStatus.length - 2} more</span>}
                                  </span>
                                  <ChevronDown className={`h-3.5 w-3.5 text-slate-500 shrink-0 transition-transform ${projOpen ? "rotate-180" : ""}`} />
                                </button>
                                {projOpen && (
                                  <div className="px-4 pb-3">
                                    <div className="rounded-lg border border-white/10 overflow-hidden">
                                      <table className="w-full text-sm">
                                        <thead>
                                          <tr className="bg-white/[0.04] border-b border-white/10">
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Subtask</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Status</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase hidden sm:table-cell">Priority</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Assignee</th>
                                            <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400 uppercase">Due</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.06]">
                                          {p.tasks.map((t) => (
                                            <tr key={t.id} className="hover:bg-white/[0.02]">
                                              <td className="px-3 py-2 font-medium text-white max-w-[220px] truncate" title={t.title}>{t.title}</td>
                                              <td className="px-3 py-2"><span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium border ${t.status === "completed" ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : t.status === "submitted" ? "bg-violet-500/10 text-violet-300 border-violet-500/20" : "bg-white/[0.06] text-slate-300 border-white/10"}`}>{statusLabel(t.status)}</span></td>
                                              <td className="px-3 py-2 text-xs hidden sm:table-cell"><span className={`rounded-full px-2 py-0.5 text-[11px] border ${t.priority === "urgent" ? "bg-rose-500/10 text-rose-300 border-rose-500/20" : t.priority === "high" ? "bg-orange-500/10 text-orange-300 border-orange-500/20" : "bg-white/5 text-slate-400 border-white/10"}`}>{t.priority}</span></td>
                                              <td className="px-3 py-2 text-xs text-slate-300 truncate max-w-[120px]">{t.assignee_name || <span className="text-slate-500">Unassigned</span>}</td>
                                              <td className="px-3 py-2 text-xs text-right whitespace-nowrap text-slate-400">{t.due_date ? new Date(t.due_date).toLocaleDateString("en-IN") : "—"}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Employee Load */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-brand-300" /> Employee Load {personFilter !== "all" && <span className="text-xs font-normal text-brand-300">— {selectedPersonName} selected</span>}</h2>
          {personFilter !== "all" && <button onClick={() => setPersonFilter("all")} className="text-xs text-slate-400 hover:text-white underline">Show all</button>}
        </div>
        {filtered.employeeLoad.length === 0 ? (
          <p className="text-sm text-slate-500">No assignments for the selected filter.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/[0.04] border-b border-white/10">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase">Employee</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Role</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400 uppercase">Active</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400 uppercase">Total</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400 uppercase">Completed</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-rose-400 uppercase">Overdue</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400 uppercase"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filtered.employeeLoad.map((e) => {
                  const isSelected = e.user_id === personFilter;
                  return (
                    <tr key={e.user_id} className={`hover:bg-white/[0.04] transition-colors ${isSelected ? "bg-brand-300/10" : ""}`}>
                      <td className="px-3 py-2.5">
                        <button type="button" onClick={() => handlePersonExport(e.user_id)} className="text-left">
                          <div className="font-medium text-white hover:text-brand-300 transition-colors">{e.full_name}</div>
                          <div className="text-xs text-slate-500 sm:hidden">{e.role_label}</div>
                        </button>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-400 hidden sm:table-cell">{e.role_label}</td>
                      <td className="px-3 py-2 text-right"><span className="inline-flex items-center justify-center min-w-[28px] rounded-full bg-brand-300/15 text-brand-300 px-2 py-0.5 text-xs font-bold">{e.activeTasks}</span></td>
                      <td className="px-3 py-2 text-right text-slate-300">{e.totalAssigned}</td>
                      <td className="px-3 py-2 text-right text-emerald-400">{e.completedTasks}</td>
                      <td className="px-3 py-2 text-right font-semibold text-rose-300">{e.overdueTasks}</td>
                      <td className="px-3 py-2 text-right">
                        <button type="button" onClick={() => handlePersonExport(e.user_id)} title={`Filter & export ${e.full_name}`} className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/10 px-2 py-1 text-xs text-slate-300 transition-colors">
                          <Download className="h-3 w-3" /> Export
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-slate-500 mt-3">Click an employee name or “Export” to filter the whole report to that person — then use the top Export buttons to download PDF/Excel for just that person.</p>
      </div>

      <p className="text-xs text-slate-500">Tip: Use the checkboxes at the top to choose what to include in the export — you see everything here, but export only what you need. Select a person above to export a person-specific report.</p>
    </div>
  );
}
