"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
  TrendingUp,
  Plus,
  Search,
} from "lucide-react";
import { punchInAction, punchOutAction } from "@/lib/actions/attendance";
import type { Attendance, AttendanceStats, LeaveWithUser } from "@/lib/types";
import LeaveApplicationModal from "@/components/LeaveApplicationModal";

function formatTime(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

function formatDate(dateInput: string | Date) {
  try {
    let d: Date;
    if (dateInput instanceof Date) {
      d = dateInput;
    } else if (typeof dateInput === "string") {
      d = dateInput.includes("T") ? new Date(dateInput) : new Date(dateInput + "T00:00:00");
    } else {
      return "—";
    }
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

const LEAVE_TYPE_META: Record<string, { label: string; cls: string }> = {
  sick: { label: "Sick", cls: "bg-rose-100 text-rose-700" },
  casual: { label: "Casual", cls: "bg-sky-100 text-sky-700" },
  earned: { label: "Earned", cls: "bg-emerald-100 text-emerald-700" },
  unpaid: { label: "Unpaid", cls: "bg-slate-100 text-slate-600" },
  emergency: { label: "Emergency", cls: "bg-amber-100 text-amber-700" },
};

const LEAVE_STATUS_META = {
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-700", icon: AlertCircle },
  approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  rejected: { label: "Rejected", cls: "bg-rose-100 text-rose-700", icon: XCircle },
};

export default function AttendanceView({
  todayRecord,
  history,
  stats,
  isAdmin,
  myLeaves,
  leaveBalance,
  pendingLeaves,
  allLeaves,
}: {
  todayRecord: Attendance | null;
  history: Attendance[];
  stats: AttendanceStats;
  isAdmin: boolean;
  myLeaves: LeaveWithUser[];
  leaveBalance: Record<string, { used: number; total: number }>;
  pendingLeaves: LeaveWithUser[];
  allLeaves: LeaveWithUser[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [now, setNow] = useState(new Date());
  const [activeTab, setActiveTab] = useState("attendance");
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveSearch, setLeaveSearch] = useState("");
  const [leaveName, setLeaveName] = useState("");
  const [leaveRole, setLeaveRole] = useState("");
  const [leaveStatus, setLeaveStatus] = useState("");

  const leaveNames = useMemo(
    () => [...new Set(allLeaves.map((l) => l.full_name))].sort(),
    [allLeaves]
  );
  const leaveRoles = useMemo(
    () => [...new Set(allLeaves.map((l) => l.role_label))].sort(),
    [allLeaves]
  );

  const filteredLeaves = useMemo(() => {
    if (!isAdmin) return myLeaves;
    const q = leaveSearch.trim().toLowerCase();
    return allLeaves.filter((l) => {
      if (leaveName && l.full_name !== leaveName) return false;
      if (leaveRole && l.role_label !== leaveRole) return false;
      if (leaveStatus && l.status !== leaveStatus) return false;
      if (q && !`${l.full_name} ${l.leave_type} ${l.reason} ${l.role_label}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [isAdmin, allLeaves, myLeaves, leaveSearch, leaveName, leaveRole, leaveStatus]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hasPunchedIn = !!todayRecord?.punch_in;
  const hasPunchedOut = !!todayRecord?.punch_out;

  function handlePunchIn() {
    start(async () => {
      const res = await punchInAction();
      if (res.error) alert(res.error);
      router.refresh();
    });
  }

  function handlePunchOut() {
    start(async () => {
      const res = await punchOutAction();
      if (res.error) alert(res.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Attendance & Leave</h1>
          <p className="text-xs text-slate-500">
            {now.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            {" · "}
            {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab("attendance")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === "attendance" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Clock className="h-3.5 w-3.5 inline mr-1" />
            Attendance
          </button>
          <button
            onClick={() => setActiveTab("leaves")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === "leaves" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Calendar className="h-3.5 w-3.5 inline mr-1" />
            Leaves
          </button>
        </div>
      </div>

      {activeTab === "attendance" && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-4 flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-full bg-brand-600/10 flex items-center justify-center mb-2">
                <LogIn className="h-6 w-6 text-brand-600" />
              </div>
              <p className="text-xs text-slate-500">Punch In</p>
              <p className="text-xl font-bold text-slate-800">{formatTime(todayRecord?.punch_in)}</p>
              <button
                className="btn-primary mt-2 w-full !py-1.5 text-xs"
                disabled={pending || hasPunchedIn}
                onClick={handlePunchIn}
              >
                {hasPunchedIn ? "Punched In" : "Punch In"}
              </button>
            </div>

            <div className="card p-4 flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-full bg-emerald-600/10 flex items-center justify-center mb-2">
                <LogOut className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-xs text-slate-500">Punch Out</p>
              <p className="text-xl font-bold text-slate-800">{formatTime(todayRecord?.punch_out)}</p>
              <button
                className="btn-primary mt-2 w-full !py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700"
                disabled={pending || !hasPunchedIn || hasPunchedOut}
                onClick={handlePunchOut}
              >
                {hasPunchedOut ? "Punched Out" : "Punch Out"}
              </button>
            </div>

            <div className="card p-4 flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-full bg-violet-600/10 flex items-center justify-center mb-2">
                <TrendingUp className="h-6 w-6 text-violet-600" />
              </div>
              <p className="text-xs text-slate-500">Hours</p>
              <p className="text-xl font-bold text-slate-800">
                {todayRecord?.hours_worked ? `${todayRecord.hours_worked}h` : "—"}
              </p>
              <div className="mt-2">
                <span
                  className={`badge ${
                    todayRecord?.status === "late"
                      ? "bg-amber-100 text-amber-700"
                      : todayRecord?.status === "present"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {todayRecord?.status === "late" ? "Late" : todayRecord?.status === "present" ? "On Time" : "—"}
                </span>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-brand-700" />
                <h2 className="font-semibold text-sm">Today&apos;s Team Overview</h2>
              </div>
              <div className="grid grid-cols-5 gap-3">
                <div className="text-center">
                  <p className="text-xl font-bold text-emerald-600">{stats.presentToday}</p>
                  <p className="text-xs text-slate-500">Present</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-amber-600">{stats.lateToday}</p>
                  <p className="text-xs text-slate-500">Late</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-rose-600">{stats.absentToday}</p>
                  <p className="text-xs text-slate-500">Absent</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-violet-600">{stats.onLeaveToday}</p>
                  <p className="text-xs text-slate-500">On Leave</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-slate-800">{stats.avgHoursToday}h</p>
                  <p className="text-xs text-slate-500">Avg Hours</p>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="font-semibold text-sm">Recent Attendance</h2>
            </div>
            {history.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-400">No attendance records yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {history.slice(0, 10).map((h) => (
                  <div key={h.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          h.status === "present"
                            ? "bg-emerald-500"
                            : h.status === "late"
                            ? "bg-amber-500"
                            : h.status === "absent"
                            ? "bg-rose-500"
                            : "bg-slate-300"
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{formatDate(h.date)}</p>
                        <p className="text-xs text-slate-400">
                          {formatTime(h.punch_in)} — {formatTime(h.punch_out)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`badge ${
                          h.status === "present"
                            ? "bg-emerald-100 text-emerald-700"
                            : h.status === "late"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {h.status}
                      </span>
                      {h.hours_worked > 0 && (
                        <p className="text-xs text-slate-400 mt-0.5">{h.hours_worked}h</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "leaves" && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Leave Balance</h2>
            <button className="btn-primary !py-1.5 !px-3 text-xs" onClick={() => setShowLeaveModal(true)}>
              <Plus className="h-3.5 w-3.5" /> Apply Leave
            </button>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {Object.entries(leaveBalance).map(([type, bal]) => (
              <div key={type} className="card p-3 text-center">
                <span className={`badge ${LEAVE_TYPE_META[type]?.cls || "bg-slate-100 text-slate-600"}`}>
                  {LEAVE_TYPE_META[type]?.label || type}
                </span>
                <p className="mt-1 text-lg font-bold text-slate-800">
                  {bal.total - bal.used}
                  <span className="text-xs text-slate-400 font-normal">/{bal.total}</span>
                </p>
              </div>
            ))}
          </div>

          {isAdmin && pendingLeaves.length > 0 && (
            <div className="card">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-semibold text-sm">Pending Approvals</h2>
                <span className="badge bg-amber-100 text-amber-700">{pendingLeaves.length}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {pendingLeaves.map((l) => (
                  <div key={l.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{l.full_name}</p>
                        <p className="text-xs text-slate-400">
                          {LEAVE_TYPE_META[l.leave_type]?.label} · {formatDate(l.start_date)} — {formatDate(l.end_date)} · {l.days}d
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="btn-primary !py-1 !px-3 text-xs"
                          disabled={pending}
                          onClick={async () => {
                            start(async () => {
                              const { approveLeaveAction } = await import("@/lib/actions/leaves");
                              const res = await approveLeaveAction(l.id);
                              if (res.error) alert(res.error);
                              router.refresh();
                            });
                          }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                        </button>
                        <button
                          className="btn-ghost !text-rose-600 !py-1 !px-3 text-xs"
                          disabled={pending}
                          onClick={async () => {
                            start(async () => {
                              const { rejectLeaveAction } = await import("@/lib/actions/leaves");
                              const reason = prompt("Reason for rejection:");
                              if (reason) {
                                const res = await rejectLeaveAction(l.id, reason);
                                if (res.error) alert(res.error);
                                router.refresh();
                              }
                            });
                          }}
                        >
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="font-semibold text-sm">{isAdmin ? "Leave History" : "My Leave History"}</h2>
            </div>

            {isAdmin && (
              <div className="px-4 py-3 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    value={leaveSearch}
                    onChange={(e) => setLeaveSearch(e.target.value)}
                    placeholder="Search name, type, reason…"
                    className="input !py-1.5 !pl-8 text-xs"
                  />
                </div>
                <select value={leaveName} onChange={(e) => setLeaveName(e.target.value)} className="input !py-1.5 text-xs">
                  <option value="">All employees</option>
                  {leaveNames.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <select value={leaveRole} onChange={(e) => setLeaveRole(e.target.value)} className="input !py-1.5 text-xs">
                  <option value="">All roles</option>
                  {leaveRoles.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <select value={leaveStatus} onChange={(e) => setLeaveStatus(e.target.value)} className="input !py-1.5 text-xs">
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            )}

            {filteredLeaves.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-400">No leave records match.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredLeaves.map((l) => {
                  const statusMeta = LEAVE_STATUS_META[l.status];
                  const StatusIcon = statusMeta?.icon || AlertCircle;
                  return (
                    <div key={l.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {isAdmin && (
                          <p className="text-xs font-medium text-slate-700 shrink-0 w-28 truncate">{l.full_name}</p>
                        )}
                        <span className={`badge shrink-0 ${LEAVE_TYPE_META[l.leave_type]?.cls || "bg-slate-100 text-slate-600"}`}>
                          {LEAVE_TYPE_META[l.leave_type]?.label}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs text-slate-700 truncate">
                            {formatDate(l.start_date)} — {formatDate(l.end_date)} · {l.days}d
                            {isAdmin && l.role_label && <span className="text-slate-400"> · {l.role_label}</span>}
                          </p>
                          {l.rejection_reason && (
                            <p className="text-[11px] text-rose-500 truncate">Rejected: {l.rejection_reason}</p>
                          )}
                        </div>
                      </div>
                      <span className={`badge shrink-0 ${statusMeta?.cls || "bg-slate-100 text-slate-500"}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusMeta?.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {showLeaveModal && <LeaveApplicationModal onClose={() => setShowLeaveModal(false)} />}
    </div>
  );
}
