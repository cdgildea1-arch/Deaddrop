// Your Move background worker: push notifications + Home Screen icon badge for chat messages.
// No fetch handler on purpose — it never touches page loads or caching for anything on the site.
const BADGE_CACHE = 'your-move-badge', BADGE_KEY = '/__your-move-badge';
async function readBadge() {
  try { const r = await (await caches.open(BADGE_CACHE)).match(BADGE_KEY); return r ? Number(await r.text()) || 0 : 0; } catch { return 0; }
}
async function writeBadge(n) {
  try { await (await caches.open(BADGE_CACHE)).put(BADGE_KEY, new Response(String(n))); } catch {}
  try { n > 0 ? await self.navigator.setAppBadge?.(n) : await self.navigator.clearAppBadge?.(); } catch {}
}
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data?.text() }; }
  e.waitUntil((async () => {
    const n = (await readBadge()) + 1;
    await writeBadge(n);
    // iPhone requires a visible notification for every push, so always show one.
    await self.registration.showNotification(d.title || 'Your Move', {
      body: d.body || 'New message', tag: 'your-move-' + (d.thread || 'room'), renotify: true,
      icon: '/your-move-assets/move-192.png', badge: '/your-move-assets/move-192.png',
      data: { url: d.url || '/' }, timestamp: d.ts || Date.now(),
    });
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || '/', self.location.origin).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) { try { await w.focus(); if (w.url !== url) await w.navigate?.(url); return; } catch {} }
    await self.clients.openWindow(url);
  })());
});

// The open app sends the real unread count so the badge and the next push start from the right number.
self.addEventListener('message', e => { if (typeof e.data?.badge === 'number') e.waitUntil(writeBadge(e.data.badge)); });
