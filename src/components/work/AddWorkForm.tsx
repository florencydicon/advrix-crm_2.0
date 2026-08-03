import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { WorkType, Priority, DeliverableQuantity } from '../../types/crm';
import { PlusCircle, Sparkles, ShieldAlert, Lock } from 'lucide-react';

interface AddWorkFormProps {
  onSuccess: () => void;
}

export const AddWorkForm: React.FC<AddWorkFormProps> = ({ onSuccess }) => {
  const { clients, addClient, addProjectAndTasks, currentUser, currentRole } = useCRM();

  // Role Restriction: Only Sales Rep & Super Admin can add projects
  if (currentRole !== 'SALES_REP' && currentRole !== 'SUPER_ADMIN') {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-4 shadow-2xl">
        <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/20">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Project Creation Restricted</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          Adding new projects and client deliverables is strictly restricted to <span className="text-emerald-400 font-semibold">Sales Representatives</span> and <span className="text-blue-400 font-semibold">Super Admin</span> accounts.
        </p>
        <div className="pt-2">
          <span className="px-3 py-1 bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-xl font-mono">
            Current Role: {currentRole}
          </span>
        </div>
      </div>
    );
  }

  // Section 1: Client Information
  const [isExistingClient, setIsExistingClient] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');

  // New Client Fields
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [remarks, setRemarks] = useState('');

  // Section 2: Project Information
  const [campaignName, setCampaignName] = useState('');
  const [workType, setWorkType] = useState<WorkType>('Social Media Management');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [priority, setPriority] = useState<Priority>('High');
  const [isMonthlyRetainer, setIsMonthlyRetainer] = useState(false);
  const [shortProjectNote, setShortProjectNote] = useState('');

  // Section 3: Deliverables
  const [staticPostsQty, setStaticPostsQty] = useState(5);
  const [reelsQty, setReelsQty] = useState(2);
  const [storiesQty, setStoriesQty] = useState(3);
  const [videoShootQty, setVideoShootQty] = useState(0);
  const [videoEditingQty, setVideoEditingQty] = useState(0);
  const [bannerQty, setBannerQty] = useState(0);
  const [contentWritingQty, setContentWritingQty] = useState(0);

  // Custom Design Fields
  const [customDesignEnabled, setCustomDesignEnabled] = useState(false);
  const [customDesignName, setCustomDesignName] = useState('');
  const [customDesignQty, setCustomDesignQty] = useState(1);
  const [customShortBrief, setCustomShortBrief] = useState('');

  // Section 4: Financial Details
  const [totalPayment, setTotalPayment] = useState(65000);
  const [advanceReceived, setAdvanceReceived] = useState(40000);
  const [paymentDueDate, setPaymentDueDate] = useState(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [paymentNotes, setPaymentNotes] = useState('50% advance received via UPI.');

  const pendingAmount = Math.max(0, totalPayment - advanceReceived);

  // Auto task list preview
  const generateDeliverablesList = (): DeliverableQuantity[] => {
    const list: DeliverableQuantity[] = [];
    if (staticPostsQty > 0) list.push({ type: 'Static Post', quantity: staticPostsQty });
    if (reelsQty > 0) list.push({ type: 'Reel', quantity: reelsQty });
    if (storiesQty > 0) list.push({ type: 'Story', quantity: storiesQty });
    if (videoShootQty > 0) list.push({ type: 'Video Shoot', quantity: videoShootQty });
    if (videoEditingQty > 0) list.push({ type: 'Video Editing', quantity: videoEditingQty });
    if (bannerQty > 0) list.push({ type: 'Banner', quantity: bannerQty });
    if (contentWritingQty > 0) list.push({ type: 'Content Writing', quantity: contentWritingQty });
    if (customDesignEnabled && customDesignQty > 0) {
      list.push({
        type: 'Custom Design',
        quantity: customDesignQty,
        customDesignName,
        customShortBrief,
      });
    }
    return list;
  };

  const deliverables = generateDeliverablesList();
  const totalTaskCount = deliverables.reduce((a, b) => a + b.quantity, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let targetClientId = selectedClientId;
    let targetClientName = '';

    if (!isExistingClient) {
      const created = addClient({
        companyName,
        contactPerson,
        phone,
        whatsappNumber: whatsappNumber || phone,
        email,
        remarks,
      });
      targetClientId = created.id;
      targetClientName = created.companyName;
    } else {
      const found = clients.find((c) => c.id === selectedClientId);
      targetClientName = found?.companyName || 'Client';
    }

    addProjectAndTasks({
      clientId: targetClientId,
      clientName: targetClientName,
      campaignName: campaignName || `${targetClientName} Campaign`,
      workType,
      startDate,
      dueDate,
      priority,
      isMonthlyRetainer,
      retainerStartDate: isMonthlyRetainer ? startDate : undefined,
      retainerTaskGenerationDate: isMonthlyRetainer ? startDate : undefined,
      shortNote: shortProjectNote,
      deliverables,
      financials: {
        totalPayment,
        advanceReceived,
        pendingAmount,
        paymentDueDate,
        paymentNotes,
        isFullyPaid: pendingAmount === 0,
      },
      createdBy: currentUser.id,
    });

    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="bg-gradient-to-r from-emerald-600 to-indigo-700 text-white p-6 rounded-3xl shadow-xl">
        <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-md">
          Add Work Flow (/add-work)
        </span>
        <h1 className="text-xl sm:text-2xl font-black mt-1">Create Project & Automatic Deliverables</h1>
        <p className="text-xs text-emerald-100">
          Enter client details, project requirements, deliverable quantities, and financial schedule.
        </p>
      </div>

      {/* Section 1: Client Information */}
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h2 className="font-bold text-white text-base flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 font-black text-xs flex items-center justify-center border border-indigo-500/30">1</span>
            <span>Client Information</span>
          </h2>

          <div className="flex bg-slate-800 p-1 rounded-xl text-xs font-semibold border border-slate-700">
            <button
              type="button"
              onClick={() => setIsExistingClient(true)}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                isExistingClient ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'
              }`}
            >
              Existing Client
            </button>
            <button
              type="button"
              onClick={() => setIsExistingClient(false)}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                !isExistingClient ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'
              }`}
            >
              + New Client
            </button>
          </div>
        </div>

        {isExistingClient ? (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Select Client
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName} ({c.contactPerson} - {c.phone})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Client / Company Name *
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Royal Sweets & Foods"
                className="w-full p-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Contact Person Name
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Rajesh Sweetwala"
                className="w-full p-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Phone Number *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98250 11223"
                className="w-full p-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                WhatsApp Number
              </label>
              <input
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+91 98250 11223"
                className="w-full p-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@royalsweets.com"
                className="w-full p-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Internal Remarks
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional notes about client background..."
                className="w-full p-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Project Information */}
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <h2 className="font-bold text-white text-base border-b border-slate-800 pb-3 flex items-center space-x-2">
          <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 font-black text-xs flex items-center justify-center border border-indigo-500/30">2</span>
          <span>Project Information</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Project / Campaign Name *
            </label>
            <input
              type="text"
              required
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g. Festive Brand Campaign"
              className="w-full p-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Work Type
            </label>
            <select
              value={workType}
              onChange={(e) => setWorkType(e.target.value as WorkType)}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="Social Media Management">Social Media Management</option>
              <option value="Branding">Branding</option>
              <option value="Video Production">Video Production</option>
              <option value="Print Design">Print Design</option>
              <option value="Packaging">Packaging</option>
              <option value="Custom Design">Custom Design</option>
              <option value="Content Writing">Content Writing</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          <div className="flex items-center space-x-3 pt-5">
            <input
              type="checkbox"
              id="retainerToggle"
              checked={isMonthlyRetainer}
              onChange={(e) => setIsMonthlyRetainer(e.target.checked)}
              className="w-4 h-4 text-indigo-600 bg-slate-800 border-slate-700 rounded focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="retainerToggle" className="text-xs font-bold text-slate-200 cursor-pointer">
              Monthly Retainer Toggle (Auto recurring tasks)
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Short Project Note
          </label>
          <textarea
            rows={2}
            value={shortProjectNote}
            onChange={(e) => setShortProjectNote(e.target.value)}
            placeholder="Brief goals, theme notes, or focus area..."
            className="w-full p-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
          />
        </div>
      </div>

      {/* Section 3: Deliverables */}
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h2 className="font-bold text-white text-base flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 font-black text-xs flex items-center justify-center border border-indigo-500/30">3</span>
            <span>Deliverables Selection</span>
          </h2>
          <span className="text-xs font-bold bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30">
            Total Deliverable Tasks: {totalTaskCount}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl space-y-1">
            <span className="font-bold text-slate-200 block">Static Posts</span>
            <input
              type="number"
              min={0}
              value={staticPostsQty}
              onChange={(e) => setStaticPostsQty(parseInt(e.target.value) || 0)}
              className="w-full p-2 bg-slate-900 border border-slate-700 text-white rounded-lg font-bold text-sm"
            />
          </div>

          <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl space-y-1">
            <span className="font-bold text-slate-200 block">Reels</span>
            <input
              type="number"
              min={0}
              value={reelsQty}
              onChange={(e) => setReelsQty(parseInt(e.target.value) || 0)}
              className="w-full p-2 bg-slate-900 border border-slate-700 text-white rounded-lg font-bold text-sm"
            />
          </div>

          <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl space-y-1">
            <span className="font-bold text-slate-200 block">Stories</span>
            <input
              type="number"
              min={0}
              value={storiesQty}
              onChange={(e) => setStoriesQty(parseInt(e.target.value) || 0)}
              className="w-full p-2 bg-slate-900 border border-slate-700 text-white rounded-lg font-bold text-sm"
            />
          </div>

          <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl space-y-1">
            <span className="font-bold text-slate-200 block">Video Shoot</span>
            <input
              type="number"
              min={0}
              value={videoShootQty}
              onChange={(e) => setVideoShootQty(parseInt(e.target.value) || 0)}
              className="w-full p-2 bg-slate-900 border border-slate-700 text-white rounded-lg font-bold text-sm"
            />
          </div>

          <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl space-y-1">
            <span className="font-bold text-slate-200 block">Video Editing</span>
            <input
              type="number"
              min={0}
              value={videoEditingQty}
              onChange={(e) => setVideoEditingQty(parseInt(e.target.value) || 0)}
              className="w-full p-2 bg-slate-900 border border-slate-700 text-white rounded-lg font-bold text-sm"
            />
          </div>

          <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl space-y-1">
            <span className="font-bold text-slate-200 block">Banner</span>
            <input
              type="number"
              min={0}
              value={bannerQty}
              onChange={(e) => setBannerQty(parseInt(e.target.value) || 0)}
              className="w-full p-2 bg-slate-900 border border-slate-700 text-white rounded-lg font-bold text-sm"
            />
          </div>

          <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl space-y-1 sm:col-span-2">
            <span className="font-bold text-slate-200 block">Content Writing</span>
            <input
              type="number"
              min={0}
              value={contentWritingQty}
              onChange={(e) => setContentWritingQty(parseInt(e.target.value) || 0)}
              className="w-full p-2 bg-slate-900 border border-slate-700 text-white rounded-lg font-bold text-sm"
            />
          </div>
        </div>

        {/* Custom Design Fields */}
        <div className="p-4 bg-indigo-950/40 border border-indigo-800/60 rounded-2xl space-y-3">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="customDesignCheck"
              checked={customDesignEnabled}
              onChange={(e) => setCustomDesignEnabled(e.target.checked)}
              className="w-4 h-4 text-indigo-500 rounded bg-slate-800 border-slate-700"
            />
            <label htmlFor="customDesignCheck" className="text-xs font-bold text-indigo-200 cursor-pointer">
              Add Custom Design Deliverable (e.g. Catalogue Cover, Packaging Mockup)
            </label>
          </div>

          {customDesignEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Design Name</label>
                <input
                  type="text"
                  value={customDesignName}
                  onChange={(e) => setCustomDesignName(e.target.value)}
                  placeholder="e.g. Product Catalogue Cover"
                  className="w-full p-2 bg-slate-900 border border-slate-700 text-white rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={customDesignQty}
                  onChange={(e) => setCustomDesignQty(parseInt(e.target.value) || 1)}
                  className="w-full p-2 bg-slate-900 border border-slate-700 text-white rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Short Brief</label>
                <input
                  type="text"
                  value={customShortBrief}
                  onChange={(e) => setCustomShortBrief(e.target.value)}
                  placeholder="e.g. Premium concept"
                  className="w-full p-2 bg-slate-900 border border-slate-700 text-white rounded-lg text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Auto Generated Task Names Preview */}
        <div className="p-4 bg-slate-950 text-white rounded-2xl border border-slate-800 space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-300 font-semibold border-b border-slate-800 pb-2">
            <span>Generated Tasks Preview</span>
            <span className="text-emerald-400 font-bold">{totalTaskCount} Tasks</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1 max-h-32 overflow-y-auto">
            {staticPostsQty > 0 &&
              Array.from({ length: staticPostsQty }).map((_, i) => (
                <span key={`sp-${i}`} className="px-2.5 py-1 bg-slate-800 rounded-lg border border-slate-700 text-[11px]">
                  Static Post {i + 1 < 10 ? `0${i + 1}` : i + 1}
                </span>
              ))}
            {reelsQty > 0 &&
              Array.from({ length: reelsQty }).map((_, i) => (
                <span key={`r-${i}`} className="px-2.5 py-1 bg-slate-800 rounded-lg border border-slate-700 text-[11px]">
                  Reel {i + 1 < 10 ? `0${i + 1}` : i + 1}
                </span>
              ))}
            {storiesQty > 0 &&
              Array.from({ length: storiesQty }).map((_, i) => (
                <span key={`st-${i}`} className="px-2.5 py-1 bg-slate-800 rounded-lg border border-slate-700 text-[11px]">
                  Story {i + 1 < 10 ? `0${i + 1}` : i + 1}
                </span>
              ))}
          </div>
        </div>
      </div>

      {/* Section 4: Financial Details */}
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <h2 className="font-bold text-white text-base border-b border-slate-800 pb-3 flex items-center space-x-2">
          <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 font-black text-xs flex items-center justify-center border border-indigo-500/30">4</span>
          <span>Financial Details</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Total Payment (₹) *
            </label>
            <input
              type="number"
              required
              min={0}
              value={totalPayment}
              onChange={(e) => setTotalPayment(parseInt(e.target.value) || 0)}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Advance Received (₹)
            </label>
            <input
              type="number"
              min={0}
              value={advanceReceived}
              onChange={(e) => setAdvanceReceived(parseInt(e.target.value) || 0)}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 text-emerald-400 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Pending Amount
            </label>
            <input
              type="text"
              disabled
              value={`₹${(pendingAmount ?? 0).toLocaleString('en-IN')}`}
              className="w-full p-2.5 bg-rose-950/40 border border-rose-800/80 rounded-xl text-xs font-black text-rose-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Payment Due Date
            </label>
            <input
              type="date"
              value={paymentDueDate}
              onChange={(e) => setPaymentDueDate(e.target.value)}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Payment Notes
            </label>
            <input
              type="text"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="e.g. ₹40,000 received via UPI. Balance due on completion."
              className="w-full p-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Final Action Button */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-600 via-indigo-600 to-indigo-700 hover:from-emerald-700 hover:to-indigo-800 text-white font-bold text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center space-x-2 cursor-pointer"
        >
          <Sparkles className="w-5 h-5 text-emerald-300" />
          <span>Create Project & Send to PM</span>
        </button>
      </div>
    </form>
  );
};
