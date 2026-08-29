"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { approveAllBriefsAction } from "@/lib/actions/projects";
import { useToast } from "@/components/Toast";

/** Approve All — bulk-approve every pending brief of a project (PM/Admin only). */
export function ApproveAllButton({
  projectId,
  pendingCount,
}: {
  projectId: string;
  pendingCount: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending || pendingCount === 0}
      onClick={() =>
        start(async () => {
          const res = await approveAllBriefsAction(projectId);
          if (res.error) toast(res.error, "error");
          else toast(`${res.approved ?? 0} brief${res.approved === 1 ? "" : "s"} approved — sequences kicked off.`, "success");
          router.refresh();
        })
      }
      className="btn-secondary !py-1 text-[11px]"
      title="Approves every pending brief in this project at once"
    >
      {pending ? (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-300 border-t-transparent" />
      ) : (
        <ClipboardCheck className="h-3 w-3 text-brand-300" />
      )}
      {pending ? "Approving…" : pendingCount > 0 ? `Approve all (${pendingCount})` : "Approve all"}
    </button>
  );
}
