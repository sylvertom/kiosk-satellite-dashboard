// Checks of the theme: the accent taking the colour of the light the dial controls, the rooms' pictures, and
// every theme of themes/themes.js.
import { sleep, check, openPage, failPictures, pictureReferers, mockReaches, activeRoom, load, reset, slowFile, BASE } from './harness.mjs';

export const ACCENT = '242,175,72';   // the dark theme's, as config.example.js sets none
// The accent as the page paints it, once it and what takes it have faded to it.
export const accent = async (p) => { await sleep(1000); return p.eval(`getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').replace(/\\s/g, '')`); };
const hsl = (rgb) => {
  const [r, g, b] = rgb.split(',').map((v) => v / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), c = max - min;
  const h = !c ? 0 : max === r ? ((g - b) / c + 6) % 6 : max === g ? (b - r) / c + 2 : (r - g) / c + 4;
  return { h: h * 60, l: (max + min) / 2 };
};
export const near = (rgb, hue, by = 8) => rgb !== ACCENT && Math.abs(((hsl(rgb).h - hue + 540) % 360) - 180) <= by;
const lum = (rgb) => rgb.split(',').map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
const lightOn = (p, entity, data) => p.eval(`Kiosk.lightOn(${JSON.stringify(entity)}, ${JSON.stringify(data)}), true`);

// 12. The accent follows the light of the Spot's main slot, one swipe after another, and the Show's main light alone.
export async function accentFollowsLight() {
  {
    const p = await openPage(480, 480);
    await load(p, 'device=Echo+Spot+Bedroom');
    check(await accent(p) === ACCENT, 'spot: with the room\'s group in the main slot, which has no colour, the theme\'s accent');
    await p.tapSel('.view.active .main-arrow[data-dir="1"]');
    let a = await accent(p);
    check(near(a, 29), `spot: the ceiling light, a warm white (2700K), gives a warm accent (got ${a})`);
    await p.tapSel('.view.active .main-arrow[data-dir="1"]');
    a = await accent(p);
    check(near(a, 340), `spot: the pink strip gives a pink accent (got ${a})`);
    check(await p.eval(`getComputedStyle(document.querySelector('.view.active .bar.current .power')).backgroundColor`) === `rgb(${a.replace(/,/g, ', ')})`, 'its power button takes that colour');
    await p.tapSel('.view.active .bar.current .power');
    check(await mockReaches((st) => st['light.bedroom_strips'].s === 'off') && await accent(p) === ACCENT, 'spot: turned off, the theme\'s accent again');
    await p.tapSel('.view.active .bar.current .power');
    check(near(await accent(p), 340), 'and on, pink again');
    await p.tapSel('.view.active .title-btn');
    await sleep(400);
    await p.tapSel('#room-menu .room-card:nth-child(3) .room-go');
    a = await accent(p);
    check((await activeRoom(p)) === 'office' && near(a, 28) && hsl(a).l > 0.66, `spot: in the office, its cool white (4000K) gives a paler accent (got ${a})`);
    await p.close();
  }
  {
    const p = await openPage(960, 480);
    await load(p, 'device=Echo+Show+5+Bedroom');
    check(await accent(p) === ACCENT, 'show 5: the room\'s group without a colour, the theme\'s accent');
    await lightOn(p, 'light.bedroom_lights', { hs_color: [200, 90] });
    let a = await accent(p);
    check(near(a, 200), `show 5: the main light turned blue gives a blue accent (got ${a})`);
    check(await p.eval(`getComputedStyle(document.querySelector('.view.active .chip.on')).backgroundColor`) === `rgb(${a.replace(/,/g, ', ')})`, 'the modes that are on take it');
    await lightOn(p, 'light.bedroom_strips', { hs_color: [120, 90] });
    check(near(await accent(p), 200), 'show 5: a tile\'s light turned green leaves it as it is');
    await lightOn(p, 'light.bedroom_lights', { hs_color: [240, 100] });
    a = await accent(p);
    check(near(a, 240) && lum(a) >= 0.16, `show 5: a deep blue is lightened to show on the dark theme (got ${a})`);
    await load(p, 'device=Echo+Show+5+Bedroom&theme=light');
    a = await accent(p);
    check(near(a, 240) && hsl(a).l <= 0.61, `show 5, light theme: the accent stays dark enough to show on it (got ${a})`);
    await lightOn(p, 'light.bedroom_lights', { hs_color: [60, 30] });
    a = await accent(p);
    check(near(a, 60) && lum(a) <= 0.45, `show 5, light theme: a pale yellow is darkened (got ${a})`);
    await p.shot('show5-bedroom-light-accent.png');
    await p.close();
  }
}

