"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, Printer, FileSpreadsheet, Eye } from "lucide-react";
import type { AttendanceReportRow } from "@/lib/data";
import EmployeeAttendanceDetail from "@/components/EmployeeAttendanceDetail";

export interface LeaveReportRowLite {
  id: string;
  full_name: string;
  role_label: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: string;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Postgres DATE columns may arrive as Date objects — normalize to YYYY-MM-DD. */
function isoDate(v: string | Date | null | undefined): string {
  if (!v) return "";
  if (v instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  }
  return String(v).slice(0, 10);
}

function csvEscape(v: string | number) {
  return `"${String(v).replace(/"/g, '""')}"`;
}

export default function AttendanceReports({
  month,
  year,
  attendanceReport,
  leaveReport,
}: {
  month: number;
  year: number;
  attendanceReport: AttendanceReportRow[];
  leaveReport: LeaveReportRowLite[];
}) {
  const router = useRouter();
  const [selectedEmployee, setSelectedEmployee] = useState<{ userId: string; name: string; role: string } | null>(null);
  const label = `${MONTHS[month - 1]} ${year}`;
  const now = new Date();
  const years = Array.from({ length: now.getFullYear() - 2023 + 2 }, (_, i) => 2024 + i);

  function goMonth(m: number, y: number) {
    router.push(`/attendance?month=${m}&year=${y}`);
  }

  function exportCsv() {
    const lines: string[] = [];
    lines.push(`Advrix Media PVT LTD — Attendance & Leave Report,${csvEscape(label)}`);
    lines.push("");
    lines.push("ATTENDANCE SUMMARY");
    lines.push(["Employee", "Role", "Present", "Half Days", "Late", "On Leave", "Absent", "Total Hours"].map(csvEscape).join(","));
    for (const r of attendanceReport) {
      lines.push(
        [r.full_name, r.role_label, r.present, r.half_days, r.late, r.on_leave, r.absent, r.total_hours]
          .map(csvEscape)
          .join(",")
      );
    }
    lines.push("");
    lines.push("LEAVE RECORDS");
    lines.push(["Employee", "Type", "From", "To", "Days", "Status", "Reason"].map(csvEscape).join(","));
    for (const l of leaveReport) {
      lines.push(
        [l.full_name, l.leave_type, isoDate(l.start_date), isoDate(l.end_date), l.days, l.status, (l.reason || "").replace(/\r?\n/g, " ")]
          .map(csvEscape)
          .join(",")
      );
    }
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `advrix-attendance-${year}-${String(month).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printPdf() {
    const win = window.open("", "_blank", "width=980,height=720");
    if (!win) return;
    const attRows = attendanceReport
      .map(
        (r) =>
          `<tr><td>${escapeHtml(r.full_name)}</td><td>${escapeHtml(r.role_label)}</td><td style="text-align:center">${r.present}</td><td style="text-align:center">${r.half_days}</td><td style="text-align:center">${r.late}</td><td style="text-align:center">${r.on_leave}</td><td style="text-align:center">${r.absent}</td><td style="text-align:right">${r.total_hours.toFixed(1)}</td></tr>`
      )
      .join("");
    const leaveRows = leaveReport
      .map(
        (l) =>
          `<tr><td>${escapeHtml(l.full_name)}</td><td>${escapeHtml(l.leave_type)}</td><td>${isoDate(l.start_date)}</td><td>${isoDate(l.end_date)}</td><td style="text-align:center">${l.days}</td><td>${escapeHtml(l.status)}</td><td>${escapeHtml(l.reason || "")}</td></tr>`
      )
      .join("");
    win.document.write(`<!DOCTYPE html><html><head><title>Advrix Media — Attendance Report ${label}</title>
      <style>
        body { font-family: -apple-system, Segoe UI, sans-serif; padding: 32px; color: #111; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        h2 { font-size: 14px; margin: 22px 0 8px; }
        p.meta { color: #555; font-size: 12px; margin: 0 0 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
        th, td { border: 1px solid #ddd; padding: 5px 8px; text-align: left; }
        th { background: #f3f4f6; }
      </style></head><body>
      <h1>Advrix Media PVT LTD — Attendance &amp; Leave Report</h1>
      <p class="meta">Period: <strong>${label}</strong> · Generated ${now.toLocaleString()}</p>
      <h2>Attendance Summary</h2>
      <table><thead><tr><th>Employee</th><th>Role</th><th>Present</th><th>Half Days</th><th>Late</th><th>On Leave</th><th>Absent</th><th>Total Hours</th></tr></thead>
      <tbody>${attRows || '<tr><td colspan="8">No data</td></tr>'}</tbody></table>
      <h2>Leave Records</h2>
      <table><thead><tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th>Reason</th></tr></thead>
      <tbody>${leaveRows || '<tr><td colspan="7">No leaves this period</td></tr>'}</tbody></table>
      </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }

  // If an employee is selected, show their detailed view
  if (selectedEmployee) {
    return (
      <EmployeeAttendanceDetail
        userId={selectedEmployee.userId}
        userName={selectedEmployee.name}
        userRole={selectedEmployee.role}
        onClose={() => setSelectedEmployee(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-brand-300" />
            <h2 className="font-semibold text-sm">Monthly Reports</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={month}
              onChange={(e) => goMonth(Number(e.target.value), year)}
              className="input !py-1.5 text-xs !w-auto"
              aria-label="Month"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => goMonth(month, Number(e.target.value))}
              className="input !py-1.5 text-xs !w-auto"
              aria-label="Year"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button className="btn-secondary !py-1.5 !px-3 text-xs" onClick={exportCsv}>
              <Download className="h-3.5 w-3.5" /> Excel
            </button>
            <button className="btn-primary !py-1.5 !px-3 text-xs" onClick={printPdf}>
              <Printer className="h-3.5 w-3.5" /> PDF
            </button>
          </div>
        </div>
      </div>

      {/* Attendance summary */}
      <div className="card overflow-x-auto">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="font-semibold text-sm">Attendance Summary — {label}</h3>
        </div>
        {attendanceReport.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">No data for this period.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Employee</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold text-emerald-300 uppercase tracking-wider">Present</th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Half Days</th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold text-amber-300 uppercase tracking-wider">Late</th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold text-violet-300 uppercase tracking-wider">On Leave</th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold text-rose-300 uppercase tracking-wider">Absent</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {attendanceReport.map((r) => (
                <tr key={r.user_id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-2">
                    <button
                      onClick={() => setSelectedEmployee({ userId: r.user_id, name: r.full_name, role: r.role_label })}
                      className="flex items-center gap-1.5 text-white hover:text-brand-300 transition-colors font-medium group"
                    >
                      {r.full_name}
                      <Eye className="h-3 w-3 text-slate-500 group-hover:text-brand-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </td>
                  <td className="px-3 py-2 text-slate-400">{r.role_label}</td>
                  <td className="px-3 py-2 text-center text-emerald-300">{r.present}</td>
                  <td className="px-3 py-2 text-center text-slate-300">{r.half_days}</td>
                  <td className="px-3 py-2 text-center text-amber-300">{r.late}</td>
                  <td className="px-3 py-2 text-center text-violet-300">{r.on_leave}</td>
                  <td className="px-3 py-2 text-center text-rose-300">{r.absent}</td>
                  <td className="px-3 py-2 text-right text-slate-200">{r.total_hours.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Leave records */}
      <div className="card overflow-x-auto">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="font-semibold text-sm">Leave Records — {label}</h3>
        </div>
        {leaveReport.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">No leaves recorded in this period.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Employee</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">From</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">To</th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Days</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {leaveReport.map((l) => (
                <tr key={l.id} className="hover:bg-white/[0.03] transition-colors align-top">
                  <td className="px-4 py-2 font-medium text-white">{l.full_name}</td>
                  <td className="px-3 py-2 text-slate-300 capitalize">{l.leave_type}</td>
                  <td className="px-3 py-2 text-slate-400">{isoDate(l.start_date)}</td>
                  <td className="px-3 py-2 text-slate-400">{isoDate(l.end_date)}</td>
                  <td className="px-3 py-2 text-center text-slate-200">{l.days}</td>
                  <td className="px-3 py-2">
                    <span className={`badge ${
                      l.status === "approved" ? "bg-emerald-400/10 text-emerald-300"
                      : l.status === "rejected" ? "bg-rose-400/10 text-rose-300"
                      : "bg-amber-400/10 text-amber-300"
                    }`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-500 max-w-[220px] truncate" title={l.reason}>{l.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function escapeHtml(s: string) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
