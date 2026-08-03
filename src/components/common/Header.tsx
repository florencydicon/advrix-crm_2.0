import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { UserRole } from '../../types/crm';
import {
  Bell,
  CheckCircle2,
  Clock,
  RefreshCw,
  UserCheck,
  ChevronDown,
  Sun,
  Moon,
} from 'lucide-react';

interface HeaderProps {
  onOpenNotifications: () => void;
  onSelectTask: (taskId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNotifications,
  onSelectTask,
}) => {
  const {
    currentUser,
    currentRole,
    notifications,
    markNotificationAsRead,
    toggleCheckIn,
    resetDemoData,
  } = useCRM();

  const [showNotifPopover, setShowNotifPopover] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead && n.recipientId === currentUser.id).length;
  const userNotifs = notifications.filter((n) => n.recipientId === currentUser.id);

  const roleLabels: Record<UserRole, string> = {
    SUPER_ADMIN: 'Super Admin',
    PROJECT_MANAGER: 'Project Manager',
    SALES_REP: 'Sales Rep',
    CONTENT_WRITER: 'Content Writer',
    GRAPHIC_DESIGNER: 'Graphic Designer',
    VIDEO_EDITOR: 'Video Editor',
    SOCIAL_MEDIA_MANAGER: 'SMM Manager',
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          
          {/* Brand & Subtitle */}
          <div className="flex items-center space-x-2.5 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-white text-base sm:text-lg tracking-wider shadow-md">
              A
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">Advrix Media</span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                  CRM
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block font-medium">
                Agency Operations Portal
              </p>
            </div>
          </div>

          {/* Center: Active Logged In User Pill */}
          <div className="flex items-center space-x-2 bg-slate-800/90 px-2.5 sm:px-3 py-1 rounded-full border border-slate-700/80 text-xs shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <span className="text-slate-100 font-bold truncate max-w-[100px] sm:max-w-[160px] text-[11px] sm:text-xs">
              {currentUser?.name || 'Logged In'}
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 bg-blue-900/60 text-blue-300 rounded-full shrink-0 hidden md:inline-block">
              {roleLabels[currentRole]}
            </span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-2 shrink-0">
            
            {/* Check-In / Check-Out */}
            <button
              onClick={() => toggleCheckIn(currentUser.id)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                currentUser.isCheckedIn
                  ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-rose-950/60 border-rose-800/80 text-rose-300 hover:bg-rose-900/60'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span className="text-[11px] sm:text-xs">
                {currentUser.isCheckedIn ? 'Checked In' : 'Checked Out'}
              </span>
            </button>

            {/* Notification Center */}
            <div className="relative">
              <button
                onClick={() => setShowNotifPopover(!showNotifPopover)}
                className="p-2 rounded-xl transition-all relative border bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {showNotifPopover && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="p-3 bg-slate-800/90 border-b border-slate-700/80 flex justify-between items-center">
                    <span className="text-xs font-bold flex items-center space-x-1.5">
                      <Bell className="w-3.5 h-3.5 text-blue-400" />
                      <span>Notifications ({userNotifs.length})</span>
                    </span>
                    <button
                      onClick={onOpenNotifications}
                      className="text-[11px] text-blue-400 hover:underline font-semibold"
                    >
                      View All
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-800">
                    {userNotifs.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs">
                        No notifications for you.
                      </div>
                    ) : (
                      userNotifs.slice(0, 5).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markNotificationAsRead(n.id);
                            if (n.relatedTaskId) onSelectTask(n.relatedTaskId);
                            setShowNotifPopover(false);
                          }}
                          className={`p-3 hover:bg-slate-800 cursor-pointer transition-colors ${
                            !n.isRead ? 'bg-blue-950/40' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <p className="text-xs font-semibold text-blue-200">{n.title}</p>
                            <span className="text-[9px] text-slate-400">{n.timestamp}</span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1 line-clamp-2">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Reset Demo Button */}
            <button
              onClick={resetDemoData}
              title="Reset Seed Data"
              className="p-2 rounded-xl border transition-all text-xs bg-slate-800 border-slate-700 text-slate-400 hover:text-amber-300 hover:bg-slate-700 cursor-pointer hidden sm:flex"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};

