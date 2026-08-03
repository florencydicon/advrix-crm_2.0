import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { Client } from '../../types/crm';
import { Users, PlusCircle, Trash2, Phone, Mail, MessageSquare, AlertTriangle, Briefcase } from 'lucide-react';

interface ClientsManagementProps {
  onOpenAddWork?: () => void;
}

export const ClientsManagement: React.FC<ClientsManagementProps> = ({ onOpenAddWork }) => {
  const { clients, projects, requestDeleteClient, currentUser, currentRole } = useCRM();

  const [deleteReasonModal, setDeleteReasonModal] = useState<string | null>(null);
  const [deleteReasonText, setDeleteReasonText] = useState('Client contract terminated');

  const isStaffRole =
    currentRole === 'GRAPHIC_DESIGNER' ||
    currentRole === 'VIDEO_EDITOR' ||
    currentRole === 'CONTENT_WRITER' ||
    currentRole === 'SOCIAL_MEDIA_MANAGER';

  const canAddOrDelete = currentRole === 'SUPER_ADMIN' || currentRole === 'PROJECT_MANAGER' || currentRole === 'SALES_REP';

  const handleRequestDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteReasonModal) return;
    requestDeleteClient(deleteReasonModal, deleteReasonText);
    setDeleteReasonModal(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span>Clients Directory</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isStaffRole
              ? 'View client names and active campaign projects assigned to your team'
              : 'Active client accounts, contact details, WhatsApp channels, and financial overview'}
          </p>
        </div>

        {canAddOrDelete && onOpenAddWork && (
          <button
            onClick={onOpenAddWork}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Client & Work</span>
          </button>
        )}
      </div>

      {/* Clients Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((c) => {
          const clientProjects = projects.filter((p) => p.clientId === c.id);
          const activeProjectsCount = clientProjects.filter((p) => p.status === 'In Progress' || p.status === 'Work in Progress').length;
          const totalPending = clientProjects.reduce((a, p) => a + (p.financials?.pendingAmount ?? 0), 0);

          return (
            <div
              key={c.id}
              className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-white text-base flex items-center space-x-2">
                      <span>{c.companyName}</span>
                    </h3>
                    {!isStaffRole && c.contactPerson && (
                      <p className="text-xs text-slate-400 font-medium mt-0.5">{c.contactPerson}</p>
                    )}
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      c.status === 'PENDING_DELETE'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {c.status === 'PENDING_DELETE' ? 'Pending Delete' : 'Active Account'}
                  </span>
                </div>

                {/* Show Contact details only for Admin/PM/Sales */}
                {!isStaffRole ? (
                  <div className="space-y-1.5 text-xs text-slate-300 bg-slate-800/60 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center space-x-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{c.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="font-semibold text-emerald-300">WhatsApp: {c.whatsappNumber || c.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{c.email || 'No email saved'}</span>
                    </div>
                  </div>
                ) : null}

                {/* Active Projects Summary */}
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-semibold flex items-center space-x-1">
                      <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                      <span>Active Campaigns</span>
                    </span>
                    <span className="font-black text-blue-400">{activeProjectsCount}</span>
                  </div>

                  {clientProjects.length > 0 && (
                    <div className="pt-2 border-t border-slate-700/60 space-y-1">
                      {clientProjects.slice(0, 3).map((proj) => (
                        <div key={proj.id} className="text-[11px] flex justify-between text-slate-300">
                          <span className="truncate max-w-[180px] font-medium">{proj.name}</span>
                          <span className="text-slate-400 text-[10px]">{proj.packageType}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {!isStaffRole && (
                    <div className="pt-2 border-t border-slate-700/60 flex justify-between text-xs">
                      <span className="text-slate-400 font-semibold">Pending Due</span>
                      <span className="font-bold text-rose-400">₹{totalPending.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons - Only for Admin / PM / Sales */}
              {canAddOrDelete && (
                <div className="flex items-center space-x-2 pt-2 border-t border-slate-800">
                  {onOpenAddWork && (
                    <button
                      onClick={onOpenAddWork}
                      className="flex-1 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-bold text-xs rounded-xl border border-blue-500/30 transition-all cursor-pointer"
                    >
                      + Add Project
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteReasonModal(c.id)}
                    className="p-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold rounded-xl border border-rose-500/30 cursor-pointer"
                    title="Request Client Deletion"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete Request Modal */}
      {deleteReasonModal && canAddOrDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-slate-800 overflow-hidden text-white">
            <div className="bg-slate-800 p-5 flex justify-between items-center border-b border-slate-700">
              <h3 className="font-bold text-base">Request Client Deletion</h3>
              <button onClick={() => setDeleteReasonModal(null)} className="text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleRequestDelete} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300">
                ⚠️ <span className="font-bold">Security Policy:</span> Deletion requests are submitted to Super Admin for approval.
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Reason for Deletion / Archival *</label>
                <textarea
                  rows={3}
                  required
                  value={deleteReasonText}
                  onChange={(e) => setDeleteReasonText(e.target.value)}
                  placeholder="Explain why this client should be removed..."
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setDeleteReasonModal(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Submit Deletion Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
