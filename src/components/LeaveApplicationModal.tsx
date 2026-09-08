"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { applyLeaveAction } from "@/lib/actions/leaves";
import { openWhatsApp, buildLeaveMessage } from "@/lib/whatsapp";
import { DatePicker } from "@/components/DatePicker";

const LEAVE_TYPES = [
  { value: "sick", label: "Sick Leave" },
  { value: "casual", label: "Casual Leave" },
  { value: "earned", label: "Earned / Privilege Leave" },
  { value: "unpaid", label: "Leave Without Pay" },
  { value: "emergency", label: "Emergency Leave" },
];

export default function LeaveApplicationModal({ onClose, userName, userRole }: { onClose: () => void; userName: string; userRole: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(fd: FormData) {
    start(async () => {
      setError(null);
      const res = await applyLeaveAction(fd);
      if (res.error) setError(res.error);
      else {
        const leaveType = String(fd.get("leave_type") || "");
        const startDate = String(fd.get("start_date") || "");
        const endDate = String(fd.get("end_date") || "");
        const reason = String(fd.get("reason") || "");
        const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1;
        openWhatsApp(buildLeaveMessage({
          name: userName,
          role: userRole,
          leaveType,
          startDate,
          endDate,
          days,
          reason,
        }));
        onClose();
        router.refresh();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:justify-center md:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex w-full max-h-[92dvh] max-w-md flex-col overflow-hidden rounded-t-2xl bg-night-850 shadow-xl shadow-black/50 ring-1 ring-white/10 md:rounded-2xl">
        <h3 className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-white/10 text-base font-semibold">
          Apply for Leave
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </h3>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <p className="mb-3 rounded-lg bg-rose-400/10 text-rose-300 text-sm px-3 py-2">{error}</p>
          )}
          <form action={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Leave Type</label>
              <select name="leave_type" required className="input">
                <option value="">Select type…</option>
                {LEAVE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Start Date</label>
                <DatePicker name="start_date" required placeholder="Start date…" />
              </div>
              <div>
                <label className="label">End Date</label>
                <DatePicker name="end_date" required placeholder="End date…" />
              </div>
            </div>
            <div>
              <label className="label">Reason</label>
              <textarea
                name="reason"
                rows={3}
                required
                className="input"
                placeholder="Describe the reason for your leave…"
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={pending}>
              {pending ? "Submitting…" : "Submit Application"}
            </button>
          </form>
        </div>
      </div>
      <button
        onClick={onClose}
        aria-label="Close leave form"
        className="md:hidden fixed bottom-6 right-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-gray-800 text-white shadow-2xl shadow-black/60 border border-gray-600 active:scale-95 transition-transform"
      >
        <X className="h-6 w-6" />
      </button>
    </div>
  );
}
