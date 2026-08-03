import React from 'react';
import { useCRM } from '../../context/CRMContext';
import {
  LayoutDashboard,
  Layers,
  PlusCircle,
  Settings,
  BarChart3,
  UserCheck,
} from 'lucide-react';

interface MobileNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ activeTab, setActiveTab }) => {
  const { currentRole } = useCRM();

  interface NavItem {
    id: string;
    label: string;
    icon: React.ReactNode;
  }

  const getNavItems = (): NavItem[] => {
    switch (currentRole) {
      case 'SUPER_ADMIN':
      case 'PROJECT_MANAGER':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
          { id: 'work', label: 'Projects', icon: <Layers className="w-5 h-5" /> },
          { id: 'hr', label: 'HR & Leaves', icon: <UserCheck className="w-5 h-5" /> },
          { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-5 h-5" /> },
          { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
        ];

      case 'SALES_REP':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
          { id: 'work', label: 'Projects', icon: <Layers className="w-5 h-5" /> },
          { id: 'add-work', label: '+ Work', icon: <PlusCircle className="w-5 h-5 text-emerald-400" /> },
          { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-5 h-5" /> },
          { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
        ];

      default:
        return [
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
          { id: 'work', label: 'Projects', icon: <Layers className="w-5 h-5" /> },
          { id: 'hr', label: 'HR & Leaves', icon: <UserCheck className="w-5 h-5" /> },
          { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-5 h-5" /> },
          { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-40 px-2 py-1.5 shadow-2xl">
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                isActive
                  ? 'text-blue-400 bg-blue-600/20 border border-blue-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {item.icon}
              <span className="mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
