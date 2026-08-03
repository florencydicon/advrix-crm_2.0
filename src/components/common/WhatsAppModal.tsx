import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { Task, WhatsAppShareRecord } from '../../types/crm';
import { MessageSquare, Copy, ExternalLink, Check, X, Send, Share2, Phone } from 'lucide-react';

interface WhatsAppShareModalProps {
  task: Task;
  onClose: () => void;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({ task, onClose }) => {
  const { currentUser, recordWhatsAppShare, sendToClientReview } = useCRM();

  const isClientShare = task.designStatus === 'Internal Approved';

  const [sharedWith, setSharedWith] = useState(
    isClientShare ? task.clientName : task.smmUpload?.postedBy || 'Priya Desai (SMM)'
  );
  const [whatsappNumberOrGroup, setWhatsappNumberOrGroup] = useState('+91 98250 11223');
  const [version, setVersion] = useState(`V${(task.whatsappShares.length || 0) + 1}`);
  const [shareType, setShareType] = useState<WhatsAppShareRecord['shareType']>(
    isClientShare ? 'Client' : 'Social Media Manager'
  );
  const [messageOrNote, setMessageOrNote] = useState(
    `Creative ${version} update sent on WhatsApp for review.`
  );
  const [isConfirmed, setIsConfirmed] = useState(false);

  const currentDateStr = new Date().toISOString().split('T')[0];
  const currentTimeStr = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;

    const shareData = {
      version,
      sharedBy: currentUser.id,
      sharedByName: currentUser.name,
      sharedWith,
      whatsappNumberOrGroup,
      sharedDate: currentDateStr,
      sharedTime: currentTimeStr,
      shareType,
      messageOrNote,
    };

    if (isClientShare) {
      sendToClientReview(task.id, shareData);
    } else {
      recordWhatsAppShare(task.id, shareData);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full border border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-2xl backdrop-blur-md">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-100">
                WhatsApp Notification Confirmation
              </span>
              <h3 className="text-base font-bold text-white">{task.taskName} ({task.clientName})</h3>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-xl cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Shared With (Recipient)
              </label>
              <input
                type="text"
                required
                value={sharedWith}
                onChange={(e) => setSharedWith(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="e.g. Priya (SMM) or Client Group"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                WhatsApp Number / Group
              </label>
              <input
                type="text"
                required
                value={whatsappNumberOrGroup}
                onChange={(e) => setWhatsappNumberOrGroup(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="e.g. +91 98250 11223"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Version Number
              </label>
              <input
                type="text"
                required
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Share Date
              </label>
              <input
                type="text"
                disabled
                value={currentDateStr}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Share Time
              </label>
              <input
                type="text"
                disabled
                value={currentTimeStr}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Share Type
            </label>
            <select
              value={shareType}
              onChange={(e) => setShareType(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="Internal Team">Internal Team</option>
              <option value="Social Media Manager">Social Media Manager</option>
              <option value="Project Manager">Project Manager</option>
              <option value="Client">Client</option>
              <option value="Client Group">Client Group</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Message / Notes
            </label>
            <textarea
              rows={2}
              value={messageOrNote}
              onChange={(e) => setMessageOrNote(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
              placeholder="Add optional remarks about the update sent on WhatsApp..."
            />
          </div>

          {/* Mandatory Checkbox */}
          <div className="p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-2xl flex items-start space-x-3">
            <input
              type="checkbox"
              id="confirmShareCheckbox"
              checked={isConfirmed}
              onChange={(e) => setIsConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-emerald-500 rounded bg-slate-800 border-slate-700 cursor-pointer"
            />
            <label htmlFor="confirmShareCheckbox" className="text-xs font-semibold text-emerald-200 cursor-pointer">
              I confirm that the update has been communicated through WhatsApp with {sharedWith || 'the recipient'}.
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isConfirmed}
              className={`px-5 py-2 font-semibold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer ${
                isConfirmed
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Confirm WhatsApp Log</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const WhatsAppGeneratorModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { clients, tasks } = useCRM();

  const [selectedTaskId, setSelectedTaskId] = useState(tasks[0]?.id || '');
  const [recipientPhone, setRecipientPhone] = useState('+91 98250 11223');
  const [copied, setCopied] = useState(false);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  const generatedText = selectedTask
    ? `Hello, ${selectedTask.taskName} for ${selectedTask.clientName} (Version V1) has been updated on WhatsApp for review. Please check and update approval or changes in Advrix CRM.`
    : `Hello, please check the latest creative updates for your project in Advrix CRM.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const cleanNumber = recipientPhone.replace(/[^0-9]/g, '');
    const encodedMsg = encodeURIComponent(generatedText);
    window.open(`https://wa.me/${cleanNumber}?text=${encodedMsg}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full border border-slate-800 overflow-hidden">
        
        <div className="bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/20 rounded-2xl text-emerald-400 border border-emerald-500/30">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Helper Tool</span>
              <h3 className="text-base font-bold text-white">WhatsApp Message Generator</h3>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-xl cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Select Deliverable Task
            </label>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.clientName} - {t.taskName} ({t.generalStatus})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Recipient Phone Number
            </label>
            <input
              type="text"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Generated Notification Message
            </label>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-300 leading-relaxed font-mono">
              {generatedText}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Message'}</span>
            </button>
            <button
              onClick={handleOpenWhatsApp}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
