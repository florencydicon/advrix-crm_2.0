"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Search,
  X,
  ImagePlus,
  Pencil,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  Eye,
  Save,
  Loader2,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { updateAttendanceRecordAction, uploadAttendanceProofAction } from "@/lib/actions/attendance";

type GridRow = {
  user_id: string;
  full_name: string;
  role_label: string;
  date: string;
  punch_in: string | null;
  punch_out: string | null;
  status: string;
  hours_worked: number;
  total_break_mins: number;
  proof_image_url: string | null;
  location_text: string | null;
  latitude: number | null;
  longitude: number | null;
};

type LeaveRow = {
  id: string;
  user_id: string;
  full_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
};

type UserRowLite = { id: string; full_name: string; role_label: string };

const STATUS_META: Record<string, { label: string; bg: string; text: string; dot: string; icon: typeof CheckCircle2 }> = {
  present: { label: "P", bg: "bg-emerald-500/15", text: "text-emerald-300", dot: "bg-emerald-500", icon: CheckCircle2 },
  late: { label: "L", bg: "bg-amber-400/15", text: "text-amber-300", dot: "bg-amber-500", icon: AlertCircle },
  half_day: { label: "HD", bg: "bg-sky-400/15", text: "text-sky-300", dot: "bg-sky-500", icon: Clock },
  absent: { label: "A", bg: "bg-rose-500/10", text: "text-rose-300", dot: "bg-rose-500", icon: XCircle },
  on_leave: { label: "LV", bg: "bg-violet-500/15", text: "text-violet-300", dot: "bg-violet-500", icon: Calendar },
};

function isoDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function AttendanceCalendarView({ month, year }: { month: number; year: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const [grid, setGrid] = useState<GridRow[]>([]);
  const [leaves, setLeaves] = useState<LeaveRow[]>([]);
  const [users, setUsers] = useState<UserRowLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ user_id: string; full_name: string; role_label: string; date: string; row?: GridRow | null } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [editStatus, setEditStatus] = useState("present");
  const [editHours, setEditHours] = useState("");
  const [editImage, setEditImage] = useState<string | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const todayStr = isoDate(new Date());
  const isCurrentMonth = new Date().getMonth() + 1 === month && new Date().getFullYear() === year;

  const fetchGrid = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/grid?month=${month}&year=${year}`, { cache: "no-store" });
      const data = await res.json();
      setGrid(data.grid || []);
      setLeaves((data.leaves || []).filter((l: LeaveRow) => l.status === "approved"));
      setUsers(data.users || []);
    } catch {
      toast("Failed to load calendar data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrid();
  }, [month, year]);

  const gridMap = useMemo(() => {
    const m = new Map<string, GridRow>();
    for (const r of grid) {
      const key = `${r.user_id}-${String(r.date).slice(0, 10)}`;
      m.set(key, r);
    }
    return m;
  }, [grid]);

  const isDateOnLeaveForUser = (user: UserRowLite, dateStr: string) => {
    return leaves.some(
      (l) =>
        l.user_id === user.id &&
        String(l.start_date).slice(0, 10) <= dateStr &&
        String(l.end_date).slice(0, 10) >= dateStr
    );
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => `${u.full_name} ${u.role_label}`.toLowerCase().includes(q));
  }, [users, search]);

  const openEdit = (user: UserRowLite, dateStr: string, row: GridRow | null | undefined) => {
    setEditing({ user_id: user.id, full_name: user.full_name, role_label: user.role_label, date: dateStr, row: row || null });
    const isOnLeave = isDateOnLeaveForUser(user, dateStr);
    setEditStatus(row?.status || (isOnLeave ? "on_leave" : "present"));
    setEditHours(row?.hours_worked != null ? String(row.hours_worked) : "");
    setEditImage(row?.proof_image_url || null);
    setEditFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) {
      toast("Image too large (max 4MB)", "error");
      return;
    }
    setEditFile(f);
    const reader = new FileReader();
    reader.onload = () => setEditImage(String(reader.result));
    reader.readAsDataURL(f);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await updateAttendanceRecordAction({
        user_id: editing.user_id,
        date: editing.date,
        status: editStatus,
        hours_worked: editHours === "" ? undefined : Number(editHours),
      });
      if ((res as { error?: string }).error) {
        toast((res as { error: string }).error, "error");
        setSaving(false);
        return;
      }
      if (editFile && editImage) {
        const up = await uploadAttendanceProofAction({
          user_id: editing.user_id,
          date: editing.date,
          proof_image_url: editImage,
        });
        if ((up as { error?: string }).error) {
          toast((up as { error: string }).error, "error");
        }
      }
      toast("Calendar entry updated", "success");
      setEditing(null);
      await fetchGrid();
      router.refresh();
    } catch {
      toast("Failed to update", "error");
    } finally {
      setSaving(false);
    }
  };

  const goToday = () => {
    const now = new Date();
    router.push(`/attendance?month=${now.getMonth() + 1}&year=${now.getFullYear()}`);
  };

  const clearFilter = () => {
    setSearch("");
  };

  if (loading) {
    return (
      <div className="card p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-10 bg-white/[0.04] rounded" />
          <div className="h-64 bg-white/[0.03] rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="card p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee…"
            className="input !py-1.5 !pl-8 text-xs w-full"
          />
        </div>
        <button
          onClick={goToday}
          className={`btn-secondary !py-1.5 !px-3 text-xs ${isCurrentMonth ? "bg-brand-300/20 text-brand-300 border-brand-300/30" : ""}`}
        >
          <Calendar className="h-3.5 w-3.5" /> Today
        </button>
        <button onClick={clearFilter} className="btn-ghost !py-1.5 !px-3 text-xs">
          <X className="h-3.5 w-3.5" /> Clear Filter
        </button>
        <span className="ml-auto text-[11px] text-slate-500">{filteredUsers.length} employees · {daysInMonth} days</span>
      </div>

      {/* Calendar grid */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-white/[0.04] border-b border-white/10">
                <th className="sticky left-0 z-20 bg-night-850 px-3 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider min-w-[160px] border-r border-white/10">
                  Employee
                </th>
                {days.map((d) => {
                  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                  const isToday = dateStr === todayStr;
                  const dayName = new Date(year, month - 1, d).toLocaleDateString([], { weekday: "short" }).slice(0, 2);
                  const isSun = new Date(year, month - 1, d).getDay() === 0;
                  return (
                    <th
                      key={d}
                      className={`px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wider min-w-[54px] border-r border-white/[0.04] ${
                        isToday ? "bg-brand-300/15 text-brand-300 ring-1 ring-brand-300/30" : isSun ? "text-rose-300 bg-rose-500/5" : "text-slate-400"
                      }`}
                    >
                      <div>{dayName}</div>
                      <div className={`text-[11px] ${isToday ? "text-brand-200 font-bold" : "text-white"}`}>{d}</div>
                    </th>
                  );
                })}
                <th className="px-2 py-2 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider min-w-[70px]">Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={days.length + 2} className="px-4 py-10 text-center text-sm text-slate-500">
                    No employees match filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="sticky left-0 z-10 bg-night-850 px-3 py-2 border-r border-white/10">
                      <p className="text-[11px] font-medium text-white truncate max-w-[150px]">{user.full_name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{user.role_label}</p>
                    </td>
                    {days.map((d) => {
                      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                      const row = gridMap.get(`${user.id}-${dateStr}`) || null;
                      const onLeave = isDateOnLeaveForUser(user, dateStr);
                      const isToday = dateStr === todayStr;
                      const isFuture = dateStr > todayStr;
                      let status = row?.status || (onLeave ? "on_leave" : isFuture ? "" : "absent");
                      // if leave overrides, force on_leave display even if attendance says present (due to prior punch)
                      if (onLeave) status = "on_leave";
                      const meta = STATUS_META[status];
                      const isWeekendSun = new Date(year, month - 1, d).getDay() === 0;
                      return (
                        <td
                          key={d}
                          onClick={() => openEdit(user, dateStr, row)}
                          className={`px-1 py-1.5 text-center cursor-pointer border-r border-white/[0.03] align-top min-h-[52px] ${
                            isToday ? "ring-1 ring-brand-300/40 bg-brand-300/[0.04]" : ""
                          }`}
                          title={`${user.full_name} · ${dateStr} · ${status || "no record"}${row?.hours_worked ? ` · ${row.hours_worked}h` : ""}`}
                        >
                          {status ? (
                            <div className={`rounded-lg px-1 py-1.5 flex flex-col items-center gap-1 ${meta?.bg || "bg-white/5"} ${isWeekendSun && status === "absent" ? "opacity-60" : ""}`}>
                              <span className={`text-[10px] font-bold leading-none ${meta?.text || "text-slate-400"}`}>{meta?.label || "—"}</span>
                              {row?.hours_worked != null && row.hours_worked > 0 && (
                                <span className="text-[9px] text-white/80 leading-none">{Number(row.hours_worked).toFixed(1)}h</span>
                              )}
                              {row?.proof_image_url && (
                                <img src={row.proof_image_url} alt="proof" className="h-6 w-6 rounded object-cover ring-1 ring-white/20" />
                              )}
                              {!row?.proof_image_url && status !== "absent" && status !== "" && (
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-white/5 border border-dashed border-white/15">
                                  <ImagePlus className="h-3 w-3 text-slate-500" />
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="rounded-lg bg-transparent py-2">
                              <span className="text-[10px] text-slate-700">—</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1 text-center">
                      <button
                        onClick={() => {
                          const rowsForUser = grid.filter((r) => r.user_id === user.id);
                          if (rowsForUser.length === 0) toast("No data for report", "error");
                          else toast(`${user.full_name}: ${rowsForUser.length} records this month`, "success");
                        }}
                        className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-white/5 hover:bg-brand-300/20 text-slate-400 hover:text-brand-300 transition-colors"
                        title="View report"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-3 py-2 border-t border-white/[0.06] flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Present</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> Late</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-500" /> Half Day</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500" /> Absent</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500" /> Leave</span>
          <span className="hidden sm:inline ml-2">· Click any day to edit status / upload proof image</span>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditing(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-night-850 border border-white/10 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-white">{editing.full_name}</h3>
                <p className="text-[11px] text-slate-400">{editing.role_label} · {editing.date}</p>
              </div>
              <button onClick={() => setEditing(null)} className="p-1 rounded-lg hover:bg-white/10 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label text-[11px]">Status</label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="input !py-2 text-xs">
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="half_day">Half Day</option>
                  <option value="absent">Absent</option>
                  <option value="on_leave">On Leave</option>
                </select>
              </div>
              <div>
                <label className="label text-[11px]">Hours worked</label>
                <input type="number" step="0.1" value={editHours} onChange={(e) => setEditHours(e.target.value)} placeholder="e.g. 8.0" className="input !py-2 text-xs" />
              </div>
              <div>
                <label className="label text-[11px] flex items-center gap-1.5"><ImagePlus className="h-3 w-3" /> Proof image (upload)</label>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                <div
                  onClick={() => fileRef.current?.click()}
                  className={`mt-1 rounded-xl border-2 border-dashed p-3 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                    editImage ? "border-brand-300/30 bg-brand-300/5" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  {editImage ? (
                    <>
                      <img src={editImage} alt="proof preview" className="max-h-40 rounded-lg object-contain ring-1 ring-white/10" />
                      <p className="text-[11px] text-brand-300">Click to change image</p>
                    </>
                  ) : (
                    <>
                      <ImagePlus className="h-6 w-6 text-slate-500" />
                      <p className="text-[11px] text-slate-400">Click to upload proof image</p>
                      <p className="text-[10px] text-slate-600">JPG/PNG, max 4MB</p>
                    </>
                  )}
                </div>
                {editImage && (
                  <button
                    type="button"
                    onClick={() => { setEditImage(null); setEditFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                    className="mt-2 text-[11px] text-rose-400 hover:text-rose-300"
                  >
                    Remove image
                  </button>
                )}
              </div>
              {editing.row && (
                <div className="rounded-lg bg-white/[0.03] px-3 py-2 text-[11px] text-slate-400 space-y-1">
                  <p>Punch in: {editing.row.punch_in ? new Date(editing.row.punch_in).toLocaleString() : "—"}</p>
                  <p>Punch out: {editing.row.punch_out ? new Date(editing.row.punch_out).toLocaleString() : "—"}</p>
                  {editing.row.location_text && <p>📍 {editing.row.location_text}</p>}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button onClick={() => setEditing(null)} className="btn-ghost flex-1 !py-2 text-xs">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 !py-2 text-xs">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
