"use client";

import { useState, useMemo } from "react";
import { CalendarDays, Search, Copy, Share2, Trash2, Download, FileText, FileSpreadsheet } from "lucide-react";
import type { AdminDailyLog } from "@/lib/actions/dailyLogs";
import { deleteDailyLogAction } from "@/lib/actions/dailyLogs";
import { openWhatsApp } from "@/lib/whatsapp";
import { useToast } from "@/components/Toast";

function formatDisplay(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", weekday: "short" });
  } catch { return dateStr; }
}

export default function AdminDailyLogReport({ initialLogs }: { initialLogs: AdminDailyLog[] }) {
  const [logs, setLogs] = useState<AdminDailyLog[]>(initialLogs);
  const [filterDate, setFilterDate] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<"pdf" | "excel" | null>(null);
  const { toast } = useToast();

  const userOptions = useMemo(() => {
    const m = new Map<string, { id: string; name: string; role: string | null }>();
    for (const l of initialLogs) if (!m.has(l.user_id)) m.set(l.user_id, { id: l.user_id, name: l.full_name, role: l.role_label });
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [initialLogs]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (filterDate && l.entry_date !== filterDate) return false;
      if (filterUser && l.user_id !== filterUser) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!`${l.full_name} ${l.role_label || ""} ${l.content} ${l.entry_date}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [logs, filterDate, filterUser, search]);

  const grouped = useMemo(() => {
    const m = new Map<string, AdminDailyLog[]>();
    for (const l of filtered) {
      if (!m.has(l.entry_date)) m.set(l.entry_date, []);
      m.get(l.entry_date)!.push(l);
    }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  function handleCopy(l: AdminDailyLog) {
    const text = `${l.entry_date} — ${l.full_name} (${l.role_label || ""})\n${l.content}`;
    navigator.clipboard.writeText(text).then(() => toast("Copied!", "success")).catch(() => toast("Copy failed.", "error"));
  }
  function handleShare(l: AdminDailyLog) {
    const msg = `📋 Daily Work Log — ${l.entry_date}\nName: ${l.full_name} (${l.role_label || ""})\nDate: ${l.entry_date}\n\n${l.content}`;
    openWhatsApp(msg);
  }
  async function handleDelete(id: string) {
    if (!window.confirm("Delete this entry?")) return;
    const res = await deleteDailyLogAction(id);
    if (!res.ok) { toast(res.error || "Delete failed.", "error"); return; }
    setLogs((prev) => prev.filter((p) => p.id !== id));
    toast("Deleted.", "success");
  }

  async function exportExcel() {
    if (filtered.length === 0) { toast("No data to export.", "error"); return; }
    setBusy("excel");
    try {
      const XLSX = await import("xlsx");
      const rows: (string | number)[][] = [["Date", "User", "Role", "Content"]];
      for (const l of filtered) rows.push([l.entry_date, l.full_name, l.role_label || "", l.content.replace(/\n/g, " | ")]);
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"] = [{ wch: 12 }, { wch: 22 }, { wch: 16 }, { wch: 70 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Daily Work Logs");
      const overview = XLSX.utils.aoa_to_sheet([["Advrix Media Pvt. Ltd. — Daily Work Log Report"], ["Generated", new Date().toLocaleDateString("en-IN")], ["Total entries", filtered.length]]);
      XLSX.utils.book_append_sheet(wb, overview, "Overview");
      XLSX.writeFile(wb, `Daily_Work_Log_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) { console.error(e); toast("Excel export failed.", "error"); } finally { setBusy(null); }
  }

  async function exportPdf() {
    if (filtered.length === 0) { toast("No data to export.", "error"); return; }
    setBusy("pdf");
    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      let fontName = "helvetica";
      let logoB64: string | null = null;
      try {
        const res = await fetch("/logo-mark.png");
        const blob = await res.blob();
        logoB64 = await new Promise<string>((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result as string);
          fr.onerror = reject;
          fr.readAsDataURL(blob);
        });
      } catch {}
      const pageW = doc.internal.pageSize.getWidth();
      const addHead = () => {
        if (logoB64) try { doc.addImage(logoB64, "PNG", 10, 8, 10, 10); } catch {}
        doc.setFontSize(12); doc.setFont(fontName, "bold"); doc.setTextColor(15, 23, 42);
        doc.text("Advrix Media Pvt. Ltd.", logoB64 ? 24 : 10, 14);
        doc.setFontSize(8); doc.setFont(fontName, "normal"); doc.setTextColor(100, 116, 139);
        doc.text(`Daily Work Log Report  •  ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`, logoB64 ? 24 : 10, 19);
        doc.setDrawColor(226, 232, 240); doc.line(10, 22, pageW - 10, 22);
      };
      const addFoot = () => {
        const h = doc.internal.pageSize.getHeight();
        doc.setFontSize(7); doc.setFont(fontName, "normal"); doc.setTextColor(148, 163, 184);
        doc.text("Advrix Media Pvt. Ltd.  •  Confidential", 10, h - 8);
        doc.text(`Page ${doc.getNumberOfPages()}`, pageW - 10, h - 8, { align: "right" } as any);
      };
      addHead();
      let y = 28;
      doc.setFontSize(14); doc.setFont(fontName, "bold"); doc.setTextColor(15, 23, 42);
      doc.text("Daily Work Log Report", 10, y); y += 4;
      doc.setFontSize(9); doc.setFont(fontName, "normal"); doc.setTextColor(71, 85, 105);
      doc.text(`Total entries: ${filtered.length}${filterDate ? `  •  Date: ${filterDate}` : ""}${filterUser ? `  •  User: ${userOptions.find((u) => u.id === filterUser)?.name || ""}` : ""}`, 10, y); y += 6;
      (autoTable as any)(doc, {
        startY: y,
        head: [["Date", "User", "Role", "Work Done"]],
        body: filtered.map((l) => [l.entry_date, l.full_name, l.role_label || "—", l.content]),
        theme: "grid",
        headStyles: { font: fontName, fillColor: [16, 185, 129], textColor: 255, fontSize: 8 },
        bodyStyles: { font: fontName, fontSize: 7 },
        columnStyles: { 3: { cellWidth: 140 } },
        styles: { font: fontName, cellPadding: 2, overflow: "linebreak" },
        margin: { left: 10, right: 10 },
      });
      addFoot();
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) { doc.setPage(i); if (i !== pages) addFoot(); }
      doc.save(`Daily_Work_Log_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) { console.error(e); toast("PDF export failed.", "error"); } finally { setBusy(null); }
  }

  return (
    <div className="w-full max-w-none space-y-4">
      {/* Filters + Export */}
      <div className="rounded-2xl border border-white/10 bg-night-850 p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-white">Monitoring</span>
          <span className="text-xs text-slate-500">{filtered.length} {filtered.length === 1 ? "entry" : "entries"} {filterDate || filterUser || search ? "filtered" : "total"}</span>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" disabled={!!busy || filtered.length === 0} onClick={exportPdf} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-300 text-night-950 px-3.5 py-2 text-xs font-semibold hover:bg-brand-200 disabled:opacity-50">
              <FileText className="h-3.5 w-3.5" /> {busy === "pdf" ? "Generating…" : "Export PDF"}
            </button>
            <button type="button" disabled={!!busy || filtered.length === 0} onClick={exportExcel} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] text-white px-3.5 py-2 text-xs font-semibold hover:bg-white/10 disabled:opacity-50">
              <FileSpreadsheet className="h-3.5 w-3.5" /> {busy === "excel" ? "Generating…" : "Export Excel"}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="input !pl-8 !py-2 text-xs w-full" />
          </div>
          <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="input !py-2 text-xs w-full">
            <option value="">All users</option>
            {userOptions.map((u) => <option key={u.id} value={u.id}>{u.name} — {u.role}</option>)}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search user, role, content…" className="input !pl-8 !py-2 text-xs w-full" />
          </div>
        </div>
        {(filterDate || filterUser || search) && (
          <button type="button" onClick={() => { setFilterDate(""); setFilterUser(""); setSearch(""); }} className="text-xs text-brand-300 hover:text-brand-200">Clear filters</button>
        )}
      </div>

      {/* List */}
      {grouped.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
          <p className="text-sm text-slate-400">No entries for selected filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(([date, items]) => (
            <div key={date} className="rounded-2xl border border-white/10 bg-night-850 overflow-hidden">
              <div className="px-4 py-3 bg-white/[0.03] border-b border-white/[0.06] flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-300 shrink-0" />
                <p className="text-sm font-semibold text-white">{formatDisplay(date)}</p>
                <span className="text-xs font-mono text-slate-500">{date}</span>
                <span className="ml-auto text-[11px] text-slate-500">{items.length} {items.length === 1 ? "entry" : "entries"}</span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {items.map((l) => (
                  <div key={l.id} className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-sm font-semibold text-white truncate">{l.full_name}</p>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300 shrink-0">{l.role_label || "—"}</span>
                    </div>
                    <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed break-words">{l.content}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <button type="button" onClick={() => handleCopy(l)} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 hover:bg-white/[0.08]"><Copy className="h-3.5 w-3.5" /> Copy</button>
                      <button type="button" onClick={() => handleShare(l)} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 text-white px-3.5 py-1.5 text-xs font-semibold hover:bg-emerald-600"><Share2 className="h-3.5 w-3.5" /> WhatsApp</button>
                      <button type="button" onClick={() => handleDelete(l.id)} className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/20 ml-auto"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
