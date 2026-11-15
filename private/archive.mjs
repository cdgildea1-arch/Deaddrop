import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.10/+esm';

const project = 'https://lecudeiafwhyhufceurv.supabase.co';
const publicKey = 'sb_publishable_Q9ESUnHKw3-FPpGeTYRfSA_4sg55UMD';
const client = createClient(
  project,
  publicKey,
  { auth: { persistSession: true, detectSessionInUrl: true } },
);
const bucket = client.storage.from('private-archive');
const $ = id => document.getElementById(id);
const frame = $('archive');
const params = new URLSearchParams(location.search);

const documents = {
  'hub.html': '327a6670bb991a6a229694ff0daeddc2ecac1462e773b2b570fce8d1c38835b2',
  'archive.html': 'e35ee1267ae866af7df9d1d27f5cb87ebc483da481f7d9f9da7ce7b199b04d1c',
  'cards.html': 'a64d6883d19adcdf7917b68480c2199ac83dc627cbc6be0765cdb9caba31ed2a',
  'deaddrop.html': 'c8a71f34bfcbb5062fe79a6d88d6f3f87c7e9c386eaa17d47fbfe5536ef4b6ec',
  'the_ledger.html': '22fbaa448a03915df8cd8c505a1cc570e20a3c1b4a8161d1eec4758b60a5b577',
  'pins.html': 'a0b377deb8badc5966a439da753e0564e73bb511f22f17e23f4a5af5e00de7ec',
  'confirmed-pins.html': '69e8423339ca402ff71adc5f8780b0d3a0e5f9140565638c8f74ebb30a511494',
  'previously-pinned.html': 'dbd36d427a9e4fa05a70229dac4528d2ac55f44cc0b762bfb88c9dc9f216eef8',
  'emergency.html': '6f55475c1b98b9e1f4d261031630b7dedd12d455defe632d54c18b309262c4df',
  'Manuscript.html': '21da887c307818bdac9fdad959b2792730ce1ad1017e16f41e5b137bd935d041',
};
const requested = params.get('page');
const page = Object.hasOwn(documents, requested) ? requested : 'hub.html';
const say = text => { $('status').textContent = text; };
let generation = 0;
let displayedUser = null;

function privateLink(name) {
  return name === 'hub.html' ? '/private/' : '/private/?' + new URLSearchParams({ page:name });
}

const allowedRequests = {
  '/rest/v1/cards': ['GET'],
  '/rest/v1/ledger': ['GET'],
  '/rest/v1/pins': ['GET', 'POST'],
  '/rest/v1/dead_drop_messages': ['GET', 'POST', 'DELETE'],
};
window.privateArchiveRequest = async (input, init = {}) => {
  const url = new URL(input, location.origin);
  const method = String(init.method || 'GET').toUpperCase();
  if (url.origin !== project || !Object.hasOwn(allowedRequests, url.pathname) ||
      !allowedRequests[url.pathname].includes(method) || !displayedUser) {
    return new Response(null, { status: 403 });
  }
  const { data: { session }, error } = await client.auth.getSession();
  if (error || session?.user?.id !== displayedUser) return new Response(null, { status: 401 });
  const headers = new Headers(init.headers);
  headers.set('apikey', publicKey);
  headers.set('Authorization', 'Bearer ' + session.access_token);
  return fetch(url, { ...init, headers, cache: 'no-store' });
};

