"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Download,
  Printer,
  Trash2,
  Pencil,
  Trophy,
  CalendarClock,
  Target,
  ChevronDown,
} from "lucide-react";
import {
  createLeadAction,
  updateLeadAction,
  updateLeadStatusAction,
  deleteLeadAction,
  convertLeadAction,
} from "@/lib/actions/leads";
import type { Lead, LeadStatus } from "@/lib/types";
import { LEAD_STATUSES, LEAD_SOURCES } from "@/lib/types";
import { Modal, EmptyState, Stat } from "@/components/ui";
import { DatePicker } from "@/components/DatePicker";
import { useToast } from "@/components/Toast";

const STATUS_STYLES: Record<string, string> = {
  new: "bg-sky-400/10 text-sky-300",
  contacted: "bg-violet-400/10 text-violet-300",
  follow_up: "bg-amber-400/10 text-amber-300",
  proposal: "bg-indigo-400/10 text-indigo-300",
  won: "bg-emerald-400/10 text-emerald-300",
  lost: "bg-rose-400/10 text-rose-300",
};

const STAGE_DOTS: Record<string, string> = {
  new: "bg-sky-400",
  contacted: "bg-violet-400",
  follow_up: "bg-amber-400",
  proposal: "bg-indigo-400",
  won: "bg-emerald-400",
  lost: "bg-rose-400",
};

const SOURCE_LABELS = Object.fromEntries(LEAD_SOURCES.map((s) => [s.key, s.label]));

/** Postgres DATE columns may arrive as Date objects — normalize to YYYY-MM-DD. */
function isoDate(v: string | Date | null | undefined): string {
  if (!v) return "";
  if (v instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  }
  return String(v).slice(0, 10);
}

function fmtMoney(n: number) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

function fmtDate(d: string | Date | null) {
  const iso = isoDate(d);
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString([], { day: "numeric", month: "short" });
}

function leadToCsv(leads: Lead[]): string {
  const header = ["Name", "Company", "Email", "Phone", "Source", "Status", "Deal Value", "Next Follow-up", "Notes", "Created"];
  const rows = leads.map((l) => [
    l.name,
    l.company || "",
    l.email || "",
    l.phone || "",
    SOURCE_LABELS[l.source] || l.source,
    l.status,
    String(l.deal_value ?? 0),
    l.next_follow_up ? isoDate(l.next_follow_up) : "",
    (l.notes || "").replace(/\r?\n/g, " "),
    l.created_at ? l.created_at.slice(0, 10) : "",
  ]);
  return [header, ...rows]
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
}

