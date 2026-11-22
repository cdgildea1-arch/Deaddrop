// Pounce chat rooms. Deployed as Supabase Edge Function `pounce-chat` (verify_jwt off: auth is done here).
// A 6-character room code (or a reserved 8-digit one) invites one friend; each device holds its own random 96-bit seat key.
// Only SHA-256 hashes of seat keys are stored. The table has RLS on and no public grants.
// Push: phones sign up with op 'push-sub'; each new message is pushed to the other seat's phones (pounce_push_v1).
import { sendPush, makeVapidKeys } from './webpush.ts';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type,apikey', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Cache-Control': 'no-store' };
const gameThreads = new Set(['pounce','speed','scrabble','guess-who','hearts','uno','duet','dots','mahjong','mahjong-daily','mahjong-level4','what-changed','draw-together','warmer','hide-a-dot','quick-draw','same-word','wavelength','butterflies','after-dark']);
const isToken = (x: unknown) => typeof x === 'string' && /^[a-f0-9]{24}$/.test(x);
const isCode = (x: unknown) => typeof x === 'string' && /^(?:[A-HJ-NP-Z2-9]{6}|[0-9]{8})$/.test(x);
const hash = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))), n => n.toString(16).padStart(2, '0')).join('');
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const cleanName = (x: unknown, d: string) => (typeof x === 'string' ? x.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 18) : '') || d;

