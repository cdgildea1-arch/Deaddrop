import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.10/+esm';

const project = 'https://lecudeiafwhyhufceurv.supabase.co';
const publicKey = 'sb_publishable_Q9ESUnHKw3-FPpGeTYRfSA_4sg55UMD';
const client = createClient(
  project,
  publicKey,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
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
  'after-the-last-page.html': 'f4fe3b80f7c9f736857df4207bc25029c5af89de99b76c098732db933bacda10',
  'places-that-became-ours.html': 'ab50b9ef569efb8140905543f65701e3997790a120a83f5a024c85b6eeb545d9',
  'surprise.html': '64fd8f98e80c8256855a316da63f5494f76576172217394683fa30c1585401df',
  'The_Archive_Illustrated_Ebook_Revised.pdf': '3043e9618e0715a1c1f75b77c03b8af95cca71199b3c5a54dc078272c35d2120',
  'Manuscript.html': '21da887c307818bdac9fdad959b2792730ce1ad1017e16f41e5b137bd935d041',
};
const ebook = 'The_Archive_Illustrated_Ebook_Revised.pdf';
let ebookUrl;
const requested = params.get('page');
const page = Object.hasOwn(documents, requested) ? requested : 'hub.html';
const say = text => { $('status').textContent = text; };
let generation = 0;
let displayedUser = null;
const callback = new URLSearchParams(location.hash.slice(1));
const emailLinkFailed = params.has('error') || params.has('error_code') ||
  callback.has('error') || callback.has('error_code');

function showForm(message = '') {
  closeArchive();
  $('form').hidden = false;
  $('signout').hidden = true;
  say(message);
}

function showRetry(message) {
  closeArchive();
  $('form').hidden = true;
  $('retry').hidden = false;
  say(message);
}

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
    if (!href || href.startsWith('#') || href.startsWith('blob:')) continue;
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
    restoreSwipeHub(doc);
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

