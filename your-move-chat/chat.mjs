const slot = document.documentElement.dataset.moveChat;
const api = 'https://lecudeiafwhyhufceurv.supabase.co/functions/v1/pounce-chat';
const apiKey = 'sb_publishable_Q9ESUnHKw3-FPpGeTYRfSA_4sg55UMD';
const gameNames = {
  pounce: 'Pounce', speed: 'Speed', scrabble: 'Scrabble', 'guess-who': 'Guess Who?',
  hearts: 'Hearts', uno: 'UNO', duet: 'Codenames Duet', dots: 'Dots & Boxes',
  'same-word': 'Same Word', 'quick-draw': 'Quick Draw', 'what-changed': 'What Changed?', 'draw-together': 'Draw Together', warmer: 'Warmer', 'hide-a-dot': 'Hide a Dot',
  mahjong: 'Mahjong', 'mahjong-daily': 'Daily Mahjong', 'mahjong-level4': 'Mahjong Level 4',
};

const read = (key, fallback = null) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};
const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), byte => byte.toString(16).padStart(2, '0')).join('');
async function request(op, room, fields = {}) {
  const response = await fetch(api, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: apiKey },
    signal: AbortSignal.timeout(10000),
    body: JSON.stringify({ op, code: room.code, secret: room.secret, ...fields }),
  });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || 'Chat could not connect.'), { status: response.status });
  return data;
}

const panel = document.createElement('dialog');
panel.className = 'move-chat';
panel.setAttribute('aria-labelledby', 'move-chat-title');
panel.innerHTML = `
  <div class="move-chat-head" data-gesture tabindex="0" aria-label="Chat header">
    <div><h2 id="move-chat-title">Chat</h2><small data-context></small></div>
    <button type="button" data-clear aria-label="Swipe: delete this chat for you">Swipe</button>
    <button type="button" data-close aria-label="Close chat">×</button>
  </div>
  <form data-join hidden>
    <label>Name<input data-name autocomplete="nickname" maxlength="18" required></label>
    <label>Game code<input data-code placeholder="Enter game code" maxlength="8" autocomplete="off" required></label>
    <button>Join chat</button>
  </form>
  <div data-messages role="log" aria-label="Messages" aria-live="polite"></div>
  <p data-status role="status"></p>
  <form data-compose><input data-message maxlength="500" aria-label="Message" placeholder="Write a message…" required><button>Send</button></form>`;