// 13. The rooms' pictures: the bedroom's and the living room's own, none in the office; one that does not load.
export async function pictures() {
  await reset();
  const paper = (p) => p.eval(`(() => { const s = document.querySelector('#wallpaper .paper.show'); return { shown: document.querySelectorAll('#wallpaper .paper.show').length, image: s ? s.querySelector('img').src : '', fade: s ? s.style.getPropertyValue('--fade') : '', on: document.getElementById('app').classList.contains('with-wallpaper') }; })()`);
  {
    const p = await openPage(480, 480);
    await load(p, 'device=Echo+Spot+Bedroom');
    check(await p.waitFor(`!!document.querySelector('#wallpaper .paper.show')`), 'spot: the bedroom\'s picture comes in once loaded');
    let w = await paper(p);
    check(w.shown === 1 && w.image.includes('photo-1519681393784') && w.fade === '0.5' && w.on, `spot: it is the bedroom's own, faded by the theme's 0.5 (got ${w.image.slice(0, 60)}, ${w.fade})`);
    check(await p.eval(`(() => { const v = getComputedStyle(document.getElementById('views')), w = getComputedStyle(document.getElementById('wallpaper')); return v.backgroundImage === 'none' && w.borderRadius === '50%' && document.getElementById('wallpaper').getBoundingClientRect().width === 480; })()`), 'spot: it fills the round screen, in place of the usual background');
    check(await p.eval(`getComputedStyle(document.querySelector('.view.active .title')).textShadow !== 'none' && getComputedStyle(document.querySelector('.view.active .tile:not(.on) .tile-icon')).boxShadow !== 'none'`), 'spot: the text stands out from it, and a light that is off keeps a solid button');
    await sleep(500);
    await p.shot('spot-bedroom-picture.png');
    await p.tapSel('.view.active .title-btn');
    await sleep(400);
    await p.tapSel('#room-menu .room-card:nth-child(3) .room-go');
    await sleep(700);
    w = await paper(p);
    check(w.shown === 0 && !w.on && await p.eval(`getComputedStyle(document.getElementById('views')).backgroundImage.startsWith('linear-gradient')`), 'spot: the office has no picture, the usual background is back');
    await p.tapSel('.view.active .title-btn');
    await sleep(400);
    await p.tapSel('#room-menu .room-card:nth-child(2) .room-go');
    check(await p.waitFor(`!!document.querySelector('#wallpaper .paper.show')`), 'spot: the living room\'s picture');
    w = await paper(p);
    check(w.shown === 1 && w.image.includes('photo-1586023492125') && w.fade === '0.6' && w.on, `spot: it is the living room's own, faded by its own 0.6 (got ${w.fade})`);
    check(await p.eval(`document.querySelectorAll('#wallpaper .paper').length`) === 2, 'one layer for each picture, both loaded from the start');
    check(pictureReferers.length > 0 && pictureReferers.every((r) => r === ''), `the pictures are asked for without the page's address (got ${[...new Set(pictureReferers)]})`);
    await p.close();
  }
  {
    const p = await openPage(1280, 800);
    await load(p, 'device=Echo+Show+8+Living+Room');
    check(await p.waitFor(`document.getElementById('app').classList.contains('with-wallpaper')`), 'show 8: the living room\'s picture');
    check(await p.eval(`getComputedStyle(document.querySelector('.view.active .tile')).backgroundColor`) === 'rgba(18, 17, 16, 0.76)', 'show 8: on it the tiles are more solid');
    await sleep(500);
    await p.shot('show8-living-picture.png');
    failPictures(true);
    await load(p, 'device=Echo+Show+8+Living+Room');
    await sleep(1200);
    const w = await paper(p);
    check(w.shown === 0 && !w.on && await p.eval(`getComputedStyle(document.querySelector('.view.active .tile')).backgroundColor.startsWith('rgba(255, 255, 255, 0.0')`), 'show 8: a picture that does not load leaves the usual background and tiles');
    failPictures(false);
    await p.close();
  }
}

