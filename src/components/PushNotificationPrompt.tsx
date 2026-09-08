"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, CheckCircle2, AlertTriangle, X } from "lucide-react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export default function PushNotificationPrompt() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ok = typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
    setSupported(ok);
    if (!ok) { setPermission("unsupported"); return; }
    setPermission(Notification.permission as NotificationPermission);
    // check if already subscribed
    navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()).then((sub) => {
      if (sub) setSubscribed(true);
    }).catch(() => {});
    const wasDismissed = localStorage.getItem("advrix.push.dismissed") === "1";
    if (wasDismissed) setDismissed(true);
  }, []);

  const subscribe = useCallback(async () => {
    if (!supported) return;
    setLoading(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as NotificationPermission);
      if (perm !== "granted") {
        setError(perm === "denied" ? "Notifications blocked — enable in browser settings." : "Permission not granted.");
        setLoading(false);
        return;
      }
      // fetch vapid key
      const vapRes = await fetch("/api/push/vapid", { cache: "no-store" });
      const { publicKey } = (await vapRes.json()) as { publicKey: string };
      if (!publicKey) throw new Error("Missing VAPID key");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      });
      const json = sub.toJSON();
      const payload = {
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
      };
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Subscription save failed");
      setSubscribed(true);
      localStorage.removeItem("advrix.push.dismissed");
    } catch (e: any) {
      setError(e?.message || "Failed to enable notifications");
    } finally {
      setLoading(false);
    }
  }, [supported]);

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem("advrix.push.dismissed", "1"); } catch {}
  };

  if (!supported || permission === "unsupported" || dismissed) return null;
  if (subscribed && permission === "granted") {
    // Subtle checkmark state — still hide prompt to reduce clutter, but keep hook for re-enable if needed
    return null;
  }
  if (permission === "denied") {
    return (
      <div className="card p-4 flex items-start gap-3 ring-1 ring-amber-400/20 bg-amber-400/5">
        <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Push notifications blocked</p>
          <p className="text-xs text-slate-400 mt-1">Allow notifications in your browser settings to get OS-level alerts (lock screen) for lunch breaks, leaves, and tasks.</p>
        </div>
        <button onClick={dismiss} className="p-1 rounded hover:bg-white/10 text-slate-400"><X className="h-4 w-4" /></button>
      </div>
    );
  }

  return (
    <div className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3 ring-1 ring-brand-300/20 bg-brand-300/5 overflow-hidden">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="h-9 w-9 rounded-xl bg-brand-300/15 flex items-center justify-center shrink-0">
          <Bell className="h-5 w-5 text-brand-300" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">Enable push notifications</p>
          <p className="text-xs text-slate-400 mt-0.5">Get OS-level alerts on mobile lock screen, desktop, and tablets — even when Advrix is in the background.</p>
          {error && <p className="text-xs text-rose-300 mt-1">{error}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
        <button onClick={subscribe} disabled={loading} className="btn-primary !py-2 text-xs flex-1 sm:flex-none justify-center">
          {loading ? "Enabling…" : "Enable Push Notifications"}
        </button>
        <button onClick={dismiss} className="btn-ghost !py-2 text-xs shrink-0">Later</button>
      </div>
      {subscribed && (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> Enabled</span>
      )}
    </div>
  );
}
