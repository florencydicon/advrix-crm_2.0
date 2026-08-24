import { redirect } from "next/navigation";

export const metadata = { title: "Team — Advrix Media" };

// Team management lives inside Settings (Users & Roles tab) now.
export default function TeamPage() {
  redirect("/settings");
}
