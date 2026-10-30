// The check suite's harness: starts headless Chrome and talks to it over the
// DevTools protocol, opens pages as each kiosk, touches them, asks the mock
// for its states and saves screenshots. Shared by every file in this folder.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const OUT = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(ROOT, 'screenshots'));
fs.mkdirSync(OUT, { recursive: true });
// The screenshots the documentation shows, refreshed with --docs.
const DOCS = args.includes('--docs') ? path.join(ROOT, 'docs', 'images') : null;
if (DOCS) fs.mkdirSync(path.join(DOCS, 'themes'), { recursive: true });   // the theme gallery's, from every theme-<name>-<shape>.png
const DOC_SHOTS = new Set(['spot-bedroom.png', 'spot-menu-music.png', 'show5-bedroom.png', 'show5-rooms.png', 'show8-living.png', 'show8-popover-more.png']);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const failures = [];
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures.push(what); };

/* ---------------------------------------------------------- chrome */
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'kiosk-shoot-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--remote-allow-origins=*', `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1400,900', 'about:blank']);
const wsUrl = await new Promise((resolve, reject) => {
  let err = '';
  chrome.stderr.on('data', (d) => { err += d; const m = err.match(/DevTools listening on (ws:\/\/\S+)/); if (m) resolve(m[1]); });
  chrome.on('exit', () => reject(new Error('chrome exited: ' + err)));
});
const ws = new WebSocket(wsUrl);
await new Promise((r) => { ws.onopen = r; });
let seq = 0;
const waiting = new Map();
const consoleErrors = [];
const layerTrees = new Map();   // by page: the compositor's layers, as last reported
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && waiting.has(m.id)) { const { resolve, reject } = waiting.get(m.id); waiting.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); }
  if (m.method === 'Runtime.exceptionThrown') consoleErrors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') consoleErrors.push(m.params.args.map((a) => a.value || a.description).join(' '));
  if (m.method === 'Fetch.requestPaused') servePicture(m.sessionId, m.params);
  if (m.method === 'LayerTree.layerTreeDidChange' && m.params.layers) layerTrees.set(m.sessionId, m.params.layers);
};
// A call Chrome leaves unanswered for half a minute stops the run, saying which, instead of holding it for good.
const cdp = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++seq;
  waiting.set(id, { resolve, reject });
  setTimeout(() => { if (waiting.delete(id)) reject(new Error(`Chrome left ${method} unanswered for 30 s`)); }, 30000).unref();
  ws.send(JSON.stringify({ id, method, params, sessionId }));
});

// The example's background pictures come from Unsplash. The harness fetches
// each once per run and hands it to the page; without a network, a made-up
// one; with failPictures(true), none at all. It notes who asked (the Referer).
const PICTURES = 'https://images.unsplash.com/*';
// XP's wallpaper is a picture of the user's own (themes/xp/bliss.jpg, which git ignores): the suite, and so the
// gallery, see XP as the repository has it, with its own sky.
const WALLPAPER = '*/themes/xp/bliss.jpg*';
const SKY = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 800"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b5b8f"/><stop offset=".6" stop-color="#e9a86a"/><stop offset="1" stop-color="#f6e2b8"/></linearGradient></defs><rect width="1280" height="800" fill="url(#s)"/><circle cx="930" cy="250" r="90" fill="#fff6d8"/><path d="M0 560 L220 330 L400 520 L610 280 L860 560 L1050 380 L1280 540 V800 H0z" fill="#22303f"/><path d="M0 680 Q320 600 640 690 T1280 660 V800 H0z" fill="#101820"/></svg>`;
const pictures = new Map(), pictureReferers = [];
let picturesFail = false;
const failPictures = (on) => { picturesFail = on; };
async function servePicture(sessionId, { requestId, request }) {
  if (request.url.includes('/themes/xp/bliss.jpg')) { cdp('Fetch.fulfillRequest', { requestId, responseCode: 404 }, sessionId).catch(() => {}); return; }
  pictureReferers.push(Object.entries(request.headers).find(([k]) => k.toLowerCase() === 'referer')?.[1] || '');
  if (picturesFail) { cdp('Fetch.failRequest', { requestId, errorReason: 'InternetDisconnected' }, sessionId).catch(() => {}); return; }
  if (!pictures.has(request.url)) {
    pictures.set(request.url, fetch(request.url, { signal: AbortSignal.timeout(8000) })
      .then(async (r) => { if (!r.ok) throw new Error(r.status); return { type: r.headers.get('content-type'), body: Buffer.from(await r.arrayBuffer()) }; })
      .catch(() => ({ type: 'image/svg+xml', body: Buffer.from(SKY) })));
  }
  const { type, body } = await pictures.get(request.url);
  cdp('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: type }, { name: 'Cache-Control', value: 'no-store' }], body: body.toString('base64') }, sessionId).catch(() => {});
}

async function openPage(width, height, scale = 1) {
  const { targetId } = await cdp('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp('Target.attachToTarget', { targetId, flatten: true });
  const s = (method, params) => cdp(method, params, sessionId);
  await s('Page.enable');
  await s('Runtime.enable');
  await s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: true });
  await s('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
  await s('Emulation.setEmitTouchEventsForMouse', { enabled: false });
  // motion, whatever the machine asks for (GitHub's macOS machines ask for less): a check that wants less says so
  await s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await s('Fetch.enable', { patterns: [{ urlPattern: PICTURES }, { urlPattern: WALLPAPER }] });
  const page = {
    s, targetId,
    async goto(url) { await s('Page.navigate', { url }); await sleep(150); },
    async eval(expr) { const r = await s('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || '')); return r.result.value; },
    async waitFor(expr, ms = 6000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await this.eval(expr)) return true; } catch { /* navigating */ } await sleep(100); } return false; },
    async rect(sel) { return this.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, l: r.left, t: r.top, w: r.width, h: r.height }; })()`); },
    async touch(type, points) { await s('Input.dispatchTouchEvent', { type, touchPoints: points }); },
    async tap(x, y) { await this.touch('touchStart', [{ x, y }]); await sleep(60); await this.touch('touchEnd', []); },
    async tapSel(sel) { const r = await this.rect(sel); if (!r) throw new Error('no element ' + sel); await this.tap(r.x, r.y); await sleep(300); },
    async longPress(x, y, ms = 700) { await this.touch('touchStart', [{ x, y }]); await sleep(ms); await this.touch('touchEnd', []); },
    async drag(x1, y1, x2, y2, steps = 10) {
      await this.touch('touchStart', [{ x: x1, y: y1 }]);
      for (let i = 1; i <= steps; i++) { await this.touch('touchMove', [{ x: x1 + ((x2 - x1) * i) / steps, y: y1 + ((y2 - y1) * i) / steps }]); await sleep(40); }
      await sleep(80);
      await this.touch('touchEnd', []);
    },
    // a drag across an element, from a fraction of its width (0.3 by default) to another
    async dragTo(sel, frac, yFrac = 0.5, from = 0.3) { const r = await this.rect(sel); const y = r.t + r.h * yFrac; await this.drag(r.l + r.w * from, y, r.l + r.w * frac, y); await sleep(450); },
    // a drag along the dial's arc, from one fraction of it to another (0 = 7 o'clock, 1 = 5 o'clock)
    async dragArc(sel, from, to) {
      const r = await this.rect(sel); const rad = (f) => ((120 + f * 300) * Math.PI) / 180; const R = Math.min(r.w, r.h) * 0.46;
      const pt = (f) => [r.x + R * Math.cos(rad(f)), r.y + R * Math.sin(rad(f))];
      const steps = 10; await this.touch('touchStart', [{ x: pt(from)[0], y: pt(from)[1] }]);
      for (let i = 1; i <= steps; i++) { const [x, y] = pt(from + ((to - from) * i) / steps); await this.touch('touchMove', [{ x, y }]); await sleep(40); }
      await sleep(80); await this.touch('touchEnd', []); await sleep(450);
    },
    async shot(name) {
      await sleep(reduceWait);
      const { data } = await s('Page.captureScreenshot', { format: 'png' }), png = Buffer.from(data, 'base64');
      fs.writeFileSync(path.join(OUT, name), png);
      if (DOCS && DOC_SHOTS.has(name)) fs.writeFileSync(path.join(DOCS, name), png);
      if (DOCS && /^theme-.+-(spot|show)\.png$/.test(name)) await this.galleryShot(name);
      console.log(`     ${name}`);
    },
    // A theme's picture in the gallery (docs/images/themes/<name>-<shape>.webp): WebP, far smaller than PNG; the
    // Spot's cut to its round screen, its corners clear.
    async galleryShot(name) {
      const round = name.endsWith('-spot.png');
      if (round) {
        await s('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
        await this.eval(`document.head.appendChild(Object.assign(document.createElement('style'), { id: 'round-shot', textContent: 'html, body { background: transparent !important; } body { clip-path: circle(50%); }' })), true`);
      }
      const { data } = await s('Page.captureScreenshot', { format: 'webp', quality: 85 });
      fs.writeFileSync(path.join(DOCS, 'themes', name.replace(/^theme-|\.png$/g, '') + '.webp'), Buffer.from(data, 'base64'));
      if (round) {
        await this.eval(`document.getElementById('round-shot').remove(), true`);
        await s('Emulation.setDefaultBackgroundColorOverride', {});
      }
    },
    // The layers Chrome composites the page from, each that draws something as { w, h }: the graphics memory
    // the page takes. Chrome reports them as they change, so the page changes once while it listens.
    async layers() {
      layerTrees.delete(sessionId);
      await s('LayerTree.enable');
      await this.eval(`document.body.style.opacity = '0.99', true`);
      await sleep(300);
      await this.eval(`document.body.style.opacity = '', true`);
      await sleep(100);
      await s('LayerTree.disable');
      return (layerTrees.get(sessionId) || []).filter((l) => l.drawsContent).map((l) => ({ w: l.width, h: l.height }));
    },
    async close() { await cdp('Target.closeTarget', { targetId }); },
  };
  return page;
}
const reduceWait = 650; // let entrance animations finish before a screenshot
const seed = (page) => page.eval(`localStorage.setItem('hassTokens', JSON.stringify({ access_token: 'mock-seed', token_type: 'Bearer', expires_in: 1800, expires: Date.now() + 315360000000, hassUrl: location.origin, clientId: location.origin + '/' })), true`);
const mockStates = async () => (await fetch(BASE + '/__states')).json();
// Waits until the mock's states pass `ok`, as a call can take a while to reach it on a slow machine; false after `ms`.
async function mockReaches(ok, ms = 3000) {
  const t0 = Date.now();
  do { if (ok(await mockStates())) return true; await sleep(100); } while (Date.now() - t0 < ms);
  return false;
}
const mockSet = (entity, state) => fetch(BASE + '/__set', { method: 'POST', body: JSON.stringify({ entity, state }) });
const callLog = async () => (await fetch(BASE + '/__calls')).json();
const lastCall = async () => { const calls = await callLog(); return calls[calls.length - 1] || {}; };
const setLibrary = (lib) => fetch(BASE + '/__library', { method: 'POST', body: JSON.stringify(lib) });   // null: as it was
const failCalls = (on) => fetch(BASE + '/__fail', { method: 'POST', body: JSON.stringify({ on }) });   // the mock refuses every call meanwhile
const slowFile = (file, ms) => fetch(BASE + '/__slow', { method: 'POST', body: JSON.stringify({ file, ms }) });   // 0: at once again
const tokenLife = (life) => fetch(BASE + '/__tokens', { method: 'POST', body: JSON.stringify({ life }) });   // seconds a login's next tokens last
const dropConnections = () => fetch(BASE + '/__drop');   // as when Home Assistant restarts
const authLog = async () => (await fetch(BASE + '/__auths')).json();   // every sign-in on the WebSocket: { ok }
const ROOT_ITEMS = 'Now playing,Screensaver,Intercom,Cameras,Find my phone,Music,Settings';   // the menu, outside Kiosk Satellite
const RADIOS = 'BBC Radio 6 Music,FIP,France Inter,KEXP,Radio Nova,Radio Paradise,TSF Jazz';   // the mock's favourites, by name
const PLAYLISTS = 'Dinner jazz,Discover Weekly,Focus,Morning coffee,Sunday vinyl';
// on the Spot's ring of favourites: every button inside the rim, none touching another, every name on two lines
// at most (a longer one ends in an ellipsis) inside its round button
const RING_FITS = `(() => { const cs = [...document.querySelectorAll('#menu .ring-item')].map((e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, d: r.width, e }; });
  return cs.every((a) => Math.hypot(a.x - 240, a.y - 240) + a.d / 2 < 240 * (50 - 3.6) / 50) && cs.every((a, j) => cs.every((b, k) => j === k || Math.hypot(a.x - b.x, a.y - b.y) >= a.d))
    && cs.every(({ x, y, d, e }) => { const l = e.querySelector('.item-label'), box = l.getBoundingClientRect(), text = document.createRange(); text.selectNodeContents(l);
      return box.height <= parseFloat(getComputedStyle(l).fontSize) * 2.3 && [...text.getClientRects()].filter((r) => r.top < box.bottom - 1).every((r) => {   // the lines shown, as far as the label shows them
        const xs = [Math.max(r.left, box.left), Math.min(r.right, box.right)], ys = [Math.max(r.top, box.top), Math.min(r.bottom, box.bottom)];
        return xs.every((px) => ys.every((py) => Math.hypot(px - x, py - y) <= d / 2 + 0.5)); }); }); })()`;
// the gap between the bottom of the Spot's favourites switch and the top of the ring
const SWITCH_GAP = `(() => { const s = document.querySelector('#menu .fav-switch').getBoundingClientRect(); return Math.min(...[...document.querySelectorAll('#menu .ring-item')].map((e) => e.getBoundingClientRect().top)) - s.bottom; })()`;
const connected = "document.getElementById('status').hidden && !document.getElementById('app').hidden && [...document.querySelectorAll('.view.active .tile-state, .view.active .bar .state')].some((e) => e.textContent !== '')";
const text = (p, sel) => p.eval(`(document.querySelector(${JSON.stringify(sel)}) || {}).textContent || ''`);
const has = (p, sel) => p.eval(`!!document.querySelector(${JSON.stringify(sel)})`);
const activeRoom = (p) => p.eval(`document.querySelector('.view.active').dataset.room`);
// How many lights each room has on, as its main group says: bedroom, living room, office.
const lightsOn = async () => { const st = await mockStates(); return ['light.bedroom_lights', 'light.downstairs', 'light.office_lights'].map((g) => st[g].a.entity_id.filter((m) => st[m].s === 'on').length); };
const menuOpen = (p) => p.eval(`document.getElementById('menu').classList.contains('open')`);
// Whether an element is really on screen: laid out inside the viewport and not hidden.
const onScreen = (p, sel) => p.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight && getComputedStyle(e).visibility === 'visible'; })()`);
// Whether every element matching a selector that is laid out lies inside the Spot's rim (its inner edge at 50 − 3.6
// of the 50-unit radius), its rounded corners included.
const insideRim = (p, sel) => p.eval(`[...document.querySelectorAll(${JSON.stringify(sel)})].filter((e) => e.offsetWidth).every((e) => {
  const r = e.getBoundingClientRect(), k = Math.min(parseFloat(getComputedStyle(e).borderTopLeftRadius) || 0, r.width / 2, r.height / 2) * (1 - Math.SQRT1_2);
  return [[r.left + k, r.top + k], [r.right - k, r.top + k], [r.left + k, r.bottom - k], [r.right - k, r.bottom - k]].every(([x, y]) => Math.hypot(x - 240, y - 240) < 240 * (50 - 3.6) / 50); })`);
