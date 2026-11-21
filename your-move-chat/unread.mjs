// Unread chat badges for Your Move. No push, no lock-screen notifications: while the app is open it asks the chat
// server for the other person's message times, compares them with what this phone has seen, and shows red counts
// on Chat buttons, game tiles and (Home Screen app only) the app icon. The icon keeps its last number after closing.
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
}
// iOS only shows an icon badge for a Home Screen app that has notification permission. Ask once, from a tap.
export function askForIconBadge() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (!standalone || !navigator.setAppBadge || !('Notification' in window) || Notification.permission !== 'default') return;
  Notification.requestPermission().then(() => checkUnread()).catch(() => {});
}
// Poll while the page is visible.
export function startUnread(every = 10000) {
  checkUnread();
  setInterval(() => { if (!document.hidden) checkUnread(); }, every);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkUnread(); });
}
