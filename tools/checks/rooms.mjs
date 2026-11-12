// Checks of the room menu: turning lights off, a house of seven rooms.
import { sleep, check, openPage, mockStates, mockReaches, mockSet, text, has, activeRoom, load } from './harness.mjs';

// 6. Lights off from the room menu: a room's power button in the Spot's list, then every light from the Show's
//    grid. The menu stays open on the same room, and what it says follows. The living room also shows the
//    bedroom's ceiling as a tile (added to config.js here): its power button turns off what its row counts, the
//    members of its group, and leaves that light on.
export async function lightsOff() {
  {
    const p = await openPage(480, 480);
    await p.s('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { let v; Object.defineProperty(window, 'KIOSK_CONFIG', { configurable: true, get: () => v, set: (c) => {
      c.rooms.living.lights.push({ entity: 'light.bedroom_ceiling', name: 'Bedroom', icon: 'ceiling-light' }); v = c; } }); })();` });
    await load(p, 'device=Echo+Spot+Bedroom');
    await p.tapSel('.view.active .title-btn');
    await sleep(400);
    await p.tapSel('#room-menu .room-card:nth-child(2) .room-off');
    check(await mockReaches((s) => ['light.downstairs', 'light.living_room', 'light.dining_room', 'light.kitchen', 'light.tv_strip', 'light.shelf_strip'].every((id) => s[id].s === 'off')), 'spot: the living room\'s power button turns off its lights');
    const st = await mockStates();   // now they are off, what must stay on, read at once
    check(st['light.bedroom_ceiling'].s === 'on' && st['light.office_lights'].s === 'on', 'and only those: the bedroom\'s ceiling, a tile in the living room, stays on');
    check(await p.waitFor(`document.querySelector('#room-menu .room-card:nth-child(2) .room-off').hidden && document.querySelector('#room-menu .room-card:nth-child(2) .room-state').textContent === 'Lights off'`) && await p.eval(`document.getElementById('room-menu').classList.contains('open')`) && (await activeRoom(p)) === 'bedroom', 'its row says Lights off without a power button, the menu stays open on the same room');
    await p.shot('spot-rooms-off.png');
    await p.close();
  }
  {
    const p = await openPage(1280, 800);
    await load(p, 'device=Echo+Show+8+Living+Room');
    await p.tapSel('.view.active .title-btn');
    await sleep(400);
    check((await text(p, '#room-menu .room-card:nth-child(2) .room-state')) === 'Lights off' && await p.eval(`document.querySelector('#room-menu .room-card:nth-child(2) .room-off').hidden`), 'show 8: a room with its lights off says so, and has no power button');
    await p.tapSel('#room-menu .room-card.all-off .room-go');
    check(await p.waitFor(`[...document.querySelectorAll('#room-menu .room-state')].every((e) => e.textContent === 'Lights off') && document.querySelector('#room-menu .all-off').classList.contains('idle')`), 'All lights off: every card then says so, and the button fades');
    check(await mockReaches((st) => Object.entries(st).filter(([id]) => id.startsWith('light.')).every(([, s]) => s.s === 'off')), 'All lights off turns off every light');
    check(await p.eval(`document.getElementById('room-menu').classList.contains('open')`) && (await activeRoom(p)) === 'living', 'the grid stays open on the same room');
    await p.shot('show8-rooms-off.png');
    await p.close();
  }
}

// 7. A main light whose members Home Assistant does not list (a Zigbee2MQTT group, a template light) stands for the
//    room's own tiles. Here (in config.js) the living room's main is a single light, and its tiles add the bedroom's
//    and the office's main lights, which count in their own rooms: the living room neither counts them nor turns
//    them off.
export async function mainWithoutMembers() {
  const p = await openPage(480, 480);
  await p.s('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { let v; Object.defineProperty(window, 'KIOSK_CONFIG', { configurable: true, get: () => v, set: (c) => {
    Object.assign(c.rooms.living, { main: { entity: 'light.living_room', name: 'All lights' }, lights: [
      { entity: 'light.tv_strip', name: 'TV strip' }, { entity: 'light.shelf_strip', name: 'Shelf strip' },
      { entity: 'light.bedroom_lights', name: 'Bedroom' }, { entity: 'light.office_lights', name: 'Office' }] }); v = c; } }); })();` });
  await load(p, 'device=Echo+Spot+Bedroom');
  await p.tapSel('.view.active .title-btn');
  await sleep(400);
  const living = '#room-menu .room-card:nth-child(2) .room-state';
  const says = async () => `${await text(p, living)}; all: ${await text(p, '#room-menu .all-off .room-state')}`;
  check(await text(p, living) === '1 light on' && await text(p, '#room-menu .all-off .room-state') === '6 lights on', `main without members: the room counts its own tiles that are on, not the main light, nor another room's (${await says()})`);
  await mockSet('light.tv_strip', 'off');
  check(await p.waitFor(`document.querySelector('${living}').textContent === '1 light on'`), 'its main light on alone counts as one');
  await mockSet('light.living_room', 'off');
  check(await p.waitFor(`document.querySelector('${living}').textContent === 'Lights off' && document.querySelector('#room-menu .room-card:nth-child(2) .room-off').hidden`), `with it off, the room says Lights off while the other rooms' lights it shows are on (${await says()})`);
  await mockSet('light.living_room', 'on');
  await mockSet('light.tv_strip', 'on');
  await p.waitFor(`document.querySelector('${living}').textContent === '1 light on'`);
  await p.tapSel('#room-menu .room-card:nth-child(2) .room-off');
  const off = await mockReaches((s) => ['light.living_room', 'light.tv_strip', 'light.shelf_strip'].every((id) => s[id].s === 'off'));
  const st = await mockStates();   // now they are off, what must stay on, read at once
  check(off && st['light.bedroom_lights'].s === 'on' && st['light.office_lights'].s === 'on', 'its power button turns off its main light and its own tiles, and leaves the other rooms\' lights on');
  await p.close();
}