export default function LeadsView({
  leads,
  stats,
  roleKey,
}: {
  leads: Lead[];
  stats: { total: number; newCount: number; followUpsDue: number; won: number; lost: number; pipelineValue: number; wonValue: number };
  roleKey: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "">("");
  const [formModal, setFormModal] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads
      .filter((l) => !statusFilter || l.status === statusFilter)
      .filter(
        (l) =>
          !q ||
          l.name.toLowerCase().includes(q) ||
          (l.company || "").toLowerCase().includes(q) ||
          (l.email || "").toLowerCase().includes(q) ||
          (l.phone || "").includes(q)
      );
  }, [leads, query, statusFilter]);

  function run(fn: () => Promise<{ ok?: boolean; error?: string }>) {
    start(async () => {
      await fn();
      router.refresh();
    });
  }

  function exportCsv() {
    const csv = leadToCsv(filtered);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `advrix-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const win = window.open("", "_blank", "width=980,height=720");
    if (!win) return;
    const rowsHtml = filtered
      .map(
        (l) => `<tr>
          <td>${escapeHtml(l.name)}</td>
          <td>${escapeHtml(l.company || "")}</td>
          <td>${escapeHtml(l.email || "")}</td>
          <td>${escapeHtml(l.phone || "")}</td>
          <td>${SOURCE_LABELS[l.source] || l.source}</td>
          <td>${l.status}</td>
          <td style="text-align:right">${fmtMoney(l.deal_value)}</td>
          <td>${fmtDate(l.next_follow_up)}</td>
        </tr>`
      )
      .join("");
    win.document.write(`<!DOCTYPE html><html><head><title>Advrix Media — Leads Report</title>
      <style>
        body { font-family: -apple-system, Segoe UI, sans-serif; padding: 32px; color: #111; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        p.meta { color: #555; font-size: 12px; margin: 0 0 18px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
        th { background: #f3f4f6; }
      </style></head><body>
      <h1>Advrix Media PVT LTD — Leads Report</h1>
      <p class="meta">Generated ${new Date().toLocaleString()} · ${filtered.length} lead${filtered.length === 1 ? "" : "s"} · Pipeline value ${fmtMoney(stats.pipelineValue)} · Won ${fmtMoney(stats.wonValue)}</p>
      <table><thead><tr><th>Name</th><th>Company</th><th>Email</th><th>Phone</th><th>Source</th><th>Status</th><th>Deal Value</th><th>Follow-up</th></tr></thead>
      <tbody>${rowsHtml || '<tr><td colspan="8">No leads</td></tr>'}</tbody></table>
      </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }

  const tabCounts = LEAD_STATUSES.map((s) => ({
    ...s,
    count: s.key === ("won" as LeadStatus) ? stats.won : leads.filter((l) => l.status === s.key).length,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Sales Leads</h1>
          <p className="text-sm text-slate-500">
            {roleKey === "SALES" ? "Your personal pipeline — only you can see these." : "Every sales rep's pipeline at a glance."}
          </p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button className="btn-secondary !py-1.5 !px-3 text-xs" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" /> Excel
          </button>
          <button className="btn-secondary !py-1.5 !px-3 text-xs" onClick={exportPdf}>
            <Printer className="h-3.5 w-3.5" /> PDF
          </button>
          <button className="btn-primary !py-1.5 !px-3 text-xs" onClick={() => { setEditing(null); setError(null); setFormModal(true); }}>
            <Plus className="h-3.5 w-3.5" /> New Lead
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Stat label="Total Leads" value={stats.total} />
        <Stat label="Follow-ups Due" value={stats.followUpsDue} accent="text-amber-300" />
        <Stat label="Pipeline Value" value={fmtMoney(stats.pipelineValue)} accent="text-brand-300" />
        <Stat label="Won Value" value={fmtMoney(stats.wonValue)} accent="text-emerald-300" />
      </div>

      <div className="space-y-2">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, company, email, phone…"
            className="input !pl-8 !py-1.5 text-xs"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => setStatusFilter("")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
              statusFilter === ""
                ? "bg-brand-300 text-night-950 shadow-sm"
                : "bg-white/5 border border-white/10 text-slate-300 hover:border-brand-300/50 hover:text-brand-200"
            }`}
          >
            All <span className={`ml-1 px-1.5 rounded-full text-[10px] ${statusFilter === "" ? "bg-brand-200" : "bg-white/10 text-slate-400"}`}>{leads.length}</span>
          </button>
          {tabCounts.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(statusFilter === tab.key ? "" : tab.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
                statusFilter === tab.key
                  ? "bg-brand-300 text-night-950 shadow-sm"
                  : "bg-white/5 border border-white/10 text-slate-300 hover:border-brand-300/50 hover:text-brand-200"
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                statusFilter === tab.key ? "bg-brand-200 text-night-950" : "bg-white/10 text-slate-400"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No leads found"
          subtitle="Capture every enquiry — add your first lead to start tracking."
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block card overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.03]">
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Lead</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Contact</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-[110px]">Source</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-[150px]">Stage</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-[110px]">Value</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-[130px]">Follow-up</th>
                  <th className="px-3 py-2.5 w-[130px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filtered.map((l) => {
                  const overdueFollowUp =
                    l.next_follow_up && !["won", "lost"].includes(l.status) &&
                    new Date(isoDate(l.next_follow_up) + "T23:59:59") < new Date();
                  return (
                    <tr key={l.id} className="hover:bg-white/[0.03] transition-colors align-top">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-white">{l.name}</p>
                        {l.company && <p className="text-[10px] text-slate-500">{l.company}</p>}
                        {l.notes && <p className="text-[10px] text-slate-600 line-clamp-1 mt-0.5">{l.notes}</p>}
                      </td>
                      <td className="px-3 py-2.5 text-slate-300">
                        {l.email && <p className="truncate max-w-[180px]">{l.email}</p>}
                        {l.phone && <p className="text-[11px] text-slate-500">{l.phone}</p>}
                        {!l.email && !l.phone && "—"}
                      </td>
                      <td className="px-3 py-2.5 text-slate-400">{SOURCE_LABELS[l.source] || l.source}</td>
                      <td className="px-3 py-2.5">
                        <StageSelect
                          lead={l}
                          disabled={pending}
                          onSelect={(status) => {
                            if (
                              l.status === "won" &&
                              l.has_active_work &&
                              status !== "won" &&
                              !window.confirm(
                                `${l.name} has active projects and tasks (${l.active_task_count} open). Are you sure you want to change the status?`
                              )
                            ) {
                              return;
                            }
                            start(async () => {
                              const res = await updateLeadStatusAction(l.id, status);
                              if (res.error) toast(res.error, "error");
                              else
                                toast(
                                  `${l.name} moved to ${LEAD_STATUSES.find((s) => s.key === status)?.label}.`,
                                  "success"
                                );
                              router.refresh();
                            });
                          }}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-slate-200">{fmtMoney(l.deal_value)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1 ${overdueFollowUp ? "text-amber-300 font-medium" : "text-slate-400"}`}>
                          <CalendarClock className="h-3 w-3" /> {fmtDate(l.next_follow_up)}
                          {overdueFollowUp && " · due"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-0.5">
                          {!["won", "lost"].includes(l.status) && (
                            <button
                              title="Convert to client (marks Won)"
                              disabled={pending}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-300 hover:bg-emerald-400/10 transition-colors"
                              onClick={() => {
                                if (confirm(`Convert "${l.name}" into a client account?`)) run(() => convertLeadAction(l.id));
                              }}
                            >
                              <Trophy className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            title="Edit lead"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
                            onClick={() => { setEditing(l); setError(null); setFormModal(true); }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            title="Delete lead"
                            disabled={pending}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-300 hover:bg-rose-400/10 transition-colors"
                            onClick={() => {
                              if (confirm(`Delete lead "${l.name}"?`)) run(() => deleteLeadAction(l.id));
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((l) => {
              const overdueFollowUp =
                l.next_follow_up && !["won", "lost"].includes(l.status) &&
                new Date(isoDate(l.next_follow_up) + "T23:59:59") < new Date();
              return (
                <div key={l.id} className="card p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">{l.name}</p>
                      {l.company && <p className="text-[11px] text-slate-500 truncate">{l.company}</p>}
                    </div>
                    <span className="text-sm font-semibold text-white shrink-0">{fmtMoney(l.deal_value)}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <StageSelect
                      lead={l}
                      disabled={pending}
                      onSelect={(status) => {
                        if (
                          l.status === "won" &&
                          l.has_active_work &&
                          status !== "won" &&
                          !window.confirm(
                            `${l.name} has active projects and tasks (${l.active_task_count} open). Are you sure you want to change the status?`
                          )
                        ) {
                          return;
                        }
                        start(async () => {
                          const res = await updateLeadStatusAction(l.id, status);
                          if (res.error) toast(res.error, "error");
                          else
                            toast(
                              `${l.name} moved to ${LEAD_STATUSES.find((s) => s.key === status)?.label}.`,
                              "success"
                            );
                          router.refresh();
                        });
                      }}
                    />
                    <span className="text-[10px] text-slate-500">{SOURCE_LABELS[l.source] || l.source}</span>
                    {overdueFollowUp && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-300 font-medium">
                        <CalendarClock className="h-3 w-3" /> due
                      </span>
                    )}
                  </div>
                  {(l.email || l.phone) && (
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-3">
                      {l.email && <span className="truncate">{l.email}</span>}
                      {l.phone && <span className="shrink-0">{l.phone}</span>}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 border-t border-white/[0.06] pt-2.5">
                    {!["won", "lost"].includes(l.status) && (
                      <button
                        disabled={pending}
                        className="btn-secondary !py-1 !px-2.5 text-[10px] !min-h-0"
                        onClick={() => {
                          if (confirm(`Convert "${l.name}" into a client account?`)) run(() => convertLeadAction(l.id));
                        }}
                      >
                        <Trophy className="h-3 w-3" /> Won
                      </button>
                    )}
                    <button
                      className="btn-secondary !py-1 !px-2.5 text-[10px] !min-h-0"
                      onClick={() => { setEditing(l); setError(null); setFormModal(true); }}
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    <button
                      disabled={pending}
                      className="btn-ghost !py-1 !px-2.5 text-[10px] !min-h-0 !text-rose-400 hover:!bg-rose-400/10"
                      onClick={() => {
                        if (confirm(`Delete lead "${l.name}"?`)) run(() => deleteLeadAction(l.id));
                      }}
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                    {!overdueFollowUp && l.next_follow_up && (
                      <span className="ml-auto text-[10px] text-slate-500 flex items-center gap-0.5">
                        <CalendarClock className="h-3 w-3" /> {fmtDate(l.next_follow_up)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <LeadFormModal
        open={formModal}
        editing={editing}
        pending={pending}
        error={error}
        onClose={() => setFormModal(false)}
        onSubmit={async (fd) => {
          if (
            editing &&
            editing.status === "won" &&
            editing.has_active_work &&
            String(fd.get("status") || "won") !== "won" &&
            !window.confirm(
              `${editing.name} has active projects and tasks (${editing.active_task_count} open). Are you sure you want to change the status?`
            )
          ) {
            return;
          }
          const res = editing ? await updateLeadAction(editing.id, fd) : await createLeadAction(fd);
          if (res.error) setError(res.error);
          else {
            setFormModal(false);
            router.refresh();
          }
        }}
      />
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Custom themed stage picker — anchored dropdown menu with reliable
 * outside-click and Escape handling, fully aligned with the dark theme.
 */
function StageSelect({
  lead,
  disabled,
  onSelect,
}: {
  lead: Lead;
  disabled?: boolean;
  onSelect: (status: LeadStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = LEAD_STATUSES.find((s) => s.key === lead.status);
  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-label={`Change stage for ${lead.name}`}
        className={`badge cursor-pointer inline-flex items-center gap-1 transition-colors ${STATUS_STYLES[lead.status] || "bg-white/10 text-slate-300"}`}
      >
        {current?.label || lead.status}
        <ChevronDown className={`h-3 w-3 opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-30 w-44 rounded-xl border border-white/10 bg-night-850 shadow-lg shadow-black/40 overflow-hidden animate-fade-in">
          {LEAD_STATUSES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                setOpen(false);
                if (s.key !== lead.status) onSelect(s.key);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                s.key === lead.status
                  ? "text-brand-300 bg-brand-300/10"
                  : "text-slate-200 hover:bg-white/[0.06]"
              }`}
            >
              <span className={`h-2 w-2 rounded-full shrink-0 ${STAGE_DOTS[s.key] || "bg-slate-500"}`} />
              {s.label}
              {s.key === lead.status && <span className="ml-auto text-[9px] text-brand-300">current</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LeadFormModal({
  open,
  editing,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editing: Lead | null;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (fd: FormData) => Promise<void>;
}) {
  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Lead" : "New Lead"}>
      {error && <p className="mb-2 rounded-lg bg-rose-400/10 text-rose-300 text-xs px-3 py-2">{error}</p>}
      <form action={onSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Name *</label>
            <input name="name" required defaultValue={editing?.name || ""} className="input" placeholder="Lead name" />
          </div>
          <div>
            <label className="label">Company</label>
            <input name="company" defaultValue={editing?.company || ""} className="input" placeholder="Company name" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" defaultValue={editing?.email || ""} className="input" placeholder="email@company.com" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input name="phone" defaultValue={editing?.phone || ""} className="input" placeholder="Phone number" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Source</label>
            <select name="source" defaultValue={editing?.source || "website"} className="input" style={{ colorScheme: "dark" }}>
              {LEAD_SOURCES.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Lead stage / status</label>
            <select name="status" defaultValue={editing?.status || "new"} className="input" style={{ colorScheme: "dark" }}>
              {LEAD_STATUSES.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Deal value (₹)</label>
          <input
            name="deal_value"
            type="number"
            min={0}
            step={1000}
            defaultValue={editing?.deal_value || ""}
            className="input"
            placeholder="25000"
          />
        </div>
        <div>
          <label className="label">Next follow-up</label>
          <DatePicker
            name="next_follow_up"
            value={isoDate(editing?.next_follow_up) || undefined}
            placeholder="Schedule a follow-up…"
          />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea name="notes" rows={2} defaultValue={editing?.notes || ""} className="input" placeholder="Context, requirements, objections…" />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? "Saving…" : editing ? "Save changes" : "Add lead"}
        </button>
      </form>
    </Modal>
  );
}
