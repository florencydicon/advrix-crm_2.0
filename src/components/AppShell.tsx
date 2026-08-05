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
  Bell,
  Check,
  ArrowRight,
  Settings,
} from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/actions/notifications";
import type { SessionPayload } from "@/lib/session";
import type { Notification } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/attendance", label: "Attendance", icon: Clock },
  { href: "/updates", label: "Updates", icon: Bell },
  { href: "/projects", label: "Project Pipeline", icon: FolderKanban, roles: ["SUPER_ADMIN", "PROJECT_MANAGER"] },
  { href: "/clients", label: "Clients", icon: Users, roles: ["SALES", "SUPER_ADMIN", "PROJECT_MANAGER"] },
  { href: "/team", label: "Team", icon: Users, roles: ["SUPER_ADMIN"] },
  { href: "/analytics", label: "Analytics", icon: BarChart3, roles: ["SUPER_ADMIN", "PROJECT_MANAGER"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["SUPER_ADMIN"] },
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

const NOTIF_STYLES: Record<string, string> = {
  task: "bg-brand-100 text-brand-700",
  project: "bg-violet-100 text-violet-700",
  leave: "bg-amber-100 text-amber-700",
  attendance: "bg-emerald-100 text-emerald-700",
  system: "bg-slate-100 text-slate-600",
};

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const diff = Math.round((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function AppShell({
  session,
  notifications,
  unreadCount,
  children,
}: {
  session: SessionPayload;
  notifications: Notification[];
  unreadCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

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

  async function handleRead(notif: Notification) {
    setNotifOpen(false);
    if (!notif.read) {
      await markNotificationReadAction(notif.id);
      router.refresh();
    }
    if (notif.link) router.push(notif.link);
  }

  async function handleMarkAll() {
    await markAllNotificationsReadAction();
    setNotifOpen(false);
    router.refresh();
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-ink text-slate-300">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-black shadow-lg shadow-brand-900/40">
          A
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-none tracking-tight">Advrix Media</p>
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
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                active ? "bg-white/10 text-white shadow-inner" : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span className="flex-1">{item.label}</span>
              {item.href === "/updates" && unreadCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
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
    <div className="min-h-screen flex bg-paper">
      <aside className="hidden lg:block w-64 fixed inset-y-0 left-0 z-30 shadow-xl shadow-slate-900/5">{sidebar}</aside>

      <div className={`fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity ${mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={() => setMobileOpen(false)} />
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 lg:hidden transform transition-transform ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {sidebar}
        <button className="absolute top-4 -right-10 p-2 rounded-full bg-white shadow" onClick={() => setMobileOpen(false)}>
          <X className="h-4 w-4" />
        </button>
      </aside>

      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 bg-white/80 backdrop-blur-lg border-b border-slate-200 px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <button className="lg:hidden p-2 rounded-lg hover:bg-slate-100" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <p className="text-sm font-medium text-slate-600 truncate">
              {items.find((n) => pathname.startsWith(n.href))?.label || "Dashboard"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <>
                    <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center shadow">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  </>
                )}
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 z-40 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-800">Updates</p>
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAll} className="text-xs font-medium text-brand-600 hover:text-brand-700">
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-50">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-10 text-center">
                          <Bell className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                          <p className="text-sm text-slate-400">No updates yet.</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n.id}
                            onClick={() => handleRead(n)}
                            className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${n.read ? "" : "bg-brand-50/60"}`}
                          >
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${NOTIF_STYLES[n.type] || "bg-slate-100 text-slate-600"}`}>
                              {n.type.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className={`text-[13px] truncate ${n.read ? "text-slate-600" : "text-slate-800 font-semibold"}`}>{n.title}</p>
                                <span className="text-[10px] text-slate-400 shrink-0">{timeAgo(n.created_at)}</span>
                              </div>
                              {n.body && <p className="text-xs text-slate-500 truncate mt-0.5">{n.body}</p>}
                            </div>
                            {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-brand-500 shrink-0" />}
                          </button>
                        ))
                      )}
                    </div>
                    <Link
                      href="/updates"
                      onClick={() => setNotifOpen(false)}
                      className="flex items-center justify-center gap-1.5 px-4 py-3 bg-slate-50 text-brand-600 hover:text-brand-700 text-sm font-medium border-t border-slate-100"
                    >
                      View all updates <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
              <span className="text-xs font-medium text-slate-700">{session.name}</span>
              <span className="badge bg-slate-100 text-slate-500 text-[10px]">{session.role_label}</span>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 flex-1">{children}</main>
      </div>
    </div>
  );
}