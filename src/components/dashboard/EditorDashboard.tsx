import React from 'react';
import { useCRM } from '../../context/CRMContext';
import { Video, Share2, CheckCircle, AlertTriangle } from 'lucide-react';

interface EditorDashboardProps {
  onSelectTask: (taskId: string) => void;
}

export const EditorDashboard: React.FC<EditorDashboardProps> = ({ onSelectTask }) => {
  const { tasks, currentUser } = useCRM();

  const myVideoTasks = tasks.filter(
    (t) =>
      (t.assignedEditorId === currentUser.id || !t.assignedEditorId) &&
      (t.taskType === 'Video Shoot' || t.taskType === 'Video Editing' || t.taskType === 'Reel')
  );

  const readyForEditing = myVideoTasks.filter((t) => t.videoStatus === 'Ready for Editing').length;
  const inEditing = myVideoTasks.filter((t) => t.videoStatus === 'Editing in Progress').length;
  const firstCutShared = myVideoTasks.filter((t) => t.videoStatus === 'First Cut Shared').length;
  const changesRequired = myVideoTasks.filter((t) => t.videoStatus === 'Video Changes Required').length;
  const finalCutShared = myVideoTasks.filter((t) => t.videoStatus === 'Revised Cut Shared').length;
  const approved = myVideoTasks.filter((t) => t.videoStatus === 'Final Approved').length;
  const completed = myVideoTasks.filter((t) => t.generalStatus === 'Completed').length;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Video Editor Dashboard</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Reel editing, first cut WhatsApp sharing, revision tracking, and final cuts
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Ready for Editing</p>
          <p className="text-xl font-black text-slate-800 dark:text-slate-200 mt-1">{readyForEditing}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase">Editing In Progress</p>
          <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">{inEditing}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase">First Cut Shared</p>
          <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">{firstCutShared}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">Changes Required</p>
          <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">{changesRequired}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase">Final Cut Shared</p>
          <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{finalCutShared}</p>
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

      <div className="p-3 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/80 rounded-xl text-xs text-purple-900 dark:text-purple-200 font-medium">
        🎥 <span className="font-bold">No Video Upload in CRM:</span> Video files are sent directly over WhatsApp to clients or PMs. Video Editors update WhatsApp First Cut / Revision sharing details in Advrix CRM!
      </div>

      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 transition-colors">
        <h3 className="font-bold text-slate-900 dark:text-white text-sm">Assigned Video Tasks</h3>

        <div className="space-y-3">
          {myVideoTasks.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No video tasks available.</p>
          ) : (
            myVideoTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onSelectTask(task.id)}
                className="p-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{task.taskName}</span>
                    <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/80 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                      {task.clientName}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">{task.taskType}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{task.shortBrief || 'Video reel cut.'}</p>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    {task.videoStatus || 'Pending'}
                  </span>
                  <button className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer">
                    Open Video Task
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
