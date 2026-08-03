import React from 'react';
import { useCRM } from '../../context/CRMContext';
import { PlusCircle, Users, Briefcase, DollarSign, ChevronRight } from 'lucide-react';

interface SalesDashboardProps {
  onNavigateTab: (tab: string) => void;
  onOpenAddWork: () => void;
}

export const SalesDashboard: React.FC<SalesDashboardProps> = ({
  onNavigateTab,
  onOpenAddWork,
}) => {
  const { clients, projects, requestDeleteClient } = useCRM();

  const totalClients = clients.filter((c) => c.status === 'ACTIVE').length;
  const activeProjects = projects.filter((p) => p.status === 'In Progress').length;
  const monthlyRetainerClients = projects.filter((p) => p.isMonthlyRetainer).length;
  const awaitingTeam = projects.filter((p) => p.status === 'Awaiting Team Assignment').length;
  const projectsInProgress = projects.filter((p) => p.status === 'In Progress').length;
  const completedProjects = projects.filter((p) => p.status === 'Completed').length;
  const pendingPayments = projects.reduce((acc, p) => acc + p.financials.pendingAmount, 0);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Sales Dashboard</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Client acquisition, project onboarding, and financial tracking
          </p>
        </div>
        <button
          onClick={onOpenAddWork}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-2 shrink-0 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Work / New Client</span>
        </button>
      </div>

      {/* Dashboard Cards (Section 6 of spec) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Total Clients</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalClients}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Active Projects</p>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{activeProjects}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Monthly Retainer Clients</p>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{monthlyRetainerClients}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Awaiting Team Assignment</p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{awaitingTeam}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Projects In Progress</p>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{projectsInProgress}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Completed Projects</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{completedProjects}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs col-span-2">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Pending Payments Total</p>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">₹{pendingPayments.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Clients List (Section 6 of spec) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 transition-colors">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Clients List</h3>
          <button
            onClick={() => onNavigateTab('clients')}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
          >
            Manage Clients
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Client Name</th>
                <th className="p-3">Contact Number</th>
                <th className="p-3">Work Type</th>
                <th className="p-3">Active Projects</th>
                <th className="p-3">Total Payment</th>
                <th className="p-3">Pending Payment</th>
                <th className="p-3">Project Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {clients.map((client) => {
                const clientProjects = projects.filter((p) => p.clientId === client.id);
                const firstProj = clientProjects[0];
                const totalPay = clientProjects.reduce((a, p) => a + (p.financials?.totalPayment ?? p.financials?.totalAgreedAmount ?? 0), 0);
                const pendPay = clientProjects.reduce((a, p) => a + (p.financials?.pendingAmount ?? 0), 0);

                return (
                  <tr key={client.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">{client.companyName}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{client.phone}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{firstProj?.workType || 'Branding'}</td>
                    <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">{clientProjects.length}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">₹{totalPay.toLocaleString('en-IN')}</td>
                    <td className="p-3 font-bold text-rose-600 dark:text-rose-400">₹{pendPay.toLocaleString('en-IN')}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {firstProj?.status || 'Active'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={onOpenAddWork}
                          className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-semibold rounded text-[10px] border border-emerald-200 dark:border-emerald-800/80"
                        >
                          + Add Work
                        </button>
                        <button
                          onClick={() => requestDeleteClient(client.id, 'Client Cancelled')}
                          className="px-2 py-1 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 font-semibold rounded text-[10px] border border-rose-200 dark:border-rose-800/80"
                        >
                          Delete Req
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
