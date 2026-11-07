// Pounce chat rooms. Deployed as Supabase Edge Function `pounce-chat` (verify_jwt off: auth is done here).
// A 6-character room code (or a reserved 8-digit one) invites one friend; each device holds its own random 96-bit seat key.
// Only SHA-256 hashes of seat keys are stored. The table has RLS on and no public grants.
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type,apikey', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Cache-Control': 'no-store' };
const isToken = (x: unknown) => typeof x === 'string' && /^[a-f0-9]{24}$/.test(x);
const isCode = (x: unknown) => typeof x === 'string' && /^(?:[A-HJ-NP-Z2-9]{6}|[0-9]{8})$/.test(x);
const hash = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))), n => n.toString(16).padStart(2, '0')).join('');
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const cleanName = (x: unknown, d: string) => (typeof x === 'string' ? x.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 18) : '') || d;

async function db(path: string, method = 'GET', body?: unknown) {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const r = await fetch(Deno.env.get('SUPABASE_URL') + '/rest/v1/pounce_rooms_v1' + path, {
    method,
    headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) throw new Error('Storage unavailable');
  return await r.json();
}

function view(row: any, seat: number, after = 0) {
  return { code: row.code, rev: row.rev, seat, joined: !!row.guest_hash, names: row.names, messages: row.messages.filter((m: any) => m.ts > after) };
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

    // Reserved rooms (8-digit codes) start with host_hash 'unclaimed'; the first join takes the first seat.
    if (b.op === 'join' && row.host_hash === 'unclaimed') {
      const names = [cleanName(b.name, 'Player 1'), row.names[1] || ''];
      const rows = await db(path + '&rev=eq.' + row.rev + '&host_hash=eq.unclaimed', 'PATCH', { host_hash: secretHash, names, rev: row.rev + 1, updated_at: new Date().toISOString() });
      if (!rows.length) return reply({ error: 'The room changed while joining. Try again.' }, 409);
      row = rows[0];
    }
    let seat = row.host_hash === secretHash ? 0 : row.guest_hash === secretHash ? 1 : -1;
    if (b.op === 'join' && seat < 0) {
      if (row.guest_hash) return reply({ error: 'That room already has two people. Start a new room.' }, 403);
      const names = [row.names[0], cleanName(b.name, 'Player 2')];
      const rows = await db(path + '&rev=eq.' + row.rev + '&guest_hash=is.null', 'PATCH', { guest_hash: secretHash, names, rev: row.rev + 1, updated_at: new Date().toISOString() });
      if (!rows.length) return reply({ error: 'The room changed while joining. Try again.' }, 409);
      row = rows[0]; seat = 1;
    }
    if (seat < 0) return reply({ error: 'This phone is not part of that room.' }, 403);
    if (b.op === 'get' || b.op === 'join') return reply(view(row, seat, after));

    if (b.op === 'message') {
      if (!isToken(b.id) || typeof b.text !== 'string' || !b.text.trim() || b.text.length > 500) return reply({ error: 'Messages can be up to 500 characters.' }, 400);
      if (row.messages.some((m: any) => m.id === b.id)) return reply(view(row, seat, after));
      for (let attempt = 0; attempt < 3; attempt++) {
        const messages = [...row.messages, { id: b.id, seat, text: b.text.trim(), ts: Date.now() }].slice(-300);
        const rows = await db(path + '&rev=eq.' + row.rev, 'PATCH', { messages, rev: row.rev + 1, updated_at: new Date().toISOString() });
        if (rows.length) return reply(view(rows[0], seat, after));
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
