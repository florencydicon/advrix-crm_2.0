import React from 'react';
import { useCRM } from '../../context/CRMContext';
import { DollarSign, TrendingUp, AlertTriangle, History } from 'lucide-react';

interface SuperAdminDashboardProps {
  onNavigateTab: (tab: string) => void;
  onSelectTask: (taskId: string) => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  onNavigateTab,
}) => {
  const { clients, projects, activityLogs, approveDeleteClient, rejectDeleteClient } = useCRM();

  const totalBilling = projects.reduce((acc, p) => acc + (p.financials?.totalPayment ?? p.financials?.totalAgreedAmount ?? 0), 0);
  const totalCollected = projects.reduce((acc, p) => acc + (p.financials?.advanceReceived ?? 0), 0);
  const totalPending = projects.reduce((acc, p) => acc + (p.financials?.pendingAmount ?? 0), 0);

  const pendingDeleteClients = clients.filter((c) => c.status === 'PENDING_DELETE');

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 sm:p-6 rounded-2xl text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold rounded-md uppercase border border-indigo-500/30">
            Agency Owner Control
          </span>
          <h1 className="text-xl sm:text-2xl font-black mt-1">Super Admin Overview</h1>
          <p className="text-xs text-slate-300 max-w-xl mt-0.5">
            Advrix Media complete revenue, client approvals, team performance, and audit trail
          </p>
        </div>
        <button
          onClick={() => onNavigateTab('financials')}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
        >
          Manage Financials
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Total Contracting Value</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">₹{totalBilling.toLocaleString('en-IN')}</p>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Advance Collected</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">₹{totalCollected.toLocaleString('en-IN')}</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between sm:col-span-2 lg:col-span-1">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Pending Payment Collection</p>
            <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">₹{totalPending.toLocaleString('en-IN')}</p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {pendingDeleteClients.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl space-y-3">
          <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span>Pending Client Deletion / Archival Requests ({pendingDeleteClients.length})</span>
          </div>

          <div className="divide-y divide-amber-200/60 bg-white rounded-xl border border-amber-200 overflow-hidden">
            {pendingDeleteClients.map((client) => (
              <div key={client.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-slate-900 text-sm">{client.companyName}</p>
                  <p className="text-slate-600 mt-0.5">
                    Requested by: <span className="font-semibold">{client.deleteRequestedBy || 'Sales Rep'}</span>
                  </p>
                  <p className="text-amber-800 font-medium mt-1">Reason: {client.deleteReason}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => approveDeleteClient(client.id, 'ARCHIVE')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg text-xs"
                  >
                    Approve Archive
                  </button>
                  <button
                    onClick={() => approveDeleteClient(client.id, 'PERMANENT')}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs"
                  >
                    Permanent Delete
                  </button>
                  <button
                    onClick={() => rejectDeleteClient(client.id)}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Agency Real-time Audit Trail</h3>
          </div>
          <span className="text-xs text-slate-400">Non-editable system log</span>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {activityLogs.slice(0, 10).map((log) => (
            <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex justify-between items-start">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900">{log.action}</span>
                  {log.clientName && (
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-semibold text-[10px]">
                      {log.clientName}
                    </span>
                  )}
                </div>
                <p className="text-slate-600 mt-1">{log.details}</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  By {log.performedByName} ({log.performedByRole})
                </p>
              </div>
              <span className="text-[10px] text-slate-400 whitespace-nowrap">{log.timestamp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
