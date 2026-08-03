import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { Task, SocialPlatform } from '../../types/crm';
import {
  X,
  FileText,
  Share2,
  CheckCircle,
  AlertTriangle,
  Clock,
  Send,
  MessageSquare,
  DollarSign,
  UserCheck,
  History,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { WhatsAppShareModal } from '../common/WhatsAppModal';

interface TaskDetailModalProps {
  taskId: string;
  onClose: () => void;
  onOpenWhatsAppGenerator?: () => void;
}


export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  taskId,
  onClose,
  onOpenWhatsAppGenerator,
}) => {
  const {
    tasks,
    projects,
    users,
    currentUser,
    currentRole,
    startContentWriting,
    saveContentDraft,
    sendContentForApproval,
    approveContent,
    requestContentChanges,
    startDesignOrEditing,
    sendCreativeForApproval,
    approveCreativeInternal,
    addClientFeedback,
    approveCreativeFinal,
    schedulePost,
    markAsUploaded,
    markTaskDone,
    reassignTask,
    grantPaymentOverride,
  } = useCRM();

  const task = tasks.find((t) => t.id === taskId);
  const [activeTab, setActiveTab] = useState<'CONTENT' | 'WHATSAPP' | 'FEEDBACK' | 'PUBLISHING' | 'LOGS'>('CONTENT');

  // WhatsApp modal state
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  // Content Editor Fields
  const [title, setTitle] = useState(task?.content?.title || '');
  const [headline, setHeadline] = useState(task?.content?.headline || '');
  const [mainCaption, setMainCaption] = useState(task?.content?.mainCaption || '');
  const [cta, setCta] = useState(task?.content?.cta || '');
  const [hashtags, setHashtags] = useState(task?.content?.hashtags || '');
  const [visualDirection, setVisualDirection] = useState(task?.content?.visualDirection || '');
  const [internalNotes, setInternalNotes] = useState(task?.content?.internalNotes || '');

  // Content Changes instructions modal
  const [showChangesInput, setShowChangesInput] = useState(false);
  const [contentInstructions, setContentInstructions] = useState('');

  // Client Feedback Form State
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackFrom, setFeedbackFrom] = useState(task?.clientName || '');
  const [feedbackText, setFeedbackText] = useState('');
  const [requiredChanges, setRequiredChanges] = useState('');

  // SMM Upload Form State
  const [platform, setPlatform] = useState<SocialPlatform>('Instagram');
  const [postUrl, setPostUrl] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduledTime, setScheduledTime] = useState('06:00 PM');

  if (!task) return null;

  const project = projects.find((p) => p.id === task.projectId);
  const writer = users.find((u) => u.id === task.assignedWriterId);
  const designer = users.find((u) => u.id === task.assignedDesignerId);
  const editor = users.find((u) => u.id === task.assignedEditorId);
  const smm = users.find((u) => u.id === task.assignedSmmId);

  const isVideo = task.taskType === 'Video Shoot' || task.taskType === 'Video Editing' || task.taskType === 'Reel';

  const handleSaveDraft = () => {
    saveContentDraft(task.id, {
      title,
      headline,
      mainCaption,
      cta,
      hashtags,
      visualDirection,
      internalNotes,
    });
  };

  const handleSendApproval = () => {
    sendContentForApproval(task.id, {
      title,
      headline,
      mainCaption,
      cta,
      hashtags,
      visualDirection,
      internalNotes,
    });
  };

  const handleSendClientFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    addClientFeedback(task.id, {
      feedbackReceivedFrom: feedbackFrom,
      feedbackDate: new Date().toISOString().split('T')[0],
      feedbackTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      clientFeedbackText: feedbackText,
      requiredChanges: requiredChanges || feedbackText,
      priority: task.priority,
    });
    setShowFeedbackForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 border-b border-slate-800 flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold rounded uppercase border border-indigo-500/30">
                {task.taskType}
              </span>
              <span className="text-xs text-slate-400 font-semibold">{task.clientName}</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">{task.taskName}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Campaign: {task.campaignName} • Due: {task.dueDate}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Statuses Strip */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 px-6 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-500">Statuses:</span>
            <span className="px-2.5 py-1 bg-purple-50 text-purple-700 font-bold rounded-full border border-purple-200">
              {task.contentStatus}
            </span>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-full border border-emerald-200">
              {task.designStatus || task.videoStatus || 'Pending Design'}
            </span>
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-full border border-indigo-200">
              {task.publishingStatus || 'Not Published'}
            </span>
          </div>

          {/* Payment Gate status */}
          {project && (project.financials?.pendingAmount ?? 0) > 0 ? (
            <div className="flex items-center space-x-2 text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200 font-bold text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Pending ₹{(project.financials?.pendingAmount ?? 0).toLocaleString('en-IN')}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-bold text-[11px]">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Fully Paid</span>
            </div>
          )}
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-6 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('CONTENT')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'CONTENT'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Content Editor</span>
          </button>

          <button
            onClick={() => setActiveTab('WHATSAPP')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'WHATSAPP'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp File Sharing ({task.whatsappShares.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('FEEDBACK')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'FEEDBACK'
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Client Feedback ({task.clientFeedbacks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('PUBLISHING')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'PUBLISHING'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>SMM Publishing Queue</span>
          </button>

          <button
            onClick={() => setActiveTab('LOGS')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'LOGS'
                ? 'border-slate-800 text-slate-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Activity Trail</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: CONTENT EDITOR */}
          {activeTab === 'CONTENT' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 text-xs">
                <span className="font-bold text-indigo-900">
                  Status: {task.contentStatus}
                </span>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => startContentWriting(task.id)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs"
                  >
                    Start Writing
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg text-xs"
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    onClick={handleSendApproval}
                    className="px-3.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs shadow-sm"
                  >
                    Send for Approval
                  </button>
                </div>
              </div>

              {/* Approval controls for SMM/PM/Admin */}
              {task.contentStatus === 'Content Sent for Approval' && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-3">
                  <span className="font-bold text-xs text-purple-950 block">
                    SMM / PM Content Approval Action Required:
                  </span>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => approveContent(task.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md"
                    >
                      Approve Content & Move to Designer
                    </button>
                    <button
                      onClick={() => setShowChangesInput(!showChangesInput)}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md"
                    >
                      Request Content Changes
                    </button>
                  </div>

                  {showChangesInput && (
                    <div className="pt-2 space-y-2">
                      <textarea
                        rows={2}
                        value={contentInstructions}
                        onChange={(e) => setContentInstructions(e.target.value)}
                        placeholder="Provide change instructions for writer..."
                        className="w-full p-2 border border-amber-300 rounded-xl text-xs"
                      />
                      <button
                        onClick={() => {
                          requestContentChanges(task.id, contentInstructions);
                          setShowChangesInput(false);
                        }}
                        className="px-3 py-1.5 bg-amber-700 text-white font-bold text-xs rounded-lg"
                      >
                        Submit Change Instructions
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Content Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Monsoon Special Offer Post"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Headline / Banner Text</label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g. ચોમાસામાં ઘર માટે ખાસ ડિસ્કાઉન્ટ ઓફર!"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Multi-line Gujarati & English preserve */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Main Content / Caption (Gujarati & English whitespace & line breaks preserved) *
                </label>
                <textarea
                  rows={6}
                  value={mainCaption}
                  onChange={(e) => setMainCaption(e.target.value)}
                  placeholder="અહીં ગુજરાતી અને ઈંગ્લીશ કેપ્શન લખો..."
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs font-sans whitespace-pre-wrap leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Call To Action (CTA)</label>
                  <input
                    type="text"
                    value={cta}
                    onChange={(e) => setCta(e.target.value)}
                    placeholder="e.g. Visit Store Today / Order Now"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hashtags</label>
                  <input
                    type="text"
                    value={hashtags}
                    onChange={(e) => setHashtags(e.target.value)}
                    placeholder="#ABCCompany #MonsoonOffer #Ahmedabad"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Visual Direction for Designer / Editor</label>
                <input
                  type="text"
                  value={visualDirection}
                  onChange={(e) => setVisualDirection(e.target.value)}
                  placeholder="Clean blue background with umbrella or rain drops motif..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                />
              </div>
            </div>
          )}

          {/* TAB 2: WHATSAPP FILE SHARING */}
          {activeTab === 'WHATSAPP' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h4 className="font-bold text-emerald-950 text-sm">WhatsApp File Sharing Confirmation</h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    No files are uploaded into CRM! Confirm creatives shared directly on WhatsApp.
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => startDesignOrEditing(task.id)}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm"
                  >
                    Start {isVideo ? 'Editing' : 'Design'}
                  </button>
                  <button
                    onClick={() => setShowWhatsAppModal(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-1.5"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Confirm Share on WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Submit for Creative Approval button */}
              <div className="flex justify-end">
                <button
                  onClick={() => sendCreativeForApproval(task.id)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  Send Creative for Approval
                </button>
              </div>

              {/* History Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-50 p-3 font-bold text-xs text-slate-800 border-b border-slate-200">
                  WhatsApp Sharing Records History ({task.whatsappShares.length})
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/70 text-slate-500 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="p-3">Version</th>
                        <th className="p-3">Shared By</th>
                        <th className="p-3">Shared With</th>
                        <th className="p-3">WA Number / Group</th>
                        <th className="p-3">Date & Time</th>
                        <th className="p-3">Share Type</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {task.whatsappShares.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-400 text-xs">
                            No WhatsApp share records logged yet.
                          </td>
                        </tr>
                      ) : (
                        task.whatsappShares.map((rec) => (
                          <tr key={rec.id} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-emerald-700">{rec.version}</td>
                            <td className="p-3 font-medium text-slate-800">{rec.sharedByName}</td>
                            <td className="p-3 font-semibold text-slate-900">{rec.sharedWith}</td>
                            <td className="p-3 text-slate-600">{rec.whatsappNumberOrGroup}</td>
                            <td className="p-3 text-slate-500">{rec.sharedDate} at {rec.sharedTime}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded text-[10px]">
                                {rec.shareType}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px]">
                                Confirmed
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CLIENT REVIEW & FEEDBACK */}
          {activeTab === 'FEEDBACK' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h4 className="font-bold text-amber-950 text-sm">Creative Review & WhatsApp Client Feedback</h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Review creative shared on WhatsApp and paste client changes text.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => approveCreativeInternal(task.id)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm"
                  >
                    Internal Approved
                  </button>
                  <button
                    onClick={() => setShowFeedbackForm(!showFeedbackForm)}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm"
                  >
                    + Add Client Feedback
                  </button>
                  <button
                    onClick={() => approveCreativeFinal(task.id)}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md"
                  >
                    Final Approve Creative
                  </button>
                </div>
              </div>

              {/* Form to add feedback */}
              {showFeedbackForm && (
                <form onSubmit={handleSendClientFeedback} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <h5 className="font-bold text-xs text-slate-800">Paste Client Feedback From WhatsApp</h5>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Feedback Received From</label>
                      <input
                        type="text"
                        required
                        value={feedbackFrom}
                        onChange={(e) => setFeedbackFrom(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Required Changes Summary</label>
                      <input
                        type="text"
                        required
                        value={requiredChanges}
                        onChange={(e) => setRequiredChanges(e.target.value)}
                        placeholder="e.g. Increase logo size by 20%"
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Full Feedback Text</label>
                    <textarea
                      rows={3}
                      required
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Paste raw WhatsApp text feedback from client..."
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-xs resize-none"
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowFeedbackForm(false)}
                      className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm"
                    >
                      Send Changes to Creator
                    </button>
                  </div>
                </form>
              )}

              {/* Feedback History Log */}
              <div className="space-y-3">
                <span className="font-bold text-xs text-slate-800 block">Feedback Logs</span>
                {task.clientFeedbacks.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No feedback logged yet.</p>
                ) : (
                  task.clientFeedbacks.map((fb) => (
                    <div key={fb.id} className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1 text-xs">
                      <div className="flex justify-between items-center text-amber-950 font-bold">
                        <span>From: {fb.feedbackReceivedFrom}</span>
                        <span className="text-[10px] text-amber-800">{fb.feedbackDate} at {fb.feedbackTime}</span>
                      </div>
                      <p className="text-amber-900 font-semibold mt-1">Changes: {fb.requiredChanges}</p>
                      <p className="text-slate-600 italic mt-1">"{fb.clientFeedbackText}"</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SMM PUBLISHING QUEUE */}
          {activeTab === 'PUBLISHING' && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-indigo-950 text-sm">Social Media Publishing Controls</h4>
                  <p className="text-xs text-indigo-800 mt-0.5">
                    Schedule or mark post as published to social platforms.
                  </p>
                </div>
                <button
                  onClick={() => markTaskDone(task.id)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  Mark Deliverable Task Done
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Platform</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as SocialPlatform)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="YouTube">YouTube</option>
                    <option value="Google Business">Google Business</option>
                    <option value="WhatsApp Status">WhatsApp Status</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Post URL (After Uploading)</label>
                  <input
                    type="url"
                    value={postUrl}
                    onChange={(e) => setPostUrl(e.target.value)}
                    placeholder="https://instagram.com/p/..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={() => schedulePost(task.id, platform, scheduledDate, scheduledTime)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  Schedule Post ({scheduledDate})
                </button>
                <button
                  onClick={() =>
                    markAsUploaded(
                      task.id,
                      platform,
                      postUrl || 'https://instagram.com/advrixmedia',
                      new Date().toISOString().split('T')[0],
                      new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                    )
                  }
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  Confirm Post Uploaded
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: AUDIT ACTIVITY LOGS */}
          {activeTab === 'LOGS' && (
            <div className="space-y-3">
              <span className="font-bold text-xs text-slate-800 block">Deliverable Audit Trail</span>
              <p className="text-xs text-slate-500">Non-editable, non-deletable history of all actions performed on this task.</p>
              
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                {task.whatsappShares.map((w) => (
                  <div key={w.id} className="p-2.5 bg-white border border-slate-100 rounded-xl flex justify-between">
                    <span>Creative {w.version} shared on WhatsApp with {w.sharedWith}</span>
                    <span className="text-slate-400 text-[10px]">{w.sharedDate}</span>
                  </div>
                ))}
                {task.clientFeedbacks.map((f) => (
                  <div key={f.id} className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl flex justify-between">
                    <span>Feedback received from {f.feedbackReceivedFrom}: {f.requiredChanges}</span>
                    <span className="text-amber-800 text-[10px]">{f.feedbackDate}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Embedded WhatsApp Share Confirmation Modal */}
      {showWhatsAppModal && (
        <WhatsAppShareModal task={task} onClose={() => setShowWhatsAppModal(false)} />
      )}
    </div>
  );
};
