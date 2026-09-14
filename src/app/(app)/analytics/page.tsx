import { redirect } from "next/navigation";

export const metadata = { title: "Reports — Advrix CRM" };

export default function AnalyticsRedirect() {
  redirect("/reports");
}