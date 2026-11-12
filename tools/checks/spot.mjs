// Checks on the Echo Spot (480×480, round), in the bedroom and in the living room.
import { sleep, check, openPage, mockStates, mockReaches, callReaches, mockSet, noEvents, callLog, lastCall, setLibrary, ROOT_ITEMS, RADIOS, PLAYLISTS, RING_FITS, SWITCH_GAP, text, has, activeRoom, lightsOn, menuOpen, onScreen, insideRim, POP_PARTS, tapTab, load } from './harness.mjs';

// 1. Bedroom Spot, round 480×480.
export async function bedroomSpot() {
  const p = await openPage(480, 480);
  await load(p, 'device=Echo+Spot+Bedroom');
  check(await p.eval(`document.documentElement.classList.contains('shape-round')`), 'spot: round layout');
  check(await has(p, '#menu .ring') && !(await has(p, '#menu .menu-panel')), 'spot: the menu is a ring');
  await p.shot('spot-bedroom.png');

  // Layout, top to bottom: title, sensors, the modes as round icons; the main light's large power button; a strip of
  // lights, three in view; a large menu handle. No clock.
  const sbox = (sel) => p.eval(`(() => { const r = document.querySelector(${JSON.stringify('.view.active ' + sel)}).getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; })()`);
  const fontPx = (sel) => p.eval(`parseFloat(getComputedStyle(document.querySelector(${JSON.stringify('.view.active ' + sel)})).fontSize)`);
  const [sTitle, sSens, sModes, sMain, sLights, sDots, sHandle] = [await sbox('.title-btn'), await sbox('.sensors'), await sbox('.modes'), await sbox('.main'), await sbox('.lights'), await sbox('> .dots'), await p.rect('#menu-handle')];
  check(sTitle.b <= sSens.t && sSens.b <= sModes.t && sModes.b <= sMain.t && sMain.b <= sLights.t && sDots.b <= sHandle.t, 'spot: title, sensors, modes, main light, lights from top to bottom');
  check(!(await has(p, '.view.active .clock')), 'spot: no clock');
  // Room around the sensors, as much above as below: from the title's baseline (not its line box, which keeps room
  // for descenders) to their icons, and from there to the modes.
  const around = await p.eval(`(() => { const v = document.querySelector('.view.active'), mark = document.createElement('span'); mark.style.cssText = 'display:inline-block;width:0;height:0'; v.querySelector('.title-btn span').appendChild(mark); const base = mark.getBoundingClientRect().bottom; mark.remove(); const ic = v.querySelector('.sensor:not([hidden]) svg').getBoundingClientRect(); return [ic.top - base, v.querySelector('.modes .chip').getBoundingClientRect().top - ic.bottom]; })()`);
  check(Math.min(...around) >= 17 && Math.abs(around[0] - around[1]) < 2.5, `spot: as much room above the sensors as below them (${around.map((g) => g.toFixed(0)).join('px / ')}px)`);
  check(await p.eval(`(() => { const c = [...document.querySelectorAll('.view.active .modes .chip')].map((e) => e.getBoundingClientRect()); return c.every((r, j) => !j || r.left - c[j - 1].right >= 17); })()`), 'spot: room between the modes');
  check(await p.eval(`[...document.querySelectorAll('.view.active .modes .chip')].every((c) => { const r = c.getBoundingClientRect(); return Math.abs(r.width - r.height) < 1 && getComputedStyle(c).borderRadius === '50%' && c.querySelector('.name').offsetWidth === 0 && c.getAttribute('aria-label'); })`), 'spot: the modes are round icons without text (named for screen readers)');
  check(await fontPx('.title') >= 29 && await fontPx('.sensors') >= 16.5, 'spot: large title and sensors');
  const sPower = await sbox('.main .bar.group .power');
  check(sPower.w >= 70 && Math.abs(sPower.w - sPower.h) < 1 && await fontPx('.main .bar.group .name') < 23, `spot: a large power button for the main light (${sPower.w.toFixed(0)}px), its name as before`);
  // The lights: one strip in a straight row, three in view inside the rim, the fourth beyond the third.
  const sTiles = await p.eval(`[...document.querySelectorAll('.view.active .lights > .tile')].map((t) => [t.querySelector('.tile-icon'), t.querySelector('.tile-name')].map((e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width }; }))`);
  const inRim = ({ l, t, r, b }) => [[l, t], [r, t], [l, b], [r, b]].every(([x, y]) => Math.hypot(x - 240, y - 240) < 240 * (50 - 3.6) / 50);
  const rowTop = sTiles[0][0].t;
  check(sTiles.length === 4 && sTiles.every(([i]) => Math.abs(i.t - rowTop) < 0.5 && i.w > 50), 'spot: the lights in one straight row, their buttons as large as before');
  check(sTiles.slice(0, 3).every(([i, n]) => Math.hypot(i.l + i.w / 2 - 240, i.t + i.w / 2 - 240) + i.w / 2 < 240 * (50 - 3.6) / 50 && inRim(n)) && sTiles[3][0].l >= 400, 'spot: three of them in view, each with its name inside the rim; the fourth further on');
  check(await p.eval(`document.querySelectorAll('.view.active > .dots span').length === 2`), 'spot: a dot for each place the strip can rest');
  check(sPower.t - sModes.b >= 32 && rowTop - sPower.b >= 32, `spot: room above and below the power button (${(sPower.t - sModes.b).toFixed(0)}px, ${(rowTop - sPower.b).toFixed(0)}px)`);
  check(sHandle.w >= 90 && sHandle.h >= 38 && sHandle.t - Math.max(...sTiles.map(([, n]) => n.b)) >= 15, `spot: a large menu handle under the lights (${sHandle.w.toFixed(0)}×${sHandle.h.toFixed(0)}px)`);
  const [overDots, underDots] = [sDots.t - Math.max(...sTiles.map(([, n]) => n.b)), sHandle.t - sDots.b];
  check(overDots >= 8 && underDots >= 18 && underDots > overDots, `spot: the dots close under the names, with more room between them and the handle (${overDots.toFixed(0)}px, ${underDots.toFixed(0)}px)`);
  check(await p.eval(`(() => { const b = document.querySelector('.view.active .main .bar.group'); return getComputedStyle(b).backgroundColor === 'rgba(0, 0, 0, 0)' && getComputedStyle(b).borderTopWidth === '0px' && !b.querySelector('.bar-icon') && !!b.querySelector('.power'); })()`), 'spot: the main light has no background and no icon, just its power button, name and state');
  // The rim: its stroke reaches the edge of the round screen.
  const rim = await p.eval(`(() => { const t = document.querySelector('.view.active .dial.rim .dial-track'); const box = t.getBBox(); const w = parseFloat(getComputedStyle(t).strokeWidth); return { r: box.width / 2, w }; })()`);
  check(rim.w >= 3.4 && Math.abs(rim.r + rim.w / 2 - 50) < 0.05, `spot: a thick rim along the edge of the screen (stroke ${rim.w}, outer edge at ${(rim.r + rim.w / 2).toFixed(2)} of 50)`);
  // Sensors without a value are left out; the row goes with the last one, the events' count included.
  const SENSORS = `document.querySelectorAll('.view.active .sensor:not(.events-chip):not([hidden])').length`, CHIP = `!document.querySelector('.view.active .events-chip').hidden`;
  await mockSet('sensor.bedroom_temperature', 'unavailable');
  check(await p.waitFor(`${SENSORS} === 2 && !document.querySelector('.view.active .sensors').hidden`), 'an unavailable sensor is not shown');
  await mockSet('sensor.bedroom_humidity', 'unknown');
  await mockSet('binary_sensor.bedroom_presence', 'unavailable');
  check(await p.waitFor(`${SENSORS} === 0 && ${CHIP} && !document.querySelector('.view.active .sensors').hidden`), 'with no sensor left, the events\' count stays in the row');
  await noEvents(true);
  check(await p.waitFor(`document.querySelector('.view.active .sensors').hidden`), 'with no events either, the row goes');
  check(await p.waitFor(`(() => { const m = document.querySelector('.view.active .modes').getBoundingClientRect(), t = document.querySelector('.view.active .title-btn').getBoundingClientRect(); return m.top - t.bottom < 20; })()`), 'and the header closes up');
  await noEvents(false);
  await mockSet('sensor.bedroom_temperature', '19.4');
  await mockSet('sensor.bedroom_humidity', '48');
  await mockSet('binary_sensor.bedroom_presence', 'on');
  check(await p.waitFor(`${SENSORS} === 3 && ${CHIP}`), 'the sensors and the events\' count come back');

  // Tap a tile: Ceiling goes off.
  await p.tapSel('.view.active .tile:nth-child(1)');
  check(await mockReaches((st) => st['light.bedroom_ceiling'].s === 'off'), 'tap tile toggles the light off');
  await p.tapSel('.view.active .tile:nth-child(1)');
  check(await mockReaches((st) => st['light.bedroom_ceiling'].s === 'on'), 'tap again turns it back on');

  // A swipe across the main light brings in the room's lights one by one; it dims nothing. The rim and the power
  // button follow the light shown.
  const rimP = () => p.eval(`parseFloat(getComputedStyle(document.querySelector('.view.active .dial.rim')).getPropertyValue('--p'))`);
  const mainName = () => text(p, '.view.active .main .bar.current .name');
  const swipe = (to) => p.dragTo('.view.active .main', to, 0.5, to < 0.5 ? 0.7 : 0.33);   // to the right: from the power button
  const st = await mockStates();
  check(Math.abs(await rimP() - st['light.bedroom_lights'].a.brightness / 255) < 0.03, 'spot: the rim dial shows the room level');
  // While the finger moves, the light shown follows it and the next one comes in alongside, a slot's width behind,
  // fading in as the other fades out. A drag that falls short of a third of the way springs back.
  const sm = await p.rect('.view.active .main');
  await p.touch('touchStart', [{ x: sm.l + sm.w * 0.7, y: sm.y }]);
  for (let i = 1; i <= 5; i++) { await p.touch('touchMove', [{ x: sm.l + sm.w * (0.7 - 0.05 * i), y: sm.y }]); await sleep(80); }   // slowly: not a flick
  const mid = await p.eval(`(() => { const m = document.querySelector('.view.active .main'), [c, n] = ['.bar.current', '.bar.peek'].map((s) => m.querySelector(s)); if (!n) return null; const x = (e) => { const r = e.getBoundingClientRect(); return (r.left + r.right) / 2; }; return { name: n.querySelector('.name').textContent, apart: x(n) - x(c), moved: x(c) - x(m), w: c.offsetWidth, seen: getComputedStyle(n).visibility, oc: +getComputedStyle(c).opacity, on: +getComputedStyle(n).opacity }; })()`);
  await p.touch('touchEnd', []);
  check(mid && mid.name === 'Ceiling' && mid.seen === 'visible' && Math.abs(mid.apart - mid.w) < 1 && mid.moved < -50 && mid.oc > mid.on && mid.on > 0.1, `spot: while dragged, the main light follows the finger and the next one comes in alongside (${mid ? `${mid.moved.toFixed(0)}px, ${mid.apart.toFixed(0)}px behind` : 'not shown'})`);
  check(await p.waitFor(`(() => { const m = document.querySelector('.view.active .main'), c = m.querySelector('.bar.current'); return c.classList.contains('group') && !m.querySelector('.peek') && getComputedStyle(c).transform === 'none' && [...m.querySelectorAll('.bar:not(.current)')].every((b) => getComputedStyle(b).visibility === 'hidden'); })()`), 'spot: a drag that falls short springs back');
  await swipe(0.15);
  check(await p.waitFor(`document.querySelector('.view.active .main .bar.current .name').textContent === 'Ceiling'`), 'spot: a swipe to the left on the main light brings in the first light of the room');
  const st2 = await mockStates();
  check(['light.bedroom_lights', 'light.bedroom_ceiling'].every((id) => st2[id].a.brightness === st[id].a.brightness), 'and dims nothing: only the rim does');
  check(await p.waitFor(`Math.abs(parseFloat(getComputedStyle(document.querySelector('.view.active .dial.rim')).getPropertyValue('--p')) - ${st2['light.bedroom_ceiling'].a.brightness / 255}) < 0.03`), 'spot: the rim follows the light shown');
  const pct = (s, id) => Math.round(s[id].a.brightness / 2.55);
  await p.dragArc('.view.active .dial.rim', 0.8, 0.5);
  check(await mockReaches((s) => pct(s, 'light.bedroom_ceiling') >= 47 && pct(s, 'light.bedroom_ceiling') <= 53 && s['light.bedroom_nightstand_1'].a.brightness === st2['light.bedroom_nightstand_1'].a.brightness),
    `spot: the rim dims that light alone (got ${pct(await mockStates(), 'light.bedroom_ceiling')}%)`);
  await p.tapSel('.view.active .main .bar.current .power');
  check(await mockReaches((s) => s['light.bedroom_ceiling'].s === 'off' && s['light.bedroom_lights'].s === 'on'), 'spot: its power button turns that light alone off');
  await p.tapSel('.view.active .main .bar.current .power');
  await mockReaches((s) => s['light.bedroom_ceiling'].s === 'on');   // on again, before the swipe that must leave it so
  await swipe(0.85);
  check(await p.waitFor(`document.querySelector('.view.active .main .bar.current').classList.contains('group')`), 'a swipe to the right goes back');
  check((await mockStates())['light.bedroom_ceiling'].s === 'on', 'a swipe that starts on the power button does not press it');
  await swipe(0.85);
  check((await mainName()) === 'Bedside right', 'and from the first, round to the last light');
  await swipe(0.15);
  await swipe(0.15);
  check((await mainName()) === 'Ceiling', 'and from the last, on to the first');
  await p.eval(`dispatchEvent(new Event('kiosksatellite:screensaverstop')), true`);
  check(await p.waitFor(`document.querySelector('.view.active .main .bar.current').classList.contains('group')`), 'spot: the end of the screensaver brings back the room\'s main light');
  // Faint arrows either side of the main light say it swipes; a tap on one steps too.
  const arrows = await p.eval(`[...document.querySelectorAll('.view.active .main-arrow')].map((a) => { const r = a.getBoundingClientRect(); return { l: r.left, r: r.right, o: parseFloat(getComputedStyle(a).opacity) }; })`);
  const sText = await sbox('.main .bar.current .bar-text');
  check(arrows.length === 2 && arrows.every((a) => a.o < 0.6) && arrows[0].r <= sPower.l - 10 && arrows[1].l >= sText.r + 10, 'spot: faint arrows either side of the main light, clear of it');
  await p.tapSel('.view.active .main-arrow[data-dir="1"]');
  check(await p.waitFor(`document.querySelector('.view.active .main .bar.current .name').textContent === 'Ceiling'`), 'spot: a tap on the right arrow brings in the next light');
  await p.tapSel('.view.active .main-arrow[data-dir="-1"]');
  check(await p.waitFor(`document.querySelector('.view.active .main .bar.current').classList.contains('group')`), 'and the left one goes back');
  // A swipe on the strip moves it on by a light, not a page; the dots follow.
  await p.dragTo('.view.active .lights', 0.32, 0.5, 0.6);
  await sleep(400);
  const stripAt = await p.eval(`document.querySelector('.view.active .lights').scrollLeft`);
  check(Math.abs(stripAt - (sTiles[1][0].l - sTiles[0][0].l)) < 2 && await p.eval(`document.querySelector('.view.active > .dots span:nth-child(2)').classList.contains('on')`), `spot: a swipe on the lights moves them on by one (${stripAt.toFixed(0)}px), the dots follow`);
  await p.eval(`document.querySelector('.view.active .lights').scrollTo({ left: 0, behavior: 'instant' }), true`);
  await p.dragArc('.view.active .dial.rim', 0.8, 0.3);
  check(await mockReaches((s) => pct(s, 'light.bedroom_lights') >= 27 && pct(s, 'light.bedroom_lights') <= 33), `spot: dragging along the rim sets the level by angle (got ${pct(await mockStates(), 'light.bedroom_lights')}%)`);
  check(await mockReaches((s) => s['light.bedroom_ceiling'].a.brightness === s['light.bedroom_lights'].a.brightness), 'group members followed');
  check(await p.eval(`(() => { const t = document.querySelector('.view.active .tile'); const i = t.querySelector('.tile-icon').getBoundingClientRect(); return Math.abs(i.width - i.height) < 1 && i.width > 45 && getComputedStyle(t.querySelector('.tile-slider')).display === 'none'; })()`), 'spot: lights are round buttons without sliders');
  await p.tapSel('.view.active .main .power');
  check(await mockReaches((s) => s['light.bedroom_lights'].s === 'off'), 'spot: the power button turns the room off');
  await p.tapSel('.view.active .main .power');

  // The round mode buttons toggle their entity.
  await p.tapSel('.view.active .chip:nth-child(2)');
  check(await mockReaches((s) => s['switch.adaptive_lighting_sleep_mode_bedroom'].s === 'on'), 'spot: a round mode button toggles its switch');
  await p.tapSel('.view.active .chip:nth-child(2)');

  // Long-press a tile opens the popover; it offers the white tab for a colour-temperature light.
  let r = await p.rect('.view.active .tile:nth-child(1)');
  await p.longPress(r.x, r.y);
  await sleep(400);
  check(await p.waitFor(`!document.getElementById('popover').hidden`), 'long-press opens the popover');
  check((await text(p, '#pop-name')) === 'Ceiling', 'popover shows the light name');
  check(await has(p, '.tabs .tab.active'), 'popover has tabs');
  // On the Spot: no card, the menus' dark backdrop, a power button in place of the icon and of Off / On, and the
  // menu's tab, pointing down, in place of the close button. Everything inside the rim.
  check(await p.eval(`(() => { const c = getComputedStyle(document.querySelector('#popover .popover')); return c.backgroundColor === 'rgba(0, 0, 0, 0)' && c.borderTopWidth === '0px' && c.boxShadow === 'none'; })()`)
    && await p.eval(`getComputedStyle(document.getElementById('popover')).backgroundColor`) === 'rgba(0, 0, 0, 0.8)'
    && await p.eval(`['.pop-body .slider.big', '.tabs'].every((s) => getComputedStyle(document.querySelector('#popover ' + s)).backgroundColor.startsWith('rgb('))`), 'spot popover: no card, over the menus\' dark backdrop, the controls solid on it');
  check(await onScreen(p, '#pop-name') && !(await onScreen(p, '#pop-state')) && !(await onScreen(p, '#pop-icon')) && !(await onScreen(p, '#pop-close')) && !(await onScreen(p, '.pop-actions')), 'spot popover: the name alone at the top, no state, icon, Off / On or close buttons');
  const [pPower, pBright] = [await p.rect('#popover .pop-power'), await p.rect('#popover .pop-main > .slider')];
  check(pPower && pPower.l + pPower.w < pBright.l && Math.abs(pPower.y - pBright.y) < 1 && Math.abs(pPower.w - pBright.h) < 1, 'spot popover: a round power button before the brightness slider, as tall as it');
  const [pTab, mTab] = [await p.rect('#pop-tab'), await p.rect('#menu-handle')];
  check(['l', 't', 'w', 'h'].every((k) => Math.abs(pTab[k] - mTab[k]) < 1) && await has(p, '#pop-tab svg'), 'spot popover: its tab sits where the menu tab is');
  check(await insideRim(p, POP_PARTS), 'spot popover: the name and every control inside the rim');
  await p.shot('spot-popover-white.png');
  await p.dragTo('#popover .pane:not([hidden]) .slider.gradient', 0.9);
  check(await mockReaches((s) => s['light.bedroom_ceiling'].a.color_temp_kelvin >= 5500), `white slider sets the colour temperature (got ${(await mockStates())['light.bedroom_ceiling'].a.color_temp_kelvin}K)`);
  await p.dragTo('#popover .pop-body .slider.big', 0.25);
  check(await mockReaches((s) => pct(s, 'light.bedroom_ceiling') <= 30), 'popover brightness slider dims the light');
  await p.tapSel('#pop-tab');
  check(await p.waitFor(`document.getElementById('popover').hidden`), 'spot: the tab closes the popover');

  // Ambiance light: colour tab with swatches and effects. (The Spot's round buttons have no dots: long-press.)
  r = await p.rect('.view.active .tile:nth-child(2)');
  await p.longPress(r.x, r.y);
  await sleep(400);
  check(await p.waitFor(`!document.getElementById('popover').hidden`) && (await text(p, '#pop-name')) === 'Ambiance', 'long-press on a round light button opens its popover');
  await tapTab(p, 'Colour');
  check(await insideRim(p, POP_PARTS) && await p.eval(`(() => { const b = document.getElementById('pop-body'); return b.scrollHeight <= b.clientHeight + 1; })()`), 'spot popover: the colour controls and swatches fit inside the rim, nothing to scroll');
  // As far apart as each other: brightness, tabs, hue, saturation, swatches. The swatches large enough to aim at.
  const gaps = await p.eval(`(() => { const r = ['.pop-main', '.tabs', '.pane:not([hidden]) > .slider:nth-child(1)', '.pane:not([hidden]) > .slider:nth-child(2)', '.pane:not([hidden]) .swatches'].map((s) => document.querySelector('#popover ' + s).getBoundingClientRect()); return r.slice(1).map((b, j) => b.top - r[j].bottom); })()`);
  check(Math.min(...gaps) >= 18 && Math.max(...gaps) - Math.min(...gaps) < 1, `spot popover: the colour controls evenly spaced (${gaps.map((g) => g.toFixed(1)).join(', ')}px)`);
  const sw = await p.rect('#popover .pane:not([hidden]) .swatch');
  check(sw.w >= 34 && Math.abs(sw.w - sw.h) < 1, `spot popover: large round swatches (${sw.w.toFixed(0)}px)`);
  await p.shot('spot-popover-colour.png');
  await p.tapSel('#popover .swatches .swatch:nth-child(5)');
  check(await mockReaches((s) => s['light.bedroom_strips'].a.hs_color && s['light.bedroom_strips'].a.hs_color[0] === 180), 'a swatch sets the colour');
  await tapTab(p, 'Effects');
  await p.tapSel('#popover .pane:not([hidden]) .chip:nth-child(3)');
  check(await mockReaches((s) => s['light.bedroom_strips'].a.effect === 'Fireplace'), 'an effect chip starts the effect');
  await p.tapSel('#popover .pop-power');
  check(await mockReaches((s) => s['light.bedroom_strips'].s === 'off') && await p.waitFor(`document.querySelector('#popover .popover').classList.contains('off')`), 'spot popover: the power button turns the light off');
  await p.tapSel('#popover .pop-power');
  check(await mockReaches((s) => s['light.bedroom_strips'].s === 'on'), 'and on again');
  await p.tap(30, 240); await sleep(400);
  check(await p.eval(`document.getElementById('popover').hidden`), 'spot popover: a tap beside the controls closes it');

  // Room menu: on the Spot the title opens a list of rows across the screen, All lights off last, each row saying
  // how many lights its room has on, with a power button while some are. The tab under it points down.
  await p.tapSel('.view.active .title-btn');
  check(await p.waitFor(`document.getElementById('room-menu').classList.contains('open')`), 'tapping the title opens the room menu');
  await sleep(400);
  const rows = await p.eval(`[...document.querySelectorAll('#room-menu .room-card')].map((c) => { const r = c.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, name: c.querySelector('.room-name').textContent, state: c.querySelector('.room-state').textContent, off: !!c.querySelector('.room-off') && !c.querySelector('.room-off').hidden }; })`);
  check(await has(p, '#room-menu .rooms') && !(await has(p, '#room-menu .ring')) && rows.map((r) => r.name).join() === 'Bedroom,Living room,Office,All lights off' && (await text(p, '#room-menu .room-card.current .room-name')) === 'Bedroom', `spot: the room menu is a list of the rooms then All lights off, the current room marked (got ${rows.map((r) => r.name)})`);
  check(rows.every((r, j) => Math.abs(r.l + r.r - 480) < 1 && r.r - r.l > 280 && (!j || r.t - rows[j - 1].b >= 6)), 'spot: one row under the other, wide and centred');
  // Each row is a pill: both its round ends inside the rim.
  check(rows.every((r) => { const k = (r.b - r.t) / 2; return [r.l + k, r.r - k].every((x) => Math.hypot(x - 240, (r.t + r.b) / 2 - 240) + k < 240 * (50 - 3.6) / 50); }), 'spot: the rows fit inside the rim');
  const on1 = await lightsOn(), say1 = (n) => (n ? `${n} ${n > 1 ? 'lights' : 'light'} on` : 'Lights off');
  check(rows.map((r) => r.state).join() === [...on1, on1.reduce((a, b) => a + b)].map(say1).join() && rows.slice(0, 3).every((r, j) => r.off === on1[j] > 0), `spot: each row says how many lights are on and has a power button while some are (${rows.map((r) => r.state).join(', ')})`);
  check(await p.eval(`document.getElementById('menu-handle').classList.contains('open')`), 'spot: the tab points down while the room menu is open');
  await p.shot('spot-rooms.png');
  await p.tapSel('#room-menu .room-card:nth-child(3) .room-go');
  check(await p.waitFor(`document.querySelector('.view.active').dataset.room === 'office'`), 'a room in the list switches the view');
  check(await p.waitFor(`document.getElementById('room-menu').hidden`) && !(await p.eval(`document.getElementById('menu-handle').classList.contains('open')`)), 'and the room menu closes, the tab points up again');
  // Office: one light, so the main slider stands alone.
  check((await text(p, '.view.active .bar.group .name')) === 'Ceiling' && await p.eval(`document.querySelector('.view.active').classList.contains('solo')`), 'office: the ceiling light is the only control');
  check(!(await has(p, '.view.active .tile')) && !(await has(p, '.view.active .solo-card')), 'spot office: nothing but the main light and the rim');
  const ot = await p.rect('.view.active .title-btn');
  await p.shot('spot-office.png');
  const ob = (await mockStates())['light.office_lights'].a.brightness;
  await p.dragTo('.view.active .main', 0.15, 0.5, 0.75);
  check((await mockStates())['light.office_lights'].a.brightness === ob && (await text(p, '.view.active .main .bar.current .name')) === 'Ceiling' && !(await has(p, '.view.active .main-arrow')), 'spot office: a swipe across its only light changes nothing, and no arrows say it would');
  await p.dragArc('.view.active .dial.rim', 0.8, 0.4);
  check(await mockReaches((s) => pct(s, 'light.office_lights') >= 36 && pct(s, 'light.office_lights') <= 44), `office: the rim dims the ceiling light (got ${pct(await mockStates(), 'light.office_lights')}%)`);
  await p.tapSel('.view.active .chip:nth-child(1)');
  check(await mockReaches((s) => s['switch.adaptive_lighting_office'].s === 'off'), 'office: the Adaptive chip toggles its switch');
  await p.tapSel('.view.active .title-btn');
  await p.tapSel('#menu-handle');
  check(await p.waitFor(`document.getElementById('room-menu').hidden`) && (await activeRoom(p)) === 'office' && !(await p.eval(`document.getElementById('menu').classList.contains('open')`)), 'the tab closes the room menu without switching, and opens nothing else');
  await p.tapSel('.view.active .title-btn');
  await p.tap(30, 240); await sleep(400);
  check(await p.eval(`document.getElementById('room-menu').hidden`) && (await activeRoom(p)) === 'office', 'so does a tap beside the rows');
  // The office's header sits where the living room's does, a room with more lights (neither has events); the
  // bedroom's higher up, to make room for its events.
  await p.tapSel('.view.active .title-btn');
  await sleep(400);
  await p.tapSel('#room-menu .room-card:nth-child(2) .room-go');
  await p.waitFor(`document.querySelector('.view.active').dataset.room === 'living'`);
  await sleep(500);
  const lt = await p.rect('.view.active .title-btn');
  check(Math.abs(ot.t - lt.t) < 2 && sTitle.t < lt.t - 10, `spot office: the header sits at the top, like in the living room (${ot.t.toFixed(0)}px, living room ${lt.t.toFixed(0)}px, bedroom ${sTitle.t.toFixed(0)}px)`);
  await p.close();
}

