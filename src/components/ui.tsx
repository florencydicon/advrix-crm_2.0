import { X, CircleCheck, Clock, PauseCircle } from "lucide-react";

export const STATUS_META: Record<string, { label: string; cls: string; Icon: any }> = {
  pending: { label: "Pending", cls: "bg-slate-100 text-slate-600", Icon: PauseCircle },
  in_progress: { label: "In Progress", cls: "bg-amber-100 text-amber-700", Icon: Clock },
  review: { label: "In Review", cls: "bg-violet-100 text-violet-700", Icon: Clock },
  completed: { label: "Completed", cls: "bg-emerald-100 text-emerald-700", Icon: CircleCheck },
};

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.Icon;
  return (
    <span className={`badge ${meta.cls}`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

const PRIORITY_META: Record<string, { label: string; cls: string }> = {
  low: { label: "Low", cls: "bg-slate-100 text-slate-500" },
  medium: { label: "Medium", cls: "bg-sky-100 text-sky-700" },
  high: { label: "High", cls: "bg-rose-100 text-rose-700" },
};

export function PriorityBadge({ priority }: { priority: string }) {
  const meta = PRIORITY_META[priority] || PRIORITY_META.medium;
  return <span className={`badge ${meta.cls}`}>{meta.label}</span>;
}

const PROJECT_STATUS_META: Record<string, { label: string; cls: string }> = {
  pending_approval: { label: "Awaiting PM Approval", cls: "bg-amber-100 text-amber-700" },
  in_progress: { label: "In Production", cls: "bg-brand-100 text-brand-700" },
  completed: { label: "Completed", cls: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", cls: "bg-rose-100 text-rose-700" },
};

export function ProjectStatusBadge({ status }: { status: string }) {
  const meta = PROJECT_STATUS_META[status] || PROJECT_STATUS_META.pending_approval;
  return <span className={`badge ${meta.cls}`}>{meta.label}</span>;
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="card flex flex-col items-center justify-center p-10 text-center">
      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
        <PauseCircle className="h-6 w-6 text-slate-400" />
      </div>
      <p className="font-medium text-slate-700">{title}</p>
      {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
}

export function Stat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent || "text-ink"}`}>{value}</p>
    </div>
  );
}