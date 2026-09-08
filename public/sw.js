const CACHE = "advrix-v4";
const CORE = ["/", "/dashboard", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.headers.get("accept")?.includes("text/html")) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/dashboard")))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res.ok && req.url.startsWith("http")) {
        const c = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, c));
      }
      return res;
    }))
  );
});

// --- Web Push: OS-level notifications (background, lock screen) ---
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    try { data = { body: event.data ? event.data.text() : "" }; } catch { data = {}; }
  }
  const title = data.title || "Advrix CRM";
  const options = {
    body: data.body || "",
    icon: data.icon || "/logo-mark.png",
    badge: data.badge || "/logo-mark.png",
    data: { url: data.url || "/dashboard" },
    tag: data.tag || undefined,
    requireInteraction: false,
    vibrate: [120, 40, 120],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const win of wins) {
        if (win.url.includes(url) && "focus" in win) return win.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
