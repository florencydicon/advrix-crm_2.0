import React from 'react';
import { useCRM } from '../../context/CRMContext';
import { Share2, Clock, CheckCircle, Calendar, AlertCircle } from 'lucide-react';

interface SMMDashboardProps {
  onSelectTask: (taskId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const SMMDashboard: React.FC<SMMDashboardProps> = ({ onSelectTask, onNavigateTab }) => {
  const { tasks } = useCRM();

  // Section 7 counters
  const contentWaiting = tasks.filter((t) => t.contentStatus === 'Content Sent for Approval').length;
  const creativeWaiting = tasks.filter((t) => t.designStatus === 'Creative Sent for Approval').length;
  const clientChanges = tasks.filter((t) => t.designStatus === 'Changes from Client').length;
  const readyToUpload = tasks.filter((t) => t.publishingStatus === 'Ready to Upload').length;
  const scheduled = tasks.filter((t) => t.publishingStatus === 'Scheduled').length;
  const postedToday = tasks.filter(
    (t) =>
      t.publishingStatus === 'Uploaded / Posted' &&
      t.smmUpload?.uploadedAt?.includes(new Date().toISOString().split('T')[0])
  ).length;
  const pendingUpload = readyToUpload + scheduled;
  const completed = tasks.filter((t) => t.generalStatus === 'Completed').length;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Social Media Manager Dashboard</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Content approvals, creative reviews, posting schedule & platform uploading
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => onNavigateTab('ready-upload')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Ready to Upload ({readyToUpload})</span>
          </button>
        </div>
      </div>

      {/* Counters Grid (Section 7 of spec) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Content Approval</p>
          <p className="text-lg font-black text-purple-600 dark:text-purple-400 mt-0.5">{contentWaiting}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Creative Review</p>
          <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{creativeWaiting}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">Client Changes</p>
          <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">{clientChanges}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Ready Upload</p>
          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{readyToUpload}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase">Scheduled</p>
          <p className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">{scheduled}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">Posted Today</p>
          <p className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{postedToday}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300 uppercase">Pending Upload</p>
          <p className="text-lg font-black text-indigo-700 dark:text-indigo-300 mt-0.5">{pendingUpload}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Completed</p>
          <p className="text-lg font-black text-slate-800 dark:text-slate-200 mt-0.5">{completed}</p>
        </div>
      </div>

      {/* Ready to Upload Quick Queue */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 transition-colors">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Approved Creatives Ready to Post</h3>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
            {readyToUpload} Creatives Waiting
          </span>
        </div>

        <div className="space-y-3">
          {tasks.filter((t) => t.publishingStatus === 'Ready to Upload').length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No posts in upload queue.</p>
          ) : (
            tasks
              .filter((t) => t.publishingStatus === 'Ready to Upload')
              .map((task) => (
                <div
                  key={task.id}
                  onClick={() => onSelectTask(task.id)}
                  className="p-4 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-xl cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{task.taskName}</span>
                      <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded">
                        {task.clientName}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-1">
                      Caption Preview: {task.content?.mainCaption || 'Caption approved.'}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer">
                      Upload / Schedule
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
