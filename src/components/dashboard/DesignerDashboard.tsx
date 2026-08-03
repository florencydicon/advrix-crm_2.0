import React from 'react';
import { useCRM } from '../../context/CRMContext';
import { Image, Share2, CheckCircle, AlertTriangle } from 'lucide-react';

interface DesignerDashboardProps {
  onSelectTask: (taskId: string) => void;
}

export const DesignerDashboard: React.FC<DesignerDashboardProps> = ({ onSelectTask }) => {
  const { tasks, currentUser } = useCRM();

  const myTasks = tasks.filter(
    (t) =>
      (t.assignedDesignerId === currentUser.id || !t.assignedDesignerId) &&
      t.taskType !== 'Video Shoot' &&
      t.taskType !== 'Video Editing'
  );

  // Section 6 of spec counters
  const readyForDesign = myTasks.filter((t) => t.designStatus === 'Ready for Design').length;
  const inDesign = myTasks.filter((t) => t.designStatus === 'In Design').length;
  const sharedOnWhatsApp = myTasks.filter((t) => t.designStatus === 'Shared on WhatsApp').length;
  const sentForApproval = myTasks.filter((t) => t.designStatus === 'Creative Sent for Approval').length;
  const changesFromClient = myTasks.filter((t) => t.designStatus === 'Changes from Client').length;
  const approved = myTasks.filter((t) => t.designStatus === 'Creative Approved').length;
  const completed = myTasks.filter((t) => t.generalStatus === 'Completed').length;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Graphic Designer Dashboard</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Design deliverables, WhatsApp sharing confirmation, and client feedback tracking
        </p>
      </div>

      {/* Counters Grid (Section 6 of spec) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Ready for Design</p>
          <p className="text-xl font-black text-slate-800 dark:text-slate-200 mt-1">{readyForDesign}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase">In Design</p>
          <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">{inDesign}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Shared on WA</p>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{sharedOnWhatsApp}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase">Sent for Approval</p>
          <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{sentForApproval}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">Client Changes</p>
          <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">{changesFromClient}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Approved</p>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{approved}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs col-span-2 sm:col-span-1">
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Completed</p>
          <p className="text-xl font-black text-emerald-800 dark:text-emerald-300 mt-1">{completed}</p>
        </div>
      </div>

      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 font-medium">
        📲 <span className="font-bold">WhatsApp Policy:</span> Graphic Designers do not upload image files into CRM. Designers share creative PNGs on WhatsApp, then update WhatsApp sharing records & version details in CRM!
      </div>

      {/* Task List */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 transition-colors">
        <h3 className="font-bold text-slate-900 dark:text-white text-sm">Design Tasks Queue</h3>

        <div className="space-y-3">
          {myTasks.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No design tasks available.</p>
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
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      {task.clientName}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">{task.taskType}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    Visual Direction: {task.content?.visualDirection || 'Follow brand guidelines.'}
                  </p>
                  {task.clientFeedbacks.length > 0 && (
                    <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 rounded text-amber-900 dark:text-amber-200 text-[11px]">
                      <span className="font-bold">Client Changes:</span> {task.clientFeedbacks[0].requiredChanges}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {task.designStatus || 'Pending'}
                  </span>
                  <button className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer">
                    Open Workspace
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
