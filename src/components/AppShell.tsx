"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  Target,
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
  { href: "/leads", label: "Leads", icon: Target, roles: ["SALES", "SUPER_ADMIN", "PROJECT_MANAGER"] },
  { href: "/clients", label: "Clients", icon: Users, roles: ["SALES", "SUPER_ADMIN", "PROJECT_MANAGER"] },
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
  const [notifs, setNotifs] = useState<Notification[]>(notifications);
  const [unread, setUnread] = useState(unreadCount);
  const [ringing, setRinging] = useState(false);
  const [missedToast, setMissedToast] = useState(0);
  const prevUnread = useRef(unreadCount);
  const awayAt = useRef<number | null>(null);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  const pollNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data: { items: Notification[]; unread: number } = await res.json();
      setNotifs(data.items || []);
      const nextUnread = data.unread ?? 0;
      if (nextUnread > prevUnread.current) {
        const gained = nextUnread - prevUnread.current;
      if (document.hidden) {
        setMissedToast((m) => m + gained);
      } else {
        setRinging(true);
        setTimeout(() => setRinging(false), 3000);
      }
      }
      prevUnread.current = nextUnread;
      setUnread(nextUnread);
    } catch {
      // offline — retry on the next tick
    }
  }, []);

  // Live polling every 25s.
  useEffect(() => {
    const id = setInterval(pollNotifications, 25000);
    return () => clearInterval(id);
  }, [pollNotifications]);

  // Return-to-tab alert: surface what was missed while away.
  useEffect(() => {
    function onVisibility() {
      if (document.hidden) {
        awayAt.current = Date.now();
        return;
      }
      const wasAway = awayAt.current !== null && Date.now() - awayAt.current > 15000;
      awayAt.current = null;
      pollNotifications();
      if (wasAway && missedToast > 0) {
        setRinging(true);
        setTimeout(() => setRinging(false), 6000);
        router.refresh();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [pollNotifications, missedToast, router]);

  function dismissMissedToast() {
    setMissedToast(0);
  }

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
      setNotifs((list) => list.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));
      setUnread((u) => Math.max(0, u - 1));
      prevUnread.current = Math.max(0, prevUnread.current - 1);
      await markNotificationReadAction(notif.id);
    }
    if (notif.link) router.push(notif.link);
  }

  async function handleMarkAll() {
    await markAllNotificationsReadAction();
    setNotifs((list) => list.map((n) => ({ ...n, read: true })));
    setUnread(0);
    prevUnread.current = 0;
    setNotifOpen(false);
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
                  {mini && item.href === "/updates" && unread > 0 && (
                    <span className="absolute -top-1 -right-1.5 h-2 w-2 rounded-full bg-brand-300 ring-2 ring-night-950" />
                  )}
                </span>
                {!mini && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.href === "/updates" && unread > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-brand-300 text-night-950 text-[10px] font-bold flex items-center justify-center">
                        {unread}
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
      {/* Return-to-tab alert */}
      {missedToast > 0 && (
        <div className="fixed top-16 right-4 sm:right-6 z-[80] animate-toast-in">
          <div className="flex items-center gap-3 rounded-2xl bg-night-850 ring-1 ring-brand-300/30 shadow-2xl shadow-black/50 px-4 py-3 max-w-sm">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-300" />
            </span>
            <p className="text-sm text-slate-200 flex-1">
              You missed <span className="font-bold text-white">{missedToast}</span> update{missedToast === 1 ? "" : "s"} while you were away.
            </p>
            <button
              onClick={() => { setNotifOpen(true); dismissMissedToast(); }}
              className="text-xs font-semibold text-brand-300 hover:text-brand-200 shrink-0"
            >
              View
            </button>
            <button onClick={dismissMissedToast} className="text-slate-500 hover:text-white shrink-0" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:block fixed inset-y-0 left-0 z-30 transition-[width] duration-300 ease-in-out ${collapsed ? "w-[76px]" : "w-64"}`}
      >
        {sidebar(false)}
      </aside>

      {/* Mobile drawer backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm lg:hidden transition-opacity duration-300 ${mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setMobileOpen(false)}
      />
      {/* Mobile drawer panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-[70] w-72 max-w-[85vw] lg:hidden transform transition-transform duration-300 ease-out ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {sidebar(true)}
        <button
          className="absolute top-3 right-3 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </aside>

      {/* Main column */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-[padding] duration-300 ease-in-out ${collapsed ? "lg:pl-[76px]" : "lg:pl-64"}`}
      >
        {/* ── Mobile header ── */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 bg-night-950/80 backdrop-blur-xl border-b border-white/[0.06] px-4 py-3 md:px-6">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger only on desktop sidebar toggle — hidden on mobile */}
            <button className="hidden lg:block p-2 rounded-xl hover:bg-white/5 text-slate-400 transition-colors" onClick={toggleCollapsed} aria-label="Toggle sidebar">
              {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
            <p className="text-[15px] font-semibold text-white tracking-tight truncate">
              {items.find((n) => pathname.startsWith(n.href))?.label || "Dashboard"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="relative p-2 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                aria-label="Notifications"
              >
                <Bell className={`h-5 w-5 ${ringing ? "animate-bell-ring text-brand-300" : ""}`} />
                {unread > 0 && (
                  <>
                    <span className={`absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-brand-300 ${ringing ? "" : "animate-pulse"}`} />
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-300 text-night-950 text-[10px] font-bold flex items-center justify-center shadow">
                      {unread > 9 ? "9+" : unread}
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
                      {unread > 0 && (
                        <button onClick={handleMarkAll} className="text-xs font-medium text-brand-300 hover:text-brand-200">
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto divide-y divide-white/[0.04]">
                      {notifs.length === 0 ? (
                        <div className="px-4 py-10 text-center">
                          <Bell className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                          <p className="text-sm text-slate-500">No updates yet.</p>
                        </div>
                      ) : (
                        notifs.map((n) => (
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
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold ${ROLE_STYLES[session.role_key] || "bg-slate-500 !text-white"}`}>
                {initials}
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 pb-24 md:pb-6 flex-1">{children}</main>
        <footer className="px-6 pb-4 pt-2 hidden lg:block">
          <p className="text-[10px] tracking-[0.14em] uppercase text-slate-600 text-right">
            © {new Date().getFullYear()} Advrix Media PVT LTD
          </p>
        </footer>
      </div>

      {/* ── Mobile bottom navigation ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-night-950/90 backdrop-blur-2xl border-t border-white/[0.08] safe-area-bottom" role="navigation" aria-label="Mobile navigation">
        <div className="flex items-stretch justify-around h-[60px] px-0 max-w-lg mx-auto">
          {items.slice(0, 4).map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + "/");
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`relative flex flex-col items-center justify-center gap-1 w-16 transition-colors ${
                  active ? "text-brand-300" : "text-slate-500 active:text-slate-300"
                }`}
              >
                <span className={`flex items-center justify-center h-8 w-12 rounded-xl transition-all ${active ? "bg-brand-300/15" : ""}`}>
                  <Icon className={`h-[22px] w-[22px]`} />
                </span>
                <span className={`text-[10px] leading-none ${active ? "font-semibold" : "font-medium"}`}>
                  {n.label.split(" ")[0]}
                </span>
                {n.href === "/updates" && unread > 0 && (
                  <span className="absolute top-1 right-3 h-2 w-2 rounded-full bg-brand-300 animate-pulse" />
                )}
              </Link>
            );
          })}
          <button
            onClick={() => setMobileOpen(true)}
            className="flex flex-col items-center justify-center gap-1 w-16 text-slate-500 active:text-slate-300 transition-colors"
            aria-label="More options"
          >
            <span className="flex items-center justify-center h-8 w-12 rounded-xl">
              <Menu className="h-[22px] w-[22px]" />
            </span>
            <span className="text-[10px] leading-none font-medium">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
