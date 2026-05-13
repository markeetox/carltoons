/* ════════════════════════════════════════════════════════════
   sw.js  —  Service Worker (PWA)
   Caches shell assets so the app loads offline.
   Pigeon PNGs are cached on first load and served from cache.
   ════════════════════════════════════════════════════════════ */

const CACHE_NAME = "tooniseum-v1";

// Shell assets — always cached
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

  // Network-first for API calls (Firebase, Discord edge functions)
  if (url.pathname.startsWith("/api/") || url.hostname.includes("firebase")) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  // Cache-first for pigeon PNG assets
  if (url.pathname.startsWith("/assets/")) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
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
        caches.open(CACHE_NAME).then((c) => c.put(e.request, res.clone()));
        return res;
      });
      return cached || fetched;
    })
  );
});
