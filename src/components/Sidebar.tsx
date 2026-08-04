"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FolderKanban, CheckSquare, LogOut } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Clients", href: "/admin/clients", icon: Users },
    { name: "Projects", href: "/admin/projects", icon: FolderKanban },
    { name: "Tasks", href: "/admin/tasks", icon: CheckSquare },
  ];

  return (
    <div className="w-64 bg-sidebar-bg text-sidebar-text h-screen flex flex-col shadow-2xl z-10 shrink-0">
      <div className="p-6">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 text-white font-bold text-xl mb-10">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
            A
          </div>
          Advrix CRM
        </div>

        {/* Navigation Links */}
        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? "bg-sidebar-active text-sidebar-textActive font-semibold" 
                    : "hover:bg-sidebar-hover hover:text-white font-medium"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout Button (Bottom) */}
      <div className="mt-auto p-6">
        <button 
          onClick={() => {
            document.cookie = "advrix_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
            window.location.href = "/login";
          }}
          className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all font-medium"
        >
          <LogOut className="w-5 h-5" />
          <span>Secure Logout</span>
        </button>
      </div>
    </div>
  );
}