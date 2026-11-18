// Your Move saved games. Deployed as Supabase Edge Function `your-move-games` (verify_jwt off: auth is done here).
// Seats come from the same room as the chat (pounce_rooms_v1): a device proves its seat with the secret it joined with.
//
// Turn games (dots, hearts, uno, guess-who, scrabble, duet, wavelength) are played THROUGH this function: it holds the full game,
// checks every move with the game's own rules, plays the computer seats, and sends each phone only its own view.
// That is what lets one person take a turn while the other is away.
//
// Live games (speed, pounce, the mini games, quick draw, same word) still run on the first player's phone while you are
// both connected. That phone saves a snapshot here so the game can be resumed later, even from another device.
//
// The table your_move_games has RLS on and no policies, so only this function (service role) can read or write it.
// The rule files in ./games are copies of the site's own rules (see build.sh), so the server and phones agree.
import * as dots from './games/dots.mjs';
import * as hearts from './games/hearts.mjs';
import * as uno from './games/uno.mjs';
import * as guessWho from './games/guess-who.mjs';
import * as scrabble from './games/scrabble.mjs';
import * as duet from './games/duet.mjs';
import * as wavelength from './games/wavelength.mjs';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type,apikey', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Cache-Control': 'no-store' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const isToken = (x: unknown) => typeof x === 'string' && /^[a-f0-9]{24}$/.test(x);
const isCode = (x: unknown) => typeof x === 'string' && /^(?:[A-HJ-NP-Z2-9]{6}|[0-9]{8})$/.test(x);
const hash = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))), n => n.toString(16).padStart(2, '0')).join('');
const WORDS_URL = 'https://centralarchive.online/scrabble/enable1.txt.gz';
let dictionary: Set<string> | null = null;
async function words() {
  if (dictionary) return dictionary;
  const r = await fetch(WORDS_URL);
  if (!r.ok || !r.body) throw new Error('Word list unavailable');
  const list = (await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).text()).trim().toUpperCase().split(/\s+/);
  if (list.length < 170000) throw new Error('Word list unavailable');
  return dictionary = new Set(list);
}

// Each turn game: how to start it, apply a move, show it to one seat, tell when it is over, and which seat is a computer.
const cpu = ['Clover', 'Ace'];
const turnGames: Record<string, any> = {
  dots: {
    create: (names: string[]) => dots.newGame(names, 2),
    act: (g: any, seat: number, m: any) => dots.action(g, seat, m),
    view: (g: any) => dots.view(g), done: (g: any) => g.winner !== null,
    yourMove: (g: any, s: number) => g.turn === s,
  },
  hearts: {
    create: (names: string[]) => hearts.newGame([...names, ...cpu], 2),
    // Dealing the next hand was a host-only button. Either player may deal now, so nobody waits on the other.
    act: (g: any, seat: number, m: any) => hearts.action(g, m?.type === 'next' ? 0 : seat, m),
    view: hearts.view, done: (g: any) => g.phase === 'end',
    yourMove: (g: any, s: number) => g.phase === 'pass' ? !g.passes[s] : g.phase === 'play' ? g.turn === s : g.phase === 'summary',
    bot: (g: any) => g.phase === 'pass' ? g.passes.findIndex((p: any, i: number) => i >= g.humans && !p) : g.phase === 'play' && g.turn >= g.humans ? g.turn : -1,
    botMove: hearts.botMove,
  },
  uno: {
    create: (names: string[], o: any) => uno.newGame([...names, ...cpu], 2, o?.extras !== false),
    act: (g: any, seat: number, m: any) => uno.action(g, seat, m),
    view: uno.view, done: (g: any) => g.winner !== null,
    yourMove: (g: any, s: number) => g.turn === s,
    bot: (g: any) => g.winner === null && g.turn >= g.humans ? g.turn : -1,
    botMove: uno.botMove,
  },
  'guess-who': {
    create: (names: string[]) => guessWho.newGame(names),
    act: (g: any, seat: number, m: any) => guessWho.action(g, seat, m),
    view: guessWho.view, done: (g: any) => g.winner !== null,
    yourMove: (g: any, s: number) => g.players[s].secret === null || (g.question ? g.question.seat !== s : g.turn === s && g.players[1 - s].secret !== null),
  },
  duet: {
    create: (names: string[], o: any) => duet.newGame(names, o?.turns === 11 ? 11 : 9),
    act: (g: any, seat: number, m: any) => duet.action(g, seat, m),
    view: duet.view, done: (g: any) => !!g.outcome,
    yourMove: (g: any, s: number) => g.phase === 'final' || (g.phase === 'clue' ? g.giver === s : g.giver !== s),
  },
  wavelength: {
    create: (names: string[]) => wavelength.newGame(names),
    act: (g: any, seat: number, m: any) => wavelength.action(g, seat, m),
    view: wavelength.view, done: (g: any) => g.phase === 'end',
    yourMove: (g: any, s: number) => g.phase === 'clue' ? g.psychic === s : g.phase === 'guess' && g.psychic !== s,
  },
  scrabble: {
    create: (names: string[], o: any) => {
      const count = Math.max(0, Math.min(2, Math.floor(Number(o?.bots) || 0)));
      const g = scrabble.newGame([...names, ...cpu.slice(0, count).map(n => n + ' (CPU)')]);
      g.humans = 2;
      return g;
    },
    act: async (g: any, seat: number, m: any) => scrabble.action(g, seat, m, await words()),
    view: scrabble.view, done: (g: any) => g.end,
    yourMove: (g: any, s: number) => g.turn === s,
    // Finding a computer word needs the whole dictionary tree, which is too heavy here, so a phone suggests the
    // computer's play (op "bot-view" + "bot") and this function checks it like any other move.
    clientBot: (g: any) => !g.end && g.turn >= g.humans ? g.turn : -1,
  },
};
const liveGames = new Set(['speed', 'pounce', 'what-changed', 'warmer', 'hide-a-dot', 'draw-together', 'quick-draw', 'same-word']);

