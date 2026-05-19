/* ════════════════════════════════════════════════════════════
   sw.js  —  Service Worker (PWA)
   ════════════════════════════════════════════════════════════ */

const CACHE_NAME = "pigeons-v1";

const SHELL = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/config.js",
  "/js/pigeon.js",
  "/js/hatch.js",
  "/js/battle.js",
  "/js/app.js",
  "/manifest.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Skip non-GET and browser-extension requests
  if (e.request.method !== "GET" || !url.protocol.startsWith("http")) return;

  // Network-first for API and Firebase calls
  if (url.pathname.startsWith("/api/") || url.hostname.includes("firebase") || url.hostname.includes("googleapis")) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for pigeon PNG assets
  if (url.pathname.includes("/assets/")) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          // Only cache successful responses
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // Stale-while-revalidate for everything else
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetched = fetch(e.request).then((res) => {
        // Clone BEFORE consuming
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        return res;
      });
      return cached || fetched;
    })
  );
});
