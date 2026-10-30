// Checks of the page where the integration serves it (/kiosk_dashboard/, which the mock serves too), and of
// what a release hands HACS.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE, check, openPage, connected, load } from './harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

// 12. Through the integration: the page signs in and shows its room, every file of its own (config.js, a theme's
//    stylesheet, script and fonts) comes from /kiosk_dashboard/; without config.js, the page says where it goes.
//    The integration is at the page's version, and hacs.json names the zip a release attaches.
export async function integration() {
  const p = await openPage(480, 480);
  await load(p, 'device=Echo+Spot+Bedroom');   // signed in, as the kiosk is
  await p.goto(`${BASE}/kiosk_dashboard/index.html?device=Echo+Spot+Bedroom&theme=synthwave`);
  check(await p.waitFor(connected, 8000) && await p.eval(`document.querySelector('.view.active').dataset.room`) === 'bedroom', 'integration: the page at /kiosk_dashboard/ connects and shows the kiosk\'s room');
  await p.waitFor(`!document.documentElement.classList.contains('theme-loading')`);
  const files = await p.eval(`performance.getEntriesByType('resource').map((r) => new URL(r.name)).filter((u) => u.origin === location.origin && /\\.(js|css|woff2)$/.test(u.pathname)).map((u) => u.pathname)`);
  check(['/kiosk_dashboard/config.js', '/kiosk_dashboard/js/main.js', '/kiosk_dashboard/themes/synthwave/theme.css', '/kiosk_dashboard/themes/synthwave/scene.js'].every((f) => files.includes(f))
    && files.every((f) => f.startsWith('/kiosk_dashboard/')), `integration: config.js, the scripts and the theme's files from /kiosk_dashboard/ (got ${files.filter((f) => !f.startsWith('/kiosk_dashboard/')).join(', ') || files.length + ' files'})`);
  await p.close();

  const q = await openPage(960, 480);
  await q.s('Page.addScriptToEvaluateOnNewDocument', { source: `Object.defineProperty(window, 'KIOSK_CONFIG', { configurable: true, get: () => undefined, set: () => {} });` });
  await q.goto(`${BASE}/kiosk_dashboard/index.html?room=bedroom`);
  check(await q.waitFor(`document.getElementById('status').textContent.includes('copy config.example.js to /config/www/kiosk/config.js')`), 'integration: without config.js the page says to copy config.example.js to /config/www/kiosk/');
  await q.close();

  const page = [...new Set(read('index.html').match(/\?v=[0-9.]+/g))], manifest = JSON.parse(read('custom_components/kiosk_dashboard/manifest.json'));
  check(page.length === 1 && page[0] === `?v=${manifest.version}`, `the integration is at the page's version (got ${manifest.version}, ${page})`);
  const zip = JSON.parse(read('hacs.json')).filename;
  check(zip && read('.github/workflows/release.yml').includes(`zip -qr ../../${zip} .`), `hacs.json names the zip a release attaches (${zip})`);
}
