import React from 'react';
import { useCRM } from '../../context/CRMContext';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  DollarSign,
  UserCheck,
  BarChart3,
  Settings,
  PlusCircle,
  FileText,
  Image,
  Video,
  Calendar,
  Layers,
  LogOut,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { currentRole, currentUser, logout } = useCRM();

  interface NavItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    badge?: number | string;
  }

  const getNavItems = (): NavItem[] => {
    switch (currentRole) {
      case 'SUPER_ADMIN':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'work', label: 'Clients & Projects', icon: <Layers className="w-4 h-4" /> },
          { id: 'financials', label: 'Financials & Billing', icon: <DollarSign className="w-4 h-4" /> },
          { id: 'hr', label: 'HR & Leaves', icon: <UserCheck className="w-4 h-4" /> },
          { id: 'reports', label: 'Reports & Analytics', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'settings', label: 'Settings & Users', icon: <Settings className="w-4 h-4" /> },
        ];

      case 'PROJECT_MANAGER':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'work', label: 'Clients & Projects', icon: <Layers className="w-4 h-4" /> },
          { id: 'financials', label: 'Financials', icon: <DollarSign className="w-4 h-4" /> },
          { id: 'hr', label: 'HR & Leaves', icon: <UserCheck className="w-4 h-4" /> },
          { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
        ];

      case 'SALES_REP':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'work', label: 'Clients & Projects', icon: <Layers className="w-4 h-4" /> },
          { id: 'add-work', label: 'Add New Client & Work', icon: <PlusCircle className="w-4 h-4 text-emerald-400" /> },
          { id: 'hr', label: 'HR & Leaves', icon: <UserCheck className="w-4 h-4" /> },
          { id: 'reports', label: 'My Performance Report', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'settings', label: 'My Account', icon: <Settings className="w-4 h-4" /> },
        ];

      case 'CONTENT_WRITER':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'work', label: 'Clients & Projects', icon: <Layers className="w-4 h-4" /> },
          { id: 'hr', label: 'HR & Leaves', icon: <UserCheck className="w-4 h-4" /> },
          { id: 'reports', label: 'My Performance Report', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'settings', label: 'My Account', icon: <Settings className="w-4 h-4" /> },
        ];

      case 'GRAPHIC_DESIGNER':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'work', label: 'Clients & Projects', icon: <Layers className="w-4 h-4" /> },
          { id: 'hr', label: 'HR & Leaves', icon: <UserCheck className="w-4 h-4" /> },
          { id: 'reports', label: 'My Performance Report', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'settings', label: 'My Account', icon: <Settings className="w-4 h-4" /> },
        ];

      case 'VIDEO_EDITOR':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'work', label: 'Clients & Projects', icon: <Layers className="w-4 h-4" /> },
          { id: 'hr', label: 'HR & Leaves', icon: <UserCheck className="w-4 h-4" /> },
          { id: 'reports', label: 'My Performance Report', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'settings', label: 'My Account', icon: <Settings className="w-4 h-4" /> },
        ];

      case 'SOCIAL_MEDIA_MANAGER':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'work', label: 'Clients & Projects', icon: <Layers className="w-4 h-4" /> },
          { id: 'calendar', label: 'Posting Calendar', icon: <Calendar className="w-4 h-4" /> },
          { id: 'hr', label: 'HR & Leaves', icon: <UserCheck className="w-4 h-4" /> },
          { id: 'reports', label: 'My Performance Report', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'settings', label: 'My Account', icon: <Settings className="w-4 h-4" /> },
        ];

      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className="w-60 bg-[#0F172A] border-r border-slate-800 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-4rem)] p-4 text-slate-300 shrink-0">
      <div className="space-y-6">
        {/* Navigation Scope Header */}
        <div className="px-3 py-2 border-b border-slate-800">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Navigation Scope</p>
          <p className="text-xs font-bold text-white mt-0.5 capitalize">
            {(currentRole || '').replace(/_/g, ' ').toLowerCase()}
          </p>
        </div>

        {/* Navigation items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <span className={isActive ? 'text-blue-400' : 'text-slate-400'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 text-[10px] bg-slate-800 text-slate-300 rounded font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer User Profile & Log Out Box */}
      <div className="mt-auto p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs text-white shadow-xs shrink-0">
            {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'US'}
          </div>
          <div className="overflow-hidden min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">
              {currentUser?.name || 'Logged In User'}
            </p>
            <p className="text-[10px] text-blue-400 font-medium truncate capitalize">
              {(currentRole || '').replace(/_/g, ' ').toLowerCase()}
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              {currentUser?.email}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2 py-1.5 px-3 bg-slate-700/60 hover:bg-rose-900/40 hover:text-rose-300 text-slate-300 rounded-lg text-xs font-semibold border border-slate-600/50 hover:border-rose-700/50 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};
