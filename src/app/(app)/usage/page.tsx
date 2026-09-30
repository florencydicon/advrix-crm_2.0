import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import {
  getActivityReport,
  getResourceUsage,
  getTrackedUsage,
  ensureUsageSchema,
} from "@/lib/usage";
import UsageView from "@/components/UsageView";

export const metadata = { title: "Usage & Analytics — Advrix CRM" };
export const dynamic = "force-dynamic";

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function UsagePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.permissions, "reports:view")) redirect("/dashboard");

  const params = await searchParams;
  const today = new Date();
  const defaultFrom = isoDay(new Date(today.getTime() - 29 * 86400000));
  const defaultTo = isoDay(today);

  const from = /^\d{4}-\d{2}-\d{2}$/.test(params.from || "") ? (params.from as string) : defaultFrom;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(params.to || "") ? (params.to as string) : defaultTo;

  await ensureUsageSchema();

  const [resources, tracked, activity] = await Promise.all([
    getResourceUsage(from, to),
    getTrackedUsage(from, to),
    getActivityReport(from, to),
  ]);

  return (
    <UsageView
      from={from}
      to={to}
      resources={resources}
      tracked={tracked}
      activity={activity}
    />
  );
}
