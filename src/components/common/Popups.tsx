import React from 'react';
import { useCRM } from '../../context/CRMContext';
import { CheckCircle, AlertTriangle, HelpCircle, DollarSign, X } from 'lucide-react';

export const Popups: React.FC = () => {
  const { systemModal, closeModal } = useCRM();

  if (!systemModal || !systemModal.isOpen) return null;

  const {
    type,
    title,
    message,
    confirmLabel,
    cancelLabel,
    onConfirm,
    onCancel,
    pendingAmount,
    clientName,
  } = systemModal;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    closeModal();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    closeModal();
  };

  if (type === 'PAYMENT_GATE') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-amber-200 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white flex justify-between items-start">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xs font-semibold tracking-wider uppercase text-amber-100">
                  Payment Gate Alert
                </span>
                <h3 className="text-xl font-bold text-white">{title}</h3>
              </div>
            </div>
            <button
              onClick={closeModal}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-sm leading-relaxed">
              <p className="font-semibold text-amber-950">
                ₹{(pendingAmount ?? 0).toLocaleString('en-IN')} is still pending for {clientName}.
              </p>
              <p className="mt-1 text-amber-800">
                Confirm permission before final delivery. Standard policy requires full payment or explicit Admin override.
              </p>
            </div>

            <div className="flex flex-col space-y-2 pt-2">
              <button
                onClick={handleConfirm}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold rounded-xl shadow-md shadow-amber-500/20 transition-all text-sm"
              >
                Continue with Admin Permission
              </button>
              <button
                onClick={handleCancel}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all text-sm"
              >
                Cancel Delivery
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const iconMap = {
    SUCCESS: <CheckCircle className="w-6 h-6 text-emerald-600" />,
    WARNING: <AlertTriangle className="w-6 h-6 text-amber-600" />,
    CONFIRMATION: <HelpCircle className="w-6 h-6 text-indigo-600" />,
  };

  const headerBgMap = {
    SUCCESS: 'bg-emerald-50 text-emerald-950 border-emerald-200',
    WARNING: 'bg-amber-50 text-amber-950 border-amber-200',
    CONFIRMATION: 'bg-indigo-50 text-indigo-950 border-indigo-200',
  };

  const buttonBgMap = {
    SUCCESS: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20',
    WARNING: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20',
    CONFIRMATION: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
        <div className={`p-5 border-b flex items-center justify-between ${headerBgMap[type as keyof typeof headerBgMap]}`}>
          <div className="flex items-center space-x-3">
            {iconMap[type as keyof typeof iconMap]}
            <h3 className="text-lg font-bold">{title}</h3>
          </div>
          <button
            onClick={closeModal}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-slate-700 text-sm leading-relaxed">{message}</p>

          <div className="flex items-center justify-end space-x-3 pt-3">
            {(type === 'CONFIRMATION' || cancelLabel) && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-xl transition-all"
              >
                {cancelLabel || 'Cancel'}
              </button>
            )}
            <button
              onClick={handleConfirm}
              className={`px-5 py-2 font-semibold text-sm rounded-xl shadow-md transition-all ${
                buttonBgMap[type as keyof typeof buttonBgMap]
              }`}
            >
              {confirmLabel || 'OK'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