// 8. A house of seven rooms, as planned (four stand-ins added to config.js, their lights unknown to the mock): the
//    Spot's list scrolls, its last row clear of the tab; the Show 5 grid takes two rows.
export async function sevenRooms() {
  const seven = `(() => { let v; Object.defineProperty(window, 'KIOSK_CONFIG', { configurable: true, get: () => v, set: (c) => {
    const room = (title, icon, k) => ({ title, icon, main: { entity: 'light.' + k, name: 'All lights' } }), r = c.rooms;
    c.rooms = { living: r.living, dining: room('Dining room', 'silverware-fork-knife', 'dining_x'), kitchen: room('Kitchen', 'countertop', 'kitchen_x'),
      bathroom: room('Bathroom', 'shower', 'bathroom_x'), restroom: room('Restroom', 'toilet', 'restroom_x'), office: r.office, bedroom: r.bedroom };
    v = c; } }); })();`;
  const p = await openPage(480, 480);
  await p.s('Page.addScriptToEvaluateOnNewDocument', { source: seven });
  await load(p, 'device=Echo+Spot+Bedroom');
  await p.tapSel('.view.active .title-btn');
  await sleep(400);
  check(await p.eval(`(() => { const l = document.querySelector('#room-menu .rooms'); return l.children.length === 8 && l.scrollTop === 0 && l.scrollHeight > l.clientHeight; })()`), 'spot, seven rooms: eight rows, the list starts at the top and scrolls');
  const first = await p.rect('#room-menu .room-card:nth-child(1)');
  await p.drag(240, 330, 240, 90, 8); await sleep(700);
  const last = await p.rect('#room-menu .room-card:last-child'), tab = await p.rect('#menu-handle');
  check(await p.eval(`document.querySelector('#room-menu .rooms').scrollTop > 0`) && first.t > 50 && last.t + last.h < tab.t - 20, `spot, seven rooms: a drag scrolls the list, its last row comes clear of the tab (${(last.t + last.h).toFixed(0)}px, tab at ${tab.t.toFixed(0)}px)`);
  check(await p.eval(`document.getElementById('room-menu').classList.contains('open')`), 'the drag leaves the menu open');
  await p.shot('spot-rooms-seven.png');
  await p.close();
  const q = await openPage(960, 480);
  await q.s('Page.addScriptToEvaluateOnNewDocument', { source: seven });
  await load(q, 'device=Echo+Show+5+Bedroom');
  await q.tapSel('.view.active .title-btn');
  await sleep(400);
  const box = await q.eval(`(() => { const cs = [...document.querySelectorAll('#room-menu .room-card')].map((e) => e.getBoundingClientRect()); return { n: cs.length, rows: new Set(cs.map((r) => Math.round(r.top))).size, t: Math.min(...cs.map((r) => r.top)), b: Math.max(...cs.map((r) => r.bottom)), r: Math.max(...cs.map((r) => r.right)), rail: document.querySelector('#menu .menu-panel').getBoundingClientRect().left }; })()`);
  check(box.n === 8 && box.rows === 2 && box.t >= 0 && box.b <= 480 && box.r < box.rail, 'show 5, seven rooms: eight cards in two rows, on screen and clear of the rail');
  await q.close();
}
