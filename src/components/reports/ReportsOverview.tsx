import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Clock,
  Briefcase,
  Users,
  AlertCircle,
  FileText,
  DollarSign,
  PieChart,
  Calendar,
  Layers,
} from 'lucide-react';

export const ReportsOverview: React.FC = () => {
  const {
    currentRole,
    currentUser,
    tasks,
    projects,
    clients,
    users,
    leaveRequests,
  } = useCRM();

  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');

  const isAdminOrPM = currentRole === 'SUPER_ADMIN' || currentRole === 'PROJECT_MANAGER';

  // My Role Specific Tasks
  const myAssignedTasks = tasks.filter((t) => {
    if (isAdminOrPM) return true;
    if (currentRole === 'CONTENT_WRITER') return t.assignedWriterId === currentUser.id;
    if (currentRole === 'GRAPHIC_DESIGNER') return t.assignedDesignerId === currentUser.id;
    if (currentRole === 'VIDEO_EDITOR') return t.assignedEditorId === currentUser.id;
    if (currentRole === 'SOCIAL_MEDIA_MANAGER') return t.assignedSmmId === currentUser.id;
    if (currentRole === 'SALES_REP') {
      const client = clients.find((c) => c.id === t.clientId);
      return client?.salesRepId === currentUser.id;
    }
    return false;
  });

  // Calculate Metrics
  const totalTasksCount = myAssignedTasks.length;
  const completedTasksCount = myAssignedTasks.filter(
    (t) => t.generalStatus === 'Completed' || t.publishingStatus === 'Uploaded / Posted' || t.publishingStatus === 'Done'
  ).length;

  const inProgressCount = totalTasksCount - completedTasksCount;
  const completionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const pendingRevisions = myAssignedTasks.filter(
    (t) =>
      t.designStatus === 'Changes from Client' ||
      t.videoStatus === 'Video Changes Required' ||
      t.contentStatus === 'Content Changes Required'
  ).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-white">
              {isAdminOrPM ? 'Agency Performance & Analytics' : 'My Performance Report'}
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAdminOrPM
              ? 'Complete overview of agency deliverables, client projects, and team productivity'
              : `Personal productivity analytics for ${currentUser.name} (${currentRole.replace('_', ' ')})`}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Time</option>
            <option value="CURRENT">Current Month</option>
            <option value="LAST_MONTH">Last Month</option>
          </select>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Tasks</span>
            <Briefcase className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white">{totalTasksCount}</p>
          <p className="text-[10px] text-slate-400 mt-1">Assigned in portal</p>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">{completedTasksCount}</p>
          <p className="text-[10px] text-slate-400 mt-1">{completionRate}% Completion Rate</p>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">In Progress</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-black text-sky-400">{inProgressCount}</p>
          <p className="text-[10px] text-slate-400 mt-1">Active deliverables</p>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Revisions</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400">{pendingRevisions}</p>
          <p className="text-[10px] text-slate-400 mt-1">Client requested changes</p>
        </div>
      </div>

      {/* Progress Bar Visual */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md space-y-3">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-white flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Overall Completion Efficiency</span>
          </span>
          <span className="font-mono font-bold text-emerald-400">{completionRate}%</span>
        </div>
        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      {/* ADMIN & PM VIEW: Agency Team Workload Table */}
      {isAdminOrPM && (
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-sm flex items-center space-x-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span>Team Workload & Completion Breakdown</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">Total Staff: {users.length}</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                  <th className="p-3">Staff Name</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Active Tasks</th>
                  <th className="p-3">Completed</th>
                  <th className="p-3 text-right">Capacity Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => {
                  const userTasks = tasks.filter(
                    (t) =>
                      t.assignedWriterId === u.id ||
                      t.assignedDesignerId === u.id ||
                      t.assignedEditorId === u.id ||
                      t.assignedSmmId === u.id
                  );
                  const active = userTasks.filter((t) => t.generalStatus !== 'Completed').length;
                  const done = userTasks.filter((t) => t.generalStatus === 'Completed').length;

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-white flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center text-[10px]">
                          {u.name.charAt(0)}
                        </div>
                        <span>{u.name}</span>
                      </td>
                      <td className="p-3 text-slate-400">{u.role.replace('_', ' ')}</td>
                      <td className="p-3 font-bold text-amber-400">{active} Tasks</td>
                      <td className="p-3 font-bold text-emerald-400">{done} Tasks</td>
                      <td className="p-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            active > 15
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : active > 8
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {active > 15 ? 'Overloaded' : active > 8 ? 'Moderate' : 'Optimal'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STAFF VIEW: My Personal Deliverables Breakdown */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
        <h3 className="font-bold text-white text-sm flex items-center space-x-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>{isAdminOrPM ? 'Recent Project Deliverables' : 'My Assigned Work Tasks'}</span>
        </h3>

        {myAssignedTasks.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
            No active tasks found under your account.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                  <th className="p-3">Task Name</th>
                  <th className="p-3">Client</th>
                  <th className="p-3">Deliverable</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {myAssignedTasks.slice(0, 15).map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-white">{t.taskName}</td>
                    <td className="p-3 text-slate-300 font-semibold">{t.clientName}</td>
                    <td className="p-3 text-slate-400">{t.taskType}</td>
                    <td className="p-3 font-mono text-slate-400">{t.dueDate}</td>
                    <td className="p-3 text-right">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {t.generalStatus || 'In Progress'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
