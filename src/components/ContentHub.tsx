"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FileText, CheckCircle2, Plus, Search } from "lucide-react";
import type { Client, ContentItem, UserRow } from "@/lib/types";
import ContentModal from "@/components/ContentModal";

function preview(body: string | null): string {
  const t = (body || "").trim().replace(/\s+/g, " ");
  if (!t) return "—";
  return t.length > 140 ? `${t.slice(0, 140)}…` : t;
}

function StatusPill({ status }: { status: ContentItem["status"] }) {
  if (status === "completed") {
    return (
      <span className="badge bg-emerald-400/10 text-emerald-300 whitespace-nowrap">
        <CheckCircle2 className="h-3 w-3" /> Completed
      </span>
    );
  }
  return (
    <span className="badge bg-brand-300/10 text-brand-300 whitespace-nowrap">
      <FileText className="h-3 w-3" /> Active
    </span>
  );
}

/**
 * Standalone Content hub — independent of the Project Pipeline.
 * Columns: Content/Copy | Client Name | Assignee | Status.
 * Active/History tabs; completing an item moves it to History.
 */
export default function ContentHub({
  items,
  clients,
  team,
  canManage,
  canEdit,
}: {
  items: ContentItem[];
  clients: Client[];
  team: UserRow[];
  canManage: boolean;
  canEdit: boolean;
}) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"active" | "history">("active");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContentItem | null>(null);
  const router = useRouter();

  const refresh = async () => {
    router.refresh();
  };

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openRow = (t: ContentItem) => {
    setEditing(t);
    setModalOpen(true);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const inTab = items.filter((t) =>
      tab === "history" ? t.status === "completed" : t.status !== "completed"
    );
    if (!q) return inTab;
    return inTab.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.body || "").toLowerCase().includes(q) ||
        t.client_name.toLowerCase().includes(q) ||
        (t.client_company || "").toLowerCase().includes(q) ||
        (t.assignee_name || "").toLowerCase().includes(q)
    );
  }, [items, search, tab]);

  const activeCount = items.filter((t) => t.status !== "completed").length;
  const historyCount = items.filter((t) => t.status === "completed").length;

  const mobileCard = (t: ContentItem) => (
    <button
      key={t.id}
      type="button"
      onClick={() => openRow(t)}
      className="w-full text-left rounded-xl border border-white/10 bg-white/[0.03] p-3.5 hover:bg-white/[0.05] transition-colors active:scale-[0.99]"
    >
      <p className="text-sm font-semibold text-white leading-snug">{t.title}</p>
      <p className="text-xs text-slate-400 mt-1 leading-snug line-clamp-3">{preview(t.body)}</p>
      <p className="text-xs text-slate-500 mt-1.5 truncate">
        {t.client_company || t.client_name} · {t.assignee_name || "Unassigned"}
      </p>
      <div className="flex items-center gap-1.5 mt-2.5">
        <StatusPill status={t.status} />
      </div>
    </button>
  );

  return (
    <div className="w-full max-w-none space-y-3">
      {/* Tabs + Add */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTab("active")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === "active"
                ? "bg-brand-300 text-night-950"
                : "bg-white/[0.04] text-slate-300 hover:bg-white/10"
            }`}
          >
            <FileText className="h-4 w-4" />
            Active
            <span className={`text-xs font-semibold ${tab === "active" ? "text-night-900" : "text-slate-500"}`}>
              {activeCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab("history")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === "history"
                ? "bg-brand-300 text-night-950"
                : "bg-white/[0.04] text-slate-300 hover:bg-white/10"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            History
            <span className={`text-xs font-semibold ${tab === "history" ? "text-night-900" : "text-slate-500"}`}>
              {historyCount}
            </span>
          </button>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={openAdd}
            className="btn-primary !py-2.5 text-sm ml-auto"
          >
            <Plus className="h-4 w-4" /> Add Content
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search content, clients, assignees…"
          className="input !py-1.5 text-xs w-full !pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card py-8 text-center">
          <p className="text-sm font-medium text-slate-300">
            {items.length === 0
              ? "No content yet"
              : tab === "history"
                ? "No completed content yet"
                : "No content matches your search."}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {tab === "history"
              ? "Completed content lands here."
              : "Use Add Content to draft copy for any client."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[880px]">
                <thead className="sticky top-0 z-10">
                  <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                    <th className="px-4 py-2.5 min-w-[320px] sticky left-0 bg-night-850 z-20">Content / Copy</th>
                    <th className="px-3 py-2.5 min-w-[160px]">Client Name</th>
                    <th className="px-3 py-2.5 min-w-[140px]">Assignee</th>
                    <th className="px-3 py-2.5 w-32">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => openRow(t)}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-2.5 sticky left-0 bg-night-850 z-[5]">
                        <p className="text-sm text-white font-medium leading-tight truncate max-w-[300px]">
                          {t.title}
                        </p>
                        <p className="text-xs text-slate-400 leading-snug line-clamp-2 max-w-[320px] mt-0.5">
                          {preview(t.body)}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs font-medium text-brand-300/90 block truncate max-w-[160px]">
                          {t.client_company || t.client_name}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="text-xs text-slate-300">{t.assignee_name || "Unassigned"}</span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <StatusPill status={t.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2.5">
            {filtered.map((t) => mobileCard(t))}
          </div>
        </>
      )}

      {modalOpen && (
        <ContentModal
          key={editing ? editing.id : "new"}
          item={editing}
          clients={clients}
          team={team}
          canDelete={canManage}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          refresh={refresh}
        />
      )}
    </div>
  );
}
