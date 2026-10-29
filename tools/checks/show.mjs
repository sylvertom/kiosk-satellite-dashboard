// Checks on the Echo Show 5 (960×480) in the bedroom, the Echo Show 8 (1280×800) in the living room, and the light
// tiles on an Echo Show 8 as Kiosk Satellite lays it out (960×600).
import { sleep, check, openPage, mockStates, mockSet, lastCall, callLog, failCalls, ROOT_ITEMS, RADIOS, PLAYLISTS, text, has, activeRoom, lightsOn, onScreen, tapTab, load, setClock, changeRoom, addEvent } from './harness.mjs';

// 4. Bedroom Show (Echo Show 5, 960×480): rail on the right; light theme.
export async function bedroomShow5() {
  const p = await openPage(960, 480);
  await load(p, 'device=Echo+Show+5+Bedroom');
  const rail = await p.rect('#menu .menu-panel');
  check(await p.eval(`document.getElementById('app').classList.contains('with-rail')`) && rail.l + rail.w > 940 && rail.h > 200 && !(await has(p, '#menu .ring')), 'show 5: a rail on the right edge');
  check(await p.eval(`document.getElementById('menu-handle').hidden && getComputedStyle(document.querySelector('#menu .menu-item .item-label')).display === 'none'`), 'show 5: icons only, no tab');
  const railNames = await p.eval(`[...document.querySelectorAll('#menu .menu-item')].map((e) => e.getAttribute('aria-label')).join()`);
  check(railNames === ROOT_ITEMS, `show 5: every item on the rail; outside Kiosk Satellite, Now playing too (got ${railNames})`);
  check(await p.eval(`document.documentElement.classList.contains('density-compact')`), 'show 5: compact density');
  check((await text(p, '.view.active .main .bar.group .state')) !== '', 'group bar shows a state');
  let st, r;
  await p.shot('show5-bedroom.png');
  await load(p, 'device=Echo+Show+5+Bedroom&theme=light');
  check(await p.eval(`document.documentElement.dataset.theme`) === 'light', 'theme=light in the address applies');
  await p.shot('show5-bedroom-light.png');

  // Header: title with the sensors under it, the modes in the middle, the clock on the right.
  await load(p, 'device=Echo+Show+5+Bedroom');
  const box = (sel) => p.eval(`(() => { const r = document.querySelector(${JSON.stringify('.view.active ' + sel)}).getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; })()`);
  const railBox = await p.rect('#menu .menu-panel');
  let top = await box('.top'), ttl = await box('.title-btn'), modes = await box('.modes'), clock = await box('.clock'), sens = await box('.sensors');
  let first = await box('.modes .chip:first-child'), last = await box('.modes .chip:last-child');
  check(await p.eval(`document.querySelector('.view.active .modes').parentElement.classList.contains('top')`) && first.l >= ttl.r && last.r <= clock.l && first.t >= top.t && first.b <= top.b, 'header: the modes sit in the top bar, between the title and the clock');
  check(await p.eval(`!document.querySelector('.view.active .modes').classList.contains('icons') && [...document.querySelectorAll('.view.active .modes .chip')].every((c) => c.querySelector('.name').scrollWidth <= c.querySelector('.name').clientWidth)`), 'header: every mode shows its full name');
  check(sens.t >= ttl.b - 2 && Math.abs(sens.l - (await box('.title')).l) < 2 && sens.b <= top.b + 1, 'header: the sensors are under the title');
  check((await text(p, '.view.active .clock')).match(/^\d\d:\d\d$/) !== null && clock.b <= railBox.t && clock.h > ttl.h * 0.8, 'header: a large 24 hour clock at the right end, above the rail');
  check((await box('.tile:nth-child(3)')).r <= railBox.l - 10 && (await box('.events')).r <= railBox.l - 10, 'the tiles and the events keep clear of the rail');
  check(top.h > 50, `header: the top bar is tall (${top.h.toFixed(0)}px)`);
  check(!(await has(p, '.nav-btn')) && !(await has(p, '.chip.preset')), 'no navigation buttons and no presets');
  // Under the header, the dial and the lights share the rest of the screen: the lights in the middle of the height
  // beside the dial, first the room's events (the light tiles 2 to 5 in the grid), all four lights in view.
  let bar = await box('.main .bar.group'), evs = await box('.lights > .events'), tile1 = await box('.lights > .tile:nth-child(2)'), grid = await box('.lights');
  check(bar.t >= top.b && grid.t >= top.b && evs.t - grid.t < 5 && tile1.t > evs.b && grid.b <= 480 && bar.b <= 480 && Math.abs((grid.t + grid.b) / 2 - (bar.t + bar.b) / 2) < 6
    && await p.eval(`(() => { const g = document.querySelector('.view.active .lights'); return g.scrollHeight <= g.clientHeight + 1; })()`),
  `the dial and the lights side by side, the lights in the middle of the height, the events first, all in view (dial ${bar.h.toFixed(0)}px, events ${evs.h.toFixed(0)}px, tile ${tile1.h.toFixed(0)}px)`);
  check(await p.eval(`getComputedStyle(document.querySelector('.view.active .main .bar.group')).backgroundColor === 'rgba(0, 0, 0, 0)' && !document.querySelector('.view.active .main .bar.group .power')`), 'the main control is the dial alone, no card behind it');
  await p.dragTo('.view.active .main .bar.group', 0.45, 0.3);
  st = await mockStates();
  check(Math.abs(Math.round(st['light.bedroom_lights'].a.brightness / 2.55) - 45) <= 3, 'dragging across the dial dims the room');
  check((await text(p, '.view.active .main .bar.group .state')).startsWith(String(Math.round(st['light.bedroom_lights'].a.brightness / 2.55)) + '%'), 'the middle of the dial shows the level');
  await p.dragArc('.view.active .main .bar.group .dial', 0.45, 0.7);
  st = await mockStates();
  check(Math.abs(Math.round(st['light.bedroom_lights'].a.brightness / 2.55) - 70) <= 3, `dragging along the dial's arc sets the level by angle (got ${Math.round(st['light.bedroom_lights'].a.brightness / 2.55)}%)`);
  await p.tapSel('.view.active .main .bar.group .dial-centre');
  check((await mockStates())['light.bedroom_lights'].s === 'off', 'a tap on the name in the middle turns the room off');
  await p.tapSel('.view.active .main .bar.group .dial-centre');
  check(await p.waitFor(`document.querySelector('.view.active .main .bar.group').classList.contains('on')`), 'and on again');
  // Tiles: the pill at the bottom is a slider for that light.
  await p.dragTo('.view.active .tile:nth-child(2) .tile-slider', 0.6);
  st = await mockStates();
  check(Math.abs(Math.round(st['light.bedroom_ceiling'].a.brightness / 2.55) - 60) <= 3, 'dragging a tile\'s pill dims that light alone');
  check((await text(p, '.view.active .tile:nth-child(2) .tile-state')).replace('%', '') === String(Math.round(st['light.bedroom_ceiling'].a.brightness / 2.55)), 'the pill shows the level');
  // A call Home Assistant refuses: a toast says so, and the pill goes back to the level the light has.
  const level = await text(p, '.view.active .tile:nth-child(2) .tile-state');
  await failCalls(true);
  await p.dragTo('.view.active .tile:nth-child(2) .tile-slider', 0.9);
  await failCalls(false);
  check(await p.waitFor(`document.getElementById('toast').textContent === 'Home Assistant did not answer'`) && await p.waitFor(`document.querySelector('.view.active .tile:nth-child(2) .tile-state').textContent === ${JSON.stringify(level)}`, 1500),
    `a refused call: a toast says so and the pill goes back to ${level} (shows ${await text(p, '.view.active .tile:nth-child(2) .tile-state')})`);
  check((await text(p, '.view.active .tile:nth-child(3) .tile-extra')).includes('Fireplace'), 'a running effect shows after the light\'s name');

  // Room menu: a grid of room cards, then All lights off, each saying how many lights are on, clear of the rail.
  await p.tapSel('.view.active .title-btn');
  check(await p.waitFor(`document.getElementById('room-menu').classList.contains('open')`) && await has(p, '#room-menu .rooms') && !(await has(p, '#room-menu .ring')), 'show 5: the title opens the room grid');
  await sleep(400);
  const cards = await p.eval(`[...document.querySelectorAll('#room-menu .room-card')].map((c) => { const r = c.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, name: c.querySelector('.room-name').textContent, state: c.querySelector('.room-state').textContent }; })`);
  const railLeft = (await p.rect('#menu .menu-panel')).l;
  check(cards.map((c) => c.name).join() === 'Bedroom,Living room,Office,All lights off' && cards.every((c) => c.l >= 0 && c.t >= 0 && c.b <= 480 && c.r <= railLeft - 12), 'show 5: the rooms and All lights off, inside the screen and clear of the rail');
  const on = await lightsOn(), say = (n) => (n ? `${n} ${n > 1 ? 'lights' : 'light'} on` : 'Lights off');
  check(cards.map((c) => c.state).join() === [...on, on.reduce((a, b) => a + b)].map(say).join(), `each card says how many lights are on, the last one in all (${cards.map((c) => c.state).join(', ')})`);
  check((await text(p, '#room-menu .room-card.current .room-name')) === 'Bedroom', 'the grid marks the current room');
  await p.shot('show5-rooms.png');
  await p.tap(880, 60); await sleep(400);
  check(await p.eval(`document.getElementById('room-menu').hidden`) && (await activeRoom(p)) === 'bedroom', 'tapping outside closes the grid');

  // The favourites are asked for as soon as the page has connected, before a folder of them opens.
  const before = (await callLog()).length;
  await load(p, 'device=Echo+Show+5+Bedroom');
  const both = (kinds) => kinds.includes('radio') && kinds.includes('playlist');
  let kinds = [];
  for (let i = 0; i < 20 && !both(kinds); i++) {
    await sleep(100);
    kinds = (await callLog()).slice(before).filter((c) => c.service === 'get_library').map((c) => c.data.media_type);
  }
  check(both(kinds), `show 5: once connected the page asks Music Assistant for the radios and playlists, no folder open (asked for ${kinds.join() || 'nothing'})`);

  // Folders on the rail: Music opens a grid of cards in the room menu's place, Back first, its rail button marked.
  // Back, a tap outside, the rail button again or picking an item closes it.
  const folderNames = `[...document.querySelectorAll('#folder-menu .room-card .room-name')].map((e) => e.textContent).join()`;
  check(await p.eval(`[...document.querySelectorAll('#menu .menu-item.folder')].map((e) => e.getAttribute('aria-label')).join() === 'Find my phone,Music,Settings' && document.querySelectorAll('#menu .menu-item.folder .more svg').length === 3`), 'show 5: Find my phone, Music and Settings are folders on the rail, a small arrow in their corner');
  await p.tapSel('#menu .menu-item[aria-label="Music"]');
  check(await p.waitFor(`document.getElementById('folder-menu').classList.contains('open')`), 'show 5: Music on the rail opens its folder');
  await p.waitFor(`${folderNames} === ${JSON.stringify(`Back,${RADIOS},Music Assistant`)}`);
  await sleep(400);
  const fcards = await p.eval(`[...document.querySelectorAll('#folder-menu .room-card')].map((c) => { const r = c.getBoundingClientRect(); return { name: c.querySelector('.room-name').textContent, l: r.left, t: r.top, r: r.right, b: r.bottom }; })`);
  check(fcards.map((c) => c.name).join() === `Back,${RADIOS},Music Assistant` && fcards.every((c) => c.l >= 0 && c.t >= 0 && c.b <= 480 && c.r <= railLeft - 12), `show 5: Back, the favourite radios and the Music Assistant page as cards, on screen and clear of the rail (got ${fcards.map((c) => c.name)})`);
  const fsw = await p.eval(`(() => { const s = document.querySelector('#folder-menu .fav-switch').getBoundingClientRect(), g = document.querySelector('#folder-menu .rooms').getBoundingClientRect(), c = document.querySelector('#folder-menu .room-card').getBoundingClientRect(); return { t: s.top, b: s.bottom, x: s.left + s.width / 2, gx: g.left + g.width / 2, first: c.top }; })()`);
  check(fsw.t >= 0 && fsw.t < 30 && fsw.b + 8 <= fsw.first && Math.abs(fsw.x - fsw.gx) < 2, `show 5: the switch at the top of the screen, centred over the cards and clear of them (top ${Math.round(fsw.t)}px)`);
  check(await p.waitFor(`(() => { const c = [...document.querySelectorAll('#folder-menu .room-go.with-cover')], r = c.length && c[0].querySelector('.room-icon').getBoundingClientRect(); return c.length === 5 && Math.abs(r.width - r.height) < 1 && r.width > 60; })()`), 'show 5: the five radios that have a cover show it, square and larger than an icon');
  check(await p.eval(`document.querySelector('#menu .menu-item[aria-label="Music"]').classList.contains('active') && document.getElementById('room-menu').hidden && document.querySelector('#folder-menu .room-card.back .room-go') !== null`), 'the rail marks the open folder, Back is set apart, the room grid stays out of it');
  await p.shot('show5-menu-folder.png');
  await p.tapSel('#folder-menu .room-card.back .room-go');
  check(await p.waitFor(`document.getElementById('folder-menu').hidden`) && !(await p.eval(`document.querySelector('#menu .menu-item[aria-label="Music"]').classList.contains('active')`)), 'Back closes the folder and unmarks the rail button');
  await p.tapSel('#menu .menu-item[aria-label="Music"]');
  await sleep(400);
  await p.tap(880, 60); await sleep(400);
  check(await p.eval(`document.getElementById('folder-menu').hidden`), 'so does a tap outside the cards');
  await p.tapSel('#menu .menu-item[aria-label="Music"]');
  await sleep(400);
  await p.tapSel('#menu .menu-item[aria-label="Music"]');
  check(await p.waitFor(`document.getElementById('folder-menu').hidden`), 'and the rail button again');
  await p.tapSel('#menu .menu-item[aria-label="Music"]');
  await sleep(400);
  await p.tapSel('#folder-menu .fav-switch button:nth-child(2)');
  check(await p.waitFor(`${folderNames} === ${JSON.stringify(`Back,${PLAYLISTS},Music Assistant`)}`) && await p.eval(`document.getElementById('folder-menu').classList.contains('open') && document.querySelector('#folder-menu .fav-switch .on').textContent === 'Playlists'`), 'show 5: Playlists swaps the radios for the playlists, the folder still open');
  const swr = await p.rect('#folder-menu .fav-switch');
  await p.tap(swr.l - 40, swr.y); await sleep(400);
  check(await p.eval(`document.getElementById('folder-menu').hidden`), 'a tap beside the switch closes the folder, as beside the cards');
  await p.tapSel('#menu .menu-item[aria-label="Music"]');
  await sleep(400);
  await p.tapSel('#menu .menu-item[aria-label="Find my phone"]');
  await sleep(400);
  check((await p.eval(folderNames)) === 'Back,Alex,Sam' && await p.eval(`document.getElementById('folder-menu').classList.contains('open') && !document.querySelector('#menu .menu-item[aria-label="Music"]').classList.contains('active') && document.querySelector('#menu .menu-item[aria-label="Find my phone"]').classList.contains('active')`), 'another folder\'s button swaps the cards: Back and the two phones, the mark moves');
  await p.tapSel('#folder-menu .room-card:nth-child(3) .room-go');
  let fl = await lastCall();
  check(await p.waitFor(`document.getElementById('folder-menu').hidden`) && fl.domain === 'script' && fl.target.entity_id === (await p.eval(`window.KIOSK_CONFIG.menu.items.find((i) => i.name === 'Find my phone').items[1].script`)) && await p.waitFor(`document.getElementById('toast').textContent === 'Find my phone · Sam'`), 'Sam runs their script, the folder closes and a toast says so');
  await p.tapSel('.view.active .title-btn');
  await sleep(300);
  await p.tapSel('#room-menu .room-card:nth-child(3) .room-go');
  check(await p.waitFor(`document.querySelector('.view.active').dataset.room === 'office'`), 'a room card switches to the office');
  await p.shot('show5-office.png');
  // The favourites play on the player of the room the kiosk belongs to, whichever room is shown.
  await p.tapSel('#menu .menu-item[aria-label="Music"]');
  await sleep(400);
  await p.tapSel('#folder-menu .fav-switch button:nth-child(1)');
  await p.tapSel('#folder-menu .room-card:nth-child(2) .room-go');
  fl = await lastCall();
  check(fl.domain === 'music_assistant' && fl.service === 'play_media' && fl.target.entity_id === (await p.eval(`window.KIOSK_CONFIG.rooms.bedroom.player`)) && fl.data.media_id === 'library://radio/7' && fl.data.media_type === 'radio', `show 5 showing the office: a radio still plays on the bedroom's player, the room this kiosk belongs to (got ${JSON.stringify(fl)})`);
  bar = await box('.main .bar.group');
  const vw = await box('');
  check(bar.h > 250 && Math.abs((bar.l + bar.r) / 2 - (vw.l + vw.r) / 2) < 10 && !(await has(p, '.view.active .tile')), 'office: the ceiling light\'s dial alone, in the middle');
  // The ceiling is a group of two bulbs that config.js does not list: the page subscribes to them by itself.
  check(await p.waitFor(`document.querySelector('.view.active .main .bar.group .state').textContent.endsWith('2 on')`), 'a group counts its members even when they are not in config.js');
  await mockSet('light.office_ceiling_2', 'off');
  check(await p.waitFor(`document.querySelector('.view.active .main .bar.group .state').textContent.endsWith('1 on')`), 'and follows their changes');
  await mockSet('light.office_ceiling_2', 'on');
  // A value set here holds only until Home Assistant answers: off means an empty dial, every time.
  const dialP = () => p.eval(`parseFloat(getComputedStyle(document.querySelector('.view.active .main .bar.group')).getPropertyValue('--p'))`);
  await p.dragTo('.view.active .main .bar.group', 0.6, 0.3);
  await p.tapSel('.view.active .main .bar.group .dial-centre');
  check(await p.waitFor(`parseFloat(getComputedStyle(document.querySelector('.view.active .main .bar.group')).getPropertyValue('--p')) === 0`), 'turning the light off right after dragging empties the dial');
  await p.tapSel('.view.active .main .bar.group .dial-centre');
  check(await p.waitFor(`parseFloat(getComputedStyle(document.querySelector('.view.active .main .bar.group')).getPropertyValue('--p')) > 0.5`), 'turning it on brings the level back');
  await p.tapSel('.view.active .main .bar.group .dial-centre');
  check(await p.waitFor(`parseFloat(getComputedStyle(document.querySelector('.view.active .main .bar.group')).getPropertyValue('--p')) === 0`), 'off again: empty again');
  await p.tapSel('.view.active .main .bar.group .dial-centre');
  void dialP;

  // A header too narrow for the mode names shows their icons alone.
  await load(p, 'device=Echo+Show+5+Bedroom');
  await p.s('Emulation.setDeviceMetricsOverride', { width: 760, height: 480, deviceScaleFactor: 1, mobile: true });
  check(await p.waitFor(`document.querySelector('.view.active .modes').classList.contains('icons')`), 'a header too narrow for the mode names shows the icons alone');
  ttl = await box('.title-btn'); clock = await box('.clock');
  first = await box('.modes .chip:first-child'); last = await box('.modes .chip:last-child');
  check(first.l >= ttl.r && last.r <= clock.l && first.w > 40, 'and they fit between the title and the clock');
  await p.close();
}

