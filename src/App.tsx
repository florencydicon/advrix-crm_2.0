import React, { useState, useEffect } from 'react';
import { CRMProvider, useCRM } from './context/CRMContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { MobileNavigation } from './components/common/MobileNavigation';
import { Popups as GlobalAlertPopups } from './components/common/Popups';
import { LoginScreen } from './components/auth/LoginScreen';
import { UserManagementSection } from './components/settings/UserManagementSection';
import { PMDashboard } from './components/dashboard/PMDashboard';
import { SuperAdminDashboard } from './components/dashboard/SuperAdminDashboard';
import { SalesDashboard } from './components/dashboard/SalesDashboard';
import { WriterDashboard } from './components/dashboard/WriterDashboard';
import { DesignerDashboard } from './components/dashboard/DesignerDashboard';
import { EditorDashboard } from './components/dashboard/EditorDashboard';
import { SMMDashboard } from './components/dashboard/SMMDashboard';
import { WorkManagement } from './components/work/WorkManagement';
import { AddWorkForm } from './components/work/AddWorkForm';
import { ClientsManagement } from './components/clients/ClientsManagement';
import { HRManagement } from './components/hr/HRManagement';
import { FinancialManagement } from './components/financials/FinancialManagement';
import { ReportsOverview } from './components/reports/ReportsOverview';
import { TaskDetailModal } from './components/work/TaskDetailModal';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  UserCheck,
  Settings as SettingsIcon,
  Database,
  Smartphone,
  CheckCircle,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { currentRole, isAuthenticated, currentUser, logout } = useCRM();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // If user is not authenticated, display independent login screen
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white pb-20 md:pb-0 w-full max-w-full overflow-x-hidden">
      
      {/* Global Header */}
      <Header
        onOpenNotifications={() => setActiveTab('notifications')}
        onSelectTask={(id) => setSelectedTaskId(id)}
      />

      <div className="flex flex-1 overflow-hidden w-full max-w-full">
        {/* Sidebar for Desktop */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Main Workspace Body */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 space-y-6 w-full max-w-full overflow-x-hidden">
          
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <>
              {currentRole === 'SUPER_ADMIN' && (
                <SuperAdminDashboard
                  onNavigateTab={setActiveTab}
                  onSelectTask={(id) => setSelectedTaskId(id)}
                />
              )}
              {currentRole === 'PROJECT_MANAGER' && (
                <PMDashboard
                  onNavigateTab={setActiveTab}
                  onSelectTask={(id) => setSelectedTaskId(id)}
                />
              )}
              {currentRole === 'SALES_REP' && (
                <SalesDashboard
                  onNavigateTab={setActiveTab}
                  onOpenAddWork={() => setActiveTab('add-work')}
                />
              )}
              {currentRole === 'CONTENT_WRITER' && (
                <WriterDashboard onSelectTask={(id) => setSelectedTaskId(id)} />
              )}
              {currentRole === 'GRAPHIC_DESIGNER' && (
                <DesignerDashboard onSelectTask={(id) => setSelectedTaskId(id)} />
              )}
              {currentRole === 'VIDEO_EDITOR' && (
                <EditorDashboard onSelectTask={(id) => setSelectedTaskId(id)} />
              )}
              {currentRole === 'SOCIAL_MEDIA_MANAGER' && (
                <SMMDashboard
                  onSelectTask={(id) => setSelectedTaskId(id)}
                  onNavigateTab={setActiveTab}
                />
              )}
            </>
          )}

          {/* Clients & Projects Directory Workspace Tab */}
          {(activeTab === 'work-management' ||
            activeTab === 'work' ||
            activeTab === 'clients' ||
            activeTab === 'clients-projects' ||
            activeTab === 'ready-upload' ||
            activeTab === 'my-content' ||
            activeTab === 'my-design' ||
            activeTab === 'my-video' ||
            activeTab === 'approvals' ||
            activeTab === 'content-approvals' ||
            activeTab === 'creative-approvals' ||
            activeTab === 'client-changes' ||
            activeTab === 'team' ||
            activeTab === 'calendar') && (
            <WorkManagement onSelectTask={(id) => setSelectedTaskId(id)} activeTab={activeTab} />
          )}

          {/* Add Work Form (/add-work) */}
          {activeTab === 'add-work' && (
            <AddWorkForm onSuccess={() => setActiveTab('work')} />
          )}

          {/* HR & Attendance Management */}
          {(activeTab === 'hr-attendance' || activeTab === 'hr') && (
            <HRManagement />
          )}

          {/* Reports & Analytics */}
          {activeTab === 'reports' && (
            <ReportsOverview />
          )}

          {/* Financials & Billing (Restricted to Super Admin & PM) */}
          {activeTab === 'financials' && (
            currentRole === 'SUPER_ADMIN' || currentRole === 'PROJECT_MANAGER' ? (
              <FinancialManagement />
            ) : (
              <div className="p-8 text-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-400 space-y-3">
                <ShieldCheck className="w-8 h-8 text-rose-500 mx-auto" />
                <h3 className="text-lg font-bold text-white">Access Restricted</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Financial records and agency billing ledgers are strictly restricted to Super Admin and Project Manager roles.
                </p>
              </div>
            )
          )}

          {/* Settings & System Info */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xs">
                <h2 className="text-xl font-bold text-white">
                  Agency Settings & Account Preferences
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Manage team accounts, user passwords, roles, and system information.
                </p>
              </div>

              {/* Team Accounts & Passwords Management Section */}
              <UserManagementSection theme="dark" />

              {/* Theme Notice */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <span>Workspace Theme Engine</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The workspace is strictly styled in dark mode theme for high contrast readability and optimal battery efficiency.
                </p>
              </div>

              {/* Database & PWA Specifications */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <Database className="w-4 h-4 text-emerald-500" />
                    <span>Neon Database Credentials</span>
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-2 border-b border-slate-800">
                      <span className="text-slate-400 font-medium">Database Host</span>
                      <span className="font-mono text-emerald-400 font-semibold truncate max-w-[180px]">ep-dark-poetry-az6rk6ec.neon.tech</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-800">
                      <span className="text-slate-400 font-medium">Pooler SSL Mode</span>
                      <span className="font-semibold text-slate-100">require (channel_binding)</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-800">
                      <span className="text-slate-400 font-medium">Auth Provider</span>
                      <span className="font-semibold text-blue-400">Neon Auth (JWKS Verified)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0F172A] border border-slate-800 p-6 rounded-2xl text-white space-y-4 shadow-xs">
                  <h3 className="text-sm font-bold flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-indigo-400" />
                    <span>Mobile PWA & Service Worker</span>
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-2 border-b border-slate-800">
                      <span className="text-slate-400">Web App Manifest</span>
                      <span className="font-mono text-emerald-400">Installed (pwa-512)</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-800">
                      <span className="text-slate-400">Service Worker Caching</span>
                      <span className="font-mono text-blue-400">Active (advrix-crm-v1)</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-800">
                      <span className="text-slate-400">App Version</span>
                      <span className="font-mono text-slate-200">v2.0 Dark Mode Master</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Global Task Workspace Modal */}
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}

      {/* Mobile Bottom Navigation Bar */}
      <MobileNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Global Popups Alert Toast Engine */}
      <GlobalAlertPopups />
    </div>
  );
};

export default function App() {
  return (
    <CRMProvider>
      <MainAppContent />
    </CRMProvider>
  );
}

