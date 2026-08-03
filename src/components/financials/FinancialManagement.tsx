import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { Project } from '../../types/crm';
import { DollarSign, TrendingUp, AlertTriangle, CheckCircle2, ShieldCheck, CreditCard } from 'lucide-react';

export const FinancialManagement: React.FC = () => {
  const { projects, recordPaymentCollection, grantPaymentOverride, currentUser } = useCRM();

  const [selectedProjectForPay, setSelectedProjectForPay] = useState<Project | null>(null);
  const [collectionAmount, setCollectionAmount] = useState(10000);
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [txnRef, setTxnRef] = useState('UPI/8821/OCT');
  const [collectionNotes, setCollectionNotes] = useState('Balance payment received.');

  // Financial Stats
  const totalBilling = projects.reduce((a, p) => a + (p.financials?.totalPayment ?? p.financials?.totalAgreedAmount ?? 0), 0);
  const totalCollected = projects.reduce((a, p) => a + (p.financials?.advanceReceived ?? 0), 0);
  const totalPending = projects.reduce((a, p) => a + (p.financials?.pendingAmount ?? 0), 0);

  const handleCollect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectForPay) return;

    recordPaymentCollection(selectedProjectForPay.id, collectionAmount, {
      paymentMode,
      txnRef,
      notes: collectionNotes,
    });

    setSelectedProjectForPay(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Financials & Payment Gate Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Client billing schedules, payment collection tracking, advance calculations, and gate overrides
          </p>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Agency Billing</p>
            <p className="text-2xl font-black text-slate-900 mt-1">₹{totalBilling.toLocaleString('en-IN')}</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Advance / Collected</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">₹{totalCollected.toLocaleString('en-IN')}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Pending Collection</p>
            <p className="text-2xl font-black text-rose-600 mt-1">₹{totalPending.toLocaleString('en-IN')}</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Payment Gate Notice */}
      <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs text-indigo-950 font-medium">
        ⚡ <span className="font-bold">Automated Payment Gate Policy:</span> When a deliverable task is marked done, Advrix Media CRM automatically checks if pending payment exists on the project. If pending amount &gt; 0, task completion is locked until payment is collected or Super Admin / PM grants Payment Override!
      </div>

      {/* Financial Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-900">
          Client Financial Accounts Register
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
              <tr>
                <th className="p-3">Client</th>
                <th className="p-3">Campaign</th>
                <th className="p-3">Total Payment</th>
                <th className="p-3">Advance Received</th>
                <th className="p-3">Pending Amount</th>
                <th className="p-3">Due Date</th>
                <th className="p-3">Payment Notes</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((proj) => {
                const pend = proj.financials?.pendingAmount ?? 0;
                const totalPay = proj.financials?.totalPayment ?? proj.financials?.totalAgreedAmount ?? 0;
                const advRec = proj.financials?.advanceReceived ?? 0;

                return (
                  <tr key={proj.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-semibold text-slate-900">{proj.clientName}</td>
                    <td className="p-3 text-indigo-700 font-medium">{proj.campaignName}</td>
                    <td className="p-3 font-bold text-slate-900">₹{totalPay.toLocaleString('en-IN')}</td>
                    <td className="p-3 font-semibold text-emerald-600">₹{advRec.toLocaleString('en-IN')}</td>
                    <td className="p-3 font-black text-rose-600">
                      {pend > 0 ? `₹${pend.toLocaleString('en-IN')}` : '₹0 (Paid)'}
                    </td>
                    <td className="p-3 text-slate-500">{proj.financials?.paymentDueDate || 'N/A'}</td>
                    <td className="p-3 text-slate-600 max-w-xs truncate">{proj.financials?.paymentNotes || '—'}</td>
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        {pend > 0 ? (
                          <>
                            <button
                              onClick={() => {
                                setSelectedProjectForPay(proj);
                                setCollectionAmount(pend);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center space-x-1"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Collect Payment</span>
                            </button>

                            {(currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'PROJECT_MANAGER') && (
                              <button
                                onClick={() => grantPaymentOverride(proj.id, 'Super Admin Override for Urgent Deliverable')}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-[11px] rounded-xl flex items-center space-x-1"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Override Gate</span>
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px] flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Fully Paid</span>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Collection Modal */}
      {selectedProjectForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base">Record Payment Collection</h3>
                <p className="text-xs text-slate-300 mt-0.5">{selectedProjectForPay.clientName}</p>
              </div>
              <button onClick={() => setSelectedProjectForPay(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCollect} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Collection Amount (₹)</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={selectedProjectForPay.financials.pendingAmount}
                  value={collectionAmount}
                  onChange={(e) => setCollectionAmount(parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-sm text-emerald-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Txn / Ref Number</label>
                  <input
                    type="text"
                    value={txnRef}
                    onChange={(e) => setTxnRef(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={collectionNotes}
                  onChange={(e) => setCollectionNotes(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedProjectForPay(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md"
                >
                  Confirm & Update Advance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