// 5. Living Show (Echo Show 8, 1280×800): rail on the right, media card, WLED controls.
export async function livingShow8() {
  const p = await openPage(1280, 800);
  await load(p, 'device=Echo+Show+8+Living+Room');
  check(await p.eval(`document.querySelector('.view.active .media').hidden`), 'media card hidden while the projector is off');
  check(await p.eval(`(() => { const v = document.querySelector('.view.active'); const r = (s) => v.querySelector(s).getBoundingClientRect(); return !v.querySelector('.modes').classList.contains('icons') && r('.modes .chip:first-child').left >= r('.title').right && r('.modes .chip:first-child').left >= r('.sensors .sensor:last-child').right && r('.modes .chip:last-child').right <= r('.clock').left && [...v.querySelectorAll('.modes .chip .name')].every((n) => n.scrollWidth <= n.clientWidth); })()`), 'show 8: title, sensors, three modes and the clock fit in the top bar');
  check(await p.eval(`(() => { const v = document.querySelector('.view.active'); const b = v.querySelector('.main .bar.group').getBoundingClientRect(), t = [...v.querySelectorAll('.tile')].pop().getBoundingClientRect(), m = document.querySelector('#menu .menu-panel').getBoundingClientRect(), g = v.querySelector('.lights'); return m.right > 1240 && t.right <= m.left - 10 && t.bottom <= 790 && b.height > 300 && g.scrollHeight <= g.clientHeight + 1; })()`), 'show 8: the dial and all five tiles in view, clear of the rail on the right');
  await p.shot('show8-living.png');
  await p.tapSel('.view.active .chip:nth-child(1)');
  check(await p.waitFor(`!document.querySelector('.view.active .media').hidden`), 'media card appears when the projector is on');
  await sleep(400);
  check(await p.eval(`document.querySelector('.view.active').classList.contains('with-media') && document.querySelector('.view.active .main .bar.group').getBoundingClientRect().height < 200`), 'the main card shrinks to a row beside the media card');
  check(await p.eval(`(() => { const v = document.querySelector('.view.active'), c = v.querySelector('.controls').getBoundingClientRect(), t = v.querySelector('.media-transport'); return c.width > 20 * 24 && t.scrollWidth <= t.clientWidth; })()`), 'the controls widen for the media card, its buttons in view');
  check((await text(p, '.view.active .media-title')) === 'Severance', 'media card shows the title');
  check(await p.eval(`document.querySelectorAll('.view.active .media-sources .chip').length`) === 5, 'media card lists the sources');
  await p.shot('show8-living-media.png');
  await p.tapSel('.view.active .media-sources .chip:nth-child(2)');
  let st = await mockStates();
  check(st['media_player.apple_tv'].a.source === 'Plex', 'a source chip switches the app');
  await p.dragTo('.view.active .media-volume .slider', 0.7);
  st = await mockStates();
  check(st['media_player.apple_tv'].a.volume_level >= 0.65 && st['media_player.apple_tv'].a.volume_level <= 0.75, `volume slider sets the volume (got ${st['media_player.apple_tv'].a.volume_level})`);
  await p.tapSel('.view.active .media-btn.next');
  st = await mockStates();
  check(st['media_player.apple_tv'].a.media_title === 'Next episode', 'next button skips');

  // WLED strip: effects, palette select, speed number.
  await p.tapSel('.view.active .tile:nth-child(4) .tile-more');
  check(await p.waitFor(`!document.getElementById('popover').hidden`), 'WLED popover opens');
  check(await onScreen(p, '#pop-icon') && await onScreen(p, '#pop-close') && await onScreen(p, '.pop-actions') && !(await onScreen(p, '#popover .pop-power')) && !(await onScreen(p, '#pop-tab')), 'wide popover: a card with the light\'s icon, a close button and Off / On');
  const tabs = await p.eval(`[...document.querySelectorAll('#popover .tabs .tab')].map((t) => t.textContent)`);
  check(JSON.stringify(tabs) === JSON.stringify(['Colour', 'Effects', 'More']), `WLED tabs are colour, effects, more (got ${tabs})`);
  await tapTab(p, 'Effects');
  await p.tapSel('#popover .pane:not([hidden]) .chip:nth-child(5)');
  st = await mockStates();
  check(st['light.tv_strip'].a.effect === 'Rainbow', 'effect chip sets the WLED effect');
  await p.shot('show8-popover-effects.png');
  await tapTab(p, 'More');
  await p.tapSel('#popover .pane:not([hidden]) .hscroll .chip:nth-child(4)');
  st = await mockStates();
  check(st['select.tv_strip_color_palette'].s === 'Ocean', 'palette chip selects the option');
  await p.dragTo('#popover .pane:not([hidden]) .slider', 0.9);
  st = await mockStates();
  check(Number(st['number.tv_strip_speed'].s) >= 220, `speed slider sets the number (got ${st['number.tv_strip_speed'].s})`);
  await p.shot('show8-popover-more.png');
  await p.tapSel('.pop-actions [data-s="off"]');
  st = await mockStates();
  check(st['light.tv_strip'].s === 'off', 'Off button turns the strip off');
  await p.tapSel('#pop-close');

  // Group popover lists its members.
  const r = await p.rect('.view.active .main .bar.group');
  await p.longPress(r.x, r.y);
  await sleep(300);
  check(await p.waitFor(`!document.getElementById('popover').hidden`), 'long-press on the group bar opens its popover');
  const gtabs = await p.eval(`[...document.querySelectorAll('#popover .tabs .tab')].map((t) => t.textContent)`);
  check(gtabs.includes('Lights'), 'group popover has a Lights tab');
  await tapTab(p, 'Lights');
  await p.shot('show8-popover-group.png');
  await p.tapSel('#pop-close');
  await p.tapSel('.view.active .chip:nth-child(1)');

  // Room menu: the grid, in the middle of the room the rail leaves.
  await p.tapSel('.view.active .title-btn');
  await sleep(400);
  const g = await p.eval(`(() => { const cs = [...document.querySelectorAll('#room-menu .room-card')].map((e) => e.getBoundingClientRect()), m = document.querySelector('#menu .menu-panel').getBoundingClientRect(); return { l: Math.min(...cs.map((r) => r.left)), r: Math.max(...cs.map((r) => r.right)), t: Math.min(...cs.map((r) => r.top)), b: Math.max(...cs.map((r) => r.bottom)), rail: m.left }; })()`);
  check(Math.abs((g.l + g.r) / 2 - g.rail / 2) < 40 && Math.abs((g.t + g.b) / 2 - 400) < 2 && g.r < g.rail - 12, 'show 8: the room grid sits in the middle, clear of the rail');
  check((await text(p, '#room-menu .room-card.current .room-name')) === 'Living room', 'show 8: the grid marks the living room');
  await p.shot('show8-rooms.png');
  await p.tapSel('#room-menu .room-card:nth-child(3) .room-go');
  check(await p.waitFor(`document.querySelector('.view.active').dataset.room === 'office'`), 'a room card switches the view');
  await sleep(300);
  await p.shot('show8-office.png');
  await p.close();
}

