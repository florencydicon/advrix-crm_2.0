"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Building2, Mail, Phone, FilePlus2, Tags } from "lucide-react";
import { createClientAction, createProjectAction } from "@/lib/actions/projects";
import type { Client, DeliverableType } from "@/lib/types";
import { Modal, EmptyState } from "@/components/ui";
import SmartTable, { type Column } from "@/components/SmartTable";

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
  clients: Client[];
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
  const [pending, start] = useTransition();
  const [clientModal, setClientModal] = useState(false);
  const [briefModal, setBriefModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState("");
  const [deliv, setDeliv] = useState<Deliv[]>([]);

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

  const columns: Column<Client>[] = [
    {
      key: "name",
      label: "Client",
      render: (c) => (
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-brand-600/10 flex items-center justify-center shrink-0">
            <Building2 className="h-3.5 w-3.5 text-brand-700" />
          </div>
          <p className="font-medium text-xs text-slate-800">{c.name}</p>
        </div>
      ),
    },
    {
      key: "company",
      label: "Company",
      render: (c) => <span className="text-xs text-slate-500">{c.company || "—"}</span>,
    },
    {
      key: "contact",
      label: "Contact",
      render: (c) => (
        <div className="space-y-0.5">
          {c.email && (
            <p className="flex items-center gap-1 text-[11px] text-slate-500">
              <Mail className="h-2.5 w-2.5" /> {c.email}
            </p>
          )}
          {c.phone && (
            <p className="flex items-center gap-1 text-[11px] text-slate-500">
              <Phone className="h-2.5 w-2.5" /> {c.phone}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "w-[100px]",
      render: (c) =>
        canCreate ? (
          <button
            className="btn-secondary !py-1 !px-2 text-[11px]"
            onClick={() => { setSelectedClient(c.id); setBriefModal(true); }}
          >
            <FilePlus2 className="h-3 w-3" /> Brief
          </button>
        ) : null,
    },
  ];

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

      {clients.length === 0 ? (
        <EmptyState title="No clients yet" subtitle="Add your first client to start the onboarding flow." />
      ) : (
        <SmartTable
          columns={columns}
          data={clients}
          total={total}
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          searchPlaceholder="Search clients…"
          basePath={basePath}
          emptyTitle="No clients found"
          emptySubtitle="Try a different search term."
        />
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
            <select name="client_id" required className="input" value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
              <option value="">Select client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
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
            <input name="deadline" type="date" className="input" />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={pending}>
            {pending ? "Creating…" : "Submit for PM approval"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
