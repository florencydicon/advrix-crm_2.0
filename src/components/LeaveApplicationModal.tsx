"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { applyLeaveAction } from "@/lib/actions/leaves";

const LEAVE_TYPES = [
  { value: "sick", label: "Sick Leave" },
  { value: "casual", label: "Casual Leave" },
  { value: "earned", label: "Earned / Privilege Leave" },
  { value: "unpaid", label: "Leave Without Pay" },
  { value: "emergency", label: "Emergency Leave" },
];

export default function LeaveApplicationModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(fd: FormData) {
    start(async () => {
      setError(null);
      const res = await applyLeaveAction(fd);
      if (res.error) setError(res.error);
      else {
        onClose();
        router.refresh();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold">Apply for Leave</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">
          {error && (
            <p className="mb-3 rounded-lg bg-rose-50 text-rose-700 text-sm px-3 py-2">{error}</p>
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
                <input name="start_date" type="date" required className="input" />
              </div>
              <div>
                <label className="label">End Date</label>
                <input name="end_date" type="date" required className="input" />
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
    </div>
  );
}