function restoreSwipeHub(doc) {
  const carousel = doc.getElementById('carousel');
  const tabs = doc.getElementById('tabBar');
  const dots = doc.getElementById('dots');

  const styles = doc.createElement('style');
  styles.textContent = `
    .swipe-card-art {
      display: grid; place-items: center; flex: 1; min-height: 52px;
      max-height: 132px; margin-top: 12px; overflow: hidden; border-radius: 12px;
      background: radial-gradient(ellipse, #f7ead5, #e9d6b4);
    }
    .swipe-card-art span { display: block; box-shadow: 0 5px 12px #503b3738; }
    .swipe-card-art--book span {
      width: 43px; height: 57px; border: 3px double #ac864b; border-left-width: 6px;
      border-radius: 3px 5px 5px 3px; background: #f8efdc; color: #8b6631;
      display: grid; place-items: center; transform: rotate(-8deg);
    }
    .swipe-card-art--book span::after { content: '✦'; }
    .swipe-card-art--letter { background: radial-gradient(ellipse, #f7e7e0, #e6c7be); }
    .swipe-card-art--letter span {
      width: 65px; height: 42px; border: 1px solid #b58576; border-radius: 4px;
      background: linear-gradient(32deg, transparent 48%, #c8998a 50%, transparent 52%) left / 50% 100% no-repeat,
        linear-gradient(-32deg, transparent 48%, #c8998a 50%, transparent 52%) right / 50% 100% no-repeat,
        #fff5e9;
      display: grid; place-items: center; color: #a45353; transform: rotate(8deg);
    }
    .swipe-card-art--letter span::after { content: '♥'; }
    .swipe-card-art--archive { background: radial-gradient(ellipse, #f8edda, #e4d2b1); }
    .swipe-card-art--cards { background: radial-gradient(ellipse, #f5e7e5, #e5cacc); }
    .swipe-card-art--drop { background: radial-gradient(ellipse, #e1e9f2, #b7c9dc); }
    .swipe-card-art--ledger { background: radial-gradient(ellipse, #eef1e5, #cdd9c2); }
    .swipe-card-art--jar { background: radial-gradient(ellipse, #eee9f5, #d7c9e5); }
    .swipe-card-art--kit { background: radial-gradient(ellipse, #faeedc, #eacaba); }
    .swipe-card-art--object span {
      display: grid; place-items: center; width: 57px; height: 49px;
      border: 1px solid #90745788; border-radius: 8px;
      background: #fff9ec; font-size: 27px; line-height: 1;
      transform: rotate(-8deg);
    }
    .swipe-card-art--cards span, .swipe-card-art--jar span { transform: rotate(8deg); }
    .swipe-card-art--archive span { border-top: 5px solid #af8a57; }
    .swipe-card-art--cards span { box-shadow: -5px 4px #e4bcc0, 0 5px 12px #503b3738; }
    .swipe-card-art--drop span { background: #ecf2f7; border-color: #738aa1; }
    .swipe-card-art--ledger span { border-left: 5px solid #7f9171; background: #f4f5eb; }
    .swipe-card-art--jar span { background: #f5eff9; border-color: #a893b7; }
    .swipe-card-art--kit span { border-top: 5px solid #ad695c; }
    .swipe-card-art--places { background: radial-gradient(ellipse, #f8ecd6, #dfc59f); }
    .swipe-card-art--places span {
      display: grid; place-items: center; width: 70px; height: 50px;
      background: repeating-linear-gradient(90deg, #f8eedb 0 21px, #d1b890 22px 23px);
      border: 1px solid #aa865c; border-radius: 4px; transform: rotate(-8deg);
      color: #8a5230; font-size: 1.6rem; line-height: 1;
    }
    .swipe-card-art--places span::after { content: '⌖'; }
    @media (max-height: 560px) { .swipe-card-art { display: none; } }
  `;
  doc.head.append(styles);

  const cardArt = {
    'archive.html': ['archive', '🗂️'],
    'cards.html': ['cards', '🃏'],
    'deaddrop.html': ['drop', '🔏'],
    'the_ledger.html': ['ledger', '📊'],
    'pins.html': ['jar', '🫙'],
    'emergency.html': ['kit', '🐧'],
  };
  for (const tile of carousel.querySelectorAll('.menu-item')) {
    const name = new URL(tile.href, location.origin).searchParams.get('page');
    const illustration = cardArt[name];
    if (!illustration) continue;
    const [artwork, symbol] = illustration;
    const art = doc.createElement('div');
    art.className = 'swipe-card-art swipe-card-art--object swipe-card-art--' + artwork;
    art.setAttribute('aria-hidden', 'true');
    const object = doc.createElement('span');
    object.textContent = symbol;
    art.append(object);
    tile.querySelector('.lock-badge').before(art);
  }

  for (const [label, icon, href, description, badge, artwork] of [
    ['Illustrated Ebook', '📘', privateLink(ebook), 'The illustrated edition of The Archive, with the revised opening image. Read or download the PDF.', '🔒 PDF passphrase required', 'book'],
    ['Surprise', '💌', privateLink('surprise.html'), 'For You. A little something to open when you have a quiet moment.', '🔒 Passphrase required', 'letter'],
    ['After the Last Page', '📖', privateLink('after-the-last-page.html'), 'Things we still wanna do. A few things I’m glad we did.', '🔒 Private Archive', 'book'],
    ['Places That Became Ours', '🗺️', privateLink('places-that-became-ours.html'), 'A scrollable rewind of the places that became part of our story.', '🔒 Passphrase required', 'places'],
  ]) {
    const index = carousel.querySelectorAll('.menu-item').length;
    const tile = doc.createElement('a');
    tile.className = 'menu-item';
    tile.dataset.index = index;
    tile.href = href;
    tile.target = '_top';
    const row = doc.createElement('div');
    row.className = 'top-row';
    const symbol = doc.createElement('div');
    symbol.className = 'menu-icon';
    symbol.setAttribute('aria-hidden', 'true');
    symbol.textContent = icon;
    const title = doc.createElement('div');
    title.className = 'menu-title';
    title.textContent = label;
    row.append(symbol, title);
    const subtitle = doc.createElement('div');
    subtitle.className = 'menu-sub';
    subtitle.textContent = description;
    const art = doc.createElement('div');
    art.className = 'swipe-card-art swipe-card-art--' + artwork;
    art.setAttribute('aria-hidden', 'true');
    art.append(doc.createElement('span'));
    const status = doc.createElement('div');
    status.className = 'lock-badge';
    status.textContent = badge;
    tile.append(row, subtitle, art, status);
    carousel.append(tile);

    const tab = doc.createElement('button');
    tab.type = 'button';
    tab.className = 'tab-btn';
    tab.dataset.index = index;
    tab.textContent = label;
    tabs.append(tab);

    const dot = doc.createElement('span');
    dot.className = 'dot';
    dot.dataset.index = index;
    dots.append(dot);
  }

  const signOut = doc.createElement('a');
  signOut.href = '/private/?signout=1';
  signOut.target = '_top';
  signOut.textContent = 'Sign out';
  signOut.style.cssText = 'display:block;text-align:center;margin:14px auto;color:inherit;font:600 12px system-ui,sans-serif';
  dots.after(signOut);
}

