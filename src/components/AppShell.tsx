"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  BarChart3,
  LogOut,
  Menu,
  X,
  Clock,
} from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import type { SessionPayload } from "@/lib/session";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/attendance", label: "Attendance", icon: Clock },
  { href: "/projects", label: "Project Pipeline", icon: FolderKanban, roles: ["SUPER_ADMIN", "PROJECT_MANAGER"] },
  { href: "/clients", label: "Clients", icon: Users, roles: ["SALES", "SUPER_ADMIN", "PROJECT_MANAGER"] },
  { href: "/team", label: "Team", icon: Users, roles: ["SUPER_ADMIN"] },
  { href: "/analytics", label: "Analytics", icon: BarChart3, roles: ["SUPER_ADMIN", "PROJECT_MANAGER"] },
];

const ROLE_STYLES: Record<string, string> = {
  SUPER_ADMIN: "bg-brand-600",
  PROJECT_MANAGER: "bg-violet-600",
  SALES: "bg-emerald-600",
  WRITER: "bg-amber-600",
  DESIGNER: "bg-pink-600",
  EDITOR: "bg-cyan-600",
  SMM: "bg-indigo-600",
};

export default function AppShell({
  session,
  children,
}: {
  session: SessionPayload;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = NAV.filter((n) => !n.roles || n.roles.includes(session.role_key));
  const initials = session.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleLogout() {
    await logoutAction();
    router.push("/login");
  }

  const sidebar = (
      <div className="flex h-full flex-col bg-ink text-slate-300">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="h-9 w-9 rounded-lg bg-brand-600 flex items-center justify-center text-white font-black">
            A
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">Advrix Media</p>
            <p className="text-[11px] text-slate-400 mt-1">Creative Workflow</p>
          </div>
        </div>

      <nav className="flex-1 px-3 space-y-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold text-white ${ROLE_STYLES[session.role_key] || "bg-slate-500"}`}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{session.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{session.role_label}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="btn-ghost w-full justify-start !text-slate-300 hover:!bg-white/10 hover:!text-white">
          <LogOut className="h-[18px] w-[18px]" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:block w-64 fixed inset-y-0 left-0 z-30">{sidebar}</aside>

      <div className={`fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity ${mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={() => setMobileOpen(false)} />
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 lg:hidden transform transition-transform ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {sidebar}
        <button className="absolute top-4 -right-10 p-2 rounded-full bg-white shadow" onClick={() => setMobileOpen(false)}>
          <X className="h-4 w-4" />
        </button>
      </aside>

      <div className="flex-1 lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between bg-white/80 backdrop-blur border-b border-slate-200 px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 rounded-lg hover:bg-slate-100" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <p className="text-sm text-slate-500">
              {items.find((n) => pathname.startsWith(n.href))?.label || "Dashboard"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 font-medium">{session.name}</span>
            <span className="badge bg-slate-100 text-slate-500 text-[10px]">{session.role_label}</span>
          </div>
        </header>
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
