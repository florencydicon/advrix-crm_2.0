import { X, CircleCheck, Clock, PauseCircle, Send, Undo2, Users, Upload } from "lucide-react";

export const STATUS_META: Record<string, { label: string; cls: string; Icon: any }> = {
  pending: { label: "Pending", cls: "bg-white/10 text-slate-300", Icon: PauseCircle },
  in_progress: { label: "In Progress", cls: "bg-amber-400/10 text-amber-300", Icon: Clock },
  submitted: { label: "Awaiting Review", cls: "bg-violet-400/10 text-violet-300", Icon: Send },
  needs_improvement: { label: "Needs Improvement", cls: "bg-rose-400/10 text-rose-300", Icon: Undo2 },
  client_review: { label: "Client Review", cls: "bg-sky-400/10 text-sky-300", Icon: Users },
  client_feedback: { label: "Client Feedback", cls: "bg-rose-400/10 text-rose-300", Icon: Undo2 },
  client_approved: { label: "Client Approved", cls: "bg-emerald-400/10 text-emerald-300", Icon: CircleCheck },
  uploading: { label: "Uploading", cls: "bg-brand-300/10 text-brand-300", Icon: Upload },
  completed: { label: "Completed", cls: "bg-emerald-400/10 text-emerald-300", Icon: CircleCheck },
};

export const STATUS_ORDER = [
  "pending",
  "in_progress",
  "submitted",
  "needs_improvement",
  "client_review",
  "client_feedback",
  "client_approved",
  "uploading",
  "completed",
];

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

export const PLATFORMS = [
  { key: "instagram", label: "Instagram", icon: "📸" },
  { key: "facebook", label: "Facebook", icon: "📘" },
  { key: "youtube", label: "YouTube", icon: "🎬" },
  { key: "twitter", label: "Twitter / X", icon: "🐦" },
];

export function PlatformBadges({ platforms }: { platforms: string[] }) {
  if (!platforms || platforms.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {PLATFORMS.filter((p) => platforms.includes(p.key)).map((p) => (
        <span key={p.key} className="badge bg-white/5 text-slate-400 ring-1 ring-white/10">
          {p.icon} {p.label}
        </span>
      ))}
    </span>
  );
}

export function TaskProgress({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="w-24">
      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
        <span>{done}/{total}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full bg-brand-300 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const PRIORITY_META: Record<string, { label: string; cls: string }> = {
  low: { label: "Low", cls: "bg-white/10 text-slate-400" },
  medium: { label: "Medium", cls: "bg-sky-400/10 text-sky-300" },
  high: { label: "High", cls: "bg-rose-400/10 text-rose-300" },
};

export function PriorityBadge({ priority }: { priority: string }) {
  const meta = PRIORITY_META[priority] || PRIORITY_META.medium;
  return <span className={`badge ${meta.cls}`}>{meta.label}</span>;
}

const PROJECT_STATUS_META: Record<string, { label: string; cls: string }> = {
  pending_approval: { label: "Awaiting PM Approval", cls: "bg-amber-400/10 text-amber-300" },
  in_progress: { label: "In Production", cls: "bg-brand-300/10 text-brand-300" },
  completed: { label: "Completed", cls: "bg-emerald-400/10 text-emerald-300" },
  rejected: { label: "Rejected", cls: "bg-rose-400/10 text-rose-300" },
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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-night-850 rounded-2xl shadow-2xl shadow-black/50 ring-1 ring-white/10">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
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
      <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
        <PauseCircle className="h-6 w-6 text-slate-500" />
      </div>
      <p className="font-medium text-slate-200">{title}</p>
      {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}

export function Stat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="card card-hover p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-1.5 text-3xl font-bold tracking-tight ${accent || "text-white"}`}>{value}</p>
    </div>
  );
}
