// ── sw.js — FTP Channel Service Worker ───────────────────────────────────────
// CACHE VERSION — bump this string any time you deploy index.html or FTP_MEGA.js
// Changing it forces all clients to evict the old cache and re-fetch everything.
const CACHE = 'ftp-v2';

// Static assets that rarely change — cache-first is fine
const STATIC_SHELL = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install: pre-cache static assets only (NOT index.html or FTP_MEGA.js)
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate: delete every old cache version
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch strategy:
//   index.html / FTP_MEGA.js → NETWORK FIRST, fall back to cache
//   Everything else          → CACHE FIRST, fall back to network
//   YouTube / Google APIs    → never intercept
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = e.request.url;

  // Never touch YouTube or font requests
  if (url.includes('youtube.com')      ||
      url.includes('googleapis.com')   ||
      url.includes('fonts.googleapis') ||
      url.includes('fonts.gstatic'))   return;

  // Network-first for the two files that change with deployments
  if (url.endsWith('/') ||
      url.includes('index.html') ||
      url.includes('FTP_MEGA.js')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // Update cache with fresh response
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request)) // offline fallback
    );
    return;
  }

  // Cache-first for icons, manifest, fonts
  e.respondWith(
    caches.match(e.request)
      .then(cached => cached || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }))
  );
});
