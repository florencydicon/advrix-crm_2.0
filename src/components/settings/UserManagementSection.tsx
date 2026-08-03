import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { User, UserRole } from '../../types/crm';
import {
  Users,
  UserPlus,
  Key,
  Shield,
  Trash2,
  Check,
  X,
  Lock,
  Mail,
  UserCheck,
  AlertCircle,
  Eye,
  EyeOff,
  User as UserIcon,
  Smartphone,
} from 'lucide-react';

export const UserManagementSection: React.FC<{ theme?: 'light' | 'dark' }> = ({ theme = 'dark' }) => {
  const {
    users,
    currentUser,
    currentRole,
    addUser,
    updateUser,
    deleteUser,
    updateUserPassword,
    updateUserRole,
    getUserActiveTaskCount,
    adminWhatsappNumber,
    updateAdminWhatsappNumber,
  } = useCRM();

  const [whatsappInput, setWhatsappInput] = useState(adminWhatsappNumber || '+91 97731 24598');
  const [whatsappSaved, setWhatsappSaved] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPasswordUserId, setEditingPasswordUserId] = useState<string | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [showMyPassword, setShowMyPassword] = useState(false);

  // New User Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('CONTENT_WRITER');
  const [password, setPassword] = useState('advrix123');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const roleLabels: Record<UserRole, string> = {
    SUPER_ADMIN: 'Super Admin (Owner)',
    PROJECT_MANAGER: 'Project Manager',
    SALES_REP: 'Sales Representative',
    CONTENT_WRITER: 'Content Writer',
    GRAPHIC_DESIGNER: 'Graphic Designer',
    VIDEO_EDITOR: 'Video Editor',
    SOCIAL_MEDIA_MANAGER: 'Social Media Manager',
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim() || !email.trim()) {
      setFormError('Please provide both name and email.');
      return;
    }

    if (users.some((u) => (u.email || '').toLowerCase() === email.trim().toLowerCase())) {
      setFormError('An account with this email address already exists.');
      return;
    }

    addUser({
      name: name.trim(),
      email: email.trim(),
      role,
      password: password || 'advrix123',
      phone: phone || '+91 98765 00000',
      whatsappNumber: phone || '+91 98765 00000',
      capacityLimit: 25,
      isCheckedIn: true,
      checkInTime: '09:00 AM',
    });

    setName('');
    setEmail('');
    setPassword('advrix123');
    setPhone('');
    setShowAddModal(false);
  };

  const handleSavePassword = (userId: string) => {
    if (!newPasswordValue.trim()) return;
    updateUserPassword(userId, newPasswordValue.trim());
    setEditingPasswordUserId(null);
    setNewPasswordValue('');
  };

  // NON-SUPER_ADMIN VIEW: Show ONLY their own account credentials
  if (currentRole !== 'SUPER_ADMIN') {
    return (
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-md text-white space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h3 className="text-lg font-bold flex items-center space-x-2">
            <UserIcon className="w-5 h-5 text-blue-400" />
            <span>My Account Profile & Credentials</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            View your login username, ID, and update your security password.
          </p>
        </div>

        <div className="max-w-xl bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-4">
          <div className="flex items-center space-x-4 pb-4 border-b border-slate-700/60">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-extrabold flex items-center justify-center text-lg shadow-inner">
              {currentUser.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h4 className="text-base font-bold text-white">{currentUser.name}</h4>
              <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 font-bold rounded text-xs border border-blue-500/30">
                {roleLabels[currentUser.role]}
              </span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-slate-700/40">
              <span className="text-slate-400 font-medium flex items-center space-x-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>User Login ID / Email</span>
              </span>
              <span className="font-mono text-white font-bold">{currentUser.email}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-700/40">
              <span className="text-slate-400 font-medium flex items-center space-x-2">
                <Smartphone className="w-4 h-4 text-slate-400" />
                <span>Phone / WhatsApp</span>
              </span>
              <span className="font-medium text-slate-200">{currentUser.phone || '+91 98765 00000'}</span>
            </div>

            {/* Password Section */}
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-400 font-medium flex items-center space-x-2">
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Account Password</span>
              </span>

              {editingPasswordUserId === currentUser.id ? (
                <div className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    value={newPasswordValue}
                    onChange={(e) => setNewPasswordValue(e.target.value)}
                    placeholder="New Password"
                    className="w-32 px-2.5 py-1 bg-slate-900 border border-slate-600 rounded text-xs text-white font-mono"
                  />
                  <button
                    onClick={() => handleSavePassword(currentUser.id)}
                    className="p-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-500 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setEditingPasswordUserId(null)}
                    className="p-1.5 bg-slate-700 text-white rounded hover:bg-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-white font-bold">
                    {showMyPassword ? currentUser.password || 'advrix123' : '••••••••'}
                  </span>
                  <button
                    onClick={() => setShowMyPassword(!showMyPassword)}
                    className="p-1 text-slate-400 hover:text-white"
                    title={showMyPassword ? 'Hide Password' : 'Show Password'}
                  >
                    {showMyPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => {
                      setEditingPasswordUserId(currentUser.id);
                      setNewPasswordValue(currentUser.password || 'advrix123');
                    }}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1"
                  >
                    <Key className="w-3 h-3" />
                    <span>Change</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // SUPER_ADMIN VIEW: Full Team Management & All Credentials
  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-md text-white space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span>Team Accounts & Credentials Management (Super Admin)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Manage agency team members, set roles, update passwords, and control workspace permissions.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-2 transition-all cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New User Account</span>
        </button>
      </div>

      {/* Admin Official Contact Number */}
      <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-200 flex items-center space-x-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Agency Official Admin Phone Number</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Official agency contact number. Attendance and check-in logs are automatically synced live to the Super Admin Dashboard.
            </p>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <input
              type="text"
              value={whatsappInput}
              onChange={(e) => {
                setWhatsappInput(e.target.value);
                setWhatsappSaved(false);
              }}
              placeholder="+91 97731 24598"
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 w-44 font-mono"
            />
            <button
              onClick={() => {
                updateAdminWhatsappNumber(whatsappInput.trim());
                setWhatsappSaved(true);
                setTimeout(() => setWhatsappSaved(false), 3000);
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-xs transition-all cursor-pointer"
            >
              {whatsappSaved ? 'Saved ✓' : 'Update Number'}
            </button>
          </div>
        </div>
      </div>

      {/* User Accounts Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="p-3.5">User</th>
              <th className="p-3.5">Email / Login ID</th>
              <th className="p-3.5">Role</th>
              <th className="p-3.5">Password</th>
              <th className="p-3.5">Active Workload</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-xs text-slate-300">
            {users.map((u) => {
              const taskCount = getUserActiveTaskCount(u.id);
              const isSelf = u.id === currentUser.id;

              return (
                <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                  {/* Name & Avatar */}
                  <td className="p-3.5">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center text-xs shrink-0">
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-white flex items-center space-x-1.5">
                          <span>{u.name}</span>
                          {isSelf && (
                            <span className="px-1.5 py-0.5 bg-blue-950 text-blue-300 font-bold text-[9px] rounded">
                              You
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-slate-400">{u.phone || 'No phone set'}</p>
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="p-3.5 font-mono text-slate-300">{u.email}</td>

                  {/* Role Selector */}
                  <td className="p-3.5">
                    <select
                      value={u.role}
                      onChange={(e) => updateUserRole(u.id, e.target.value as UserRole)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="SUPER_ADMIN">Super Admin (Owner)</option>
                      <option value="PROJECT_MANAGER">Project Manager</option>
                      <option value="SALES_REP">Sales Representative</option>
                      <option value="CONTENT_WRITER">Content Writer</option>
                      <option value="GRAPHIC_DESIGNER">Graphic Designer</option>
                      <option value="VIDEO_EDITOR">Video Editor</option>
                      <option value="SOCIAL_MEDIA_MANAGER">Social Media Manager</option>
                    </select>
                  </td>

                  {/* Password Handler */}
                  <td className="p-3.5">
                    {editingPasswordUserId === u.id ? (
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="text"
                          value={newPasswordValue}
                          onChange={(e) => setNewPasswordValue(e.target.value)}
                          placeholder="New Password"
                          className="w-28 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white font-mono"
                        />
                        <button
                          onClick={() => handleSavePassword(u.id)}
                          className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-500 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingPasswordUserId(null)}
                          className="p-1 bg-slate-700 text-white rounded hover:bg-slate-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-slate-300 text-[11px]">
                          {u.password || 'advrix123'}
                        </span>
                        <button
                          onClick={() => {
                            setEditingPasswordUserId(u.id);
                            setNewPasswordValue(u.password || 'advrix123');
                          }}
                          title="Change Password"
                          className="p-1 text-blue-400 hover:bg-blue-950/50 rounded transition-colors cursor-pointer"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Workload */}
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-300 font-semibold rounded text-[11px]">
                      {taskCount} Active Tasks
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="p-3.5 text-right">
                    {!isSelf && (
                      <button
                        onClick={() => deleteUser(u.id)}
                        title="Remove User Account"
                        className="p-1.5 text-rose-400 hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal to Add New User */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 w-full max-w-md space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-blue-400" />
                <span>Create New User Account</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white font-bold">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddUserSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-slate-300">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-300">Email Address (Login ID)</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ramesh@advrixmedia.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-300">Assigned Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-bold focus:outline-none focus:border-blue-500"
                >
                  <option value="SUPER_ADMIN">Super Admin (Owner)</option>
                  <option value="PROJECT_MANAGER">Project Manager</option>
                  <option value="SALES_REP">Sales Representative</option>
                  <option value="CONTENT_WRITER">Content Writer</option>
                  <option value="GRAPHIC_DESIGNER">Graphic Designer</option>
                  <option value="VIDEO_EDITOR">Video Editor</option>
                  <option value="SOCIAL_MEDIA_MANAGER">Social Media Manager</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-300">Initial Password</label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="advrix123"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-slate-300">Phone / WhatsApp</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
