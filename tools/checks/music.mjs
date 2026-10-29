// Checks of a room's music card: the living room's, on the Echo Show 8 (1280×800) and as Kiosk Satellite lays an Echo
// Show 8 out (960×600).
import { check, openPage, mockReaches, lastCall, RADIOS, PLAYLISTS, has, load, changeRoom } from './harness.mjs';

const names = (p) => p.eval(`[...document.querySelectorAll('.view.active .music-fav')].map((b) => b.getAttribute('aria-label')).join()`);
const shown = (p, sel) => p.eval(`(() => { const e = document.querySelector('.view.active ' + ${JSON.stringify(sel)}); return !!e && !e.hidden && e.getBoundingClientRect().height > 0; })()`);
const box = (p, sel) => p.eval(`(() => { const r = document.querySelector('.view.active ' + ${JSON.stringify(sel)}).getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; })()`);

// 21. The living room's music card under the dial: its favourites while the player plays nothing, a tap plays one there,
//     then what plays, with pause, next and the volume; pausing brings the favourites back. It steps aside for the
//     media card, and the Spot has none.
export async function musicShow8() {
  const p = await openPage(1280, 800);
  await load(p, 'device=Echo+Show+8+Living+Room');
  check(await p.waitFor(`document.querySelectorAll('.view.active .music-fav').length === 7`) && (await names(p)) === RADIOS, `show 8: the music card lists the favourite radios (got ${await names(p)})`);
  const [dial, card, controls] = [await box(p, '.main'), await box(p, '.music'), await box(p, '.controls')];
  check(card.t >= dial.b && Math.abs(card.l - controls.l) < 1 && Math.abs(card.r - controls.r) < 1 && card.b <= 800 && dial.h > 300,
    `show 8: the card under the dial, across its column, the dial still large (dial ${dial.h.toFixed(0)}px, card ${card.h.toFixed(0)}px)`);
  check(await p.eval(`document.querySelector('.view.active .music .fav-switch .on').textContent === 'Radios'`) && await p.waitFor(`document.querySelectorAll('.view.active .music-fav.with-cover').length === 5`)
    && await p.eval(`(() => { const s = document.querySelector('.view.active .music-strip'); return s.scrollWidth > s.clientWidth; })()`),
  'show 8: the switch on Radios, the five covers there are, more than the card shows at once');
  await p.shot('show8-music.png');

  // Playlists, then back to the radios.
  await p.tapSel('.view.active .music .fav-switch button:nth-child(2)');
  check(await p.waitFor(`document.querySelector('.view.active .music .fav-switch .on').textContent === 'Playlists'`) && (await names(p)) === PLAYLISTS, `show 8: Playlists shows the playlists (got ${await names(p)})`);
  await p.tapSel('.view.active .music .fav-switch button:nth-child(1)');

  // A tap plays one on the room's player, a toast says so, and the card shows what plays.
  await p.tapSel('.view.active .music-fav:nth-child(2)');
  const call = await lastCall();
  check(call.domain === 'music_assistant' && call.service === 'play_media' && call.target.entity_id === 'media_player.living_room_speakers' && call.data.media_id === 'library://radio/1' && call.data.media_type === 'radio'
    && await p.waitFor(`document.getElementById('toast').textContent === 'FIP'`), `show 8: a tap on FIP plays it on the living room's player, a toast says so (got ${JSON.stringify(call)})`);
  check(await p.waitFor(`(document.querySelector('.view.active .music .media-title') || {}).textContent === 'FIP'`) && await shown(p, '.music .media') && !(await shown(p, '.music-favs')),
    'show 8: while it plays, the card shows what plays in the favourites\' place');
  const playing = await box(p, '.music');
  check(Math.abs(playing.h - card.h) < 1 && Math.abs((await box(p, '.main')).h - dial.h) < 1 && await shown(p, '.music .media-btn.play') && await shown(p, '.music .media-btn.next') && await shown(p, '.music .media-volume')
    && !(await shown(p, '.music .media-btn.prev')) && !(await shown(p, '.music .media-btn.pwr')), 'show 8: as tall as the favourites, the dial unmoved; pause, next and the volume');
  await p.shot('show8-music-playing.png');
  await p.dragTo('.view.active .music .media-volume .slider', 0.8);
  check(await mockReaches((st) => Math.abs(st['media_player.living_room_speakers'].a.volume_level - 0.8) < 0.06), 'show 8: the card\'s slider sets the player\'s volume');
  await p.tapSel('.view.active .music .media-btn.play');
  check(await mockReaches((st) => st['media_player.living_room_speakers'].s === 'paused') && await p.waitFor(`!document.querySelector('.view.active .music-favs').hidden`) && (await names(p)) === RADIOS,
    'show 8: pause, and the favourites come back');

  // The media card takes the column: the music card steps aside until it goes.
  await p.tapSel('.view.active .chip:nth-child(1)');
  check(await p.waitFor(`!document.querySelector('.view.active .controls > .media').hidden`) && !(await shown(p, '.music')), 'show 8: with the Apple TV\'s card on, no music card');
  await p.tapSel('.view.active .chip:nth-child(1)');
  check(await p.waitFor(`document.querySelector('.view.active .music').getBoundingClientRect().height > 0`), 'show 8: and back once it goes');
  await p.close();

  // On an Echo Show 8 as Kiosk Satellite lays it out: the card, the dial and three lights all fit.
  const q = await openPage(960, 600);
  await changeRoom(q, 'living', { lights: [{ entity: 'light.living_room', name: 'Living room' }, { entity: 'light.dining_room', name: 'Dining room' }, { entity: 'light.kitchen', name: 'Kitchen' }] });
  await load(q, 'device=Echo+Show+8+Living+Room');
  const [d, c] = [await box(q, '.main'), await box(q, '.music')];
  check(d.h > 12.5 * 20.4 && c.t >= d.b && c.b <= 600 - 10 && await q.eval(`(() => { const g = document.querySelector('.view.active .lights'); return g.scrollHeight <= g.clientHeight + 1; })()`),
    `show 8 at 960×600: the dial, the card under it and the three lights in view (dial ${(d.h / 20.4).toFixed(1)}rem)`);
  await q.shot('show8-960-music.png');
  await q.close();

  // The Spot has no music card; a room's music without a player is left out.
  const s = await openPage(480, 480);
  await load(s, 'device=Echo+Spot+Living+Room');
  check(!(await has(s, '.music')), 'spot: no music card');
  await s.close();
  const n = await openPage(1280, 800);
  await changeRoom(n, 'living', { player: null });
  await load(n, 'device=Echo+Show+8+Living+Room');
  check(!(await has(n, '.music')), 'show 8, music but no player: no card');
  await n.close();
}
