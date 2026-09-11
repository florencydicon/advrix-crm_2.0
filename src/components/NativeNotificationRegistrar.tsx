"use client";

import { useEffect } from "react";

/**
 * Native (Capacitor) FCM registration — mounted inside the app shell.
 *
 * When the web CRM is loaded inside the Android WebView (mobile app), this
 * talks to the @capacitor/push-notifications native plugin to:
 *   1. request POST_NOTIFICATIONS permission,
 *   2. register for Firebase Cloud Messaging,
 *   3. send the returned FCM token to the backend (/api/push/fcm),
 *   4. surface foreground notifications via a local channel (system tray),
 *   5. deep-link when a background notification is tapped.
 *
 * In a regular browser (window.Capacitor undefined) this does nothing,
 * so desktop/PWA users still rely on the web-push service worker instead.
 */
export default function NativeNotificationRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const capacitor = (window as any).Capacitor as any;
    if (!capacitor?.isNativePlatform?.()) return;

    let active = true;
    let cleanupFns: Array<() => void> = [];

    (async () => {
      const [{ Capacitor }, { PushNotifications }, { LocalNotifications }] =
        await Promise.all([
          import("@capacitor/core"),
          import("@capacitor/push-notifications"),
          import("@capacitor/local-notifications"),
        ]);

      if (!active) return;
      const platform = Capacitor.getPlatform?.() || "android";

      try {
        // Android 8+ requires a notification channel for local display.
        try {
          await PushNotifications.createChannel({
            id: "advrix",
            name: "Advrix",
            description: "Advrix CRM alerts",
            importance: 5,
            visibility: 1,
          });
        } catch {}

        let permission = await PushNotifications.checkPermissions().catch(() => ({ receive: "prompt" } as any));
        if (permission?.receive === "prompt") {
          permission = await PushNotifications.requestPermissions().catch(
            () => ({ receive: "denied" } as any)
          );
        }
        if (permission?.receive !== "granted") return;

        // Register with FCM and submit token to the backend.
        await PushNotifications.register();

        cleanupFns.push(
          (await PushNotifications.addListener("registration", async ({ value }) => {
            if (!active || !value) return;
            try {
              await fetch("/api/push/fcm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: value, platform }),
              });
            } catch {}
          })).remove
        );

        cleanupFns.push(
          (await PushNotifications.addListener("registrationError", () => {})).remove
        );

        // Foreground messages: FCM does not auto-show while app is visible, so
        // schedule an OS-level local notification so mobile alerts always appear.
        cleanupFns.push(
          (await PushNotifications.addListener("pushNotificationReceived", (n: any) => {
            if (!active) return;
            const data = n?.data || {};
            const title = n?.title || "Advrix";
            const body = n?.body || "";
            const url = data.url || "/dashboard";
            try {
              LocalNotifications.schedule({
                notifications: [
                  {
                    id: Math.floor(Date.now() % 100000000) + Math.floor(Math.random() * 1000),
                    title,
                    body,
                    extra: { url },
                  },
                ],
              });
            } catch {}
          })).remove
        );

        // Tapping a background/foreground notification → deep-link.
        const go = (data: any) => {
          const url = (data && data.url) || "/dashboard";
          window.location.href = url.startsWith("/") ? url : `/${url.replace(/^\//, "")}`;
        };
        cleanupFns.push(
          (await PushNotifications.addListener("pushNotificationActionPerformed", (res: any) => {
            go(res?.notification?.data || res?.data);
          })).remove
        );
        cleanupFns.push(
          (await LocalNotifications.addListener("localNotificationActionPerformed", (res: any) => {
            go(res?.notification?.extra || res?.actionId);
          })).remove
        );
      } catch {}
    })();

    return () => {
      active = false;
      cleanupFns.forEach((fn) => { try { fn(); } catch {} });
    };
  }, []);

  return null;
}