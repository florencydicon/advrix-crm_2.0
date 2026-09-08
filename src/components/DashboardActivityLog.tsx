"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import ActivityLogOverlay from "@/components/ActivityLogOverlay";
import type { ActivityLogRow } from "@/lib/activity";

export function DashboardActivityLogTrigger({ activity }: { activity: ActivityLogRow[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn-secondary !py-2 text-xs"
        aria-label="Open activity log"
      >
        <Clock className="h-3.5 w-3.5" /> Activity Log
      </button>
      <ActivityLogOverlay open={open} onClose={() => setOpen(false)} activity={activity} />
    </>
  );
}
