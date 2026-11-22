// Unread chat badges + push notifications for Your Move. While the app is open it asks the chat server for the other
// person's message times, compares them with what this phone has seen, and shows red counts on Chat buttons, game tiles
// and the app icon. When the app is closed, the chat server sends a push (see /your-move-sw.js) that shows a notification
// and bumps the icon badge. iPhone: push only works in the Home Screen app, after a tap on "Turn on notifications".
const api = 'https://lecudeiafwhyhufceurv.supabase.co/functions/v1/pounce-chat';
const apiKey = 'sb_publishable_Q9ESUnHKw3-FPpGeTYRfSA_4sg55UMD';

const read = (key, fallback = null) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
const seenKey = room => 'your-move.chat.seen.' + room.code;
export const currentRoom = () => { const room = read('pounce.room'); return room?.code && room?.secret ? room : null; };

let latest = null; // last server answer: { thread: [timestamps of the other person's messages] }
const listeners = new Set();
export const onUnread = fn => { listeners.add(fn); };

function counts(room) {
  if (!latest) return null;
  let seen = read(seenKey(room));
  if (!seen) { // First run on this phone: start from now instead of badging old history.
    seen = Object.fromEntries(Object.entries(latest).map(([t, list]) => [t, Math.max(0, ...list)]));
    write(seenKey(room), seen);
  }
  const byThread = {};
  let total = 0;
  for (const [thread, list] of Object.entries(latest)) {
    const n = list.filter(ts => ts > (seen[thread] || 0)).length;
    if (n) { byThread[thread] = n; total += n; }
  }
  return { byThread, total };
}
function publish(room) {
  const result = counts(room);
  if (!result) return;
  setIconBadge(result.total);
  for (const fn of listeners) fn(result);
}
export function setIconBadge(n) {
  // Keep the background worker's count in step so the next push adds to the real number.
  try { caches.open('your-move-badge').then(c => c.put('/__your-move-badge', new Response(String(n || 0)))).catch(() => {}); } catch {}
  try {
    const p = n > 0 ? navigator.setAppBadge?.(n) : navigator.clearAppBadge?.();
    p?.catch?.(() => {});
  } catch {}
}
let busy = false;
export async function checkUnread() {
  const room = currentRoom();
  if (!room || busy) return;
  busy = true;
  try {
    const response = await fetch(api, {
      method: 'POST', signal: AbortSignal.timeout(10000),
      headers: { 'Content-Type': 'application/json', apikey: apiKey },
      body: JSON.stringify({ op: 'unread', code: room.code, secret: room.secret }),
    });
    const data = await response.json();
    if (!response.ok || !data.threads) return;
    latest = data.threads;
    publish(room);
  } catch {} finally { busy = false; }
}
// Call when a chat thread is on screen: everything up to `ts` counts as read.
export function markSeen(thread, ts) {
  const room = currentRoom();
  if (!room || !ts) return;
  const seen = read(seenKey(room), {});
  if ((seen[thread] || 0) >= ts) return;
  seen[thread] = ts;
  write(seenKey(room), seen);
  publish(room);
  // Read receipt (one-way: only the room's parent phone ever sees these; the server ignores the parent's own reads).
  fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: apiKey },
    body: JSON.stringify({ op: 'read', code: room.code, secret: room.secret, thread, ts }) }).catch(() => {});
}
// ---------- push notifications ----------
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
async function chat(op, extra) {
  const room = currentRoom();
  if (!room) throw new Error('Join a room first.');
  const r = await fetch(api, { method: 'POST', signal: AbortSignal.timeout(10000), headers: { 'Content-Type': 'application/json', apikey: apiKey },
    body: JSON.stringify({ op, code: room.code, secret: room.secret, ...extra }) });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Could not reach the chat.');
  return data;
}
const urlKey = s => { const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)); return Uint8Array.from(b, c => c.charCodeAt(0)); };
// 'on' | 'off' (can ask) | 'denied' | 'home-screen' (iPhone Safari tab: add to Home Screen first) | 'no-room' | 'unsupported'
export async function pushState() {
  if (!pushSupported()) return isIOS() && !isStandalone() ? 'home-screen' : 'unsupported';
  if (!currentRoom()) return 'no-room';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted') return 'off';
  const reg = await navigator.serviceWorker.getRegistration('/');
  return (await reg?.pushManager.getSubscription()) && read('your-move.push.room') === currentRoom().code ? 'on' : 'off';
}
// Registers the worker, subscribes this phone and tells the chat server which room seat it belongs to.
// `ask` must come from a tap the first time (iPhone won't show the permission prompt otherwise).
export async function enablePush(ask = true) {
  if (!pushSupported() || !currentRoom()) return pushState();
  if (Notification.permission === 'default') { if (!ask) return 'off'; await Notification.requestPermission(); }
  if (Notification.permission !== 'granted') return pushState();
  const reg = await navigator.serviceWorker.register('/your-move-sw.js', { scope: '/' });
  // Wait for this worker itself (not navigator.serviceWorker.ready, which on /Pounce/ would be Pounce's own worker).
  for (let i = 0; !reg.active && i < 50; i++) await new Promise(r => setTimeout(r, 100));
  const { key } = await chat('push-key');
  let sub = await reg.pushManager.getSubscription();
  const current = sub?.options?.applicationServerKey;
  if (sub && current && btoa(String.fromCharCode(...new Uint8Array(current))) !== btoa(String.fromCharCode(...urlKey(key)))) { await sub.unsubscribe(); sub = null; }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlKey(key) });
  await chat('push-sub', { sub: sub.toJSON() });
  write('your-move.push.room', currentRoom().code);
  checkUnread();
  return 'on';
}
// Kept for chat.mjs: opening a chat (a tap) turns notifications on if they aren't yet.
export function askForIconBadge() { enablePush(true).catch(() => {}); }
// Poll while the page is visible.
export function startUnread(every = 10000) {
  checkUnread();
  // Already allowed: quietly keep this phone's sign-up current (new room, new seat, or a renewed subscription).
  if (pushSupported() && Notification.permission === 'granted') enablePush(false).catch(() => {});
  setInterval(() => { if (!document.hidden) checkUnread(); }, every);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkUnread(); });
}