// 13b. Backgrounds drawn from a colour: the accent's opposite in the bedroom, a colour of its own in the office,
// the accent (the theme's background) in the living room.
export async function gradients() {
  await reset();
  const drawn = `(() => { let v; Object.defineProperty(window, 'KIOSK_CONFIG', { configurable: true, get: () => v, set: (c) => {
    c.theme.background = 'accent'; c.rooms.bedroom.background = 'complement'; c.rooms.office.background = '#5B3FD1'; delete c.rooms.living.background; v = c; } }); })();`;
  const paint = async (p) => { await sleep(1000); return p.eval(`(() => { const s = document.querySelector('#wallpaper .paper.show'), cs = s && getComputedStyle(s), n = (v) => cs ? cs.getPropertyValue(v).replace(/\\s/g, '') : '';
    return { shown: document.querySelectorAll('#wallpaper .paper.show').length, drawn: !!s && s.classList.contains('paint') && !s.querySelector('img'), a: n('--paint-rgb'), b: n('--paint-2-rgb'),
      on: document.getElementById('app').classList.contains('with-wallpaper') }; })()`); };
  const room = async (p, n) => { await p.tapSel('.view.active .title-btn'); await sleep(400); await p.tapSel(`#room-menu .room-card:nth-child(${n}) .room-go`); };
  {
    const p = await openPage(480, 480);
    await p.s('Page.addScriptToEvaluateOnNewDocument', { source: drawn });
    await load(p, 'device=Echo+Spot+Bedroom');
    let w = await paint(p);
    check(w.shown === 1 && w.drawn && w.on, 'spot: the bedroom\'s background is drawn, with no picture to load');
    check(near(w.a, 216) && near(w.b, 256) && hsl(w.b).l < hsl(w.a).l, `spot: the theme's amber accent gives its opposite, a blue, running to a deeper indigo (got ${w.a} to ${w.b})`);
    await p.shot('spot-bedroom-complement.png');
    await p.tapSel('.view.active .main-arrow[data-dir="1"]');
    await p.tapSel('.view.active .main-arrow[data-dir="1"]');
    w = await paint(p);
    check(near(await accent(p), 340) && near(w.a, 160) && near(w.b, 200), `spot: the pink strip in the main slot, a pink accent on its opposite, a green running to blue (got ${w.a} to ${w.b})`);
    await room(p, 3);
    w = await paint(p);
    check((await activeRoom(p)) === 'office' && w.drawn && w.a === '91,63,209' && near(w.b, 291), `spot: the office's own colour, whatever its light (got ${w.a} to ${w.b})`);
    await room(p, 2);
    w = await paint(p);
    const a = await accent(p);
    check(w.drawn && w.a === a, `spot: the living room has the theme's background, the accent (got ${w.a}, the accent ${a})`);
    check(await p.eval(`document.querySelectorAll('#wallpaper .paper').length === 3 && !document.querySelector('#wallpaper img')`), 'one layer for each colour, none of them a picture');
    await load(p, 'device=Echo+Spot+Bedroom&theme=nord');
    w = await paint(p);
    check(near(w.a, 13), `spot, nord: drawn from the opposite of the theme's own accent, its frosty blue giving a peach (got ${w.a})`);
    await load(p, 'device=Echo+Spot+Bedroom&theme=eink');
    w = await paint(p);
    check(w.shown === 0 && !w.on, 'spot, eink: a mono theme keeps its plain background');
    await p.close();
  }
  {
    const p = await openPage(1280, 800);
    await p.s('Page.addScriptToEvaluateOnNewDocument', { source: drawn });
    await load(p, 'device=Echo+Show+8+Living+Room');
    await lightOn(p, 'light.downstairs', { hs_color: [200, 90] });
    const w = await paint(p), a = await accent(p);
    check(near(a, 200) && w.drawn && w.a === a && near(w.b, 240), `show 8: the main light turned blue, the background follows the accent (got ${w.a} to ${w.b})`);
    check(await p.eval(`getComputedStyle(document.querySelector('.view.active .tile')).backgroundColor`) === 'rgba(18, 17, 16, 0.76)', 'show 8: on it the tiles are more solid, as on a picture');
    await p.shot('show8-living-accent.png');
    await p.close();
  }
}

