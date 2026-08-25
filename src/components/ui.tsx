"use client";

import {
  Chip,
  Modal as HeroModal,
  ModalContent,
  ModalHeader,
  ModalBody,
} from "@heroui/react";
import { CircleCheck, Clock, PauseCircle, Send, Undo2, Users, Upload } from "lucide-react";

export const STATUS_META: Record<string, { label: string; cls: string; Icon: any }> = {
  pending: { label: "Pending", cls: "bg-white/10 text-slate-300", Icon: PauseCircle },
  pending_approval: { label: "Pending Approval", cls: "bg-amber-400/10 text-amber-300", Icon: Clock },
  in_progress: { label: "In Process", cls: "bg-brand-300/10 text-brand-300", Icon: Clock },
  submitted: { label: "Awaiting Review", cls: "bg-violet-400/10 text-violet-300", Icon: Send },
  needs_improvement: { label: "Needs Improvement", cls: "bg-rose-400/10 text-rose-300", Icon: Undo2 },
  client_review: { label: "Client Review", cls: "bg-sky-400/10 text-sky-300", Icon: Users },
  client_feedback: { label: "Client Feedback", cls: "bg-rose-400/10 text-rose-300", Icon: Undo2 },
  client_approved: { label: "Client Approved", cls: "bg-emerald-400/10 text-emerald-300", Icon: CircleCheck },
  uploading: { label: "Uploading", cls: "bg-brand-300/10 text-brand-300", Icon: Upload },
  upload_done: { label: "Upload Done", cls: "bg-sky-400/10 text-sky-300", Icon: Upload },
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

type ChipColor = "default" | "primary" | "secondary" | "success" | "warning" | "danger";

const STATUS_COLOR: Record<string, ChipColor> = {
  pending: "default",
  pending_approval: "warning",
  in_progress: "primary",
  submitted: "secondary",
  needs_improvement: "danger",
  client_review: "secondary",
  client_feedback: "danger",
  client_approved: "success",
  uploading: "primary",
  upload_done: "success",
  completed: "success",
};

const STATUS_ICON: Record<string, any> = {
  pending: PauseCircle,
  pending_approval: Clock,
  in_progress: Clock,
  submitted: Send,
  needs_improvement: Undo2,
  client_review: Users,
  client_feedback: Undo2,
  client_approved: CircleCheck,
  uploading: Upload,
  upload_done: Upload,
  completed: CircleCheck,
};

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = STATUS_ICON[status] || PauseCircle;
  return (
    <Chip
      size="sm"
      variant="flat"
      color={STATUS_COLOR[status] || "default"}
      startContent={<Icon className="h-3 w-3" />}
      className="text-[10px] h-5 pl-1"
    >
      {meta.label}
    </Chip>
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
        <Chip key={p.key} size="sm" variant="bordered" className="text-[10px] h-5 border-white/15 text-slate-400">
          {p.icon} {p.label}
        </Chip>
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

const PRIORITY_META: Record<string, { label: string; color: ChipColor }> = {
  low: { label: "Low", color: "default" },
  medium: { label: "Medium", color: "primary" },
  high: { label: "High", color: "danger" },
};

export function PriorityBadge({ priority }: { priority: string }) {
  const meta = PRIORITY_META[priority] || PRIORITY_META.medium;
  return (
    <Chip size="sm" variant="flat" color={meta.color} className="text-[10px] h-5">
      {meta.label}
    </Chip>
  );
}

const PROJECT_STATUS_META: Record<string, { label: string; color: ChipColor }> = {
  pending_approval: { label: "Awaiting PM Approval", color: "warning" },
  in_progress: { label: "In Production", color: "primary" },
  completed: { label: "Completed", color: "success" },
  rejected: { label: "Rejected", color: "danger" },
};

export function ProjectStatusBadge({ status }: { status: string }) {
  const meta = PROJECT_STATUS_META[status] || PROJECT_STATUS_META.pending_approval;
  return (
    <Chip size="sm" variant="flat" color={meta.color} className="text-[10px] h-5">
      {meta.label}
    </Chip>
  );
}

/** HeroUI-powered modal. Same external props as before (open/onClose/title). */
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
  return (
    <HeroModal
      isOpen={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      placement="center"
      backdrop="blur"
      classNames={{
        base: "bg-night-850 border border-white/10",
        header: "border-b border-white/[0.06] text-white pb-2",
        body: "py-4",
      }}
    >
      <ModalContent>
        <ModalHeader className="flex item-center gap-2 text-base font-semibold">{title}</ModalHeader>
        <ModalBody>{children}</ModalBody>
      </ModalContent>
    </HeroModal>
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
