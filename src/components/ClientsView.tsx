"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Building2, Mail, Phone, FilePlus2, Tags } from "lucide-react";
import { createClientAction, createProjectAction } from "@/lib/actions/projects";
import type { Client, DeliverableType } from "@/lib/types";
import { Modal, EmptyState } from "@/components/ui";

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
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {types.map((t) => {
          const q = quantities[t.key] || 0;
          return (
            <div key={t.key} className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-700">{t.label}</p>
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
                  className="input !w-16 !py-1 text-center text-sm"
                  aria-label={`Quantity of ${t.label}`}
                />
              </div>
              {q > 0 && (
                <p className="text-[11px] text-brand-600 mt-1.5">
                  {q} task{q === 1 ? "" : "s"} will be generated
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 p-3 space-y-2">
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={custom}
            onChange={(e) => {
              setCustom(e.target.checked);
              onChange([...selected]);
            }}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          Custom Design Deliverables
        </label>
        {custom && (
          <input
            value={customLabel}
            onChange={(e) => {
              setCustomLabel(e.target.value);
              onChange([...selected]);
            }}
            className="input !py-1.5 text-sm"
            placeholder="e.g. Catalogue Covers, Packaging Mockups, Menu Design…"
          />
        )}
        {custom && customLabel.trim() && (
          <p className="text-[11px] text-slate-400">One task per custom deliverable. Custom deliverables go straight to the Designer after approval.</p>
        )}
      </div>

      <div className="rounded-xl bg-brand-50/60 border border-brand-100 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Tags className="h-4 w-4 text-brand-700" />
          <p className="text-sm font-semibold text-brand-800">Generated Tasks Preview</p>
        </div>
        {total === 0 ? (
          <p className="text-xs text-slate-400">Set quantities above — each individual task tag appears here in real time.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((d) =>
              Array.from({ length: d.quantity }, (_, i) => (
                <span key={`${d.key}-${i}`} className="badge bg-white text-brand-700 border border-brand-200">
                  {d.label} {pad(i + 1)}
                </span>
              ))
            )}
          </div>
        )}
        {total > 0 && (
          <p className="text-[11px] text-brand-600 mt-2">
            {total} content task{total === 1 ? "" : "s"} now · visual task{total === 1 ? "" : "s"} auto-spawn after copy is approved.
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
}: {
  clients: Client[];
  canCreate: boolean;
  deliverableTypes: DeliverableType[];
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Clients &amp; Briefs</h1>
          <p className="text-sm text-slate-500">Onboard clients and create initial project briefs for PM approval.</p>
        </div>
        {canCreate && (
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setBriefModal(true)}>
              <FilePlus2 className="h-4 w-4" /> New Brief
            </button>
            <button className="btn-primary" onClick={() => setClientModal(true)}>
              <Plus className="h-4 w-4" /> New Client
            </button>
          </div>
        )}
      </div>

      {clients.length === 0 ? (
        <EmptyState title="No clients yet" subtitle="Add your first client to start the onboarding flow." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => (
            <div key={c.id} className="card p-5 space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-brand-600/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-brand-700" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{c.name}</p>
                  {c.company && <p className="text-xs text-slate-400 truncate">{c.company}</p>}
                </div>
              </div>
              <div className="space-y-1 pt-1">
                {c.email && (
                  <p className="flex items-center gap-2 text-xs text-slate-500">
                    <Mail className="h-3 w-3" /> {c.email}
                  </p>
                )}
                {c.phone && (
                  <p className="flex items-center gap-2 text-xs text-slate-500">
                    <Phone className="h-3 w-3" /> {c.phone}
                  </p>
                )}
              </div>
              {canCreate && (
                <button
                  className="btn-secondary w-full !py-1.5 text-xs"
                  onClick={() => {
                    setSelectedClient(c.id);
                    setBriefModal(true);
                  }}
                >
                  <FilePlus2 className="h-3.5 w-3.5" /> Create brief for this client
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={clientModal} onClose={() => setClientModal(false)} title="New Client">
        {error && <p className="mb-3 rounded-lg bg-rose-50 text-rose-700 text-sm px-3 py-2">{error}</p>}
        <form action={runWith(createClientAction)} className="space-y-4">
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
        {error && <p className="mb-3 rounded-lg bg-rose-50 text-rose-700 text-sm px-3 py-2">{error}</p>}
        <form action={runWith(createProjectAction)} className="space-y-4">
          <div>
            <label className="label">Client</label>
            <select
              name="client_id"
              required
              className="input"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
            >
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
            <textarea
              name="brief"
              rows={3}
              className="input"
              placeholder="Campaign goal, tone, audience, channels, key messages…"
            />
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
