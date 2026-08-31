"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Inbox } from "lucide-react";
import type { Task } from "@/lib/types";
import { StatusBadge } from "@/components/ui";
import { ReviewPanel } from "@/components/TaskWorkflow";
import { formatClientName } from "@/lib/utils";

export default function ApprovalQueue({
  initialTasks,
}: {
  initialTasks: Task[];
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06]">
        <CheckCircle2 className="h-4 w-4 text-violet-400" />
        <h2 className="font-semibold">Awaiting your approval</h2>
        <span className="badge bg-violet-400/10 text-violet-300 ml-auto">{initialTasks.length} task{initialTasks.length === 1 ? "" : "s"}</span>
      </div>

      {initialTasks.length === 0 ? (
        <div className="px-5 py-6 text-sm text-slate-500 flex items-center gap-2">
          <Inbox className="h-4 w-4" /> No submitted work waiting for review.
        </div>
      ) : (
        <div className="divide-y divide-white/[0.06]">
          {initialTasks.map((t) => (
            <div key={t.id} className={`px-5 py-3 transition-colors ${openId === t.id ? "bg-violet-400/[0.06]" : "hover:bg-white/[0.04]"}`}>
              <button className="w-full text-left flex items-center justify-between gap-3" onClick={() => setOpenId(openId === t.id ? null : t.id)}>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{t.title}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {formatClientName(t.client_company, t.client_name)} · {t.project_name} · {t.assignee_name || "Unassigned"} ({t.role_label})
                  </p>
                </div>
                <StatusBadge status={t.status} />
              </button>
              {openId === t.id && (
                <div className="pt-3">
                  <ReviewPanel task={t} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}