const POP_PARTS = '#popover .pop-head, #popover .pop-main > *, #popover .tabs, #popover .pane:not([hidden]) > :not(.swatches), #popover .pane:not([hidden]) .swatch';
async function tapTab(p, name) {
  const r = await p.eval(`(() => { const t = [...document.querySelectorAll('#popover .tabs .tab')].find((b) => b.textContent === ${JSON.stringify(name)}); if (!t) return null; const r = t.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  if (!r) throw new Error('no tab ' + name);
  await p.tap(r.x, r.y); await sleep(300);
}

async function load(page, query) {
  await page.goto(`${BASE}/index.html?${query}`);
  await page.waitFor("document.getElementById('app') !== null");
  await seed(page);
  await page.goto(`${BASE}/index.html?${query}`);
  check(await page.waitFor(connected, 15000), `${query}: connected and rendered`);   // the first page on a fresh machine takes a while
  // the room's widgets rise into place as it shows: the checks measure them once there
  await page.waitFor(`document.getAnimations().every((a) => a.animationName !== 'rise' || a.playState === 'finished')`, 3000);
  await sleep(250);
}

// The page's clock, from its next load on, set to a time on Wednesday 21 October 2026, and running on from there:
// the mock's calendars place their events on the day the page asks from.
const setClock = (page, h, m = 0) => page.s('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
  const D = Date, shift = new D(2026, 9, 21, ${h}, ${m}).getTime() - D.now();
  class Clock extends D { constructor(...a) { if (a.length) super(...a); else super(D.now() + shift); } static now() { return D.now() + shift; } }
  window.Date = Clock; })();` });
