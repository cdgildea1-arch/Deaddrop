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

// Each room has its own queue, so switching rooms cannot redirect a pending save.
export function snapshots(game, getRoom) {
  const queues = new Map();

  function currentQueue() {
    const room = getRoom();
    if (!room?.code || !room.secret) return null;
    const key = JSON.stringify([room.code, room.secret]);
    if (!queues.has(key)) {
      queues.set(key, {
        room: { code: room.code, secret: room.secret },
        last: 0, timer: null, queued: null, writes: Promise.resolve(),
      });
    }
    return queues.get(key);
  }

  function write(queue, op, fields) {
    queue.writes = queue.writes
      .then(() => gameCall(op, queue.room, game, fields))
      .catch(() => {});
    return queue.writes;
  }

  function flush(queue) {
    clearTimeout(queue.timer);
    queue.timer = null;
    if (queue.queued === null) return queue.writes;
    const snapshot = queue.queued;
    queue.queued = null;
    queue.last = Date.now();
    return write(queue, 'snap-put', { snapshot });
  }

  return {
    async get() {
      const queue = currentQueue();
      if (!queue) return null;
      await flush(queue);
      return (await gameCall('snap-get', queue.room, game)).snapshot;
    },
    put(snapshot, now = false) {
      const queue = currentQueue();
      if (!queue) return;
      queue.queued = structuredClone(snapshot);
      if (now) {
        flush(queue);
      } else if (queue.timer === null) {
        queue.timer = setTimeout(() => flush(queue), Math.max(0, 2500 - (Date.now() - queue.last)));
      }
    },
    clear() {
      const queue = currentQueue();
      if (!queue) return Promise.resolve();
      clearTimeout(queue.timer);
      queue.timer = null;
      queue.queued = null;
      // An in-flight save must finish before clearing, or it could restore the old game.
      return write(queue, 'snap-clear');
    },
  };
}