async function rest(table: string, path: string, method = 'GET', body?: unknown, prefer = 'return=representation') {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const r = await fetch(Deno.env.get('SUPABASE_URL') + '/rest/v1/' + table + path, {
    method,
    headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: prefer },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) throw new Error('Storage unavailable');
  return method === 'DELETE' ? [] : await r.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Use POST.' }, 405);
  try {
    const raw = await req.text();
    if (raw.length > 400000) return reply({ error: 'That save is too large.' }, 413);
    const b = JSON.parse(raw);
    if (!isCode(b.code) || !isToken(b.secret)) return reply({ error: 'Check the room code.' }, 400);
    const turn = turnGames[b.game];
    if (!turn && !liveGames.has(b.game) && b.op !== 'status') return reply({ error: 'Choose a game.' }, 400);

    const room = (await rest('pounce_rooms_v1', '?select=code,host_hash,guest_hash,names,live&code=eq.' + b.code))[0];
    if (!room) return reply({ error: 'No room with that code.' }, 404);
    const secretHash = await hash(b.secret);
    const seat = room.host_hash === secretHash ? 0 : room.guest_hash === secretHash ? 1 : -1;
    if (seat < 0) return reply({ error: 'This phone is not part of that room. Join again.' }, 403);

    // Home screen: which saved turn games are waiting on this phone ("Your move") and which on the other person.
    if (b.op === 'status') {
      const rows = await rest('your_move_games', '?select=game,live,state,updated_at&code=eq.' + b.code);
      const games = rows.filter((r: any) => r.live === room.live && turnGames[r.game] && !turnGames[r.game].done(r.state))
        .map((r: any) => ({ game: r.game, yours: !!turnGames[r.game].yourMove(r.state, seat), updated: r.updated_at }));
      return reply({ seat, names: room.names, games });
    }

    const path = '?code=eq.' + b.code + '&game=eq.' + encodeURIComponent(b.game);
    const load = async () => {
      const row = (await rest('your_move_games', path))[0];
      return row && row.live === room.live ? row : null; // A reset room starts with no saved games.
    };
    const names = [room.names[0] || 'Player 1', room.names[1] || 'Player 2'];

    // ---------- live games: snapshots from the first player's phone ----------
    if (!turn) {
      if (b.op === 'snap-get') {
        const row = await load();
        return reply({ seat, names, snapshot: row?.state ?? null, rev: row?.rev ?? 0, updated: row?.updated_at ?? null });
      }
      if (seat !== 0) return reply({ error: 'Only the first player’s phone saves this game.' }, 403);
      if (b.op === 'snap-put') {
        if (b.snapshot === null || typeof b.snapshot !== 'object') return reply({ error: 'Nothing to save.' }, 400);
        await rest('your_move_games', '?on_conflict=code,game', 'POST',
          { code: b.code, game: b.game, live: room.live, state: b.snapshot, rev: 0, updated_at: new Date().toISOString() },
          'return=minimal,resolution=merge-duplicates');
        return reply({ saved: true });
      }
      if (b.op === 'snap-clear') { await rest('your_move_games', path, 'DELETE'); return reply({ cleared: true }); }
      return reply({ error: 'Unknown request.' }, 400);
    }

    // ---------- turn games: played through the server ----------
    const out = (row: any) => {
      const g = row?.state ?? null;
      return {
        seat, names, rev: row?.rev ?? 0, updated: row?.updated_at ?? null,
        game: g ? turn.view(g, seat) : null, over: g ? !!turn.done(g) : null,
        botTurn: g && turn.clientBot ? turn.clientBot(g) : -1,
      };
    };
    let row = await load();
    if (b.op === 'load') return reply(out(row));

    if (b.op === 'start') {
      // Both phones may tap Start; an unfinished game is kept unless a phone asks for a fresh one.
      if (row && !turn.done(row.state) && !b.fresh) return reply(out(row));
      const g = await turn.create(names, b.options || {});
      if (turn.bot) runBots(turn, g);
      const rev = (row?.rev ?? 0) + 1;
      const saved = await rest('your_move_games', '?on_conflict=code,game', 'POST',
        { code: b.code, game: b.game, live: room.live, state: g, rev, updated_at: new Date().toISOString() },
        'return=representation,resolution=merge-duplicates');
      return reply(out(saved[0]));
    }

    if (b.op === 'bot-view') {
      if (!row || !turn.clientBot) return reply({ error: 'No computer turn.' }, 400);
      const cpuSeat = turn.clientBot(row.state);
      if (cpuSeat < 0) return reply(out(row));
      return reply({ ...out(row), cpuSeat, cpuView: turn.view(row.state, cpuSeat) });
    }

    if (b.op === 'move' || b.op === 'bot') {
      if (!b.move || typeof b.move !== 'object') return reply({ error: 'No move.' }, 400);
      for (let attempt = 0; attempt < 3; attempt++) {
        if (!row) return reply({ error: 'Start a game first.' }, 404);
        const g = structuredClone(row.state);
        try {
          if (b.op === 'bot') {
            const cpuSeat = turn.clientBot ? turn.clientBot(g) : -1;
            if (cpuSeat < 0) return reply(out(row));
            await turn.act(g, cpuSeat, { ...b.move, id: g.id, rev: g.rev });
          } else {
            await turn.act(g, seat, b.move);
          }
        } catch (e) {
          return reply({ ...out(row), error: (e as Error).message || 'That move is unavailable.' }, 409);
        }
        if (turn.bot) runBots(turn, g);
        const saved = await rest('your_move_games', path + '&rev=eq.' + row.rev, 'PATCH',
          { state: g, rev: row.rev + 1, updated_at: new Date().toISOString() });
        if (saved.length) return reply(out(saved[0]));
        row = await load(); // The other phone moved at the same moment; re-check against the newer game.
      }
      return reply({ ...out(row), error: 'Busy table. Try again.' }, 409);
    }
    return reply({ error: 'Unknown request.' }, 400);
  } catch (_e) {
    return reply({ error: 'Could not reach the game. Check your connection.' }, 503);
  }
});

function runBots(turn: any, g: any) {
  for (let i = 0; i < 80; i++) {
    const s = turn.bot(g);
    if (s < 0) return;
    turn.act(g, s, { ...turn.botMove(g, s), id: g.id, rev: g.rev });
  }
}