// From the page's next load on, config.js with these changes to one of its rooms ({ lights: [...], events: {...} }).
const changeRoom = (page, room, changes) => page.s('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { let v; Object.defineProperty(window, 'KIOSK_CONFIG', { configurable: true, get: () => v, set: (c) => {
  Object.assign(c.rooms[${JSON.stringify(room)}], ${JSON.stringify(changes)}); v = c; } }); })();` });
const addEvent = (e) => fetch(BASE + '/__calendar', { method: 'POST', body: JSON.stringify(e) });   // {entity, summary, day, h, m, minutes}
const noEvents = (none) => fetch(BASE + '/__calendar', { method: 'POST', body: JSON.stringify({ none }) });   // the calendars empty, or back

// Back to the mock's first states, its call log emptied.
const reset = () => fetch(BASE + '/__reset');
// The end of the run: no console errors, Chrome closed, the verdict.
async function finish() {
  check(consoleErrors.length === 0, 'no console errors' + (consoleErrors.length ? ':\n     ' + consoleErrors.join('\n     ') : ''));

  ws.close();
  const exited = new Promise((r) => chrome.on('exit', r));
  chrome.kill();
  await exited;
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
  // the failures again at the end, where a long run's output is read; on GitHub, also at the top of the run's page
  console.log(failures.length ? `\n${failures.length} failure(s):\n${failures.map((f) => `FAIL ${f}`).join('\n')}` : '\nall checks passed');
  if (process.env.GITHUB_ACTIONS) for (const f of failures) console.log(`::error title=Check failed::${f.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')}`);
  process.exit(failures.length ? 1 : 0);
}

export {
  check, openPage, failPictures, pictureReferers, ROOT_ITEMS, has, menuOpen, load, sleep, text, insideRim, mockStates, mockReaches, activeRoom, mockSet, lastCall, RADIOS, PLAYLISTS, lightsOn, onScreen, tapTab, BASE, connected, callLog, setLibrary, RING_FITS, SWITCH_GAP, POP_PARTS, reset, finish,
  failCalls, slowFile, tokenLife, dropConnections, authLog, setClock, changeRoom, addEvent, noEvents,
};
