"use client";

import { useState } from "react";
import { Save, Clock, Timer, Coffee } from "lucide-react";
import {
  getAttendanceSettingsAction,
  updateAttendanceSettingsAction,
  type AttendanceSettings,
} from "@/lib/actions/attendance";
import { useToast } from "@/components/Toast";
import { useEffect } from "react";

const DEFAULT: AttendanceSettings = {
  shift_start_time: "10:00",
  shift_end_time: "19:00",
  late_grace_period_mins: 15,
  minimum_hours_for_half_day: 4.5,
  minimum_hours_for_full_day: 8.0,
  monthly_paid_leaves: 1,
  allowed_break_mins: 60,
};

export default function AttendanceSettingsPanel() {
  const { toast } = useToast();
  const [form, setForm] = useState<AttendanceSettings>(DEFAULT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getAttendanceSettingsAction().then((res) => {
      if (res.ok && res.settings) {
        setForm(res.settings);
        setLoaded(true);
      }
    });
  }, []);

  const set = (key: keyof AttendanceSettings, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function save() {
    const res = await updateAttendanceSettingsAction(form);
    if (res.ok) toast("Attendance settings saved.", "success");
    else toast(res.error || "Failed to save settings.", "error");
  }

  return (
    <div className="space-y-4">
      <div className="card p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-brand-300" />
          <h2 className="font-semibold text-sm">Attendance Engine Settings</h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Shift Start (24h, HH:MM)</label>
            <input
              type="time"
              className="input"
              value={form.shift_start_time}
              onChange={(e) => set("shift_start_time", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Shift End (24h, HH:MM)</label>
            <input
              type="time"
              className="input"
              value={form.shift_end_time}
              onChange={(e) => set("shift_end_time", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Late grace (minutes)</label>
            <input
              type="number"
              className="input"
              value={form.late_grace_period_mins}
              onChange={(e) => set("late_grace_period_mins", Number(e.target.value))}
            />
            <p className="text-[11px] text-slate-500 mt-1">Punch-in after start + grace marks the day &ldquo;late&rdquo;.</p>
          </div>
          <div>
            <label className="label">Allowed lunch/break (minutes)</label>
            <input
              type="number"
              className="input"
              value={form.allowed_break_mins}
              onChange={(e) => set("allowed_break_mins", Number(e.target.value))}
            />
            <p className="text-[11px] text-slate-500 mt-1">Exceeding this flags &ldquo;Overbreak&rdquo; on reports.</p>
          </div>
          <div>
            <label className="label">Min hours for half day</label>
            <input
              type="number"
              step="0.5"
              className="input"
              value={form.minimum_hours_for_half_day}
              onChange={(e) => set("minimum_hours_for_half_day", Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Min hours for full day</label>
            <input
              type="number"
              step="0.5"
              className="input"
              value={form.minimum_hours_for_full_day}
              onChange={(e) => set("minimum_hours_for_full_day", Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Paid leaves per month</label>
            <input
              type="number"
              className="input"
              value={form.monthly_paid_leaves}
              onChange={(e) => set("monthly_paid_leaves", Number(e.target.value))}
            />
            <p className="text-[11px] text-slate-500 mt-1">Leave beyond this quota becomes Leave Without Pay.</p>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button className="btn-primary" onClick={save} disabled={!loaded}>
            <Save className="h-4 w-4" /> Save Settings
          </button>
        </div>
      </div>

      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-brand-300" />
          <h3 className="font-semibold text-sm">How the engine classifies a workday</h3>
        </div>
        <ul className="text-xs text-slate-400 space-y-2">
          <li><Coffee className="h-3.5 w-3.5 inline text-slate-500" /> Net hours = time between punch-in and punch-out minus total break time.</li>
          <li>Net &ge; full-day min → <span className="text-emerald-300">Present</span> (or <span className="text-amber-300">Late</span> if past the grace window).</li>
          <li>Full-day min &gt; net &ge; half-day min → <span className="text-slate-300">Half day</span>.</li>
          <li>Net &lt; half-day min → <span className="text-rose-300">Absent / action required</span>.</li>
          <li>Paid leave types consume the monthly paid-leave quota; anything beyond it is recorded as a Loss of Pay (is_paid = false).</li>
        </ul>
      </div>
    </div>
  );
}
