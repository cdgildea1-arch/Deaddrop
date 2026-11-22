// Share location with the other person in your Your Move room. Add to a game page with
//   <script type="module" src="/your-move-chat/location.mjs?v=1"></script>
// It puts an arrow button next to the page's Chat button. Sharing is off until you turn it on, only updates while the
// game is open on screen (iPhone web apps can't use location in the background), and turning it off erases your spot.
const api = 'https://lecudeiafwhyhufceurv.supabase.co/functions/v1/pounce-chat';
const apiKey = 'sb_publishable_Q9ESUnHKw3-FPpGeTYRfSA_4sg55UMD';
const read = (k, d = null) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const room = () => { const r = read('pounce.room'); return r?.code && r?.secret ? r : null; };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
async function call(op, extra = {}) {
  const r = room(); if (!r) throw new Error('Join a room first.');
  const res = await fetch(api, { method: 'POST', signal: AbortSignal.timeout(10000), headers: { 'Content-Type': 'application/json', apikey: apiKey },
    body: JSON.stringify({ op, code: r.code, secret: r.secret, ...extra }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not connect.');
  return data;
}
const ago = ts => { const s = Math.max(0, (Date.now() - ts) / 1000);
  return s < 60 ? 'just now' : s < 3600 ? Math.round(s / 60) + ' min ago' : Math.round(s / 3600) + ' hr ago'; };

const ARROW = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M21 3 3 10.5l7.2 2.3L12.5 20z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const css = `
.yl-pair{display:flex;align-items:center;gap:6px}
.yl-btn{display:inline-flex;align-items:center;justify-content:center;position:relative;width:36px;height:32px;padding:0;border-radius:10px;color:#9aa0a6}
.yl-btn.on{color:#0a84ff}
.yl-btn.theirs::after{content:'';position:absolute;top:3px;right:3px;width:8px;height:8px;border-radius:50%;background:#30d158;box-shadow:0 0 0 2px #0008}
.yl{border:1px solid #ffffff22;border-radius:20px;background:#1c1f26;color:#fff;padding:16px;width:min(92vw,420px);font:15px/1.4 system-ui,sans-serif}
.yl::backdrop{background:#000a}
.yl-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.yl-head h2{margin:0;font-size:18px}
.yl-head button{background:none;border:0;color:#9aa0a6;font-size:20px;padding:4px 8px}
.yl-map{width:100%;height:240px;border:0;border-radius:14px;background:#2a2e36;display:block}
.yl-empty{height:120px;display:flex;align-items:center;justify-content:center;text-align:center;border-radius:14px;background:#2a2e36;color:#9aa0a6;padding:0 16px}
.yl-meta{display:flex;justify-content:space-between;align-items:center;margin:8px 2px 14px;color:#b8bcc2;font-size:13px}
.yl-meta a{color:#0a84ff;text-decoration:none;font-weight:600}
.yl-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border-radius:14px;background:#2a2e36}
.yl-row small{display:block;color:#9aa0a6;font-size:12px}
.yl-sw{appearance:none;flex:none;width:51px;height:31px;border-radius:16px;background:#48484a;position:relative;transition:background .2s;cursor:pointer}
.yl-sw::after{content:'';position:absolute;top:2px;left:2px;width:27px;height:27px;border-radius:50%;background:#fff;transition:transform .2s}
.yl-sw:checked{background:#30d158}.yl-sw:checked::after{transform:translateX(20px)}
.yl-err{color:#ff6961;font-size:13px;margin:8px 2px 0;min-height:1em}`;
document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);

const btn = document.createElement('button');
btn.type = 'button'; btn.className = 'yl-btn'; btn.innerHTML = ARROW; btn.setAttribute('aria-label', 'Share location');
const anchor = document.querySelector('#chatToggle, .move-chat-launch, [data-move-chat-button]');
// Keep the arrow and Chat together on the right so the header's spacing doesn't change.
if (anchor) { const pair = document.createElement('div'); pair.className = 'yl-pair'; anchor.before(pair); pair.append(btn, anchor); }
else document.querySelector('header')?.append(btn);

const dlg = document.createElement('dialog');
dlg.className = 'yl';
dlg.innerHTML = `<div class="yl-head"><h2>Location</h2><button type="button" aria-label="Close">✕</button></div>
<div class="yl-where"></div><div class="yl-meta"></div>
<label class="yl-row"><span><b>Share my location</b><small>Updates only while this game is open. Off erases it.</small></span><input type="checkbox" class="yl-sw"></label>
<p class="yl-err" role="status"></p>`;
document.body.append(dlg);
const $ = s => dlg.querySelector(s), sw = $('.yl-sw'), err = $('.yl-err');
$('.yl-head button').onclick = () => dlg.close();
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

let sharing = !!read('your-move.loc.on'), watch = null, lastSent = 0, lastPos = null, them = null, themName = 'Your friend', shownKey = '';
function draw() {
  btn.classList.toggle('on', sharing);
  btn.classList.toggle('theirs', !!them);
  sw.checked = sharing;
  $('.yl-head h2').textContent = themName + '’s location';
  if (!room()) { $('.yl-where').innerHTML = '<div class="yl-empty">Join a room with your friend to share locations.</div>'; $('.yl-meta').textContent = ''; return; }
  if (!them) { shownKey = ''; $('.yl-where').innerHTML = `<div class="yl-empty">${esc(themName)} isn’t sharing a location right now.</div>`; $('.yl-meta').textContent = ''; return; }
  const key = them.lat.toFixed(5) + ',' + them.lng.toFixed(5);
  if (key !== shownKey) { // only reload the map when the spot actually moves
    shownKey = key;
    const d = 0.006, bbox = [them.lng - d, them.lat - d * 0.75, them.lng + d, them.lat + d * 0.75].join(',');
    $('.yl-where').innerHTML = `<iframe class="yl-map" title="Map" loading="lazy" referrerpolicy="no-referrer"
      src="https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${them.lat},${them.lng}"></iframe>`;
  }
  $('.yl-meta').innerHTML = `<span>Updated ${ago(them.ts)}${them.acc ? ` · within ${Math.round(them.acc)} m` : ''}</span>
    <a href="https://maps.apple.com/?ll=${them.lat},${them.lng}&q=${encodeURIComponent(themName)}" target="_blank" rel="noopener">Open in Maps</a>`;
}
async function refresh() {
  if (!room() || document.hidden) return draw();
  try { const d = await call('loc-get'); them = d.theirs; themName = d.name || themName; err.textContent = ''; } catch {}
  draw();
}
function send(pos, force = false) {
  const { latitude: lat, longitude: lng, accuracy: acc } = pos.coords;
  const moved = !lastPos || Math.hypot(lat - lastPos.lat, (lng - lastPos.lng) * Math.cos(lat * Math.PI / 180)) * 111000 > 25;
  if (!force && !moved && Date.now() - lastSent < 60000) return; // every 25 m, or a heartbeat each minute
  if (!force && Date.now() - lastSent < 10000) return;
  lastSent = Date.now(); lastPos = { lat, lng };
  call('loc-set', { lat, lng, acc }).catch(e => { err.textContent = e.message; });
}
function startWatch() {
  if (watch != null || !sharing || document.hidden || !navigator.geolocation || !room()) return;
  watch = navigator.geolocation.watchPosition(p => send(p), e => {
    if (e.code === 1) { setSharing(false); err.textContent = 'Location is blocked. Allow it in iPhone Settings → Privacy & Security → Location Services → Safari Websites (or Your Move).'; }
  }, { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 });
}
function stopWatch() { if (watch != null) navigator.geolocation.clearWatch(watch); watch = null; }
async function setSharing(on) {
  sharing = on; write('your-move.loc.on', on); draw();
  if (on) {
    if (!room()) { err.textContent = 'Join a room first.'; return setSharing(false); }
    err.textContent = '';
    // Ask right from the tap so iPhone shows its location prompt.
    navigator.geolocation?.getCurrentPosition(p => send(p, true), () => {}, { enableHighAccuracy: true, timeout: 20000 });
    startWatch();
  } else {
    stopWatch(); lastPos = null;
    call('loc-off').catch(() => {});
  }
}
sw.onchange = () => setSharing(sw.checked);
btn.onclick = () => { draw(); dlg.showModal(); refresh(); };

document.addEventListener('visibilitychange', () => { if (document.hidden) stopWatch(); else { startWatch(); refresh(); } });
setInterval(() => { if (!document.hidden) refresh(); }, 20000);
setInterval(() => { if (dlg.open && them) draw(); }, 15000); // keep "updated x min ago" current
draw(); refresh(); startWatch();
