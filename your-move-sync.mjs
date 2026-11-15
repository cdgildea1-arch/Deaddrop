// Saved games for Your Move. Turn games send every move to the `your-move-games` function, which keeps the game,
// so either phone can take its turn while the other is away. Live games save snapshots there to resume later.
const API = 'https://lecudeiafwhyhufceurv.supabase.co/functions/v1/your-move-games';
const KEY = 'sb_publishable_Q9ESUnHKw3-FPpGeTYRfSA_4sg55UMD';

export async function gameCall(op, room, game, extra = {}) {
  let response, data;
  try {
    response = await fetch(API, {
      method: 'POST', signal: AbortSignal.timeout(20000),
      headers: { 'Content-Type': 'application/json', apikey: KEY },
      body: JSON.stringify({ op, code: room.code, secret: room.secret, game, ...extra }),
    });
    data = await response.json();
  } catch {
    throw Error('Could not reach the game. Check your connection.');
  }
  if (!response.ok || data.error) {
    const error = Error(data.error || 'Could not reach the game.');
    error.data = data.game !== undefined ? data : null; // a refused move still brings back the latest game
    throw error;
  }
  return data;
}

// Keeps one turn game in step with the server: ignores answers older than what is already shown.
export function savedTable(game, getRoom, onState) {
  let rev = -1;
  const take = data => {
    if (data && data.game !== undefined && data.rev >= rev) { rev = data.rev; onState(data); }
    return data;
  };
  const run = async (op, extra) => {
    try { return take(await gameCall(op, getRoom(), game, extra)); }
    catch (error) { if (error.data) take(error.data); throw error; }
  };
  return {
    load: () => run('load'),
    start: options => run('start', { options }),
    move: move => run('move', { move }),
    botView: () => gameCall('bot-view', getRoom(), game),
    bot: move => run('bot', { move }),
    forget: () => { rev = -1; },
  };
}

// Snapshot saves for live games, throttled so a fast game doesn't flood the server.
export function snapshots(game, getRoom) {
  let last = 0, timer = 0, queued = null;
  const flush = () => {
    timer = 0;
    const snapshot = queued; queued = null; last = Date.now();
    if (snapshot) gameCall('snap-put', getRoom(), game, { snapshot }).catch(() => {});
  };
  return {
    get: async () => (await gameCall('snap-get', getRoom(), game)).snapshot,
    put(snapshot, now = false) {
      queued = snapshot;
      if (now) { clearTimeout(timer); flush(); return; }
      if (!timer) timer = setTimeout(flush, Math.max(0, 2500 - (Date.now() - last)));
    },
    clear: () => { clearTimeout(timer); timer = 0; queued = null; return gameCall('snap-clear', getRoom(), game).catch(() => {}); },
  };
}
