"use client";

import { useEffect, useState } from "react";
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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/actions/notifications";
import type { SessionPayload } from "@/lib/session";
import type { Notification } from "@/lib/types";
import { BrandMark, BrandLogoFull } from "@/components/brand";

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
  SUPER_ADMIN: "bg-brand-300 !text-night-950",
  PROJECT_MANAGER: "bg-violet-400/90 !text-night-950",
  SALES: "bg-emerald-400/90 !text-night-950",
  WRITER: "bg-amber-400/90 !text-night-950",
  DESIGNER: "bg-pink-400/90 !text-night-950",
  EDITOR: "bg-cyan-400/90 !text-night-950",
  SMM: "bg-indigo-400/90 !text-night-950",
};

const NOTIF_STYLES: Record<string, string> = {
  task: "bg-brand-300/10 text-brand-300",
  project: "bg-violet-400/10 text-violet-300",
  leave: "bg-amber-400/10 text-amber-300",
  attendance: "bg-emerald-400/10 text-emerald-300",
  system: "bg-white/10 text-slate-300",
};

const COLLAPSE_KEY = "advrix.sidebar.collapsed";

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
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      window.localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      return !c;
    });
  }

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

  const sidebar = (mobile: boolean) => {
    const mini = !mobile && collapsed;
    return (
      <div className="flex h-full flex-col bg-night-950 text-slate-300 border-r border-white/[0.06]">
        {/* Brand */}
        <div className={`flex items-center py-5 ${mini ? "justify-center px-2" : "gap-2 px-4"}`}>
          {mini ? (
            <Link href="/dashboard" className="shrink-0" aria-label="Advrix Media PVT LTD">
              <BrandMark className="h-9 w-9" />
            </Link>
          ) : (
            <>
              <Link href="/dashboard" className="min-w-0 flex-1" aria-label="Advrix Media PVT LTD">
                <BrandLogoFull className="h-10 w-auto max-w-full" />
              </Link>
              {!mobile && (
                <button
                  onClick={toggleCollapsed}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
                  aria-label="Collapse sidebar"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="h-[18px] w-[18px]" />
                </button>
              )}
            </>
          )}
        </div>
        {mini && (
          <button
            onClick={toggleCollapsed}
            className="mx-auto -mt-1 mb-2 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="h-[18px] w-[18px]" />
          </button>
        )}

        {/* Nav */}
        <nav className={`flex-1 space-y-1 overflow-y-auto overflow-x-visible ${mini ? "px-2.5" : "px-3"}`}>
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={mini ? item.label : undefined}
                className={`group relative flex items-center rounded-xl text-sm font-medium transition-all ${
                  mini ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
                } ${
                  active
                    ? "bg-brand-300/10 text-brand-300"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-brand-300" />
                )}
                <span className="relative shrink-0">
                  <Icon className="h-[18px] w-[18px]" />
                  {mini && item.href === "/updates" && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 h-2 w-2 rounded-full bg-brand-300 ring-2 ring-night-950" />
                  )}
                </span>
                {!mini && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.href === "/updates" && unreadCount > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-brand-300 text-night-950 text-[10px] font-bold flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </>
                )}
                {mini && (
                  <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-night-700 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl shadow-black/40 ring-1 ring-white/10 transition-opacity group-hover:opacity-100">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={`border-t border-white/[0.06] space-y-2 ${mini ? "p-2.5" : "p-4"}`}>
          <div className={`flex items-center ${mini ? "justify-center" : "gap-3"}`}>
            <div
              className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${ROLE_STYLES[session.role_key] || "bg-slate-500 !text-white"}`}
              title={mini ? `${session.name} — ${session.role_label}` : undefined}
            >
              {initials}
            </div>
            {!mini && (
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{session.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{session.role_label}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className={`btn-ghost w-full ${mini ? "justify-center px-0" : "justify-start"}`}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {!mini && "Sign out"}
          </button>
          {!mini && (
            <p className="text-center text-[9px] tracking-[0.18em] uppercase text-slate-600 pt-1">
              Advrix Media PVT LTD
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex bg-paper">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:block fixed inset-y-0 left-0 z-30 transition-[width] duration-300 ease-in-out ${collapsed ? "w-[76px]" : "w-64"}`}
      >
        {sidebar(false)}
      </aside>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 lg:hidden transition-opacity ${mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setMobileOpen(false)}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 lg:hidden transform transition-transform ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {sidebar(true)}
        <button
          className="absolute top-4 -right-10 p-2 rounded-full bg-night-700 text-white shadow-lg ring-1 ring-white/10"
          onClick={() => setMobileOpen(false)}
        >
          <X className="h-4 w-4" />
        </button>
      </aside>

      {/* Main column */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-[padding] duration-300 ease-in-out ${collapsed ? "lg:pl-[76px]" : "lg:pl-64"}`}
      >
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 bg-paper/80 backdrop-blur-lg border-b border-white/[0.06] px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <button className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-slate-300" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <p className="text-sm font-medium text-slate-300 truncate">
              {items.find((n) => pathname.startsWith(n.href))?.label || "Dashboard"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="relative p-2 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <>
                    <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-brand-300 animate-pulse" />
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-300 text-night-950 text-[10px] font-bold flex items-center justify-center shadow">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  </>
                )}
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 z-40 mt-2 w-80 sm:w-96 rounded-2xl bg-night-850 shadow-2xl shadow-black/50 ring-1 ring-white/10 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                      <p className="text-sm font-semibold text-white">Updates</p>
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAll} className="text-xs font-medium text-brand-300 hover:text-brand-200">
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto divide-y divide-white/[0.04]">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-10 text-center">
                          <Bell className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                          <p className="text-sm text-slate-500">No updates yet.</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n.id}
                            onClick={() => handleRead(n)}
                            className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors ${n.read ? "" : "bg-brand-300/[0.05]"}`}
                          >
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${NOTIF_STYLES[n.type] || "bg-white/10 text-slate-300"}`}>
                              {n.type.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className={`text-[13px] truncate ${n.read ? "text-slate-400" : "text-white font-semibold"}`}>{n.title}</p>
                                <span className="text-[10px] text-slate-500 shrink-0">{timeAgo(n.created_at)}</span>
                              </div>
                              {n.body && <p className="text-xs text-slate-500 truncate mt-0.5">{n.body}</p>}
                            </div>
                            {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-brand-300 shrink-0" />}
                          </button>
                        ))
                      )}
                    </div>
                    <Link
                      href="/updates"
                      onClick={() => setNotifOpen(false)}
                      className="flex items-center justify-center gap-1.5 px-4 py-3 bg-white/[0.03] text-brand-300 hover:text-brand-200 text-sm font-medium border-t border-white/[0.06]"
                    >
                      View all updates <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-white/[0.06]">
              <span className="text-xs font-medium text-slate-300">{session.name}</span>
              <span className="badge bg-white/5 text-slate-400 text-[10px] ring-1 ring-white/10">{session.role_label}</span>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 flex-1">{children}</main>
        <footer className="px-6 pb-4 pt-2 hidden lg:block">
          <p className="text-[10px] tracking-[0.14em] uppercase text-slate-600 text-right">
            © {new Date().getFullYear()} Advrix Media PVT LTD
          </p>
        </footer>
      </div>
    </div>
  );
}