// 5b. The light tiles on an Echo Show 8 as Kiosk Satellite lays it out (960×600, 1rem = 20.4px): its width holds the dial
//     and one column of lights. Three lights are rows, each its icon beside its name and its pill, all in view under three
//     lines of events, their names in full; four are cards in two columns; on the Show 5 three are two rows, the third
//     across. The events' tile is as tall as its events.
export async function tilesShow8() {
  const BEDROOM = ['light.bedroom_ceiling', 'light.bedroom_strips', 'light.bedroom_nightstand_1', 'light.bedroom_nightstand_2'];
  const lights = (n) => BEDROOM.slice(0, n).map((entity, j) => ({ entity, name: ['Living room', 'Dining room', 'Bathroom', 'Bedside right'][j], icon: 'lamp' }));
  const tiles = (p) => p.eval(`(() => { const g = document.querySelector('.view.active .lights'), rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const ts = [...g.querySelectorAll('.tile:not(.events)')].map((t) => { const r = t.getBoundingClientRect(), i = t.querySelector('.tile-icon').getBoundingClientRect(), n = t.querySelector('.tile-name'), s = t.querySelector('.tile-slider').getBoundingClientRect();
      return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, beside: i.right < n.getBoundingClientRect().left && i.right < s.left, full: n.scrollWidth <= n.clientWidth }; });
    return { rows: g.classList.contains('rows'), cols: +g.style.getPropertyValue('--cols'), fits: g.scrollHeight <= g.clientHeight + 1, ts, grid: g.getBoundingClientRect().width, rem,
      dial: document.querySelector('.view.active .main .bar.group').getBoundingClientRect().width }; })()`);
  const p = await openPage(960, 600);
  await setClock(p, 10);
  await changeRoom(p, 'bedroom', { lights: lights(3), events: { calendars: ['calendar.family'], period: 'week' } });
  await load(p, 'room=bedroom');
  await p.waitFor(`document.querySelectorAll('.view.active .events .event').length === 5`);
  let t = await tiles(p);
  check(t.rem > 20 && t.dial <= 15.2 * t.rem && t.grid > 22 * t.rem, `show 8 at 960×600: the dial a third of the width, the lights the rest (dial ${(t.dial / t.rem).toFixed(1)}rem, lights ${(t.grid / t.rem).toFixed(1)}rem)`);
  check(t.rows && t.cols === 1 && t.ts.every((x) => x.beside && x.full && Math.abs(x.w - t.ts[0].w) < 1) && t.fits && await p.eval(`document.querySelector('.view.active .events-rows').childElementCount > 3`),
    `show 8: three lights as rows in one column, each its icon beside its name and pill, the names in full, all in view under three lines of events (${JSON.stringify(t.ts.map((x) => [x.beside, x.full]))}, fits: ${t.fits})`);
  await p.shot('show8-960-rows.png');
  await p.close();

  // One event left today: the tile one line tall, no mark, its line the tile's whole width.
  const one = await openPage(960, 600);
  await setClock(one, 19, 30);
  await addEvent({ entity: 'calendar.family', summary: 'Pathé La Joliette: Psychose', day: 0, h: 22, m: 30, minutes: 120 });
  await changeRoom(one, 'bedroom', { lights: lights(3), events: { calendars: ['calendar.family'], period: 'day' } });
  await load(one, 'room=bedroom');
  await one.waitFor(`document.querySelectorAll('.view.active .events .event').length === 2`);
  check(await one.eval(`(() => { const e = document.querySelector('.view.active .events'), rows = e.querySelector('.events-rows'), row = rows.firstElementChild, title = rows.lastElementChild.querySelector('.ev-title');
    return Math.abs(rows.getBoundingClientRect().height - 2 * row.getBoundingClientRect().height) < 1 && e.querySelector('.events-at').hidden && !e.classList.contains('paged') && title.scrollWidth <= title.clientWidth; })()`),
  'show 8: two events, two lines, no mark, a long title in full');
  await one.shot('show8-960-events.png');
  await one.close();

  // Four lights: two columns of cards, all in view.
  const four = await openPage(960, 600);
  await setClock(four, 10);
  await changeRoom(four, 'bedroom', { lights: lights(4), events: { calendars: ['calendar.family'], period: 'day', lines: 1 } });
  await load(four, 'room=bedroom');
  t = await tiles(four);
  check(!t.rows && t.cols === 2 && t.ts.every((x) => !x.beside && x.full) && t.fits, `show 8: four lights as cards in two columns, the icon above the name, all in view (rows: ${t.rows}, ${t.cols} columns, fits: ${t.fits})`);
  await four.shot('show8-960-cards.png');
  await four.close();

  // The Show 5 has room for two rows side by side: three lights are two and one, the last across.
  const five = await openPage(960, 480);
  await changeRoom(five, 'bedroom', { lights: lights(3) });
  await load(five, 'room=bedroom');
  t = await tiles(five);
  check(t.rows && t.cols === 2 && Math.abs(t.ts[0].t - t.ts[1].t) < 1 && t.ts[2].t > t.ts[0].b && Math.abs(t.ts[2].l - t.ts[0].l) < 1 && Math.abs(t.ts[2].r - t.ts[1].r) < 1 && t.ts.every((x) => x.beside && x.full),
    'show 5: three lights as two rows side by side, the third across under them');
  await five.close();
}