document.body.append(panel);
const find = name => panel.querySelector('[data-' + name + ']');
const feed = find('messages');
let room, mode = 'table', generation = 0, joining = false, sending = false, loading = false;
let lastView, baseline = 0, writeVersion = 0, visibleSignature = '';
const sessionCuts = new Map();
const cutKey = view => 'your-move.chat.cut.' + (mode === 'room' ? 'shared-room' : slot) + '.' + room.code + '.' + view.live;
const setStatus = value => { find('status').textContent = value; };
const selectors = {
  pounce: 'button.chatOpen[aria-label="Messages"]', mahjong: '#speakButton',
  'mahjong-daily': '#chatButton', 'mahjong-level4': '#talkButton',
};
function setup(show) {
  find('join').hidden = !show;
  find('clear').disabled = show || !lastView || sending;
  find('compose').hidden = show;
  find('message').disabled = show || !lastView;
  find('compose').querySelector('button').disabled = show || !lastView || sending;
  if (show) {
    find('name').value = room?.name || read('pounce.name', '');
    find('code').value = '';
  }
}
function context() {
  find('context').textContent = mode === 'room' ? (room?.code ? 'Room ' + room.code : 'Room') : gameNames[slot];
  find('gesture').setAttribute('aria-keyshortcuts', mode === 'table' ? 'ArrowUp' : 'ArrowDown');
}
function showMessages(view) {
  const messages = view.messages.filter(message => message.ts > baseline);
  const signature = mode + ':' + view.live + ':' + messages.map(message => message.id).join(',');
  if (signature === visibleSignature) return;
  visibleSignature = signature;
  feed.toggleAttribute('data-blank', messages.length === 0);
  const nearBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 60;
  feed.replaceChildren();
  if (!messages.length) {
    const empty = document.createElement('p');
    empty.className = 'move-chat-empty';
    empty.textContent = 'No messages yet.';
    feed.append(empty);
  }
  for (const message of messages) {
    const article = document.createElement('article');
    article.className = message.seat === view.seat ? 'mine' : '';
    const name = document.createElement('small');
    name.textContent = view.names[message.seat] || 'Player';
    const content = document.createElement('div');
    content.textContent = message.text;
    article.append(name, content);
    feed.append(article);
  }
  if (nearBottom) feed.scrollTop = feed.scrollHeight;
}
async function load({ restart = false } = {}) {
  if (!panel.open || !room || joining || loading || sending) return;
  const current = generation, thread = mode, startedAtWrite = writeVersion;
  loading = true;
  setup(false);
  try {
    const result = await request(thread === 'table' ? 'table-get' : 'get', room, { game: slot });
    if (current !== generation || sending || startedAtWrite !== writeVersion) return;
    const key = cutKey(result);
    const cursor = result.cursor ?? result.messages.reduce((latest, message) => Math.max(latest, message.ts), 0);
    baseline = restart ? cursor : sessionCuts.get(key) ?? read(key, 0);
    if (restart) { sessionCuts.set(key, baseline); write(key, baseline); }
    lastView = result;
    showMessages(result);
    setStatus('');
  } catch (error) {
    if (current !== generation) return;
    if (error.status === 403 || error.status === 404) setup(true);
    setStatus(error.message);
  } finally {
    if (current === generation) {
      loading = false;
      setup(find('join').hidden === false);
    }
  }
}
function change(next, restart = false) {
  generation++;
  mode = next;
  loading = false;
  lastView = null;
  baseline = 0;
  visibleSignature = '';
  find('message').value = '';
  context();
  feed.replaceChildren();
  feed.setAttribute('data-blank', '');
  setStatus('');
  setup(!room);
  if (room) void load({ restart });
}
function fitPanel() {
  if (!panel.open || !window.visualViewport) return;
  const { height, offsetTop } = window.visualViewport;
  const size = Math.min(650, height - 18);
  panel.style.height = Math.max(100, size) + 'px';
  panel.style.top = offsetTop + Math.max(9, (height - size) / 2) + 'px';
  panel.style.bottom = 'auto';
  panel.style.marginBlock = '0';
}
window.visualViewport?.addEventListener('resize', fitPanel);
window.visualViewport?.addEventListener('scroll', fitPanel);
// Kill switch: wipes this chat for you on the server, so it stays gone on every device you use.
// The other person keeps their copy. The screen clears right away even if the server can't be reached.
find('clear').onclick = () => {
  if (!panel.open || !room || !lastView || sending || joining) return;
  const thread = mode === 'room' ? 'room' : slot;
  change(mode, true);
  request('clear', room, { thread }).catch(() => setStatus('Cleared here. Couldn’t reach the server, so tap Swipe again when you’re back online.'));
};
function open() {
  if (panel.open) return;
  room = read('pounce.room');
  panel.showModal();
  document.dispatchEvent(new Event('your-move-chat-open'));
  fitPanel();
  change('table');
}
find('close').onclick = () => panel.close();
panel.addEventListener('close', () => {
  generation++;loading = false;lastView = null;feed.replaceChildren();find('message').value = '';
  document.dispatchEvent(new Event('your-move-chat-close'));
});
function swipeChat(direction) {
  if (!panel.open || sending || joining) return;
  if (direction === 'up' && mode === 'table') change('room');
  if (direction === 'down' && mode === 'room') change('table', true);
}
function attachSwipe(surface) {
  let start = null;
  surface.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || event.target.closest('button,input,select,textarea,a')) return;
    if (surface === feed && !feed.hasAttribute('data-blank')) return;
    start = { id: event.pointerId, x: event.clientX, y: event.clientY };
    surface.setPointerCapture?.(event.pointerId);
  });
  surface.addEventListener('pointerup', event => {
    if (start?.id !== event.pointerId) return;
    const x = event.clientX - start.x;
    const y = event.clientY - start.y;
    start = null;
    if (Math.abs(y) >= 32 && Math.abs(y) > Math.abs(x) * 1.4) swipeChat(y < 0 ? 'up' : 'down');
  });
  surface.addEventListener('pointercancel', () => { start = null; });
  surface.addEventListener('lostpointercapture', () => { start = null; });
}
const chatHeader = find('gesture');
attachSwipe(chatHeader);
attachSwipe(feed);
chatHeader.addEventListener('keydown', event => {
  if (event.target !== chatHeader || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
  event.preventDefault();
  swipeChat(event.key === 'ArrowUp' ? 'up' : 'down');
});
find('join').onsubmit = async event => {
  event.preventDefault();
  const name = find('name').value.trim();
  const code = find('code').value.trim().toUpperCase();
  if (!name || !/^(?:[A-HJ-NP-Z2-9]{6}|[0-9]{8})$/.test(code)) return setStatus('Enter a name and a valid room code.');
  const candidate = { code, name, secret: room?.code === code ? room.secret : token() };
  joining = true;
  event.submitter.disabled = true;
  try {
    const joined = await request('join', candidate, { name });
    room = candidate;
    write('pounce.room', room);
    write('pounce.name', name);
    document.dispatchEvent(new CustomEvent('your-move-chat-joined', { detail: joined }));
    joining = false;
    if (panel.open) change(mode);
  } catch (error) {
    setStatus(error.message);
  } finally {
    joining = false;
    event.submitter.disabled = false;
  }
};
find('compose').onsubmit = async event => {
  event.preventDefault();
  const input = find('message'), text = input.value.trim();
  if (!lastView || !room || sending || !text) return;
  const current = generation;
  sending = true;
  writeVersion++;
  setup(false);
  try {
    const result = await request(mode === 'table' ? 'table-message' : 'message', room, { game: slot, id: token(), text });
    if (current !== generation) return;
    lastView = result;
    input.value = '';
    showMessages(result);
    feed.scrollTop = feed.scrollHeight;
    setStatus('');
  } catch (error) {
    if (current === generation) setStatus(error.message);
  } finally {
    sending = false;
    if (current === generation) setup(false);
  }
};

const selector = selectors[slot] || '#chatToggle';
document.addEventListener('click', event => {
  if (event.target.closest(selector) && !event.target.closest('.move-chat')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    open();
  }
}, true);
if (!document.querySelector(selector)) {
  const trigger = document.createElement('button');
  trigger.className = 'move-chat-launch';
  trigger.textContent = 'Chat';
  trigger.onclick = open;
  (document.querySelector('header') || document.body).append(trigger);
}
if (document.documentElement.dataset.moveInvite) {
  const code = document.documentElement.dataset.moveInvite;
  open();
  if (room?.code !== code) {
    generation++;
    loading = false;
    lastView = null;
    setup(true);
    find('code').focus();
  }
}
setInterval(() => {
  if (panel.open && !document.hidden && find('join').hidden) void load();
}, 2500);
