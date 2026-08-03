import React from 'react';
import { useCRM } from '../../context/CRMContext';
import {
  Users,
  Briefcase,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  Image,
  Video,
  Share2,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface PMDashboardProps {
  onNavigateTab: (tab: string) => void;
  onSelectTask: (taskId: string) => void;
}

export const PMDashboard: React.FC<PMDashboardProps> = ({ onNavigateTab, onSelectTask }) => {
  const { clients, projects, tasks, users } = useCRM();

  // Main Counters (Section 8 of spec)
  const totalClientsCount = clients.filter((c) => c.status === 'ACTIVE').length;
  const activeProjectsCount = projects.filter((p) => p.status === 'In Progress').length;
  const pendingTasksCount = tasks.filter((t) => t.generalStatus !== 'Completed').length;
  const inWorkingCount = tasks.filter((t) => t.generalStatus === 'In Progress').length;
  const contentReviewCount = tasks.filter((t) => t.contentStatus === 'Content Sent for Approval').length;
  const creativeReviewCount = tasks.filter(
    (t) => t.designStatus === 'Creative Sent for Approval' || t.videoStatus === 'First Cut Review'
  ).length;
  const clientChangesCount = tasks.filter(
    (t) => t.designStatus === 'Changes from Client' || t.videoStatus === 'Video Changes Required'
  ).length;
  const readyToUploadCount = tasks.filter((t) => t.publishingStatus === 'Ready to Upload').length;
  const doneCount = tasks.filter((t) => t.generalStatus === 'Completed').length;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const overdueCount = tasks.filter((t) => t.generalStatus !== 'Completed' && t.dueDate < todayStr).length;

  // Role-Wise Work Summary counts
  const writerPending = tasks.filter((t) => t.contentStatus === 'Content Pending').length;
  const writerInProgress = tasks.filter((t) => t.contentStatus === 'Content Writing').length;
  const writerApprovalPending = tasks.filter((t) => t.contentStatus === 'Content Sent for Approval').length;
  const writerChangesReq = tasks.filter((t) => t.contentStatus === 'Content Changes Required').length;
  const writerApproved = tasks.filter((t) => t.contentStatus === 'Content Approved').length;

  const designerReady = tasks.filter((t) => t.designStatus === 'Ready for Design').length;
  const designerInDesign = tasks.filter((t) => t.designStatus === 'In Design').length;
  const designerSharedWA = tasks.filter((t) => t.designStatus === 'Shared on WhatsApp').length;
  const designerCreativeRev = tasks.filter((t) => t.designStatus === 'Creative Sent for Approval').length;
  const designerClientChanges = tasks.filter((t) => t.designStatus === 'Changes from Client').length;
  const designerApproved = tasks.filter((t) => t.designStatus === 'Creative Approved').length;

  const editorReady = tasks.filter((t) => t.videoStatus === 'Ready for Editing').length;
  const editorInEditing = tasks.filter((t) => t.videoStatus === 'Editing in Progress').length;
  const editorFirstCut = tasks.filter((t) => t.videoStatus === 'First Cut Shared').length;
  const editorChanges = tasks.filter((t) => t.videoStatus === 'Video Changes Required').length;
  const editorApproved = tasks.filter((t) => t.videoStatus === 'Final Approved').length;

  const smmContentPending = tasks.filter((t) => t.contentStatus === 'Content Sent for Approval').length;
  const smmCreativePending = tasks.filter((t) => t.designStatus === 'Creative Sent for Approval').length;
  const smmReadyUpload = tasks.filter((t) => t.publishingStatus === 'Ready to Upload').length;
  const smmScheduled = tasks.filter((t) => t.publishingStatus === 'Scheduled').length;
  const smmUploaded = tasks.filter((t) => t.publishingStatus === 'Uploaded / Posted').length;

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Project Manager Dashboard</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Complete agency operational position and role-wise deliverable pipeline
          </p>
        </div>
        <button
          onClick={() => onNavigateTab('work')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center space-x-1.5 cursor-pointer shrink-0"
        >
          <span>Work Management</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Main Counters Grid (10 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Total Clients</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalClientsCount}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Active Projects</p>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{activeProjectsCount}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Pending Tasks</p>
          <p className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">{pendingTasksCount}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">In Working</p>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{inWorkingCount}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Content Review</p>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{contentReviewCount}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Creative Review</p>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{creativeReviewCount}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Client Changes</p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{clientChangesCount}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Ready to Upload</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{readyToUploadCount}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Done</p>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{doneCount}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Overdue</p>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{overdueCount}</p>
        </div>
      </div>

      {/* Role-Wise Work Summary Cards */}
      <h2 className="text-base font-bold text-slate-900 dark:text-white pt-2">Role-Wise Work Summary</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Content Writers Summary */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 transition-colors">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Content Writers Pipeline</h3>
            </div>
            <span className="text-xs text-slate-400 font-semibold">{writerPending + writerInProgress} Active</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-medium">Pending Content</span>
              <span className="text-base font-bold text-slate-800 dark:text-slate-100">{writerPending}</span>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 rounded-xl border border-blue-100 dark:border-blue-900/50">
              <span className="text-blue-700 dark:text-blue-300 text-[10px] block font-medium">Writing in Progress</span>
              <span className="text-base font-bold text-blue-900 dark:text-blue-100">{writerInProgress}</span>
            </div>
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/50 rounded-xl border border-purple-100 dark:border-purple-900/50">
              <span className="text-purple-700 dark:text-purple-300 text-[10px] block font-medium">Approval Pending</span>
              <span className="text-base font-bold text-purple-900 dark:text-purple-100">{writerApprovalPending}</span>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 rounded-xl border border-amber-100 dark:border-amber-900/50">
              <span className="text-amber-700 dark:text-amber-300 text-[10px] block font-medium">Changes Required</span>
              <span className="text-base font-bold text-amber-900 dark:text-amber-100">{writerChangesReq}</span>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl border border-emerald-100 dark:border-emerald-900/50 col-span-2">
              <span className="text-emerald-700 dark:text-emerald-300 text-[10px] block font-medium">Content Approved</span>
              <span className="text-base font-bold text-emerald-900 dark:text-emerald-100">{writerApproved}</span>
            </div>
          </div>
        </div>

        {/* Graphic Designers Summary */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 transition-colors">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <Image className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Graphic Designers Pipeline</h3>
            </div>
            <span className="text-xs text-slate-400 font-semibold">{designerInDesign + designerSharedWA} Active</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-medium">Ready for Design</span>
              <span className="text-base font-bold text-slate-800 dark:text-slate-100">{designerReady}</span>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 rounded-xl border border-blue-100 dark:border-blue-900/50">
              <span className="text-blue-700 dark:text-blue-300 text-[10px] block font-medium">In Design</span>
              <span className="text-base font-bold text-blue-900 dark:text-blue-100">{designerInDesign}</span>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
              <span className="text-emerald-700 dark:text-emerald-300 text-[10px] block font-medium">Shared on WA</span>
              <span className="text-base font-bold text-emerald-900 dark:text-emerald-100">{designerSharedWA}</span>
            </div>
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
              <span className="text-indigo-700 dark:text-indigo-300 text-[10px] block font-medium">Creative Review</span>
              <span className="text-base font-bold text-indigo-900 dark:text-indigo-100">{designerCreativeRev}</span>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 rounded-xl border border-amber-100 dark:border-amber-900/50">
              <span className="text-amber-700 dark:text-amber-300 text-[10px] block font-medium">Client Changes</span>
              <span className="text-base font-bold text-amber-900 dark:text-amber-100">{designerClientChanges}</span>
            </div>
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/60 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <span className="text-emerald-800 dark:text-emerald-200 text-[10px] block font-medium">Approved</span>
              <span className="text-base font-bold text-emerald-900 dark:text-emerald-100">{designerApproved}</span>
            </div>
          </div>
        </div>

        {/* Video Editors Summary */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 transition-colors">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <Video className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Video Editors Pipeline</h3>
            </div>
            <span className="text-xs text-slate-400 font-semibold">{editorInEditing + editorFirstCut} Active</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-medium">Ready for Editing</span>
              <span className="text-base font-bold text-slate-800 dark:text-slate-100">{editorReady}</span>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 rounded-xl border border-blue-100 dark:border-blue-900/50">
              <span className="text-blue-700 dark:text-blue-300 text-[10px] block font-medium">In Editing</span>
              <span className="text-base font-bold text-blue-900 dark:text-blue-100">{editorInEditing}</span>
            </div>
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/50 rounded-xl border border-purple-100 dark:border-purple-900/50">
              <span className="text-purple-700 dark:text-purple-300 text-[10px] block font-medium">First Cut Shared</span>
              <span className="text-base font-bold text-purple-900 dark:text-purple-100">{editorFirstCut}</span>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 rounded-xl border border-amber-100 dark:border-amber-900/50">
              <span className="text-amber-700 dark:text-amber-300 text-[10px] block font-medium">Revision Required</span>
              <span className="text-base font-bold text-amber-900 dark:text-amber-100">{editorChanges}</span>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl border border-emerald-100 dark:border-emerald-900/50 col-span-2">
              <span className="text-emerald-700 dark:text-emerald-300 text-[10px] block font-medium">Final Approved</span>
              <span className="text-base font-bold text-emerald-900 dark:text-emerald-100">{editorApproved}</span>
            </div>
          </div>
        </div>

        {/* Social Media Managers Summary */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 transition-colors">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <Share2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">SMM Publishing Pipeline</h3>
            </div>
            <span className="text-xs text-slate-400 font-semibold">{smmReadyUpload + smmScheduled} Queue</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/50 rounded-xl border border-purple-100 dark:border-purple-900/50">
              <span className="text-purple-700 dark:text-purple-300 text-[10px] block font-medium">Content Approval</span>
              <span className="text-base font-bold text-purple-900 dark:text-purple-100">{smmContentPending}</span>
            </div>
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
              <span className="text-indigo-700 dark:text-indigo-300 text-[10px] block font-medium">Creative Review</span>
              <span className="text-base font-bold text-indigo-900 dark:text-indigo-100">{smmCreativePending}</span>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
              <span className="text-emerald-700 dark:text-emerald-300 text-[10px] block font-medium">Ready to Upload</span>
              <span className="text-base font-bold text-emerald-900 dark:text-emerald-100">{smmReadyUpload}</span>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 rounded-xl border border-blue-100 dark:border-blue-900/50">
              <span className="text-blue-700 dark:text-blue-300 text-[10px] block font-medium">Scheduled</span>
              <span className="text-base font-bold text-blue-900 dark:text-blue-100">{smmScheduled}</span>
            </div>
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/60 rounded-xl border border-emerald-200 dark:border-emerald-800 col-span-2">
              <span className="text-emerald-800 dark:text-emerald-200 text-[10px] block font-medium">Uploaded / Posted</span>
              <span className="text-base font-bold text-emerald-900 dark:text-emerald-100">{smmUploaded}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Quick Action Pending Work Table */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 transition-colors">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Urgent Deliverables Requiring Attention</h3>
          <button
            onClick={() => onNavigateTab('work')}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
          >
            View All Work
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Client</th>
                <th className="p-3">Task Name</th>
                <th className="p-3">Type</th>
                <th className="p-3">Due Date</th>
                <th className="p-3">Content Status</th>
                <th className="p-3">Design / Video Status</th>
                <th className="p-3">Publish Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {tasks.slice(0, 5).map((task) => (
                <tr key={task.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-3 font-semibold text-slate-900 dark:text-white">{task.clientName}</td>
                  <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{task.taskName}</td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">{task.taskType}</td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">{task.dueDate}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {task.contentStatus}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {task.designStatus || task.videoStatus || 'Pending'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {task.publishingStatus || 'Not Started'}
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => onSelectTask(task.id)}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded-lg text-[11px] transition-colors cursor-pointer"
                    >
                      Open Task
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
