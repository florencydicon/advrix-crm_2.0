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
  Trash2,
} from "lucide-react";
import { createClientAction, createProjectAction, deleteClientAction } from "@/lib/actions/projects";
import type { ClientCard } from "@/lib/data";
import type { DeliverableType } from "@/lib/types";
import { formatClientName } from "@/lib/utils";
import { Modal, EmptyState } from "@/components/ui";
import { SearchableSelect } from "@/components/SearchableSelect";
import { DatePicker } from "@/components/DatePicker";
import { useToast } from "@/components/Toast";

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
  quantities,
  setQuantities,
  custom,
  setCustom,
  customLabel,
  setCustomLabel,
  customQty,
  setCustomQty,
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
}) {
  const selected: Deliv[] = [
    ...types
      .filter((t) => (quantities[t.key] || 0) > 0)
      .map((t) => ({ key: t.key, label: t.label, quantity: quantities[t.key] || 0, isCustom: false })),
    ...(custom && customLabel.trim() && customQty > 0
      ? [{ key: "custom", label: customLabel.trim(), quantity: customQty, isCustom: true, customLabel: customLabel.trim() }]
      : []),
  ];

  const total = selected.reduce((s, d) => s + d.quantity, 0);

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
                  }}
                  className="input !w-14 !py-0.5 text-center text-xs"
                  aria-label={`Quantity of ${t.label}`}
                />
              </div>
              {q > 0 && (
                <p className="text-[10px] text-brand-300 mt-1">
                  {q} task{q === 1 ? "" : "s"} will be generated
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Other — fully custom deliverable with its own repeat counter */}
      <div className="rounded-lg border border-dashed border-white/10 p-2 space-y-1.5">
        <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
          <input
            type="checkbox"
            checked={custom}
            onChange={(e) => setCustom(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-brand-300 focus:ring-brand-300/25"
          />
          Other (custom task)
        </label>
        {custom && (
          <div className="flex items-center gap-2">
            <input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              className="input !py-1 text-xs flex-1"
              placeholder="e.g. Catalogue Covers, Packaging Mockups…"
            />
            <input
              type="number"
              min={1}
              max={500}
              value={customQty}
              onChange={(e) => {
                const v = Math.max(1, Math.min(500, Number(e.target.value) || 1));
                setCustomQty(v);
              }}
              className="input !w-14 !py-1 text-center text-xs shrink-0"
              aria-label="How many times to repeat this custom task"
              title="Repeat count"
            />
          </div>
        )}
        {custom && customLabel.trim() && (
          <p className="text-[10px] text-brand-300">
            {customQty} × “{customLabel.trim()}” task{customQty === 1 ? "" : "s"} will be generated
          </p>
        )}
      </div>

      <div className="rounded-lg bg-brand-300/10 border border-brand-300/20 p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Tags className="h-3.5 w-3.5 text-brand-300" />
          <p className="text-xs font-semibold text-brand-200">Generated Tasks Preview</p>
        </div>
        {total === 0 ? (
          <p className="text-[11px] text-slate-500">Set quantities above to preview tasks.</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {selected.map((d) =>
              Array.from({ length: d.quantity }, (_, i) => (
                <span key={`${d.key}-${i}`} className="badge bg-brand-300/10 text-brand-300 border border-brand-300/20 text-[10px]">
                  {d.label} {pad(i + 1)}
                </span>
              ))
            )}
          </div>
        )}
        {total > 0 && (
          <p className="text-[10px] text-brand-300 mt-1.5">
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
  canDelete,
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
  canDelete: boolean;
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
  const { toast } = useToast();
  const [clientModal, setClientModal] = useState(false);
  const [briefModal, setBriefModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState("");
  const [deliv, setDeliv] = useState<Deliv[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [custom, setCustom] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customQty, setCustomQty] = useState(1);
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
      const types = deliverableTypes;
      const currentDeliv: Deliv[] = [
        ...types
          .filter((t) => (quantities[t.key] || 0) > 0)
          .map((t) => ({ key: t.key, label: t.label, quantity: quantities[t.key] || 0, isCustom: false })),
        ...(custom && customLabel.trim() && customQty > 0
          ? [{ key: "custom", label: customLabel.trim(), quantity: customQty, isCustom: true, customLabel: customLabel.trim() }]
          : []),
      ];
      if (currentDeliv.length > 0) fd.set("deliverables_json", JSON.stringify(currentDeliv));
      const res = await fn(fd);
      if (res.error) setError(res.error);
      else {
        setClientModal(false);
        setBriefModal(false);
        setDeliv([]);
        setQuantities({});
        setCustom(false);
        setCustomLabel("");
        setCustomQty(1);
        router.refresh();
      }
    };
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Clients</h1>
          <p className="text-sm text-slate-500">Accounts and tasks flowing through the agency.</p>
        </div>
        {canCreate && (
          <div className="flex gap-1.5">
            <button className="btn-secondary !py-1.5 !px-3 text-xs" onClick={() => setBriefModal(true)}>
              <FilePlus2 className="h-3.5 w-3.5" /> Add Tasks
            </button>
            <button className="btn-primary !py-1.5 !px-3 text-xs" onClick={() => setClientModal(true)}>
              <Plus className="h-3.5 w-3.5" /> New Client
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
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
          <span className="badge bg-white/10 text-slate-300">{total} client{total === 1 ? "" : "s"}</span>
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
                  <div className="h-9 w-9 rounded-xl bg-brand-300/10 flex items-center justify-center shrink-0 text-brand-300 font-bold text-sm">
                    {initials(c.company || c.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-white truncate">{formatClientName(c.company, c.name)}</p>
                    <p className="text-[11px] text-slate-500 truncate">{c.company ? `Contact: ${c.name}` : "—"}</p>
                  </div>
                  {canCreate && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedClient(c.id); setBriefModal(true); }}
                      className="btn-secondary !py-1 !px-2 text-[11px] shrink-0"
                      title="Add tasks for this client"
                    >
                      <FilePlus2 className="h-3 w-3" /> Tasks
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!window.confirm(`Remove "${c.name}" and ALL of their projects and tasks? This cannot be undone.`)) return;
                        const res = await deleteClientAction(c.id);
                        if (res.error) toast(res.error, "error");
                        else { toast("Client removed.", "success"); router.refresh(); }
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-300 hover:bg-rose-400/10 transition-colors shrink-0"
                      title="Remove this client"
                      aria-label={`Remove ${c.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 mt-auto pt-2 border-t border-white/10">
                  <span className="text-[10px] text-slate-600 whitespace-nowrap">
                    Added {new Date(c.created_at).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })} · {new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {(c.email || c.phone) && (
                    <span className="text-slate-500 truncate max-w-[140px] hidden sm:inline">
                      · {c.email || c.phone}
                    </span>
                  )}
                  <span className="ml-auto flex items-center gap-1.5">
                    <span className={`badge ${c.active_projects > 0 ? "bg-amber-400/10 text-amber-300" : "bg-white/10 text-slate-500"}`}>
                      {c.active_projects} active
                    </span>
                    <span className="badge bg-emerald-400/10 text-emerald-300">{c.total_projects} projects</span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                  </span>
                </div>
              </button>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border border-white/10 rounded-xl bg-night-850">
              <p className="text-[11px] text-slate-500">
                {total} clients · Page {page}/{totalPages}
              </p>
              <div className="flex items-center gap-0.5">
                <button
                  className="p-1 rounded text-slate-500 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed"
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
                          ? "bg-brand-300 text-night-950"
                          : "text-slate-300 hover:bg-white/15"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  className="p-1 rounded text-slate-500 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed"
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
        {error && <p className="mb-2 rounded-lg bg-rose-400/10 text-rose-300 text-xs px-3 py-2">{error}</p>}
        <form action={runWith(createClientAction)} className="space-y-3">
          <div>
            <label className="label">Client / Contact name</label>
            <input name="name" required className="input" placeholder="Client name" />
          </div>
          <div>
            <label className="label">Company</label>
            <input name="company" className="input" placeholder="Company name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" className="input" placeholder="email@company.com" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input name="phone" className="input" placeholder="Phone number" />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={pending}>
            {pending ? "Saving…" : "Save client"}
          </button>
        </form>
      </Modal>

      <Modal open={briefModal} onClose={() => setBriefModal(false)} title="Add Tasks">
        {error && <p className="mb-2 rounded-lg bg-rose-400/10 text-rose-300 text-xs px-3 py-2">{error}</p>}
        <form action={runWith(createProjectAction)} className="space-y-3">
          <div>
            <label className="label">Client</label>
            <SearchableSelect
              name="client_id"
              options={clients.map((c) => ({
                value: c.id,
                label: formatClientName(c.company, c.name),
                search: `${c.name} ${c.company || ""} ${c.email || ""}`,
              }))}
              value={selectedClient}
              onChange={setSelectedClient}
              placeholder="Search client…"
            />
          </div>
          <div>
            <label className="label">Project name</label>
            <input name="name" required className="input" placeholder="Project name" />
          </div>
          <div>
            <label className="label">Task details <span className="text-slate-500 font-normal">(optional)</span></label>
            <textarea name="brief" rows={2} className="input" placeholder="Campaign goal, tone, audience, channels…" />
          </div>
          <div>
            <label className="label">Deliverables</label>
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
            />
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