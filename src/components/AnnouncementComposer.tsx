"use client";

import { useMemo, useState } from "react";
import { Megaphone, Search, Send, X } from "lucide-react";
import { sendAnnouncementAction } from "@/lib/actions/notifications";
import { useToast } from "@/components/Toast";

export interface AnnouncementMember {
  id: string;
  full_name: string;
  email: string;
  role_label: string;
}

/**
 * Super Admin broadcast composer — custom title + message to all members or
 * selected single/multiple users. Delivery is in-app (bell + Updates page)
 * plus mobile (FCM) and web (VAPID) push via the announcement server action.
 */
export default function AnnouncementComposer({ members }: { members: AnnouncementMember[] }) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"all" | "selected">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  // Two-tap inline confirm — window.confirm is unreliable inside mobile WebViews
  const [confirming, setConfirming] = useState(false);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return members;
    return members.filter((m) =>
      `${m.full_name} ${m.email} ${m.role_label}`.toLowerCase().includes(q)
    );
  }, [members, q]);

  const toggle = (id: string) => {
    setConfirming(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const switchMode = (m: "all" | "selected") => {
    setConfirming(false);
    setMode(m);
  };

  const recipientCount = mode === "all" ? members.length : selected.size;

  const handleSend = () => {
    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    if (cleanTitle.length < 3) { toast("Title too short (min 3 characters).", "error"); return; }
    if (!cleanBody) { toast("Message cannot be empty.", "error"); return; }
    if (mode === "selected" && selected.size === 0) { toast("Select at least one member.", "error"); return; }
    // First tap arms the confirm, second tap actually sends
    if (!confirming) { setConfirming(true); return; }
    void doSend(cleanTitle, cleanBody);
  };

  const doSend = async (cleanTitle: string, cleanBody: string) => {
    setSending(true);
    const res: any = await sendAnnouncementAction({
      title: cleanTitle,
      body: cleanBody,
      mode,
      userIds: mode === "selected" ? [...selected] : undefined,
    });
    setSending(false);
    if (res?.error) { toast(res.error, "error"); return; }
    if (res.pushed > 0) {
      toast(`Sent to ${res.count} member${res.count === 1 ? "" : "s"} · mobile push to ${res.pushed} device${res.pushed === 1 ? "" : "s"}.`, "success");
    } else if ((res.pushDevices || 0) === 0) {
      toast(`Sent in-app to ${res.count}, but no phones are registered for push.`, "error");
    } else {
      const reason =
        res.pushError === "no-fcm-credentials" ? "push credentials missing on server" :
        res.pushError === "fcm-auth-failed" ? "push login failed on server" :
        "mobile push failed";
      toast(`Sent in-app, but ${reason}. Tell the developer: ${res.pushError || "push-failed"}.`, "error");
    }
    setTitle("");
    setBody("");
    setSelected(new Set());
    setSearch("");
    setMode("all");
    setConfirming(false);
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 px-4 md:px-5 py-3 md:py-4 border-b border-white/[0.06]">
        <Megaphone className="h-4 w-4 text-brand-300" />
        <h2 className="font-semibold text-sm">Broadcast Announcement</h2>
        <span className="badge bg-brand-300/10 text-brand-300 ml-auto">Super Admin</span>
      </div>
      <div className="p-4 md:p-5 space-y-4">
        <p className="text-xs text-slate-500">
          Custom message to the team — appears in web notifications and as a mobile push (e.g. office closed, holiday, urgent notice).
        </p>

        {/* Recipient mode */}
        <div>
          <label className="label">Send to</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => switchMode("all")}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold border transition-colors ${
                mode === "all"
                  ? "border-brand-300/50 bg-brand-300/10 text-brand-200"
                  : "border-white/10 bg-white/[0.02] text-slate-500 hover:bg-white/[0.05] hover:text-slate-300"
              }`}
            >
              All members ({members.length})
            </button>
            <button
              type="button"
              onClick={() => switchMode("selected")}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold border transition-colors ${
                mode === "selected"
                  ? "border-brand-300/50 bg-brand-300/10 text-brand-200"
                  : "border-white/10 bg-white/[0.02] text-slate-500 hover:bg-white/[0.05] hover:text-slate-300"
              }`}
            >
              Select members{selected.size > 0 ? ` (${selected.size})` : ""}
            </button>
          </div>
        </div>

        {/* Member picker */}
        {mode === "selected" && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, role..."
                className="w-full rounded-lg border border-white/10 bg-night-900 py-2 pl-9 pr-8 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-300/20"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-500 hover:text-white" aria-label="Clear search">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelected(new Set(filtered.map((m) => m.id)))}
                className="text-[11px] text-brand-300 hover:text-brand-200 font-medium"
              >
                Select all{filtered.length !== members.length ? ` (${filtered.length} shown)` : ""}
              </button>
              <span className="text-slate-600 text-[11px]">·</span>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="text-[11px] text-slate-500 hover:text-slate-300 font-medium"
              >
                Clear
              </button>
              <span className="ml-auto text-[11px] text-slate-500">{selected.size} selected</span>
            </div>
            <div className="space-y-1.5 max-h-[32vh] overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">{members.length === 0 ? "No active members found." : "No members match search."}</p>
              ) : (
                filtered.map((m) => {
                  const checked = selected.has(m.id);
                  return (
                    <label
                      key={m.id}
                      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                        checked ? "border-brand-300/40 bg-brand-300/[0.07]" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(m.id)}
                        className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-brand-300 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-white truncate">{m.full_name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{m.role_label} · {m.email}</p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Message */}
        <div>
          <label className="label">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 120))}
            className="input"
            placeholder="e.g. Office closed tomorrow"
          />
        </div>
        <div>
          <label className="label">Message <span className="text-slate-500 font-normal">({body.trim().length}/500)</span></label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 500))}
            rows={3}
            className="input"
            placeholder="Write the announcement — it reaches web notifications and mobile push..."
          />
        </div>

        {confirming && !sending ? (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/[0.07] p-3 space-y-2.5">
            <p className="text-xs text-amber-200">
              Send “{title.trim()}” to {recipientCount} member{recipientCount === 1 ? "" : "s"}? They get it in web notifications + mobile push.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirming(false)} className="btn-ghost flex-1 !py-2 text-xs">
                Cancel
              </button>
              <button onClick={handleSend} className="btn-primary flex-1 !py-2 text-xs">
                <Send className="h-3.5 w-3.5" /> Confirm send
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleSend}
            disabled={sending || recipientCount === 0}
            className="btn-primary w-full !py-2.5 text-sm disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {sending ? "Sending..." : `Send to ${recipientCount} member${recipientCount === 1 ? "" : "s"}`}
          </button>
        )}
      </div>
    </div>
  );
}
