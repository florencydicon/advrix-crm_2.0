"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Mail,
  Phone,
  FilePlus2,
  Tags,
  ChevronRight,
  Search,
  ChevronLeft,
} from "lucide-react";
import { createClientAction, createProjectAction } from "@/lib/actions/projects";
import type { ClientCard } from "@/lib/data";
import type { DeliverableType } from "@/lib/types";
import { Modal, EmptyState } from "@/components/ui";
import { SearchableSelect } from "@/components/SearchableSelect";
import { DatePicker } from "@/components/DatePicker";

interface Deliv {
  key: string;
  label: string;
  quantity: number;
  isCustom: boolean;
  customLabel?: string | null;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

function DeliverablesPicker({
  types,
  onChange,
}: {
  types: DeliverableType[];
  onChange: (d: Deliv[]) => void;
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [custom, setCustom] = useState(false);
  const [customLabel, setCustomLabel] = useState("");

  const selected: Deliv[] = [
    ...types
      .filter((t) => (quantities[t.key] || 0) > 0)
      .map((t) => ({ key: t.key, label: t.label, quantity: quantities[t.key] || 0, isCustom: false })),
    ...(custom && customLabel.trim()
      ? [{ key: "custom", label: customLabel.trim(), quantity: 1, isCustom: true, customLabel: customLabel.trim() }]
      : []),
  ];

  const total = selected.reduce((s, d) => s + d.quantity, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {types.map((t) => {
          const q = quantities[t.key] || 0;
          return (
            <div key={t.key} className="rounded-lg border border-slate-200 p-2 bg-slate-50/50">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-slate-700">{t.label}</p>
                <input
                  type="number"
                  min={0}
                  max={500}
                  value={q}
                  onChange={(e) => {
                    const v = Math.max(0, Math.min(500, Number(e.target.value) || 0));
                    setQuantities((prev) => ({ ...prev, [t.key]: v }));
                    onChange([...selected]);
                  }}
                  className="input !w-14 !py-0.5 text-center text-xs"
                  aria-label={`Quantity of ${t.label}`}
                />
              </div>
              {q > 0 && (
                <p className="text-[10px] text-brand-600 mt-1">
                  {q} task{q === 1 ? "" : "s"} will be generated
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-dashed border-slate-300 p-2 space-y-1.5">
        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={custom}
            onChange={(e) => { setCustom(e.target.checked); onChange([...selected]); }}
            className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          Custom Design Deliverables
        </label>
        {custom && (
          <input
            value={customLabel}
            onChange={(e) => { setCustomLabel(e.target.value); onChange([...selected]); }}
            className="input !py-1 text-xs"
            placeholder="e.g. Catalogue Covers, Packaging Mockups…"
          />
        )}
      </div>

      <div className="rounded-lg bg-brand-50/60 border border-brand-100 p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Tags className="h-3.5 w-3.5 text-brand-700" />
          <p className="text-xs font-semibold text-brand-800">Generated Tasks Preview</p>
        </div>
        {total === 0 ? (
          <p className="text-[11px] text-slate-400">Set quantities above to preview tasks.</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {selected.map((d) =>
              Array.from({ length: d.quantity }, (_, i) => (
                <span key={`${d.key}-${i}`} className="badge bg-white text-brand-700 border border-brand-200 text-[10px]">
                  {d.label} {pad(i + 1)}
                </span>
              ))
            )}
          </div>
        )}
        {total > 0 && (
          <p className="text-[10px] text-brand-600 mt-1.5">
            {total} content task{total === 1 ? "" : "s"} now · visual tasks auto-spawn after approval.
          </p>
        )}
      </div>
    </div>
  );
}

export default function ClientsView({
  clients,
  canCreate,
  deliverableTypes,
  page,
  pageSize,
  total,
  totalPages,
  search,
  basePath,
}: {
  clients: ClientCard[];
  canCreate: boolean;
  deliverableTypes: DeliverableType[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  search: string;
  basePath: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, start] = useTransition();
  const [clientModal, setClientModal] = useState(false);
  const [briefModal, setBriefModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState("");
  const [deliv, setDeliv] = useState<Deliv[]>([]);
  const [searchDraft, setSearchDraft] = useState(search);

  const navigate = useCallback(
    (params: Record<string, string | null>) => {
      const newParams = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(params)) {
        if (value === null || value === "") {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      }
      if (!params.page) newParams.delete("page");
      router.push(`${basePath}?${newParams.toString()}`);
    },
    [router, searchParams, basePath]
  );


  function runWith(fn: (fd: FormData) => Promise<{ ok?: boolean; error?: string }>) {
    return async (fd: FormData) => {
      setError(null);
      if (deliv.length > 0) fd.set("deliverables_json", JSON.stringify(deliv));
      const res = await fn(fd);
      if (res.error) setError(res.error);
      else {
        setClientModal(false);
        setBriefModal(false);
        setDeliv([]);
        router.refresh();
      }
    };
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Clients</h1>
          <p className="text-sm text-slate-500">Accounts and briefs flowing through the agency.</p>
        </div>
        {canCreate && (
          <div className="flex gap-1.5">
            <button className="btn-secondary !py-1.5 !px-3 text-xs" onClick={() => setBriefModal(true)}>
              <FilePlus2 className="h-3.5 w-3.5" /> New Brief
            </button>
            <button className="btn-primary !py-1.5 !px-3 text-xs" onClick={() => setClientModal(true)}>
              <Plus className="h-3.5 w-3.5" /> New Client
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && navigate({ search: searchDraft || null })}
            placeholder="Search clients…"
            className="input !pl-8 !py-1.5 text-xs"
          />
        </div>
        {total > 0 && (
          <span className="badge bg-slate-100 text-slate-600">{total} client{total === 1 ? "" : "s"}</span>
        )}
      </div>

      {clients.length === 0 ? (
        search ? (
          <EmptyState title="No clients found" subtitle="Try a different search term." />
        ) : (
          <EmptyState title="No clients yet" subtitle="Add your first client to start the onboarding flow." />
        )
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {clients.map((c) => (
              <button
                key={c.id}
                onClick={() => router.push(`/projects?client=${c.id}`)}
                className="card card-hover p-4 text-left overflow-hidden flex flex-col gap-2"
              >
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-brand-600/10 flex items-center justify-center shrink-0 text-brand-700 font-bold text-sm">
                    {initials(c.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-slate-800 truncate">{c.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{c.company || "—"}</p>
                  </div>
                  {canCreate && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedClient(c.id); setBriefModal(true); }}
                      className="btn-secondary !py-1 !px-2 text-[11px] shrink-0"
                      title="New brief for this client"
                    >
                      <FilePlus2 className="h-3 w-3" /> Brief
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 mt-auto pt-2 border-t border-slate-100">
                  {(c.email || c.phone) && (
                    <span className="text-slate-400 truncate max-w-[180px]">
                      {c.email || c.phone}
                    </span>
                  )}
                  <span className="ml-auto flex items-center gap-1.5">
                    <span className={`badge ${c.active_projects > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                      {c.active_projects} active
                    </span>
                    <span className="badge bg-emerald-100 text-emerald-700">{c.total_projects} projects</span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                  </span>
                </div>
              </button>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border border-slate-200 rounded-xl bg-white">
              <p className="text-[11px] text-slate-500">
                {total} clients · Page {page}/{totalPages}
              </p>
              <div className="flex items-center gap-0.5">
                <button
                  className="p-1 rounded text-slate-400 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  disabled={page <= 1}
                  onClick={() => navigate({ page: String(page - 1) })}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (page <= 3) pageNum = i + 1;
                  else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = page - 2 + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => navigate({ page: String(pageNum) })}
                      className={`w-7 h-7 rounded text-[11px] font-medium transition-colors ${
                        page === pageNum
                          ? "bg-brand-600 text-white"
                          : "text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  className="p-1 rounded text-slate-400 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  disabled={page >= totalPages}
                  onClick={() => navigate({ page: String(page + 1) })}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={clientModal} onClose={() => setClientModal(false)} title="New Client">
        {error && <p className="mb-2 rounded-lg bg-rose-50 text-rose-700 text-xs px-3 py-2">{error}</p>}
        <form action={runWith(createClientAction)} className="space-y-3">
          <div>
            <label className="label">Client / Contact name</label>
            <input name="name" required className="input" placeholder="Lumina Cosmetics" />
          </div>
          <div>
            <label className="label">Company</label>
            <input name="company" className="input" placeholder="Lumina Pvt Ltd" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" className="input" placeholder="hello@lumina.in" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input name="phone" className="input" placeholder="+91 98765 00000" />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={pending}>
            {pending ? "Saving…" : "Save client"}
          </button>
        </form>
      </Modal>

      <Modal open={briefModal} onClose={() => setBriefModal(false)} title="New Project Brief">
        {error && <p className="mb-2 rounded-lg bg-rose-50 text-rose-700 text-xs px-3 py-2">{error}</p>}
        <form action={runWith(createProjectAction)} className="space-y-3">
          <div>
            <label className="label">Client</label>
            <SearchableSelect
              name="client_id"
              options={clients.map((c) => ({
                value: c.id,
                label: c.name,
                search: `${c.name} ${c.company || ""} ${c.email || ""}`,
              }))}
              value={selectedClient}
              onChange={setSelectedClient}
              placeholder="Search client…"
            />
          </div>
          <div>
            <label className="label">Project name</label>
            <input name="name" required className="input" placeholder="Aryush Height — Q3 Content Campaign" />
          </div>
          <div>
            <label className="label">Brief</label>
            <textarea name="brief" rows={2} className="input" placeholder="Campaign goal, tone, audience, channels…" />
          </div>
          <div>
            <label className="label">Deliverables</label>
            <DeliverablesPicker types={deliverableTypes} onChange={setDeliv} />
          </div>
          <div>
            <label className="label">Deadline</label>
            <DatePicker name="deadline" placeholder="Select deadline…" />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={pending}>
            {pending ? "Creating…" : "Submit for PM approval"}
          </button>
        </form>
      </Modal>
    </div>
  );
}