// The page's colours as numbers, and how far two stand apart (WCAG's contrast ratio, 1 to 21).
const COLOURS = `((names) => Object.fromEntries(names.map((n) => { const d = document.body.appendChild(document.createElement('i')); d.style.color = 'var(' + n + ')';
  const c = getComputedStyle(d).color.match(/[\\d.]+/g).slice(0, 3).join(','); d.remove(); return [n, c]; })))`;
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

// 14. Every theme of themes/themes.js on the Spot and on the Show: its files loaded, its text legible on its
// background, its own accent; then a name that is not a theme, and a kiosk with a theme of its own.
export async function themes() {
  failPictures(true);   // the theme's own background, not the rooms' pictures
  let all = null;
  // one page at a time: Chrome does not draw a page in the background
  for (const [width, height, device, where] of [[480, 480, 'Echo+Spot+Bedroom', 'spot'], [1280, 800, 'Echo+Show+8+Living+Room', 'show']]) {
    const p = await openPage(width, height);
    if (!all) {
      await load(p, `device=${device}`);
      all = await p.eval(`window.KIOSK_THEMES`);
      check(Object.keys(all).includes('dark') && Object.keys(all).includes('light'), `themes/themes.js lists the dark and light themes (got ${Object.keys(all)})`);
    }
    for (const [name, t] of Object.entries(all)) {
      await load(p, `device=${device}&theme=${name}`);
      const got = await p.eval(`(() => { const h = document.documentElement; return { theme: h.dataset.theme, scheme: h.dataset.scheme, loading: h.classList.contains('theme-loading'),
        files: [...document.querySelectorAll('link[href^="themes/"]')].map((l) => ({ href: l.getAttribute('href'), rules: l.sheet ? l.sheet.cssRules.length : 0 })),
        fonts: [...document.fonts].map((f) => f.family + ' ' + f.status) }; })()`);
      const files = t.files || [];
      check(got.theme === name && got.scheme === (t.scheme === 'light' ? 'light' : 'dark') && !got.loading, `${where}, ${name}: the theme and its scheme apply (got ${got.theme}, ${got.scheme})`);
      check(got.files.length === files.filter((f) => /\.css(\?|$)/.test(f)).length && got.files.every((f) => f.rules > 0 && files.includes(f.href.slice('themes/'.length))), `${where}, ${name}: its stylesheets, and only those, loaded (got ${got.files.map((f) => `${f.href} ${f.rules}`)})`);
      check(got.fonts.every((f) => f.endsWith(' loaded')), `${where}, ${name}: its fonts loaded (got ${got.fonts.join(', ') || 'none'})`);
      const scene = files.some((f) => /\.js(\?|$)/.test(f));
      check(await p.eval(`(() => { const s = document.getElementById('scene'); return s.classList.contains('on') && s.children.length > 0 && document.getElementById('app').classList.contains('with-scene'); })()`) === scene,
        `${where}, ${name}: ${scene ? 'its scene moves behind the rooms' : 'no scene behind the rooms'}`);
      // A layer many times the screen is more than an Echo's graphics memory holds: other parts of the page go missing.
      const layers = await p.layers(), largest = Math.max(...layers.map((l) => l.w * l.h)) / (width * height);
      check(layers.length > 0 && largest <= 1.5, `${where}, ${name}: no layer of the page much larger than the screen (${layers.length ? `the largest ${largest.toFixed(1)} screens` : 'Chrome reported no layers'})`);
      if (where === 'show') {
        const widths = await p.eval(`(() => { const c = document.querySelector('.view.active .clock'), was = c.textContent;
          const w = ['00:00', '11:11', '23:59', '09:09', '15:55'].map((t) => { c.textContent = t; return c.getBoundingClientRect().width; }); c.textContent = was; return w; })()`);
        check(Math.max(...widths) - Math.min(...widths) < 1, `show, ${name}: the clock as wide at any time, so the header keeps still (got ${widths.map(Math.round)})`);
      }
      if (t.mono && where === 'spot') {
        const a = await accent(p), lit = await p.eval(`[...document.querySelectorAll('.view.active .tile.on')].map((e) => getComputedStyle(e).getPropertyValue('--tile-rgb').replace(/\\s/g, ''))`);
        check(lit.length > 1 && lit.every((rgb) => rgb === a), `${name}: a mono theme, its accent stands for every light's colour, the pink strip's too (got ${[...new Set(lit)]} for ${a})`);
      }
      if (where === 'spot') {
        const c = await p.eval(`${COLOURS}(['--text', '--muted', '--bg', '--surface-solid', '--accent', '--on-accent'])`);
        const worst = (fg, bgs) => Math.min(...bgs.map((b) => contrast(c[fg], c[b]))).toFixed(1);
        check(worst('--text', ['--bg', '--surface-solid']) >= 7, `${name}: its text stands out from its background and its menus (${worst('--text', ['--bg', '--surface-solid'])}:1, 7 at least)`);
        check(worst('--muted', ['--bg', '--surface-solid']) >= 4.5, `${name}: so does its quieter text (${worst('--muted', ['--bg', '--surface-solid'])}:1, 4.5 at least)`);
        check(worst('--on-accent', ['--accent']) >= 4.5, `${name}: and what is written on its accent (${worst('--on-accent', ['--accent'])}:1, 4.5 at least)`);
        check(worst('--accent', ['--bg', '--surface-solid']) >= 3, `${name}: its accent stands out from its background and its menus (${worst('--accent', ['--bg', '--surface-solid'])}:1, 3 at least)`);
      }
      await p.shot(`theme-${name}-${where}.png`);
    }
    await p.close();
  }
  const spot = await openPage(480, 480);
  // Nord brings its own accent: there while the light of the main slot has no colour, there from the first frame.
  await load(spot, 'device=Echo+Spot+Bedroom&theme=nord');
  check(await accent(spot) === '136,192,208', 'spot, nord: the theme\'s own accent, as config.js sets none');
  await spot.goto(`${BASE}/index.html?device=Echo+Spot+Bedroom&theme=nord`);
  let first = null;
  for (let i = 0; i < 200 && !first; i++) {
    first = await spot.eval(`(() => { const a = document.getElementById('app'); return a && !a.hidden ? getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').replace(/\\s/g, '') : null; })()`).catch(() => null);
    if (!first) await sleep(10);
  }
  check(first === '136,192,208', `spot, nord: the page shows in the theme's accent from the start, without fading to it (got ${first})`);
  // A mono theme keeps its accent when the light of the main slot takes a colour.
  const mono = Object.entries(all).find(([, t]) => t.mono);
  if (mono) {
    await load(spot, `device=Echo+Spot+Bedroom&theme=${mono[0]}`);
    const before = await accent(spot);
    await lightOn(spot, 'light.bedroom_lights', { hs_color: [200, 90] });
    check(await accent(spot) === before, `spot, ${mono[0]}: a mono theme does not follow the light, turned blue (got ${await accent(spot)}, ${before} before)`);
    await reset();
  }
  // A theme's scene: Matrix's rain moves, stops and empties while the page is hidden, comes back when it shows
  // again; with less motion asked for, it stands still. Synthwave's grid runs, or stands still.
  if (all.matrix && all.synthwave) {
    // the scene's canvas as an image, or why there is none yet
    const frame = () => spot.eval(`(() => { const c = document.querySelector('#scene canvas'); if (!c) return 'no canvas'; if (!c.width || !c.height) return 'no size';
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 1; i < d.length; i += 4) if (d[i] > 60) return c.toDataURL(); return 'nothing lit'; })()`);
    // The scene's first picture, which may come a moment after the page shows (the first drops of rain take a
    // few steps to fall into view), then whether another follows within two seconds.
    const watch = async () => {
      let a = await frame();
      for (const t0 = Date.now(); !a.startsWith('data:') && Date.now() - t0 < 3000; a = await frame()) await sleep(100);
      if (!a.startsWith('data:')) return a;
      for (const t0 = Date.now(); Date.now() - t0 < 2000;) { await sleep(100); if (await frame() !== a) return 'moving'; }
      return 'still';
    };
    const frameRate = () => spot.eval(`new Promise((done) => { let n = 0; const t0 = performance.now();
      const next = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(next); else done(n); }; requestAnimationFrame(next); })`);
    const hide = (hidden) => spot.eval(`Object.defineProperty(document, 'hidden', { value: ${hidden}, configurable: true }), document.dispatchEvent(new Event('visibilitychange')), true`);
    await load(spot, 'device=Echo+Spot+Bedroom&theme=matrix');
    let seen = await watch();
    check(seen === 'moving', `spot, matrix: the rain falls (got ${seen})`);
    await hide(true);
    check(await spot.eval(`document.getElementById('scene').children.length`) === 0, 'spot, matrix: with the page hidden, the rain stops and is gone');
    await hide(false);
    check(await spot.waitFor(`!!document.querySelector('#scene canvas')`, 1000), 'spot, matrix: shown again, it falls again');
    // Its script coming after the page has shown, as on a slow kiosk (the page waits 3 s at most for a theme's
    // files): the rain starts when it comes.
    await slowFile('/themes/matrix/rain.js', 7000);
    await load(spot, 'device=Echo+Spot+Bedroom&theme=matrix');
    const early = await spot.eval(`!!document.querySelector('#scene canvas')`);
    check(!early && await spot.waitFor(`!!document.querySelector('#scene canvas') && document.getElementById('app').classList.contains('with-scene')`, 7000), 'spot, matrix: a script that comes after the page has shown starts the rain then');
    await slowFile('/themes/matrix/rain.js', 0);
    await load(spot, 'device=Echo+Spot+Bedroom&theme=synthwave');
    seen = await watch();
    check(seen === 'moving', `spot, synthwave: the grid runs toward you (got ${seen}, ${await frameRate()} frames a second)`);
    await spot.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await load(spot, 'device=Echo+Spot+Bedroom&theme=matrix');
    seen = await watch();
    check(seen === 'still', `spot, matrix, less motion: the rain is there, still (got ${seen})`);
    await load(spot, 'device=Echo+Spot+Bedroom&theme=synthwave');
    seen = await watch();
    check(seen === 'still', `spot, synthwave, less motion: the grid is there, still (got ${seen})`);
    await spot.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  }
  // A name themes/themes.js does not list, or a path, gives the dark theme and loads nothing.
  for (const wrong of ['nope', '../css/base', 'constructor']) {
    await load(spot, `device=Echo+Spot+Bedroom&theme=${encodeURIComponent(wrong)}`);
    check(await spot.eval(`document.documentElement.dataset.theme === 'dark' && !document.querySelector('link[href^="themes/"], script[src^="themes/"]:not([src^="themes/themes.js"])')`), `theme=${wrong}: the dark theme, nothing loaded`);
  }
  // The office's Spot has the light theme of its own (config.example.js); the address wins over it.
  await load(spot, 'device=Echo+Spot+Office');
  check(await spot.eval(`document.documentElement.dataset.theme === 'light' && document.documentElement.dataset.scheme === 'light' && document.querySelector('.view.active').dataset.room === 'office'`), 'spot, office: its own room and its own theme, the light one');
  await load(spot, 'device=Echo+Spot+Office&theme=nord');
  check(await spot.eval(`document.documentElement.dataset.theme`) === 'nord', 'spot, office: theme=nord in the address wins over it');
  failPictures(false);
  await spot.close();
}
