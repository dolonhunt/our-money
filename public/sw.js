/* Our Money — modest service worker (PRD §51).
   Strategy: static assets cache-first; navigations network-first with a
   cached-shell fallback so installed apps still open offline. Financial
   WRITES are never cached — Firestore handles its own offline queue, so
   nothing silently disappears. */

const VERSION = "our-money-v1";
const CORE = ["/", "/dashboard", "/login", "/manifest.webmanifest", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(CORE).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never touch Firebase/Firestore traffic — the SDK manages its own
  // persistence and offline queue.
  if (url.hostname.endsWith("firebaseio.com") || url.hostname.endsWith("googleapis.com") || url.hostname.endsWith("firebaseapp.com")) {
    return;
  }

  // Static assets: cache-first
  if (url.origin === self.location.origin && (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.endsWith(".svg") || url.pathname.endsWith(".woff2"))) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy));
            return res;
          })
      )
    );
    return;
  }

  // Navigations: network-first, fall back to cached shell (offline-safe reads)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match("/dashboard").then((d) => d || caches.match("/"))))
    );
  }
});