// 2. Living Spot: the menu ring, the media card joins the light strip when the projector is on.
export async function livingSpot() {
  const p = await openPage(480, 480);
  await load(p, 'device=Echo+Spot+Living+Room');
  const h = await p.rect('#menu-handle');
  check(await has(p, '#menu-handle svg') && Math.abs(h.x - 240) < 1 && h.t + h.h > 460, 'living spot: the menu tab at the bottom, an arrow on it');
  check(await p.eval(`(() => { const v = document.querySelector('.view.active'); return v.querySelectorAll('.lights > .tile').length === 5 && v.querySelector('.lights > .media').hidden && v.querySelectorAll(':scope > .dots span').length === 3; })()`), 'five lights in one strip (three places to rest); the media card hidden while the projector is off');
  await p.shot('spot-living.png');
  await p.tapSel('.view.active .chip:nth-child(1)');
  check(await mockReaches((s) => s['input_boolean.projector'].s === 'on'), 'projector chip runs the turn-on script');
  check(await p.waitFor(`!document.querySelector('.view.active .lights > .media').hidden && document.querySelectorAll('.view.active > .dots span').length === 5`), 'the media card joins the end of the strip when the projector is on');
  await p.eval(`document.querySelector('.view.active .lights').scrollTo({ left: 1e4, behavior: 'instant' }), true`);
  await sleep(500);
  check((await text(p, '.view.active .media-title')) === 'Severance', 'the media card shows what is playing');
  // Inside the rim (its inner edge at 50 − 3.6 of the 50-unit radius), corners included, and no button cut off.
  check(await p.eval(`(() => { const m = document.querySelector('.view.active .media'), r = m.getBoundingClientRect(), k = parseFloat(getComputedStyle(m).borderTopLeftRadius), o = k * (1 - Math.SQRT1_2), t = m.querySelector('.media-transport');
    const pts = [[r.left, r.top + k], [r.left + o, r.top + o], [r.left + k, r.top], [r.left, r.bottom - k], [r.left + o, r.bottom - o], [r.left + k, r.bottom]].flatMap(([x, y]) => [[x, y], [2 * 240 - x, y]]);
    return pts.every(([x, y]) => Math.hypot(x - 240, y - 240) < 240 * (50 - 3.6) / 50) && t.scrollWidth <= t.clientWidth; })()`), 'spot: the media card fits inside the rim with all its buttons');
  await p.shot('spot-living-media.png');
  await p.tapSel('.view.active .media-btn.play');
  check(await mockReaches((s) => s['media_player.apple_tv'].s === 'paused'), 'play/pause pauses the Apple TV');
  // The menu: a ring in the middle of the screen, opened from its tab.
  check(!(await onScreen(p, '#menu .ring-item')), 'the menu is out of sight until opened');
  await p.tapSel('#menu-handle');
  check(await p.waitFor(`document.getElementById('menu').classList.contains('open')`), 'the tab opens the menu');
  await sleep(300);
  const ringNames = `[...document.querySelectorAll('#menu .ring-item')].map((e) => e.textContent).join()`;
  const menuNames = await p.eval(ringNames);
  check(menuNames === ROOT_ITEMS, `spot: the menu has every item, the folders last (got ${menuNames})`);
  const mid = await p.rect('#menu .ring-close');
  check(Math.abs(mid.x - 240) < 2 && Math.abs(mid.y - 240) < 2 && await p.eval(`[...document.querySelectorAll('#menu .ring-item')].every((e) => { const r = e.getBoundingClientRect(); return Math.hypot(r.left + r.width / 2 - 240, r.top + r.height / 2 - 240) + r.width / 2 < 240 * (50 - 3.6) / 50; })`), 'spot: the menu ring sits in the middle of the screen, inside the rim');
  check(await p.eval(`(() => { const cs = [...document.querySelectorAll('#menu .ring-item')].map((e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, d: r.width }; }); return cs.every((a, j) => cs.every((b, k) => j === k || Math.hypot(a.x - b.x, a.y - b.y) >= a.d)); })()`), 'the buttons on the ring do not touch');
  await p.shot('spot-menu.png');
  await p.tapSel('#menu .ring-item:nth-child(2)');
  check(await p.waitFor(`!document.getElementById('menu').classList.contains('open')`), 'choosing an item closes the menu');
  check((await text(p, '#toast')).includes('Kiosk Satellite'), 'outside Kiosk Satellite a ks:// link only explains itself');
  await p.tapSel('.view.active .chip:nth-child(1)');
  check(await mockReaches((s) => s['input_boolean.projector'].s === 'off'), 'projector chip runs the turn-off script');

  // The menu closes on a tap anywhere but on an item, over a dark backdrop, and on its close button.
  await p.tapSel('#menu-handle');
  await p.waitFor(`document.getElementById('menu').classList.contains('open')`);
  await sleep(300);
  check(await p.eval(`getComputedStyle(document.getElementById('backdrop')).backgroundColor`) === 'rgba(0, 0, 0, 0.8)', 'the backdrop behind an open menu is dark');
  const top = await p.rect('#menu .ring-item:nth-child(1)');
  await p.tap(top.l + top.w + 25, top.y - 10); await sleep(400);
  check(!(await menuOpen(p)) && (await activeRoom(p)) === 'living', 'tapping between the items closes the menu');
  await p.tapSel('#menu-handle');
  await p.waitFor(`document.getElementById('menu').classList.contains('open')`);
  await sleep(300);
  await p.tapSel('#menu .ring-close');
  check(!(await menuOpen(p)), 'and so does its close button');

  // Folders: Find my phone and Music open rings of their own, Back in the middle; Back brings the first ring back.
  // A script or a favourite closes the menu and says what was asked once the mock has answered.
  await p.tapSel('#menu-handle');
  await p.waitFor(`document.getElementById('menu').classList.contains('open')`);
  await sleep(300);
  check(await p.eval(`[...document.querySelectorAll('#menu .ring-item.folder')].map((e) => e.textContent).join() === 'Find my phone,Music,Settings' && document.querySelectorAll('#menu .ring-item.folder .more svg').length === 3`), 'spot: Find my phone, Music and Settings are folders, a small arrow in their corner');
  check(await p.eval(`[...document.querySelectorAll('#menu .ring-item .item-label')].every((l) => l.scrollHeight <= l.clientHeight + 1 && l.scrollWidth <= l.clientWidth + 1)`), 'spot: every name fits in its button (two lines at most)');
  await p.tapSel('#menu .ring-item:nth-child(5)');
  await sleep(350);
  const sub = await p.eval(`(() => { const c = (e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }; const items = [...document.querySelectorAll('#menu .ring-item')], mid = document.querySelector('#menu .ring-close');
    return { names: items.map((e) => e.textContent).join(), back: mid.getAttribute('aria-label') + (mid.classList.contains('back') ? ' .back' : ''), pts: items.map(c), mid: c(mid) }; })()`);
  check(sub.names === 'Alex,Sam' && sub.back === 'Back .back' && Math.abs(sub.mid.x - 240) < 2 && Math.abs(sub.mid.y - 240) < 2 && sub.pts[0].x < 200 && sub.pts[1].x > 280 && sub.pts.every((c) => Math.abs(c.y - 240) < 2) && await menuOpen(p), `spot: Find my phone opens a ring of the two phones either side of a Back button (got ${sub.names}, ${sub.back})`);
  await p.shot('spot-menu-folder.png');
  await p.tapSel('#menu .ring-close');
  await sleep(350);
  check((await p.eval(ringNames)) === ROOT_ITEMS && await menuOpen(p) && !(await p.eval(`document.querySelector('#menu .ring-close').classList.contains('back')`)), 'Back brings the first ring back, the menu still open, its close button in the middle');
  // Music holds the Music Assistant favourites (its Music Assistant page is kept to the Shows): the favourite radios
  // by name, their covers in the buttons (KEXP has none, Radio Paradise's does not load: both keep the icon), and a
  // switch at the top of the screen for the playlists. Picking one plays it on the player of the room.
  await p.tapSel('#menu .ring-item:nth-child(6)');
  await sleep(350);
  const phones = await p.eval(`window.KIOSK_CONFIG.menu.items.find((i) => i.name === 'Find my phone').items`);
  check(await p.waitFor(`${ringNames} === ${JSON.stringify(RADIOS)}`), `spot: Music opens the favourite radios by name, not the one that is no favourite; the Music Assistant page is kept to the Shows (got ${await p.eval(ringNames)})`);
  const asked = (await callLog()).filter((c) => c.service === 'get_library');
  check(asked.length >= 2 && asked.every((c) => c.domain === 'music_assistant' && c.response && c.data.config_entry_id === 'mock-music-assistant' && c.data.favorite === true) && ['radio', 'playlist'].every((k) => asked.some((c) => c.data.media_type === k)),
    `the favourites come from Music Assistant's Get library, for the instance the room's player comes from, radios and playlists (got ${JSON.stringify(asked.at(-1))})`);
  const covered = RADIOS.split(',').filter((n) => n !== 'KEXP' && n !== 'Radio Paradise').join();
  check(await p.waitFor(`[...document.querySelectorAll('#menu .ring-item.with-cover')].map((e) => e.textContent).join() === ${JSON.stringify(covered)} && ['KEXP', 'Radio Paradise'].every((n) => { const b = [...document.querySelectorAll('#menu .ring-item')].find((e) => e.textContent === n); return !b.querySelector('img') && b.querySelector('.icon').getBoundingClientRect().width > 10; })`),
    'covers in the buttons; KEXP (no cover) and Radio Paradise (a cover that does not load) keep the radio icon');
  const sw = await p.eval(`(() => { const s = document.querySelector('#menu .fav-switch'), r = s.getBoundingClientRect(); return { names: [...s.children].map((b) => b.textContent + (b.classList.contains('on') ? '*' : '')).join(), x: r.left + r.width / 2 }; })()`);
  const gap = await p.eval(SWITCH_GAP);
  check(sw.names === 'Radios*,Playlists' && Math.abs(sw.x - 240) < 2 && gap >= 4 && await insideRim(p, '#menu .fav-switch'), `spot: a switch at the top of the screen, Radios picked, inside the rim and above the ring (${sw.names}, ${Math.round(gap)}px above it)`);
  check(await p.eval(RING_FITS), 'the ring of covers sits inside the rim, its buttons apart, every name in its button');
  await p.shot('spot-menu-music.png');
  await p.tapSel('#menu .fav-switch button:nth-child(2)');
  check(await p.waitFor(`${ringNames} === ${JSON.stringify(PLAYLISTS)}`) && await menuOpen(p) && (await text(p, '#menu .fav-switch .on')) === 'Playlists', 'Playlists brings the favourite playlists in the radios\' place, the menu still open');
  await p.tapSel('#menu .ring-item:nth-child(2)');
  check(await p.waitFor(`!document.getElementById('menu').classList.contains('open')`), 'picking a playlist closes the menu');
  const livingPlayer = await p.eval(`window.KIOSK_CONFIG.rooms.living.player`);
  check(await callReaches((c) => c.domain === 'music_assistant' && c.service === 'play_media' && c.target.entity_id === livingPlayer && c.data.media_id === 'spotify://playlist/mock-discover-weekly' && c.data.media_type === 'playlist'),
    `the playlist plays through Music Assistant on the living room's player (got ${JSON.stringify(await lastCall())})`);
  check(await p.waitFor(`document.getElementById('toast').textContent === 'Music · Discover Weekly'`), 'a toast says which playlist was asked for');
  await p.tapSel('#menu-handle');
  await sleep(350);
  check((await p.eval(ringNames)) === ROOT_ITEMS, 'the menu opens on its first ring again');
  await p.tapSel('#menu .ring-item:nth-child(5)');
  await sleep(350);
  await p.tapSel('#menu .ring-item:nth-child(1)');
  check(await callReaches((c) => c.domain === 'script' && c.service === 'turn_on' && c.target.entity_id === phones[0].script) && await p.waitFor(`document.getElementById('toast').textContent === 'Find my phone · Alex'`) && !(await menuOpen(p)), 'Find my phone · Alex runs the script, closes the menu and says so');

  // The kind picked stays. Each time Music opens it asks Music Assistant again: with no favourite playlists left
  // it says so, Back alone in the middle; twelve favourite radios make a ring of the first ten by name.
  const twelve = Array.from({ length: 12 }, (_, i) => ({ media_type: 'radio', uri: `library://radio/${20 + i}`, name: `Station ${String(i + 1).padStart(2, '0')}`, image: `/mock/cover/station-${i + 1}.svg`, favorite: true }));
  await setLibrary({ radio: twelve, playlist: [] });
  await p.tapSel('#menu-handle');
  await sleep(350);
  await p.tapSel('#menu .ring-item:nth-child(6)');
  check(await p.waitFor(`(document.querySelector('#menu .fav-switch .on') || {}).textContent === 'Playlists' && (document.querySelector('#menu .fav-note') || {}).textContent === 'No favourite playlists in Music Assistant' && !document.querySelector('#menu .ring-item')`)
    && await insideRim(p, '#menu .fav-note'), 'spot: Music opens on Playlists again; with none left in Music Assistant it says so inside the rim, Back alone in the middle');
  await p.tapSel('#menu .fav-switch button:nth-child(1)');
  check(await p.waitFor(`${ringNames} === ${JSON.stringify(twelve.slice(0, 10).map((r) => r.name).join())}`), 'twelve favourite radios: the ring takes the first ten by name');
  check(await p.waitFor(`document.querySelectorAll('#menu .ring-item.with-cover').length === 10`) && await p.eval(RING_FITS) && (await p.eval(SWITCH_GAP)) >= 4, 'ten covers under the switch, inside the rim and apart, every name in its button');
  await p.shot('spot-menu-music-ten.png');
  await setLibrary(null);

  // A projector already on when the page loads: the media card is there from the start.
  await mockSet('input_boolean.projector', 'on');
  await load(p, 'device=Echo+Spot+Living+Room');
  check(await p.waitFor(`!document.querySelector('.view.active .lights > .media').hidden && document.querySelector('.view.active .media').classList.contains('show')`), 'media card shown when the page loads with the projector on');
  await mockSet('input_boolean.projector', 'off');

  // A swipe up on the handle opens it too.
  const hr = await p.rect('#menu-handle');
  await p.drag(hr.x, hr.y, hr.x, hr.y - 60, 5);
  check(await p.waitFor(`document.getElementById('menu').classList.contains('open')`), 'a swipe on the handle opens the menu');
  await p.tapSel('#menu-handle');
  check(await p.waitFor(`!document.getElementById('menu').classList.contains('open')`), 'and a tap on it closes it');

  // The WLED strip's popover on the Spot: its More tab runs past the bottom, so the controls scroll, fading out
  // above the tab; scrolled to the end, the last one clears the tab and stays inside the rim.
  await p.eval(`document.querySelector('.view.active .lights > .tile:nth-child(4)').scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'instant' }), true`);
  await sleep(400);
  const tv = await p.rect('.view.active .lights > .tile:nth-child(4) .tile-icon');
  await p.longPress(tv.x, tv.y);
  check(await p.waitFor(`!document.getElementById('popover').hidden`) && (await text(p, '#pop-name')) === 'TV strip', 'living spot: long-press on the TV strip opens its popover');
  await sleep(400);
  await tapTab(p, 'More');
  check(await p.eval(`(() => { const b = document.getElementById('pop-body'); return b.scrollHeight > b.clientHeight; })()`) && await insideRim(p, '#popover .pop-head, #popover .pop-main > *, #popover .tabs'), 'spot popover: the More tab scrolls under the name, brightness and tabs, which stay inside the rim');
  await p.shot('spot-popover-more.png');
  await p.eval(`(() => { const b = document.getElementById('pop-body'); b.scrollTop = b.scrollHeight; return true; })()`);
  await sleep(200);
  const [lastSlider, popTab] = [await p.eval(`(() => { const r = [...document.querySelectorAll('#popover .pane:not([hidden]) .slider')].pop().getBoundingClientRect(); return { b: r.bottom }; })()`), await p.rect('#pop-tab')];
  check(lastSlider.b < popTab.t && await insideRim(p, '#popover .pane:not([hidden]) > .slider:last-child'), `spot popover: scrolled to the end, the last control clears the tab and the rim (${lastSlider.b.toFixed(0)}px, tab at ${popTab.t.toFixed(0)}px)`);
  await p.dragTo('#popover .pane:not([hidden]) > .slider:last-child', 0.9);
  check(await mockReaches((s) => Number(s['number.tv_strip_intensity'].s) >= 220), 'spot popover: the intensity slider sets the number');
  await mockSet('number.tv_strip_intensity', '128');
  await p.tapSel('#pop-tab');
  check(await p.waitFor(`document.getElementById('popover').hidden`), 'and the tab closes it');
  await p.close();
}