async function readPage() {
  const storageNames = {
    'archive.html': 'archive-rotated.html',
    'surprise.html': 'surprise-rekeyed.html',
    [ebook]: 'The_Archive_Illustrated_Ebook_Locked.pdf',
  };
  const file = storageNames[page] ?? page;
  const { data, error } = await bucket.download(file);
  if (error) throw error;
  const bytes = await data.arrayBuffer();
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    byte => byte.toString(16).padStart(2, '0')).join('');
  if (hash !== documents[page]) throw new Error('This archive page could not be verified.');
  return page === ebook ? new Blob([bytes], { type: 'application/pdf' }) : new TextDecoder().decode(bytes);
}

function closeArchive() {
  displayedUser = null;
  if (ebookUrl) URL.revokeObjectURL(ebookUrl);
  ebookUrl = undefined;
  frame.hidden = true;
  frame.removeAttribute('srcdoc');
  $('gate').hidden = false;
}

async function render() {
  const version = ++generation;
  $('retry').hidden = true;
  const { data: { session }, error: sessionError } = await client.auth.getSession();
  if (version !== generation) return;
  if (sessionError?.name === 'AuthRetryableFetchError') {
    showRetry('Could not check your saved sign-in. Check your connection and try again.');
    return;
  }
  if (!session) {
    showForm(emailLinkFailed ? 'This sign-in link is expired or already used. Open the newest email link or request another.' : '');
    return;
  }
  $('form').hidden = true;
  $('signout').hidden = false;
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (version !== generation) return;
  if (!user) {
    if (userError?.name === 'AuthRetryableFetchError' || (userError?.status || 0) >= 500) {
      showRetry('Could not check your saved sign-in. Check your connection and try again.');
    } else {
      showForm('Your saved sign-in has ended. Request a new link to continue.');
    }
    return;
  }
  if (displayedUser === user.id && !frame.hidden) return;
  closeArchive();
  say('Checking access…');
  const { data, error } = await client.from('archive_authorized_users').select('user_id').eq('user_id', user.id).maybeSingle();
  if (version !== generation) return;
  if (error || !data) {
    if (error) showRetry('Could not verify archive access. Try again.');
    else say('This email is signed in and awaiting archive approval.');
    return;
  }
  try {
    const markup = await readPage();
    if (version !== generation) return;
    document.title = page === 'hub.html' ? 'Private Archive · Hub' : 'Private Archive';
    displayedUser = user.id;
    if (page === ebook) ebookUrl = URL.createObjectURL(markup);
    frame.srcdoc = buildPage(page === ebook ? `<!doctype html>
      <html lang="en"><head><meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>The Archive · Illustrated Ebook</title>
      <style>
        body { margin: 0; background: #f8f5ed; color: #193653; font: 16px system-ui, sans-serif; }
        main { max-width: 30rem; margin: 12vh auto; padding: 24px; }
        h1 { font: 700 36px Georgia, serif; }
        a { display: inline-block; padding: 12px; margin-right: 8px; color: inherit; }
        .open { background: #cddde9; border: 1px solid #7895ad; border-radius: 8px; }
      </style></head><body><main>
      <h1>The Archive</h1><p>Illustrated Edition · Passphrase required to open the PDF.</p>
      <a class="open" href="${ebookUrl}" target="_top">Open PDF</a>
      <a href="${ebookUrl}" download="${ebook}">Download PDF</a>
      </main></body></html>` : markup);
    frame.hidden = false;
    $('gate').hidden = true;
  } catch {
    if (version === generation) showRetry('Could not open this archive page. Try again.');
  }
}

$('retry').onclick = render;
$('form').onsubmit = async event => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  say('Sending sign-in email…');
  try {
    const { error } = await client.auth.signInWithOtp({
      email: $('email').value.trim(),
      options: { emailRedirectTo: location.origin + '/private/', shouldCreateUser: false },
    });
    if (error?.status === 429 || error?.code === 'over_email_send_rate_limit') {
      say('Email delivery is temporarily limited. Use your newest sign-in email if it still works, or try again later. Your archive approval is still in place.');
    } else if (error?.code === 'otp_disabled' || error?.code === 'signup_disabled' || error?.code === 'user_not_found') {
      say('Check that you entered the email approved for this archive.');
    } else {
      say(error ? error.message : 'Check your inbox. Open the newest sign-in link in the browser you want to keep using.');
    }
  } catch {
    say('Could not reach the sign-in service. Check your connection and try again.');
  } finally {
    button.disabled = false;
  }
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
    if (event !== 'INITIAL_SESSION') setTimeout(render, 0);
  });
  await render();
}