async function db(path: string, method = 'GET', body?: unknown, table = 'pounce_rooms_v1', prefer = 'return=representation') {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const r = await fetch(Deno.env.get('SUPABASE_URL') + '/rest/v1/' + table + path, {
    method,
    headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: prefer },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) throw new Error('Storage unavailable');
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

// ---------- push notifications ----------
const pushHosts = /^(web\.push\.apple\.com|fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.notify\.windows\.com)$/;
const threadUrl: Record<string, string> = { room: '/', pounce: '/Pounce/', speed: '/speed/', hearts: '/hearts/', uno: '/uno/', 'guess-who': '/guess-who/',
  scrabble: '/scrabble/', dots: '/dots/', mahjong: '/mahjong/', 'mahjong-daily': '/mahjong/', 'mahjong-level4': '/mahjong/', duet: '/duet/',
  'what-changed': '/mini/?game=what-changed', warmer: '/mini/?game=warmer', 'hide-a-dot': '/mini/?game=hide-a-dot', 'draw-together': '/mini/?game=draw-together',
  'quick-draw': '/sketch/', 'same-word': '/same-word/', wavelength: '/wavelength/', butterflies: '/butterflies/', 'after-dark': '/after-dark/' };
let vapid: { publicKey: string; privateKey: string } | null = null;
async function vapidKeys() {
  if (vapid) return vapid;
  let row = (await db('?id=eq.1', 'GET', undefined, 'pounce_push_keys'))[0];
  if (!row) {
    const k = await makeVapidKeys();
    await db('?on_conflict=id', 'POST', { id: 1, public_key: k.publicKey, private_key: k.privateKey }, 'pounce_push_keys', 'resolution=ignore-duplicates,return=minimal');
    row = (await db('?id=eq.1', 'GET', undefined, 'pounce_push_keys'))[0];
  }
  return vapid = { publicKey: row.public_key, privateKey: row.private_key };
}
const validSub = (s: any) => s && typeof s.endpoint === 'string' && s.endpoint.length < 1000 && /^https:\/\//.test(s.endpoint)
  && pushHosts.test(new URL(s.endpoint).hostname) && typeof s.keys?.p256dh === 'string' && typeof s.keys?.auth === 'string'
  && s.keys.p256dh.length < 200 && s.keys.auth.length < 100;
async function notify(row: any, fromSeat: number, thread: string, text: string) {
  try {
    const to = 1 - fromSeat;
    const subs = await db(`?code=eq.${row.code}&seat=eq.${to}`, 'GET', undefined, 'pounce_push_v1');
    if (!subs.length) return;
    const keys = await vapidKeys();
    const name = row.names?.[fromSeat] || 'Your friend';
    const data = { title: name, body: text.length > 140 ? text.slice(0, 139) + '…' : text, thread, url: threadUrl[thread] || '/', ts: Date.now() };
    await Promise.all(subs.map(async (s: any) => {
      try {
        const status = await sendPush(s.sub, data, keys, 'https://centralarchive.online');
        if (status === 404 || status === 410) await db('?endpoint=eq.' + encodeURIComponent(s.endpoint), 'DELETE', undefined, 'pounce_push_v1', 'return=minimal');
      } catch (_e) { /* one bad phone shouldn't stop the others */ }
    }));
  } catch (_e) { /* push is best-effort */ }
}
const later = (p: Promise<unknown>) => { try { (globalThis as any).EdgeRuntime?.waitUntil(p); } catch (_e) { /* runs anyway */ } };

// Kill switch: each seat can wipe a chat for itself. `cleared[seat][thread]` is the time up to which that seat no longer
// gets messages back, on any device. The other person's copy is untouched.
const clearedAt = (row: any, seat: number, thread: string) => Number(row.cleared?.[seat]?.[thread] || 0);

function view(row: any, seat: number, after = 0) {
  // `live` is the secret realtime channel key for live games; only seated players ever see it.
  const from = Math.max(after, clearedAt(row, seat, 'room'));
  return { code: row.code, rev: row.rev, seat, joined: !!row.guest_hash, names: row.names, live: row.live, messages: row.messages.filter((m: any) => m.ts > from) };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Use POST.' }, 405);
  try {
    const raw = await req.text();
    if (raw.length > 4000) return reply({ error: 'Request too large.' }, 413);
    const b = JSON.parse(raw);
    if (!isCode(b.code) || !isToken(b.secret)) return reply({ error: 'Check the room code.' }, 400);
    const secretHash = await hash(b.secret), path = '?code=eq.' + b.code;
    const after = typeof b.after === 'number' ? b.after : 0;
    let row = (await db(path))[0];

    if (b.op === 'create') {
      if (row) return reply({ error: 'That room code is taken. Try again.' }, 409);
      row = (await db('', 'POST', { code: b.code, host_hash: secretHash, names: [cleanName(b.name, 'Player 1'), ''] }))[0];
      return reply(view(row, 0));
    }
    if (!row) return reply({ error: 'No room with that code. Double-check it with your friend.' }, 404);

    // Start over: empties both seats and the messages and issues a new live key, which cuts off both phones.
    // A seated phone can reset any room. Anyone can reset a reserved 8-digit room, so a lost phone can't lock it.
    if (b.op === 'reset') {
      const seated = row.host_hash === secretHash || row.guest_hash === secretHash;
      if (!seated && !/^[0-9]{8}$/.test(b.code)) return reply({ error: 'This phone is not part of that room.' }, 403);
      const rows = await db(path + '&rev=eq.' + row.rev, 'PATCH', { host_hash: /^[0-9]{8}$/.test(b.code) ? 'unclaimed' : secretHash, guest_hash: null,
        names: ['', ''], messages: [], game_threads: {}, cleared: {}, live: crypto.randomUUID().replace(/-/g, ''), rev: row.rev + 1, updated_at: new Date().toISOString() });
      if (!rows.length) return reply({ error: 'The room changed. Try again.' }, 409);
      await db('?code=eq.' + b.code, 'DELETE', undefined, 'pounce_push_v1', 'return=minimal').catch(() => {});
      return reply({ reset: true });
    }
    // Reserved rooms (8-digit codes) start with host_hash 'unclaimed'; the first join takes the first seat.
    if (b.op === 'join' && row.host_hash === 'unclaimed') {
      const names = [cleanName(b.name, 'Player 1'), row.names[1] || ''];
      const rows = await db(path + '&rev=eq.' + row.rev + '&host_hash=eq.unclaimed', 'PATCH', { host_hash: secretHash, names, rev: row.rev + 1, updated_at: new Date().toISOString() });
      if (!rows.length) return reply({ error: 'The room changed while joining. Try again.' }, 409);
      row = rows[0];
    }
    let seat = row.host_hash === secretHash ? 0 : row.guest_hash === secretHash ? 1 : -1;
    // Rejoin: a phone that lost its saved seat (Safari vs. the Home Screen app keep separate storage, private tabs
    // forget) gets its old seat back by joining with the same name, instead of taking the other seat or being refused.
    if (b.op === 'join' && seat < 0 && typeof b.name === 'string') {
      const want = cleanName(b.name, '').toLowerCase();
      const mine = want ? [0, 1].find(i => (row.names[i] || '').toLowerCase() === want && (i === 0 || row.guest_hash)) : undefined;
      if (mine !== undefined) {
        const rows = await db(path + '&rev=eq.' + row.rev, 'PATCH', { [mine === 0 ? 'host_hash' : 'guest_hash']: secretHash, rev: row.rev + 1, updated_at: new Date().toISOString() });
        if (!rows.length) return reply({ error: 'The room changed while joining. Try again.' }, 409);
        row = rows[0]; seat = mine;
      }
    }
    if (b.op === 'join' && seat < 0) {
      if (row.guest_hash) return reply({ error: `That room already has two people (${row.names[0]} and ${row.names[1]}). If one of them is you, join with that exact name.` }, 403);
      const names = [row.names[0], cleanName(b.name, 'Player 2')];
      const rows = await db(path + '&rev=eq.' + row.rev + '&guest_hash=is.null', 'PATCH', { guest_hash: secretHash, names, rev: row.rev + 1, updated_at: new Date().toISOString() });
      if (!rows.length) return reply({ error: 'The room changed while joining. Try again.' }, 409);
      row = rows[0]; seat = 1;
    }
    if (seat < 0) return reply({ error: 'This phone is not part of that room.' }, 403);
    if (b.op === 'get' || b.op === 'join') return reply(view(row, seat, after));

    if (b.op === 'push-key') return reply({ key: (await vapidKeys()).publicKey });
    if (b.op === 'push-sub') {
      if (!validSub(b.sub)) return reply({ error: 'That notification sign-up isn’t valid.' }, 400);
      const ep = encodeURIComponent(b.sub.endpoint);
      if (b.off === true) { await db('?endpoint=eq.' + ep, 'DELETE', undefined, 'pounce_push_v1', 'return=minimal'); return reply({ push: false }); }
      await db('?on_conflict=endpoint', 'POST', { endpoint: b.sub.endpoint, code: b.code, seat, updated_at: new Date().toISOString(),
        sub: { endpoint: b.sub.endpoint, keys: { p256dh: b.sub.keys.p256dh, auth: b.sub.keys.auth } } }, 'pounce_push_v1', 'resolution=merge-duplicates,return=minimal');
      return reply({ push: true, seat });
    }

    // Unread badges: times of the other person's messages in each chat (after this seat's Swipe), newest 50 per chat.
    if (b.op === 'unread') {
      const other = 1 - seat;
      const pick = (list: any[], thread: string) => { const from = clearedAt(row, seat, thread);
        return (list || []).filter((m: any) => m.seat === other && m.ts > from).slice(-50).map((m: any) => m.ts); };
      const threads: Record<string, number[]> = { room: pick(row.messages, 'room') };
      for (const [thread, list] of Object.entries(row.game_threads || {})) if (gameThreads.has(thread)) threads[thread] = pick(list as any[], thread);
      return reply({ seat, threads });
    }

    if (b.op === 'table-get' || b.op === 'table-message') {
      if (!gameThreads.has(b.game)) return reply({ error: 'Choose a game.' }, 400);
      const tableView = (current: any) => {
        const messages = current.game_threads[b.game] || [];
        const from = Math.max(after, clearedAt(current, seat, b.game));
        return { code: current.code, seat, joined: !!current.guest_hash, names: current.names, live: current.live,
          cursor: messages.at(-1)?.ts || 0, messages: messages.filter((m: any) => m.ts > from) };
      };
      if (b.op === 'table-get') return reply(tableView(row));
      if (!isToken(b.id) || typeof b.text !== 'string' || !b.text.trim() || b.text.length > 500)
        return reply({ error: 'Messages can be up to 500 characters.' }, 400);
      const live = row.live;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (!row || row.live !== live || (seat === 0 ? row.host_hash : row.guest_hash) !== secretHash)
          return reply({ error: 'This phone is not part of that room.' }, 403);
        const messages = row.game_threads[b.game] || [];
        if (messages.some((m: any) => m.id === b.id)) return reply(tableView(row));
        const ts = Math.max(Date.now(), (messages.at(-1)?.ts || 0) + 1);
        const game_threads = { ...row.game_threads, [b.game]: [...messages, { id: b.id, seat, text: b.text.trim(), ts }].slice(-300) };
        const rows = await db(path + '&rev=eq.' + row.rev, 'PATCH', { game_threads, rev: row.rev + 1, updated_at: new Date().toISOString() });
        if (rows.length) { later(notify(rows[0], seat, b.game, b.text.trim())); return reply(tableView(rows[0])); }
        row = (await db(path))[0];
      }
      return reply({ error: 'Busy room. Send again.' }, 409);
    }


    if (b.op === 'clear') {
      const thread = b.thread === 'room' ? 'room' : gameThreads.has(b.thread) ? b.thread : null;
      if (!thread) return reply({ error: 'Choose a chat.' }, 400);
      // Delete for both: erases the messages from the server, so neither phone (on any device) can get them back.
      if (b.both === true) {
        for (let attempt = 0; attempt < 3; attempt++) {
          const patch = thread === 'room' ? { messages: [] } : { game_threads: { ...row.game_threads, [thread]: [] } };
          const rows = await db(path + '&rev=eq.' + row.rev, 'PATCH', { ...patch, rev: row.rev + 1, updated_at: new Date().toISOString() });
          if (rows.length) return reply({ cleared: thread, both: true });
          row = (await db(path))[0];
        }
        return reply({ error: 'Busy room. Try again.' }, 409);
      }
      for (let attempt = 0; attempt < 3; attempt++) {
        const list = thread === 'room' ? row.messages : (row.game_threads[thread] || []);
        const upTo = Math.max(Date.now(), list.at(-1)?.ts || 0);
        const mine = { ...(row.cleared?.[seat] || {}), [thread]: upTo };
        const cleared = { ...(row.cleared || {}), [seat]: mine };
        const rows = await db(path + '&rev=eq.' + row.rev, 'PATCH', { cleared, rev: row.rev + 1, updated_at: new Date().toISOString() });
        if (rows.length) return reply({ cleared: thread, upTo });
        row = (await db(path))[0];
      }
      return reply({ error: 'Busy room. Try again.' }, 409);
    }

    if (b.op === 'message') {
      if (!isToken(b.id) || typeof b.text !== 'string' || !b.text.trim() || b.text.length > 500) return reply({ error: 'Messages can be up to 500 characters.' }, 400);
      if (row.messages.some((m: any) => m.id === b.id)) return reply(view(row, seat, after));
      for (let attempt = 0; attempt < 3; attempt++) {
        const messages = [...row.messages, { id: b.id, seat, text: b.text.trim(), ts: Date.now() }].slice(-300);
        const rows = await db(path + '&rev=eq.' + row.rev, 'PATCH', { messages, rev: row.rev + 1, updated_at: new Date().toISOString() });
        if (rows.length) { later(notify(rows[0], seat, 'room', b.text.trim())); return reply(view(rows[0], seat, after)); }
        row = (await db(path))[0];
        if (row.messages.some((m: any) => m.id === b.id)) return reply(view(row, seat, after));
      }
      return reply({ error: 'Busy room. Send again.' }, 409);
    }
    return reply({ error: 'Unknown request.' }, 400);
  } catch (_e) {
    return reply({ error: 'Could not reach the chat. Check your connection.' }, 503);
  }
});
