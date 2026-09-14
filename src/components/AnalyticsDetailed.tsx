"use client";

import { useState } from "react";
import type { DetailedAnalytics } from "@/lib/data";
import { STATUS_META } from "@/components/ui";

type ExportSelection = {
  hierarchy: boolean;
  status: boolean;
  employee: boolean;
};

export default function AnalyticsDetailed({ data }: { data: DetailedAnalytics }) {
  const [sel, setSel] = useState<ExportSelection>({ hierarchy: true, status: true, employee: true });
  const [busy, setBusy] = useState<"pdf" | "excel" | null>(null);

  const toggle = (k: keyof ExportSelection) => setSel((s) => ({ ...s, [k]: !s[k] }));

  async function handleExportPdf() {
    if (!sel.hierarchy && !sel.status && !sel.employee) return;
    setBusy("pdf");
    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      // Load Noto Sans Gujarati for proper Gujarati rendering
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

      // Try to load black logo for white PDF background
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
          try { doc.addImage(logoBase64, "PNG", 10, 8, 28, 10); } catch {}
        }
        doc.setFontSize(13);
        doc.setFont(fontName, "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("Advrix Media Pvt. Ltd.", logoBase64 ? 42 : 10, 14);
        doc.setFontSize(8);
        doc.setFont(fontName, "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("Reports  •  " + new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }), logoBase64 ? 42 : 10, 19);
        doc.setDrawColor(226, 232, 240);
        doc.line(10, 22, pageW - 10, 22);
      };
      const addFooter = () => {
        const h = doc.internal.pageSize.getHeight();
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text("Advrix Media Pvt. Ltd.  •  Confidential  •  Generated from Advrix CRM", 10, h - 8);
        doc.text(`Page ${doc.getNumberOfPages()}`, pageW - 20, h - 8, { align: "right" } as any);
      };

      addLetterhead();
      let y = 28;
      doc.setFontSize(16);
      doc.setFont(fontName, "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("Reports Overview", 10, y);
      y += 4;
      doc.setFontSize(9);
      doc.setFont(fontName, "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(`Total Clients: ${data.totalClients}  •  Total Projects: ${data.totalProjects}  •  Total Subtasks: ${data.totalTasks}`, 10, y);
      y += 8;

      const statusLabel = (s: string) => (STATUS_META as any)[s]?.label || s;

      if (sel.status) {
        doc.setFontSize(11);
        doc.setFont(fontName, "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("Tasks by Status", 10, y);
        y += 2;
        (autoTable as any)(doc, {
          startY: y,
          head: [["Status", "Count"]],
          body: data.tasksByStatus.map((r) => [statusLabel(r.status), String(r.count)]),
          theme: "grid",
          headStyles: {font: fontName, fillColor: [16, 185, 129], textColor: 255, fontSize: 9 },
          bodyStyles: {font: fontName, fontSize: 8 },
          margin: { left: 10, right: 10 },
          styles: {font: fontName, cellPadding: 2 },
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
        for (const c of data.clientsHierarchy) {
          if (c.projects.length === 0) {
            body.push([c.company ? `${c.company} (${c.name})` : c.name, "—", "0", "—"]);
          } else {
            for (const p of c.projects) {
              const st = p.tasksByStatus.map((s) => `${statusLabel(s.status)}:${s.count}`).join(", ") || "—";
              body.push([
                c.company ? `${c.company} (${c.name})` : c.name,
                p.name,
                String(p.totalTasks),
                st,
              ]);
            }
          }
        }
        if (body.length === 0) body.push(["—", "—", "0", "—"]);
        (autoTable as any)(doc, {
          startY: y,
          head: [["Client", "Project", "Subtasks", "Status Breakdown"]],
          body,
          theme: "grid",
          headStyles: {font: fontName, fillColor: [15, 23, 42], textColor: 255, fontSize: 8 },
          bodyStyles: {font: fontName, fontSize: 7 },
          columnStyles: { 3: { cellWidth: 55 } },
          margin: { left: 10, right: 10 },
          styles: {font: fontName, cellPadding: 2, overflow: "linebreak" },
          didDrawPage: () => {},
        });
        y = (doc as any).lastAutoTable.finalY + 8;
        if (y > 260) { doc.addPage(); addLetterhead(); y = 28; }

        // Detailed subtask list per project (optional second table)
        const detailBody: string[][] = [];
        for (const c of data.clientsHierarchy) {
          for (const p of c.projects) {
            for (const t of p.tasks) {
              detailBody.push([
                c.company || c.name,
                p.name,
                t.title,
                statusLabel(t.status),
                t.priority,
                t.assignee_name || "Unassigned",
                t.due_date ? new Date(t.due_date).toLocaleDateString("en-IN") : "—",
              ]);
            }
          }
        }
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
            headStyles: {font: fontName, fillColor: [51, 65, 85], textColor: 255, fontSize: 7 },
            bodyStyles: {font: fontName, fontSize: 6 },
            margin: { left: 10, right: 10 },
            styles: {font: fontName, cellPadding: 1.5, overflow: "linebreak" },
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
          body: data.employeeLoad.map((e) => [
            e.full_name,
            e.role_label,
            String(e.activeTasks),
            String(e.totalAssigned),
            String(e.completedTasks),
            String(e.overdueTasks),
          ]),
          theme: "grid",
          headStyles: {font: fontName, fillColor: [59, 130, 246], textColor: 255, fontSize: 8 },
          bodyStyles: {font: fontName, fontSize: 7 },
          margin: { left: 10, right: 10 },
          styles: {font: fontName, cellPadding: 2 },
        });
      }

      // footer on last page
      addFooter();
      // add footer to earlier pages
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        if (i !== pages) addFooter();
      }

      doc.save(`Advrix_Reports_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error(e);
      alert("PDF export failed.");
    } finally {
      setBusy(null);
    }
  }

  async function handleExportExcel() {
    if (!sel.hierarchy && !sel.status && !sel.employee) return;
    setBusy("excel");
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      if (sel.status) {
        const ws = XLSX.utils.aoa_to_sheet([
          ["Status", "Count"],
          ...data.tasksByStatus.map((r) => [r.status, r.count]),
        ]);
        XLSX.utils.book_append_sheet(wb, ws, "Tasks by Status");
      }
      if (sel.hierarchy) {
        const rows: (string | number)[][] = [["Client", "Company", "Project", "Project Status", "Subtasks", "Status Breakdown"]];
        for (const c of data.clientsHierarchy) {
          if (c.projects.length === 0) rows.push([c.name, c.company || "", "—", "—", 0, "—"]);
          else for (const p of c.projects) {
            const st = p.tasksByStatus.map((s) => `${s.status}:${s.count}`).join(", ");
            rows.push([c.name, c.company || "", p.name, p.status, p.totalTasks, st]);
          }
        }
        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Clients & Projects");
        const detailRows: (string | number)[][] = [["Client", "Company", "Project", "Subtask", "Status", "Priority", "Assignee", "Due Date"]];
        for (const c of data.clientsHierarchy) for (const p of c.projects) for (const t of p.tasks) detailRows.push([c.name, c.company || "", p.name, t.title, t.status, t.priority, t.assignee_name || "Unassigned", t.due_date || ""]);
        const ws2 = XLSX.utils.aoa_to_sheet(detailRows);
        XLSX.utils.book_append_sheet(wb, ws2, "Subtasks");
      }
      if (sel.employee) {
        const rows: (string | number)[][] = [["Employee", "Role", "Active Tasks", "Total Assigned", "Completed", "Overdue"]];
        for (const e of data.employeeLoad) rows.push([e.full_name, e.role_label, e.activeTasks, e.totalAssigned, e.completedTasks, e.overdueTasks]);
        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Employee Load");
      }
      // Overview sheet
      const overview = XLSX.utils.aoa_to_sheet([
        ["Advrix Media Pvt. Ltd. — Reports"],
        ["Date", new Date().toLocaleDateString("en-IN")],
        [],
        ["Total Clients", data.totalClients],
        ["Total Projects", data.totalProjects],
        ["Total Subtasks", data.totalTasks],
      ]);
      XLSX.utils.book_append_sheet(wb, overview, "Overview");

      XLSX.writeFile(wb, `Advrix_Reports_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      console.error(e);
      alert("Excel export failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Export controls */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
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
          <button type="button" disabled={!!busy} onClick={handleExportPdf} className="btn-primary !py-2 text-sm disabled:opacity-50">
            {busy === "pdf" ? "Generating…" : "Export PDF"}
          </button>
          <button type="button" disabled={!!busy} onClick={handleExportExcel} className="btn-ghost !py-2 text-sm disabled:opacity-50">
            {busy === "excel" ? "Generating…" : "Export Excel"}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Total Clients</div>
          <div className="text-2xl font-bold text-white mt-1">{data.totalClients}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Total Projects</div>
          <div className="text-2xl font-bold text-white mt-1">{data.totalProjects}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Total Subtasks</div>
          <div className="text-2xl font-bold text-white mt-1">{data.totalTasks}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Completion</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {data.tasksByStatus.find((s) => s.status === "completed")?.count || 0}/{data.totalTasks}
          </div>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="card p-5">
        <h2 className="font-semibold mb-3">Tasks by Status</h2>
        {data.tasksByStatus.length === 0 ? (
          <p className="text-sm text-slate-500">No tasks yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03]">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {data.tasksByStatus.map((r) => (
                  <tr key={r.status} className="hover:bg-white/[0.03]">
                    <td className="px-3 py-2 text-slate-200">{(STATUS_META as any)[r.status]?.label || r.status}</td>
                    <td className="px-3 py-2 text-right font-semibold text-white">{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Clients → Projects → Subtasks */}
      <div className="card p-5">
        <h2 className="font-semibold mb-1">Clients → Projects → Subtasks</h2>
        <p className="text-xs text-slate-500 mb-4">{data.totalClients} clients • {data.totalProjects} projects • {data.totalTasks} subtasks — expand a client to see its projects</p>
        {data.clientsHierarchy.length === 0 ? (
          <p className="text-sm text-slate-500">No clients in scope.</p>
        ) : (
          <div className="space-y-3">
            {data.clientsHierarchy.map((c) => (
              <details key={c.id} className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden group" open={data.clientsHierarchy.length <= 6}>
                <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none hover:bg-white/[0.03]">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{c.company ? `${c.company}` : c.name} <span className="text-slate-500 font-normal">— {c.name}</span></div>
                    <div className="text-xs text-slate-500">{c.projectCount} project{c.projectCount !== 1 ? "s" : ""}</div>
                  </div>
                  <span className="text-xs text-slate-400">{c.projects.reduce((a, p) => a + p.totalTasks, 0)} subtasks</span>
                  <span className="text-slate-500 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <div className="border-t border-white/10">
                  {c.projects.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-500">No projects for this client.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-white/[0.03] border-b border-white/10">
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Project</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Subtasks</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Breakdown</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.06]">
                          {c.projects.map((p) => (
                            <tr key={p.id} className="hover:bg-white/[0.03]">
                              <td className="px-3 py-2 font-medium text-white">{p.name}</td>
                              <td className="px-3 py-2 text-xs text-slate-300">{p.status}</td>
                              <td className="px-3 py-2 text-right font-semibold text-white">{p.totalTasks}</td>
                              <td className="px-3 py-2 text-xs text-slate-400">
                                {p.tasksByStatus.map((s) => (
                                  <span key={s.status} className="inline-flex items-center gap-1 mr-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-brand-300" /> {(STATUS_META as any)[s.status]?.label || s.status}: {s.count}
                                  </span>
                                ))}
                                {p.tasksByStatus.length === 0 && "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>

      {/* Employee Load */}
      <div className="card p-5">
        <h2 className="font-semibold mb-3">Employee Load</h2>
        {data.employeeLoad.length === 0 ? (
          <p className="text-sm text-slate-500">No assignments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03]">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Employee</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Role</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Active</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Total</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Completed</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-rose-400 uppercase">Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {data.employeeLoad.map((e) => (
                  <tr key={e.user_id} className="hover:bg-white/[0.03]">
                    <td className="px-3 py-2 font-medium text-white">{e.full_name}</td>
                    <td className="px-3 py-2 text-xs text-slate-400">{e.role_label}</td>
                    <td className="px-3 py-2 text-right font-bold text-brand-300">{e.activeTasks}</td>
                    <td className="px-3 py-2 text-right text-slate-300">{e.totalAssigned}</td>
                    <td className="px-3 py-2 text-right text-emerald-400">{e.completedTasks}</td>
                    <td className="px-3 py-2 text-right font-semibold text-rose-300">{e.overdueTasks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500">Tip: Use the checkboxes at the top to choose what to include in the export — you see everything here, but export only what you need.</p>
    </div>
  );
}
