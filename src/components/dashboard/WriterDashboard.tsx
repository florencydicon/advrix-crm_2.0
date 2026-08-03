import React from 'react';
import { useCRM } from '../../context/CRMContext';
import { FileText, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface WriterDashboardProps {
  onSelectTask: (taskId: string) => void;
}

export const WriterDashboard: React.FC<WriterDashboardProps> = ({ onSelectTask }) => {
  const { tasks, currentUser } = useCRM();

  // Content Writer dashboard counters (Section 5 of spec)
  const myTasks = tasks.filter((t) => t.assignedWriterId === currentUser.id || !t.assignedWriterId);

  const pendingCount = myTasks.filter((t) => t.contentStatus === 'Content Pending').length;
  const writingCount = myTasks.filter((t) => t.contentStatus === 'Content Writing').length;
  const sentForApprovalCount = myTasks.filter((t) => t.contentStatus === 'Content Sent for Approval').length;
  const changesRequiredCount = myTasks.filter((t) => t.contentStatus === 'Content Changes Required').length;
  const approvedCount = myTasks.filter((t) => t.contentStatus === 'Content Approved').length;
  const completedMonthCount = myTasks.filter((t) => t.generalStatus === 'Completed').length;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Content Writer Dashboard</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Writing-related work queue, text drafting, Gujarati & English caption formatting
        </p>
      </div>

      {/* Counters Grid (Section 5 of spec) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Content Pending</p>
          <p className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Content Writing</p>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{writingCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Sent for Approval</p>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{sentForApprovalCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">Changes Required</p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{changesRequiredCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Content Approved</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{approvedCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Completed This Month</p>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{completedMonthCount}</p>
        </div>
      </div>

      {/* Note from spec: Content Writer does NOT upload images/files! */}
      <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 rounded-xl text-xs text-indigo-900 dark:text-indigo-200 font-medium">
        💡 <span className="font-bold">CRM Policy:</span> Content Writers write text content (Gujarati & English caption formatting preserved). Visual creative files are shared externally on WhatsApp!
      </div>

      {/* Task List */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 transition-colors">
        <h3 className="font-bold text-slate-900 dark:text-white text-sm">Assigned Written Tasks</h3>

        <div className="space-y-3">
          {myTasks.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No writing tasks assigned.</p>
          ) : (
            myTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onSelectTask(task.id)}
                className="p-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{task.taskName}</span>
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                      {task.clientName}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                      {task.taskType}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-1">{task.shortBrief || 'No brief provided.'}</p>
                  {task.contentChangesInstructions && (
                    <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 rounded text-amber-900 dark:text-amber-200 text-[11px]">
                      <span className="font-bold">Requested Changes:</span> {task.contentChangesInstructions}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    {task.contentStatus}
                  </span>
                  <button className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer">
                    Open Editor
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