function buildPage(markup) {
  const doc = new DOMParser().parseFromString(markup, 'text/html');
  for (const anchor of doc.querySelectorAll('a[href]')) {
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#')) continue;
    const destination = new URL(href, location.origin + '/');
    if (destination.origin !== location.origin) continue;
    const name = decodeURIComponent(destination.pathname.split('/').pop());
    if (!Object.hasOwn(documents, name)) continue;
    anchor.href = privateLink(name) + destination.hash;
    anchor.target = '_top';
  }
  for (const script of doc.querySelectorAll('script:not([src])')) {
    let code = script.textContent.replace(
      /window\.location\.href\s*=\s*(['"])(hub|pins)\.html\1/g,
      (_match, _quote, name) => 'window.top.location.href = ' + JSON.stringify(privateLink(name + '.html')),
    );
    if (['archive.html', 'cards.html', 'the_ledger.html', 'pins.html', 'deaddrop.html'].includes(page)) {
      code = code.replace(/\bawait fetch\(/g, 'await window.parent.privateArchiveRequest(');
    }
    if (page === 'deaddrop.html') {
      code = code.replace('  loadSavedConfig();',
        '  sbConfig = ' + JSON.stringify({ url: project, key: publicKey, table: 'dead_drop_messages' }) + ';');
    }
    script.textContent = code;
  }
  if (page === 'deaddrop.html') {
    doc.getElementById('settingsToggle')?.setAttribute('hidden', '');
    doc.getElementById('settingsPanel')?.setAttribute('hidden', '');
  }
  if (page === 'hub.html') {
    styleReadingRoom(doc);
  } else {
    const controls = doc.createElement('nav');
    controls.setAttribute('aria-label', 'Private Archive');
    controls.style.cssText = 'position:fixed;bottom:max(12px,env(safe-area-inset-bottom));right:12px;z-index:1000;font:600 12px system-ui,sans-serif';
    const back = doc.createElement('a');
    back.textContent = '‹ Hub';
    back.href = '/private/';
    back.target = '_top';
    back.style.cssText = 'display:block;padding:10px 12px;border:1px solid #ac8d72;border-radius:20px;background:#2c211a;color:#f5e9dc;text-decoration:none';
    controls.append(back);
    doc.body.append(controls);
  }
  return '<!doctype html>\n' + doc.documentElement.outerHTML;
}

function styleReadingRoom(doc) {
  doc.body.classList.add('reading-room');
  const style = doc.createElement('link');
  style.rel = 'stylesheet';
  style.href = '/private/reading-room.css?v=1';
  doc.head.append(style);

  const wrap = doc.querySelector('.wrap');
  const heading = doc.createElement('header');
  heading.className = 'room-heading';
  const title = doc.createElement('h1');
  title.textContent = 'The Hub';
  heading.append(doc.querySelector('.footer-note'), title);
  wrap.prepend(heading);

  doc.querySelectorAll('.tab-bar, .dots, .menu-sub, .lock-badge').forEach(element => element.remove());
  for (const script of doc.querySelectorAll('script')) {
    if (script.textContent.includes("const carousel = document.getElementById('carousel')")) script.remove();
  }
  const grid = doc.getElementById('carousel');
  grid.setAttribute('role', 'navigation');
  grid.setAttribute('aria-label', 'Archive sections');
  grid.querySelectorAll('.menu-icon').forEach(icon => icon.setAttribute('aria-hidden', 'true'));
  const footer = doc.createElement('footer');
  footer.className = 'room-footer';
  for (const [label, url] of [['Manuscript', privateLink('Manuscript.html')], ['Sign out', '/private/?signout=1']]) {
    const link = doc.createElement('a');
    link.textContent = label;
    link.href = url;
    link.target = '_top';
    footer.append(link);
  }
  footer.insertBefore(doc.getElementById('tp-widget'), footer.lastElementChild);
  wrap.append(footer);
}

async function readPage() {
  const file = page === 'archive.html' ? 'archive-rotated.html' : page;
  const { data, error } = await bucket.download(file);
  if (error) throw error;
  const bytes = await data.arrayBuffer();
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    byte => byte.toString(16).padStart(2, '0')).join('');
  if (hash !== documents[page]) throw new Error('This archive page could not be verified.');
  return new TextDecoder().decode(bytes);
}

function closeArchive() {
  displayedUser = null;
  frame.hidden = true;
  frame.removeAttribute('srcdoc');
  $('gate').hidden = false;
}

async function render() {
  const version = ++generation;
  const { data:{user} } = await client.auth.getUser();
  if (version !== generation) return;
  if (!user) {
    closeArchive();
    $('form').hidden = false;
    $('signout').hidden = true;
    say('');
    return;
  }
  $('form').hidden = true;
  $('signout').hidden = false;
  if (displayedUser === user.id && !frame.hidden) return;
  closeArchive();
  say('Checking access…');
  const { data, error } = await client.from('archive_authorized_users').select('user_id').eq('user_id', user.id).maybeSingle();
  if (version !== generation) return;
  if (error || !data) {
    say(error ? 'Could not verify archive access. Refresh to try again.' : 'This email is signed in and awaiting archive approval.');
    return;
  }
  try {
    const markup = await readPage();
    if (version !== generation) return;
    document.title = page === 'hub.html' ? 'Private Archive · Hub' : 'Private Archive';
    displayedUser = user.id;
    frame.srcdoc = buildPage(markup);
    frame.hidden = false;
    $('gate').hidden = true;
  } catch {
    if (version === generation) say('Could not open this archive page. Refresh to try again.');
  }
}

$('form').onsubmit = async event => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  say('Sending sign-in email…');
  const { error } = await client.auth.signInWithOtp({
    email: $('email').value.trim(),
    options: { emailRedirectTo: location.origin + '/private/' },
  });
  say(error ? error.message : 'Check your email for a sign-in link.');
  button.disabled = false;
};

async function signOut() {
  ++generation;
  closeArchive();
  const { error } = await client.auth.signOut();
  if (error) { say('Could not sign out. Try again.'); $('signout').hidden = false; return; }
  location.replace('/private/');
}
$('signout').onclick = signOut;
if (params.has('signout')) {
  await signOut();
} else {
  client.auth.onAuthStateChange(event => {
    if (event === 'SIGNED_OUT') closeArchive();
    setTimeout(render, 0);
  });
  await render();
}
