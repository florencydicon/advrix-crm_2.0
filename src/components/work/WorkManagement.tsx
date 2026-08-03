import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { Task, Project } from '../../types/crm';
import {
  Briefcase,
  Users,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  FileText,
  Image,
  Video,
  Clock,
  UserPlus,
  PlusCircle,
  CheckCircle2,
  Share2,
  DollarSign,
  Layers,
} from 'lucide-react';

interface WorkManagementProps {
  onSelectTask: (taskId: string) => void;
  activeTab?: string;
  onOpenAddWork?: () => void;
}

export const WorkManagement: React.FC<WorkManagementProps> = ({
  onSelectTask,
  activeTab,
  onOpenAddWork,
}) => {
  const {
    projects,
    tasks,
    clients,
    users,
    currentUser,
    currentRole,
    assignProjectTeam,
    updateTaskStatus,
    isUserOnLeave,
  } = useCRM();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('ALL');
  const [filterMode, setFilterMode] = useState<'ALL' | 'MY_TASKS' | 'APPROVALS' | 'CLIENT_CHANGES'>('ALL');

  // Accordion state: Track open project IDs (default open all or first few)
  const [expandedProjectIds, setExpandedProjectIds] = useState<Record<string, boolean>>({});

  // Assign Team Modal state
  const [selectedProjectIdForAssign, setSelectedProjectIdForAssign] = useState<string | null>(null);
  const [writerId, setWriterId] = useState('');
  const [designerId, setDesignerId] = useState('');
  const [editorId, setEditorId] = useState('');
  const [smmId, setSmmId] = useState('');

  const isAdminOrPM = currentRole === 'SUPER_ADMIN' || currentRole === 'PROJECT_MANAGER';
  const canAddWork = isAdminOrPM || currentRole === 'SALES_REP';

  const toggleAccordion = (projectId: string) => {
    setExpandedProjectIds((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  // Filter Projects based on Role & Filter Controls
  const filteredProjects = projects.filter((proj) => {
    // Client dropdown
    const matchesClient = selectedClientId === 'ALL' || proj.clientId === selectedClientId;

    // Search term
    const searchLower = (searchTerm || '').toLowerCase();
    const matchesSearch =
      (proj.name || '').toLowerCase().includes(searchLower) ||
      (proj.clientName || '').toLowerCase().includes(searchLower) ||
      (proj.packageType || '').toLowerCase().includes(searchLower);

    // Role-based visibility
    let matchesRole = true;
    if (!isAdminOrPM) {
      if (currentRole === 'CONTENT_WRITER') {
        matchesRole = proj.assignedWriterId === currentUser.id || tasks.some((t) => t.projectId === proj.id && t.assignedWriterId === currentUser.id);
      } else if (currentRole === 'GRAPHIC_DESIGNER') {
        matchesRole = proj.assignedDesignerId === currentUser.id || tasks.some((t) => t.projectId === proj.id && t.assignedDesignerId === currentUser.id);
      } else if (currentRole === 'VIDEO_EDITOR') {
        matchesRole = proj.assignedEditorId === currentUser.id || tasks.some((t) => t.projectId === proj.id && t.assignedEditorId === currentUser.id);
      } else if (currentRole === 'SOCIAL_MEDIA_MANAGER') {
        matchesRole = proj.assignedSmmId === currentUser.id || tasks.some((t) => t.projectId === proj.id && t.assignedSmmId === currentUser.id);
      } else if (currentRole === 'SALES_REP') {
        const client = clients.find((c) => c.id === proj.clientId);
        matchesRole = client?.salesRepId === currentUser.id;
      }
    }

    // Filter Mode / Active Tab
    let matchesMode = true;
    const projTasks = tasks.filter((t) => t.projectId === proj.id);

    if (activeTab === 'my-design' || activeTab === 'my-content' || activeTab === 'my-video' || filterMode === 'MY_TASKS') {
      matchesMode = projTasks.some(
        (t) =>
          t.assignedWriterId === currentUser.id ||
          t.assignedDesignerId === currentUser.id ||
          t.assignedEditorId === currentUser.id ||
          t.assignedSmmId === currentUser.id
      );
    } else if (activeTab === 'approvals' || activeTab === 'creative-approvals' || activeTab === 'content-approvals' || filterMode === 'APPROVALS') {
      matchesMode = projTasks.some(
        (t) =>
          t.contentStatus === 'Content Sent for Approval' ||
          t.designStatus === 'Creative Sent for Approval' ||
          t.videoStatus === 'First Cut Review'
      );
    } else if (activeTab === 'client-changes' || filterMode === 'CLIENT_CHANGES') {
      matchesMode = projTasks.some(
        (t) =>
          t.designStatus === 'Changes from Client' ||
          t.videoStatus === 'Video Changes Required' ||
          t.contentStatus === 'Content Changes Required'
      );
    }

    return matchesClient && matchesSearch && matchesRole && matchesMode;
  });

  // Assign Team Handlers
  const handleOpenAssign = (proj: Project) => {
    setSelectedProjectIdForAssign(proj.id);
    setWriterId(proj.assignedWriterId || users.find((u) => u.role === 'CONTENT_WRITER')?.id || '');
    setDesignerId(proj.assignedDesignerId || users.find((u) => u.role === 'GRAPHIC_DESIGNER')?.id || '');
    setEditorId(proj.assignedEditorId || users.find((u) => u.role === 'VIDEO_EDITOR')?.id || '');
    setSmmId(proj.assignedSmmId || users.find((u) => u.role === 'SOCIAL_MEDIA_MANAGER')?.id || '');
  };

  const handleSaveAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectIdForAssign) return;

    assignProjectTeam(selectedProjectIdForAssign, {
      writerId,
      designerId,
      editorId,
      smmId,
    });

    setSelectedProjectIdForAssign(null);
  };

  // Unique clients for dropdown
  const uniqueClients = Array.from(new Set(projects.map((p) => JSON.stringify({ id: p.clientId, name: p.clientName }))))
    .map((str: string) => JSON.parse(str) as { id: string; name: string });

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header & Controls */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Layers className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-white">Clients & Projects Directory</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            View active campaigns by client. Click any project row to expand and view its assigned tasks table.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Pills */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/80 text-xs">
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                filterMode === 'ALL' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Projects
            </button>
            <button
              onClick={() => setFilterMode('MY_TASKS')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                filterMode === 'MY_TASKS' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              My Work
            </button>
            <button
              onClick={() => setFilterMode('APPROVALS')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                filterMode === 'APPROVALS' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Approvals
            </button>
            <button
              onClick={() => setFilterMode('CLIENT_CHANGES')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                filterMode === 'CLIENT_CHANGES' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Client Changes
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[180px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search projects or tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800/80 text-white pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-700/80 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Client Filter Dropdown */}
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="bg-slate-800/80 text-white px-3 py-1.5 text-xs rounded-xl border border-slate-700/80 focus:outline-none focus:border-blue-500 font-semibold"
          >
            <option value="ALL">All Clients ({uniqueClients.length})</option>
            {uniqueClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Add Work Button for Admin, PM, Sales */}
          {canAddWork && onOpenAddWork && (
            <button
              onClick={onOpenAddWork}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add New Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Projects Accordion Table List */}
      <div className="space-y-4">
        {filteredProjects.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/90 rounded-2xl border border-dashed border-slate-800 text-slate-500 text-xs">
            No projects found matching your search or role filters.
          </div>
        ) : (
          filteredProjects.map((proj) => {
            const isExpanded = expandedProjectIds[proj.id] ?? true; // Default open
            const projTasks = tasks.filter((t) => t.projectId === proj.id);

            // Staff specific filtering for tasks inside accordion
            const visibleTasks = projTasks.filter((t) => {
              if (isAdminOrPM) return true;
              if (currentRole === 'CONTENT_WRITER') return t.assignedWriterId === currentUser.id;
              if (currentRole === 'GRAPHIC_DESIGNER') return t.assignedDesignerId === currentUser.id;
              if (currentRole === 'VIDEO_EDITOR') return t.assignedEditorId === currentUser.id;
              if (currentRole === 'SOCIAL_MEDIA_MANAGER') return t.assignedSmmId === currentUser.id;
              return true;
            });

            const completedTasks = projTasks.filter(
              (t) => t.generalStatus === 'Completed' || t.publishingStatus === 'Uploaded / Posted' || t.publishingStatus === 'Done'
            ).length;
            const progressPct = projTasks.length > 0 ? Math.round((completedTasks / projTasks.length) * 100) : 0;

            const writer = users.find((u) => u.id === proj.assignedWriterId);
            const designer = users.find((u) => u.id === proj.assignedDesignerId);
            const editor = users.find((u) => u.id === proj.assignedEditorId);
            const smm = users.find((u) => u.id === proj.assignedSmmId);

            const hasClientChanges = projTasks.some(
              (t) =>
                t.designStatus === 'Changes from Client' ||
                t.videoStatus === 'Video Changes Required' ||
                t.contentStatus === 'Content Changes Required'
            );

            return (
              <div
                key={proj.id}
                className={`bg-slate-900 rounded-2xl border transition-all overflow-hidden ${
                  hasClientChanges ? 'border-amber-500/60 shadow-amber-950/20 shadow-md' : 'border-slate-800 shadow-sm'
                }`}
              >
                {/* Project Accordion Header Row */}
                <div
                  onClick={() => toggleAccordion(proj.id)}
                  className="p-4 sm:p-5 bg-slate-800/80 hover:bg-slate-800 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 transition-colors"
                >
                  <div className="flex items-start sm:items-center space-x-3 min-w-0">
                    <button className="p-1 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white shrink-0">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded bg-blue-600/20 text-blue-300 border border-blue-500/30 font-bold text-[10px]">
                          {proj.clientName}
                        </span>
                        <h3 className="text-sm font-bold text-white truncate">{proj.name}</h3>
                        <span className="text-[10px] text-slate-400 font-medium px-2 py-0.5 bg-slate-900 rounded border border-slate-700">
                          {proj.packageType}
                        </span>
                        {hasClientChanges && (
                          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30 rounded flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3 text-amber-400" />
                            <span>Client Changes</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Start Month: <span className="text-slate-200 font-semibold">{proj.monthYear}</span> • Target Tasks: {projTasks.length}
                      </p>
                    </div>
                  </div>

                  {/* Project Financials & Team */}
                  <div className="flex flex-wrap items-center gap-4 shrink-0 justify-between md:justify-end">
                    {/* Completion Progress */}
                    <div className="w-32">
                      <div className="flex justify-between text-[10px] font-bold text-slate-300 mb-1">
                        <span>Progress</span>
                        <span>{completedTasks}/{projTasks.length} ({progressPct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-700">
                        <div
                          className="h-full bg-emerald-400 rounded-full transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Financials Summary - ONLY FOR SUPER ADMIN & PM */}
                    {isAdminOrPM && proj.financials && (
                      <div className="text-right text-xs bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-700/80">
                        <p className="text-[10px] text-slate-400 font-semibold">Financial Balance</p>
                        <p className="font-bold text-white">
                          ₹{(proj.financials.totalAgreedAmount ?? proj.financials.totalPayment ?? 0).toLocaleString('en-IN')}{' '}
                          {(proj.financials.pendingAmount ?? 0) > 0 && (
                            <span className="text-rose-400 font-extrabold text-[10px]">
                              (₹{(proj.financials.pendingAmount ?? 0).toLocaleString('en-IN')} Due)
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {/* Assigned Team Avatars */}
                    <div className="flex items-center space-x-1.5 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-700/80">
                      <div className="flex items-center -space-x-1">
                        {writer && (
                          <div title={`Writer: ${writer.name}`} className="w-6 h-6 rounded-full bg-sky-600 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-slate-900">
                            {writer.name.charAt(0)}
                          </div>
                        )}
                        {designer && (
                          <div title={`Designer: ${designer.name}`} className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-slate-900">
                            {designer.name.charAt(0)}
                          </div>
                        )}
                        {editor && (
                          <div title={`Editor: ${editor.name}`} className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-slate-900">
                            {editor.name.charAt(0)}
                          </div>
                        )}
                        {smm && (
                          <div title={`SMM: ${smm.name}`} className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-slate-900">
                            {smm.name.charAt(0)}
                          </div>
                        )}
                      </div>

                      {isAdminOrPM && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAssign(proj);
                          }}
                          className="ml-1 p-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded text-[10px] font-bold border border-blue-500/30"
                          title="Assign or Change Team"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Tasks Accordion Table */}
                {isExpanded && (
                  <div className="p-4 bg-slate-900/60">
                    <div className="overflow-x-auto rounded-xl border border-slate-800/80">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead>
                          <tr className="bg-slate-800/90 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                            <th className="p-3">Deliverable Task</th>
                            <th className="p-3">Type</th>
                            <th className="p-3">Assigned Staff</th>
                            <th className="p-3">Due Date</th>
                            <th className="p-3">Stage & Status</th>
                            <th className="p-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {visibleTasks.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-6 text-center text-slate-500 text-xs">
                                No tasks assigned under your role for this project.
                              </td>
                            </tr>
                          ) : (
                            visibleTasks.map((task) => {
                              const taskWriter = users.find((u) => u.id === task.assignedWriterId);
                              const taskDesigner = users.find((u) => u.id === task.assignedDesignerId);
                              const taskEditor = users.find((u) => u.id === task.assignedEditorId);

                              const isClientChangeTask =
                                task.designStatus === 'Changes from Client' ||
                                task.videoStatus === 'Video Changes Required' ||
                                task.contentStatus === 'Content Changes Required';

                              return (
                                <tr
                                  key={task.id}
                                  onClick={() => onSelectTask(task.id)}
                                  className={`hover:bg-slate-800/60 cursor-pointer transition-colors ${
                                    isClientChangeTask ? 'bg-amber-950/20' : ''
                                  }`}
                                >
                                  {/* Task Name */}
                                  <td className="p-3">
                                    <div className="font-bold text-white flex items-center space-x-2">
                                      <span>{task.taskName}</span>
                                      {isClientChangeTask && (
                                        <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 text-[9px] font-bold rounded border border-amber-500/30">
                                          Client Feedback
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{task.campaignName}</p>
                                  </td>

                                  {/* Deliverable Type */}
                                  <td className="p-3 font-semibold text-slate-300">
                                    <div className="flex items-center space-x-1.5">
                                      {task.taskType.includes('Video') ? (
                                        <Video className="w-3.5 h-3.5 text-purple-400" />
                                      ) : task.taskType.includes('Content') ? (
                                        <FileText className="w-3.5 h-3.5 text-sky-400" />
                                      ) : (
                                        <Image className="w-3.5 h-3.5 text-emerald-400" />
                                      )}
                                      <span>{task.taskType}</span>
                                    </div>
                                  </td>

                                  {/* Assigned Staff */}
                                  <td className="p-3">
                                    <div className="flex items-center space-x-1">
                                      {taskWriter && (
                                        <span className="px-2 py-0.5 bg-sky-950 text-sky-300 rounded text-[10px] font-semibold border border-sky-800">
                                          W: {taskWriter.name.split(' ')[0]}
                                        </span>
                                      )}
                                      {taskDesigner && (
                                        <span className="px-2 py-0.5 bg-purple-950 text-purple-300 rounded text-[10px] font-semibold border border-purple-800">
                                          D: {taskDesigner.name.split(' ')[0]}
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {/* Due Date */}
                                  <td className="p-3 font-mono text-slate-400">
                                    <div className="flex items-center space-x-1">
                                      <Clock className="w-3 h-3 text-slate-500" />
                                      <span>{task.dueDate}</span>
                                    </div>
                                  </td>

                                  {/* Status Badge */}
                                  <td className="p-3">
                                    <span
                                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                                        task.generalStatus === 'Completed' || task.publishingStatus === 'Uploaded / Posted'
                                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                          : isClientChangeTask
                                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                      }`}
                                    >
                                      {task.generalStatus === 'Completed'
                                        ? 'Completed'
                                        : isClientChangeTask
                                        ? 'Changes Required'
                                        : task.contentStatus || task.designStatus || 'In Progress'}
                                    </span>
                                  </td>

                                  {/* Quick Stage Update */}
                                  <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                                    <select
                                      value={
                                        task.generalStatus === 'Completed'
                                          ? 'COMPLETED'
                                          : task.publishingStatus === 'Ready to Upload'
                                          ? 'READY_UPLOAD'
                                          : task.contentStatus === 'Content Sent for Approval' || task.designStatus === 'Creative Sent for Approval'
                                          ? 'APPROVAL'
                                          : task.designStatus === 'In Design'
                                          ? 'DESIGN_EDITING'
                                          : 'AWAITING'
                                      }
                                      onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                                      className="bg-slate-800 text-white text-[10px] font-bold py-1 px-2 rounded-lg border border-slate-700 focus:outline-none cursor-pointer hover:border-blue-500"
                                    >
                                      <option value="AWAITING">Backlog</option>
                                      <option value="WRITING">Writing</option>
                                      <option value="DESIGN_EDITING">Design</option>
                                      <option value="APPROVAL">Review</option>
                                      <option value="READY_UPLOAD">Ready</option>
                                      <option value="COMPLETED">Done</option>
                                    </select>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Assign Team Modal */}
      {selectedProjectIdForAssign && isAdminOrPM && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-slate-800 overflow-hidden">
            <div className="bg-slate-800/90 text-white p-5 flex justify-between items-center border-b border-slate-700/80">
              <h3 className="font-bold text-base flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-blue-400" />
                <span>Assign Project Team</span>
              </h3>
              <button
                onClick={() => setSelectedProjectIdForAssign(null)}
                className="text-slate-400 hover:text-white p-1 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAssign} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Content Writer</label>
                <select
                  value={writerId}
                  onChange={(e) => setWriterId(e.target.value)}
                  className="w-full bg-slate-800 text-white p-2.5 border border-slate-700 rounded-xl font-semibold focus:border-blue-500"
                >
                  <option value="">Select Writer</option>
                  {users
                    .filter((u) => u.role === 'CONTENT_WRITER')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} {isUserOnLeave(u.id) ? '(On Leave)' : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Graphic Designer</label>
                <select
                  value={designerId}
                  onChange={(e) => setDesignerId(e.target.value)}
                  className="w-full bg-slate-800 text-white p-2.5 border border-slate-700 rounded-xl font-semibold focus:border-blue-500"
                >
                  <option value="">Select Designer</option>
                  {users
                    .filter((u) => u.role === 'GRAPHIC_DESIGNER')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} {isUserOnLeave(u.id) ? '(On Leave)' : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Video Editor</label>
                <select
                  value={editorId}
                  onChange={(e) => setEditorId(e.target.value)}
                  className="w-full bg-slate-800 text-white p-2.5 border border-slate-700 rounded-xl font-semibold focus:border-blue-500"
                >
                  <option value="">Select Editor</option>
                  {users
                    .filter((u) => u.role === 'VIDEO_EDITOR')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} {isUserOnLeave(u.id) ? '(On Leave)' : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Social Media Manager</label>
                <select
                  value={smmId}
                  onChange={(e) => setSmmId(e.target.value)}
                  className="w-full bg-slate-800 text-white p-2.5 border border-slate-700 rounded-xl font-semibold focus:border-blue-500"
                >
                  <option value="">Select SMM</option>
                  {users
                    .filter((u) => u.role === 'SOCIAL_MEDIA_MANAGER')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} {isUserOnLeave(u.id) ? '(On Leave)' : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedProjectIdForAssign(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Save Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
