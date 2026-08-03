import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { LeaveType } from '../../types/crm';
import {
  Clock,
  Calendar,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  History,
  Search,
  ShieldCheck,
  Users,
  LogOut,
  LogIn,
} from 'lucide-react';

export const HRManagement: React.FC = () => {
  const {
    users,
    currentUser,
    currentRole,
    attendanceRecords,
    leaveRequests,
    checkIn,
    checkOut,
    applyLeave,
    approveLeave,
    rejectLeave,
    isUserOnLeave,
  } = useCRM();

  const [activeSubTab, setActiveSubTab] = useState<'attendance' | 'team-leaves' | 'my-leaves'>(
    currentRole === 'SUPER_ADMIN' || currentRole === 'PROJECT_MANAGER' ? 'attendance' : 'team-leaves'
  );

  // Leave Form State
  const [leaveType, setLeaveType] = useState<LeaveType>('Casual Leave');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [showApplyLeaveModal, setShowApplyLeaveModal] = useState(false);

  // Filters for Super Admin Attendance Table
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);

  // Filters for Team Leave Status
  const [leaveRoleFilter, setLeaveRoleFilter] = useState<string>('ALL');

  const pendingLeaves = leaveRequests.filter((l) => l.status === 'PENDING');
  const myLeaves = leaveRequests.filter((l) => l.userId === currentUser.id);

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    applyLeave({
      leaveType,
      startDate,
      endDate,
      reason,
    });
    setShowApplyLeaveModal(false);
    setReason('');
  };

  const todayISO = new Date().toISOString().split('T')[0];

  // Attendance stats for today
  const totalStaffCount = users.length;
  const checkedInUsersCount = users.filter((u) => u.isCheckedIn).length;
  const usersOnLeaveCount = users.filter((u) => isUserOnLeave(u.id, todayISO)).length;
  const notCheckedInCount = Math.max(0, totalStaffCount - checkedInUsersCount - usersOnLeaveCount);

  // Filtered Attendance Records for Admin Table
  const filteredAttendance = attendanceRecords.filter((rec) => {
    const userObj = users.find((u) => u.id === rec.userId);
    const matchesSearch =
      rec.userName.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
      (userObj && userObj.email.toLowerCase().includes(attendanceSearch.toLowerCase()));

    const matchesRole = selectedRoleFilter === 'ALL' || (userObj && userObj.role === selectedRoleFilter);
    const matchesDate = !selectedDateFilter || rec.date === selectedDateFilter;

    return matchesSearch && matchesRole && matchesDate;
  });

  const availableRoles: { id: string; label: string }[] = [
    { id: 'ALL', label: 'All Roles' },
    { id: 'SUPER_ADMIN', label: 'Super Admin' },
    { id: 'PROJECT_MANAGER', label: 'Project Manager' },
    { id: 'GRAPHIC_DESIGNER', label: 'Graphic Designer' },
    { id: 'CONTENT_WRITER', label: 'Content Writer' },
    { id: 'VIDEO_EDITOR', label: 'Video Editor' },
    { id: 'SOCIAL_MEDIA_MANAGER', label: 'Social Media Manager' },
    { id: 'SALES_REP', label: 'Sales Executive' },
  ];

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Top Header with Daily Check-In & Check-Out Controls */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-white">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 font-bold text-[10px] rounded border border-blue-500/30 uppercase tracking-wider">
              Staff HR Portal
            </span>
            <span className="text-xs text-slate-400 font-medium">Logged as: {currentUser.name} ({currentUser.role})</span>
          </div>
          <h1 className="text-xl font-bold mt-1 flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            <span>Attendance & Leave Management</span>
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Single-click check-in & check-out logged directly to Super Admin Dashboard
          </p>
        </div>

        {/* Quick Check-In & Check-Out Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {currentUser.isCheckedIn ? (
            <button
              onClick={checkOut}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer border border-rose-400/30"
            >
              <LogOut className="w-4 h-4" />
              <span>Clock Out ({currentUser.checkInTime || 'Checked In'})</span>
            </button>
          ) : (
            <button
              onClick={checkIn}
              className="px-4.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer border border-emerald-400/30"
            >
              <LogIn className="w-4 h-4" />
              <span>Daily Check-In</span>
            </button>
          )}

          <button
            onClick={() => setShowApplyLeaveModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer border border-blue-400/30 flex items-center space-x-1.5"
          >
            <Calendar className="w-4 h-4" />
            <span>Apply Leave</span>
          </button>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {(currentRole === 'SUPER_ADMIN' || currentRole === 'PROJECT_MANAGER') && (
          <button
            onClick={() => setActiveSubTab('attendance')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
              activeSubTab === 'attendance'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Attendance Ledger (Super Admin View)</span>
          </button>
        )}

        <button
          onClick={() => setActiveSubTab('team-leaves')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
            activeSubTab === 'team-leaves'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4 text-blue-400" />
          <span>Team Leave Status by Role ID</span>
        </button>

        <button
          onClick={() => setActiveSubTab('my-leaves')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 ${
            activeSubTab === 'my-leaves'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <History className="w-4 h-4 text-amber-400" />
          <span>My Leave Requests & History</span>
          {myLeaves.length > 0 && (
            <span className="px-2 py-0.5 bg-slate-800 text-white rounded-full text-[10px]">
              {myLeaves.length}
            </span>
          )}
        </button>
      </div>

      {/* SUB-TAB 1: SUPER ADMIN ATTENDANCE LEDGER */}
      {activeSubTab === 'attendance' && (
        <div className="space-y-6">
          {/* Attendance KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-white">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Staff Members</p>
              <p className="text-2xl font-black text-white mt-1">{totalStaffCount}</p>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-emerald-500/30 text-white">
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Checked-In Today</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">{checkedInUsersCount}</p>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-amber-500/30 text-white">
              <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">On Leave Today</p>
              <p className="text-2xl font-black text-amber-400 mt-1">{usersOnLeaveCount}</p>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-white">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Not Checked-In</p>
              <p className="text-2xl font-black text-slate-400 mt-1">{notCheckedInCount}</p>
            </div>
          </div>

          {/* Live Staff Roster */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Live Staff Duty Roster</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">Realtime Live State</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {users.map((u) => {
                const onLeave = isUserOnLeave(u.id, todayISO);

                return (
                  <div key={u.id} className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/80 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-bold text-white text-sm">{u.name}</p>
                      <p className="text-blue-400 text-[11px] font-semibold mt-0.5">{u.role.replace(/_/g, ' ')}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{u.email}</p>
                    </div>

                    <div className="shrink-0 text-right">
                      {onLeave ? (
                        <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 font-bold rounded-full text-[10px] border border-amber-500/30 flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          <span>On Leave</span>
                        </span>
                      ) : u.isCheckedIn ? (
                        <div>
                          <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 font-bold rounded-full text-[10px] border border-emerald-500/30 flex items-center space-x-1">
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                            <span>Checked In</span>
                          </span>
                          <p className="text-[10px] text-emerald-400/80 font-mono mt-1">{u.checkInTime || '09:00 AM'}</p>
                        </div>
                      ) : (
                        <span className="px-2.5 py-1 bg-slate-700/50 text-slate-400 font-semibold rounded-full text-[10px] border border-slate-700">
                          Clocked Out
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Super Admin Attendance Logs Database Table */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>Attendance History Log (Super Admin Database)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Filter by date, role, or staff name</p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-48">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search staff..."
                    value={attendanceSearch}
                    onChange={(e) => setAttendanceSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <select
                  value={selectedRoleFilter}
                  onChange={(e) => setSelectedRoleFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {availableRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  value={selectedDateFilter}
                  onChange={(e) => setSelectedDateFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />

                {selectedDateFilter && (
                  <button
                    onClick={() => setSelectedDateFilter('')}
                    className="text-[10px] text-slate-400 hover:text-white underline"
                  >
                    All Dates
                  </button>
                )}
              </div>
            </div>

            {filteredAttendance.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                No attendance records matching filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead>
                    <tr className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                      <th className="p-3">Staff Name</th>
                      <th className="p-3">Role ID</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Check-In Time</th>
                      <th className="p-3">Check-Out Time</th>
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredAttendance.map((rec) => {
                      const userObj = users.find((u) => u.id === rec.userId);
                      const roleDisplay = userObj ? userObj.role : 'STAFF';

                      return (
                        <tr key={rec.id} className="hover:bg-slate-800/40">
                          <td className="p-3 font-semibold text-white">
                            <div>
                              <p>{rec.userName}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{userObj?.email}</p>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 font-mono font-bold rounded text-[10px] border border-blue-500/30">
                              {roleDisplay}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-400">{rec.date}</td>
                          <td className="p-3 font-bold text-emerald-400">{rec.checkInTime || '—'}</td>
                          <td className="p-3 font-semibold text-slate-400">{rec.checkOutTime || 'Present / Active'}</td>
                          <td className="p-3 text-right">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {rec.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: TEAM LEAVE STATUS BY ROLE ID (Accessible to ALL employees) */}
      {activeSubTab === 'team-leaves' && (
        <div className="space-y-6">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span>Team Leave Status (Filtered by Role ID)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Check leave availability for team members across specific job roles
                </p>
              </div>

              {/* Role Selector Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {availableRoles.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setLeaveRoleFilter(r.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      leaveRoleFilter === r.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List of Staff with Leave Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {users
                .filter((u) => leaveRoleFilter === 'ALL' || u.role === leaveRoleFilter)
                .map((u) => {
                  const onLeaveToday = isUserOnLeave(u.id, todayISO);
                  const userLeaveRequests = leaveRequests.filter((l) => l.userId === u.id);
                  const activeLeave = userLeaveRequests.find(
                    (l) => l.status === 'APPROVED' && l.startDate <= todayISO && l.endDate >= todayISO
                  );
                  const upcomingLeave = userLeaveRequests.find(
                    (l) => l.status === 'APPROVED' && l.startDate > todayISO
                  );

                  return (
                    <div
                      key={u.id}
                      className={`p-4 rounded-xl border text-xs space-y-3 transition-all ${
                        onLeaveToday
                          ? 'bg-amber-950/20 border-amber-500/40'
                          : 'bg-slate-800/80 border-slate-700/80'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-white text-sm">{u.name}</p>
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 font-mono font-bold rounded text-[10px] border border-blue-500/30 inline-block mt-1">
                            Role ID: {u.role}
                          </span>
                        </div>

                        {onLeaveToday ? (
                          <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 font-bold rounded-full text-[10px] border border-amber-500/30 flex items-center space-x-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            <span>On Leave Today</span>
                          </span>
                        ) : upcomingLeave ? (
                          <span className="px-2.5 py-1 bg-blue-500/20 text-blue-300 font-bold rounded-full text-[10px] border border-blue-500/30">
                            Upcoming Leave
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 font-bold rounded-full text-[10px] border border-emerald-500/30 flex items-center space-x-1">
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                            <span>On Duty</span>
                          </span>
                        )}
                      </div>

                      {/* Leave details if any */}
                      {activeLeave ? (
                        <div className="p-2.5 bg-amber-900/30 border border-amber-500/30 rounded-lg text-amber-200 text-[11px] space-y-1">
                          <p className="font-bold">
                            {activeLeave.leaveType} ({activeLeave.startDate} to {activeLeave.endDate})
                          </p>
                          <p className="italic opacity-90">"{activeLeave.reason}"</p>
                        </div>
                      ) : upcomingLeave ? (
                        <div className="p-2.5 bg-blue-900/30 border border-blue-500/30 rounded-lg text-blue-200 text-[11px] space-y-1">
                          <p className="font-bold">
                            Scheduled: {upcomingLeave.leaveType} ({upcomingLeave.startDate} to {upcomingLeave.endDate})
                          </p>
                          <p className="italic opacity-90">"{upcomingLeave.reason}"</p>
                        </div>
                      ) : (
                        <p className="text-slate-400 text-[11px]">Available for task assignment</p>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: MY LEAVES & MANAGER APPROVALS */}
      {activeSubTab === 'my-leaves' && (
        <div className="space-y-6">
          {/* Pending Leave Requests for PM / Super Admin */}
          {(currentRole === 'SUPER_ADMIN' || currentRole === 'PROJECT_MANAGER') && pendingLeaves.length > 0 && (
            <div className="bg-amber-950/20 border border-amber-500/30 p-5 rounded-2xl space-y-3">
              <div className="flex items-center space-x-2 text-amber-300 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span>Pending Team Leave Requests ({pendingLeaves.length})</span>
              </div>

              <div className="divide-y divide-slate-800 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                {pendingLeaves.map((leave) => (
                  <div key={leave.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-sm">{leave.userName}</span>
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 font-bold rounded text-[10px]">
                          {leave.userRole}
                        </span>
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-semibold rounded text-[10px]">
                          {leave.leaveType}
                        </span>
                      </div>
                      <p className="text-slate-400 mt-1">
                        Dates: <span className="font-bold text-white">{leave.startDate} to {leave.endDate}</span> ({leave.totalDays} Days)
                      </p>
                      <p className="text-slate-400 italic mt-0.5">Reason: "{leave.reason}"</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => approveLeave(leave.id)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => rejectLeave(leave.id)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-lg cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Personal Leave History Table */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <History className="w-4 h-4 text-blue-400" />
                <span>My Personal Leave History</span>
              </h3>
              <button
                onClick={() => setShowApplyLeaveModal(true)}
                className="text-xs text-blue-400 hover:underline font-semibold cursor-pointer"
              >
                + Apply New Leave
              </button>
            </div>

            {myLeaves.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                No leave requests submitted yet. Click "Apply Leave" above to request time off.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead>
                    <tr className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                      <th className="p-3">Type</th>
                      <th className="p-3">Dates</th>
                      <th className="p-3">Days</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {myLeaves.map((leave) => (
                      <tr key={leave.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-semibold text-white">{leave.leaveType}</td>
                        <td className="p-3 font-mono text-slate-400">
                          {leave.startDate} to {leave.endDate}
                        </td>
                        <td className="p-3 font-bold">{leave.totalDays} Days</td>
                        <td className="p-3 text-slate-400 italic max-w-xs truncate">{leave.reason}</td>
                        <td className="p-3 text-right">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              leave.status === 'APPROVED'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : leave.status === 'REJECTED'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {leave.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Apply Leave Modal */}
      {showApplyLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-800 overflow-hidden">
            <div className="bg-slate-800 p-5 flex justify-between items-center border-b border-slate-700">
              <h3 className="font-bold text-base">Apply for Leave</h3>
              <button onClick={() => setShowApplyLeaveModal(false)} className="text-slate-400 hover:text-white font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl font-semibold text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Festival Leave">Festival Leave</option>
                  <option value="Unannounced Leave">Unannounced Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Reason</label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain leave reason..."
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApplyLeaveModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
