// ── sw.js — FTP Channel Service Worker ───────────────────────────────────────
// Two jobs:
//   1. Makes the app installable (PWA requirement)
//   2. Caches the app shell so it loads instantly and works offline
//      (the YouTube video stream itself is never cached — that's fine)
// ─────────────────────────────────────────────────────────────────────────────

const CACHE     = 'ftp-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/FTP_MEGA.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install: cache the app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: serve shell from cache, everything else from network
self.addEventListener('fetch', e => {
  // Never intercept YouTube API calls or non-GET requests
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('youtube.com') ||
      e.request.url.includes('googleapis.com') ||
      e.request.url.includes('fonts.googleapis.com') ||
      e.request.url.includes('fonts.gstatic.com')) return;

  e.respondWith(
    caches.match(e.request)
      .then(cached => cached || fetch(e.request))
  );
});
