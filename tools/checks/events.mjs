// Checks of the rooms' events: the bedroom's calendars (the family's and work's) on the Spot and on the Show, the
// page's clock at 10:00 on Wednesday 21 October 2026, when the gym session is over and work's stand-up is on.
import { sleep, check, openPage, load, setClock, changeRoom, addEvent, noEvents, failCalls, callLog, insideRim, text } from './harness.mjs';

const TODAY = 'All day Bins out,Now Stand-up,12:30 Lunch with Sam,18:00 Swimming lesson';
// The lines of a list, each its time and title.
const lines = (p, sel) => p.eval(`[...document.querySelectorAll(${JSON.stringify(sel + ' .event')})].map((e) => (e.querySelector('.ev-time') ? e.querySelector('.ev-time').textContent + ' ' + e.querySelector('.ev-title').textContent : e.textContent)).join()`);
// The panel's rows and headings, in order.
const panel = (p) => p.eval(`[...document.querySelectorAll('#pop-body > *')].map((e) => e.classList.contains('events-day') ? '# ' + e.textContent : [...e.querySelectorAll('.ev-time, .ev-title, .ev-where')].map((s) => s.textContent).join(' ')).join('|')`);
const panelOpen = `!document.getElementById('popover').hidden && document.getElementById('popover').classList.contains('show')`;
const accent = (p, sel) => p.eval(`(() => { const t = document.createElement('i'); t.style.color = 'var(--accent)'; document.querySelector('.view.active').append(t); const c = getComputedStyle(t).color; t.remove(); return getComputedStyle(document.querySelector(${JSON.stringify(sel)})).color === c; })()`);
// A page whose config.js gives the bedroom other events (and other lights).
async function withEvents(width, height, events, lights) {
  const p = await openPage(width, height);
  await setClock(p, 10);
  await changeRoom(p, 'bedroom', lights ? { events, lights } : { events });
  return p;
}

// 19. On the Spot: the count among the sensors, a line above the main light that a swipe scrolls through, the panel.
export async function eventsSpot() {
  const p = await openPage(480, 480);
  await setClock(p, 10);
  const before = (await callLog()).length;
  await load(p, 'device=Echo+Spot+Bedroom');
  const LINE = '.view.active .events';
  check(await p.waitFor(`document.querySelectorAll('${LINE} .event').length === 4`), 'spot, 10:00: the line holds the rest of the day\'s four events');
  check(await lines(p, LINE) === TODAY, `spot: the all-day event first, then the one on now, then by time; the gym at 7:00 is over (got ${await lines(p, LINE)})`);
  check(await text(p, '.view.active .events-chip') === '4' && await p.eval(`document.querySelector('.view.active .events-chip').getAttribute('aria-label')`) === '4 events today'
    && await p.eval(`document.querySelector('.view.active .events-chip').parentElement.classList.contains('sensors')`), 'spot: the count among the sensors, the number alone');
  check(await text(p, `${LINE} .events-at`) === '1/4', 'spot: the mark at the end of the line says the first of four');
  const ask = (await callLog()).slice(before).find((c) => c.service === 'get_events');
  check(!!ask && ask.domain === 'calendar' && ask.response && [].concat(ask.target.entity_id).join() === 'calendar.family,calendar.work'
    && /^2026-10-21T10:00:\d\d[+-]\d\d:\d\d$/.test(ask.data.start_date_time) && /^2026-10-22T00:00:00[+-]\d\d:\d\d$/.test(ask.data.end_date_time),
  `spot: Home Assistant is asked for both calendars' events from now to midnight, in the kiosk's time zone (got ${JSON.stringify(ask && ask.data)})`);

  // One line between the modes and the main light, inside the rim; each event's dot in its calendar's colour.
  const box = (sel) => p.rect('.view.active ' + sel);
  const [modes, line, power, row] = [await box('.modes'), await box('.events'), await box('.main .bar.group .power'), await box('.events .event')];
  check(line.t - (modes.t + modes.h) >= 10 && power.t - (line.t + line.h) >= 10 && Math.abs(line.h - row.h) < 1,
    `spot: one line between the modes and the main light, room above and below it (${(line.t - modes.t - modes.h).toFixed(0)}px, ${(power.t - line.t - line.h).toFixed(0)}px)`);
  check(await insideRim(p, LINE), 'spot: the line inside the rim');
  const dots = await p.eval(`[...document.querySelectorAll('${LINE} .ev-dot')].map((d) => getComputedStyle(d).backgroundColor)`);
  check(dots.length === 4 && dots[1] === 'rgb(90, 169, 230)' && dots[0] !== dots[1] && dots[0] === dots[2], `spot: a dot in its calendar's colour, work's its own, the family's the accent (got ${dots})`);
  check(await accent(p, `${LINE} .event.now .ev-time`) && await text(p, `${LINE} .event.now .ev-title`) === 'Stand-up', 'spot: the one on now says so, in the accent');
  check(await p.eval(`Kiosk.eventsOf({ events: { calendars: ['calendar.x'], lines: 3 } }).lines === 1`), 'spot: one line at most, whatever config.js asks');
  await p.shot('spot-events.png');

  // A swipe up on the line brings the next event, and down the one before; it opens nothing and moves no light.
  const swipe = async (dy) => { const l = await box('.events'), y = l.y - Math.sign(dy) * 8; await p.drag(l.x, y, l.x, y + dy, 10); await sleep(700); };
  await swipe(-30);
  check(await p.waitFor(`document.querySelector('${LINE} .events-at').textContent === '2/4'`) && await p.eval(`(() => { const r = document.querySelector('${LINE} .events-rows'); return Math.abs(r.scrollTop - r.firstElementChild.offsetHeight) < 1; })()`),
    `spot: a swipe up on the line brings the next event, the mark follows (${await text(p, `${LINE} .events-at`)})`);
  check(await p.eval(`document.getElementById('popover').hidden`) && (await text(p, '.view.active .main .bar.current .name')) === 'All lights', 'spot: the swipe opens nothing and moves no light');
  await swipe(30);
  check(await p.waitFor(`document.querySelector('${LINE} .events-at').textContent === '1/4'`), 'spot: a swipe down, the one before');

  // A tap on the line opens them all in the panel, with the hours and where; Open calendar leads to Kiosk Satellite's.
  await p.tapSel(LINE);
  check(await p.waitFor(panelOpen), 'spot: a tap on the line opens the panel');
  await sleep(400);
  const all = await panel(p);
  check(await text(p, '#pop-name') === 'Today' && all === 'All day Bins out|09:30–10:15 Stand-up|12:30–13:30 Lunch with Sam Café Lumière|18:00–19:00 Swimming lesson'
    && await p.eval(`[...document.querySelectorAll('#pop-body .event-row.now .ev-title')].map((e) => e.textContent).join() === 'Stand-up'`), `spot: Today, every event with its hours and where, the one on now marked (got ${all})`);
  check(await p.eval(`!document.querySelector('#popover .pop-power') && document.querySelector('#popover .panel-actions button').textContent === 'Open calendar' && document.querySelector('#popover .panel-actions').offsetWidth > 0`), 'spot: no power button, an Open calendar button');
  check(await insideRim(p, '#popover .event-row, #popover .panel-actions button, #popover .pop-name'), 'spot: the panel inside the rim');
  await p.shot('spot-events-panel.png');
  await p.tapSel('#popover .panel-actions button');
  check(await p.waitFor(`document.getElementById('popover').hidden`) && (await text(p, '#toast')).includes('Kiosk Satellite'), 'spot: Open calendar closes the panel and leads to Kiosk Satellite\'s calendar (outside it, a toast says so)');
  await p.tapSel('.view.active .events-chip');
  check(await p.waitFor(panelOpen), 'spot: a tap on the count opens the panel too');
  await p.tapSel('#pop-tab');
  check(await p.waitFor(`document.getElementById('popover').hidden`), 'spot: the tab closes it');

  // An event added to a calendar changes its state: the page asks again and shows it at once.
  await addEvent({ entity: 'calendar.family', summary: 'Call the plumber', day: 0, h: 11, m: 0, minutes: 30 });
  check(await p.waitFor(`document.querySelector('.view.active .events-chip').textContent === '5'`) && (await lines(p, LINE)).split(',')[2] === '11:00 Call the plumber', `spot: an event added to a calendar shows at once, in its place (got ${await lines(p, LINE)})`);
  // Home Assistant not answering keeps the events it gave; none at all: the count goes and the line says so.
  await failCalls(true);
  await addEvent({ entity: 'calendar.work', summary: 'Not seen', day: 0, h: 15, m: 0, minutes: 30 });
  await sleep(1200);
  await failCalls(false);
  check(await text(p, '.view.active .events-chip') === '5' && !(await lines(p, LINE)).includes('Not seen'), 'spot: when Home Assistant does not answer, the events it gave stay');
  await noEvents(true);
  check(await p.waitFor(`document.querySelector('.view.active .events-chip').hidden && document.querySelector('${LINE} .events-at').hidden`) && await lines(p, LINE) === 'No events today', `spot: no events: the count goes, the line says so (${await lines(p, LINE)})`);
  await noEvents(false);
  await p.close();

  // Home Assistant not answering at all: the line says so.
  const q = await openPage(480, 480);
  await setClock(q, 10);
  await failCalls(true);
  await load(q, 'device=Echo+Spot+Bedroom');
  check(await q.waitFor(`document.querySelector('${LINE} .event') && document.querySelector('${LINE} .event').textContent === 'The calendar did not answer'`) && await q.eval(`document.querySelector('.view.active .events-chip').hidden`), 'spot: a calendar that does not answer: the line says so, no count');
  await failCalls(false);
  await q.close();
}

// 20. On the Show: the count after the sensors, a wide tile first among the lights that scrolls on its own, the panel;
//     other periods, the list's lines and length, no count, no list, no link.
export async function eventsShow() {
  const p = await openPage(960, 480);
  await setClock(p, 10);
  await load(p, 'device=Echo+Show+5+Bedroom');
  const TILE = '.view.active .lights > .events';
  check(await p.waitFor(`document.querySelectorAll('${TILE} .event').length === 4`) && await text(p, '.view.active .events-chip') === '4 today', 'show 5: the count after the sensors, "4 today"');
  const box = (sel) => p.rect('.view.active ' + sel);
  const [grid, tile, first, rows, mark] = [await box('.lights'), await box('.lights > .events'), await box('.lights > .tile:nth-child(2)'), await box('.events-rows'), await box('.events .events-at')];
  check(await p.eval(`document.querySelector('.view.active .lights').firstElementChild.matches('.events.tile')`) && Math.abs(tile.l - grid.l) < 4 && Math.abs(tile.w - grid.w) < 8 && first.t > tile.t + tile.h,
    'show 5: the events a wide tile first among the lights, across the grid, the light tiles under it');
  const rowH = (await box('.events .event')).h;
  check(Math.abs(rows.h - 3 * rowH) < 1 && await text(p, `${TILE} .events-at`) === '1–3/4' && mark.l >= rows.l && mark.t >= tile.t && mark.l + mark.w <= tile.l + tile.w,
    `show 5: three lines in view, the mark in the corner says which (${await text(p, `${TILE} .events-at`)})`);
  check(await lines(p, TILE) === TODAY, `show 5: the same events as on the Spot (got ${await lines(p, TILE)})`);
  check(await p.eval(`(() => { const g = document.querySelector('.view.active .lights'); return g.scrollHeight <= g.clientHeight + 1; })()`), 'show 5: the four lights in view under the tile, nothing to scroll');
  await p.shot('show5-events.png');
  // A swipe inside the tile scrolls the events.
  await p.drag(tile.x, tile.y + 10, tile.x, tile.y - 20, 10); await sleep(700);
  check(await p.waitFor(`document.querySelector('${TILE} .events-at').textContent === '2–4/4'`), `show 5: a swipe up inside the tile brings the next event (${await text(p, `${TILE} .events-at`)})`);
  // A tap on the tile opens the panel: a card with the period, how many, every event, and Open calendar.
  await p.tapSel(TILE);
  check(await p.waitFor(panelOpen), 'show 5: a tap on the tile opens the panel');
  await sleep(400);
  check(await text(p, '#pop-name') === 'Today' && await text(p, '#pop-state') === '4 events' && (await panel(p)).split('|').length === 4
    && await p.eval(`document.querySelector('#popover .panel-actions button').textContent === 'Open calendar' && !document.querySelector('#popover .pop-actions:not(.panel-actions)')`),
  'show 5: Today, 4 events, each in a row, and Open calendar in the Off / On buttons\' place');
  await p.shot('show5-events-panel.png');
  await p.tapSel('#pop-close');
  check(await p.waitFor(`document.getElementById('popover').hidden`), 'show 5: the close button closes it');
  // a light's panel after it has its own buttons again
  await p.longPress((await box('.lights > .tile:nth-child(2)')).x, (await box('.lights > .tile:nth-child(2)')).y);
  check(await p.waitFor(panelOpen) && await p.eval(`!document.querySelector('#popover .panel-actions') && document.querySelectorAll('#popover .pop-actions button').length === 2 && !!document.querySelector('#popover .pop-power')`), 'show 5: a light\'s panel after it has its Off and On buttons again');
  await p.tapSel('#pop-close');
  // In a theme of one colour, every dot in it; a theme with title bars shows the period in the tile's.
  await load(p, 'device=Echo+Show+5+Bedroom&theme=eink');
  await p.waitFor(`document.querySelectorAll('${TILE} .ev-dot').length === 4`);
  check(await p.eval(`(() => { const t = document.createElement('i'); t.style.color = 'var(--accent)'; document.querySelector('.view.active').append(t); const c = getComputedStyle(t).color; t.remove();
    return [...document.querySelectorAll('${TILE} .ev-dot')].every((d) => getComputedStyle(d).backgroundColor === c); })()`), 'show 5, e-ink: every calendar\'s dot in its one colour');
  check(await p.eval(`!document.querySelector('${TILE} .tile-name').offsetWidth`), 'show 5: the period\'s name left out of the tile');
  await load(p, 'device=Echo+Show+5+Bedroom&theme=xp');
  check(await p.eval(`(() => { const n = document.querySelector('${TILE} .tile-name'), t = document.querySelector('${TILE}').getBoundingClientRect(), r = n.getBoundingClientRect(); return n.textContent === 'Today' && r.width > 0 && r.top - t.top < 30; })()`), 'show 5, xp: the period in the tile\'s title bar');
  await p.close();

  // With eight lights the grid scrolls: a swipe inside the tile scrolls the events, not the grid; elsewhere it scrolls the grid.
  const BEDROOM = ['light.bedroom_ceiling', 'light.bedroom_strips', 'light.bedroom_nightstand_1', 'light.bedroom_nightstand_2'];
  const eight = await withEvents(960, 480, { calendars: ['calendar.family', 'calendar.work'] }, [...BEDROOM, 'light.living_room', 'light.dining_room', 'light.kitchen', 'light.tv_strip'].map((entity) => ({ entity, name: entity.split('.')[1] })));
  await load(eight, 'device=Echo+Show+5+Bedroom');
  await eight.waitFor(`document.querySelectorAll('${TILE} .event').length === 4`);
  const [many, firstLight] = [await eight.rect(TILE), await eight.rect('.view.active .lights > .tile:nth-child(2)')];
  check(await eight.eval(`(() => { const g = document.querySelector('.view.active .lights'); return g.scrollHeight > g.clientHeight + 20; })()`), 'show 5, eight lights: more than the screen holds');
  await eight.drag(many.x, many.y + 10, many.x, many.y - 20, 10); await sleep(700);
  check(await eight.waitFor(`document.querySelector('${TILE} .events-at').textContent === '2–4/4'`) && await eight.eval(`document.querySelector('.view.active .lights').scrollTop === 0`),
    `show 5, eight lights: a swipe up inside the tile brings the next event, the grid stays (${await text(eight, `${TILE} .events-at`)})`);
  await eight.drag(firstLight.l + 30, firstLight.y, firstLight.l + 30, firstLight.y - 60, 10); await sleep(700);   // from its icon: its pill is a slider
  check(await eight.eval(`document.querySelector('.view.active .lights').scrollTop > 0`), 'show 5, eight lights: a swipe on the light tiles scrolls the grid');
  await eight.close();

  // The next 7 days on the Show 8: four lines of five at most, no count, no link; the panel under the days.
  const w = await withEvents(1280, 800, { calendars: ['calendar.family', { entity: 'calendar.work', color: '#5aa9e6' }], period: 'week', max: 5, lines: { wide: 4 }, chip: false });
  await load(w, 'device=Echo+Show+5+Bedroom');
  check(await w.waitFor(`document.querySelectorAll('${TILE} .event').length === 5`) && !(await w.eval(`!!document.querySelector('.view.active .events-chip')`)), 'show 8, a week: five events at most in the list, no count');
  check(await lines(w, TILE) === 'All day Bins out,Now Stand-up,12:30 Lunch with Sam,18:00 Swimming lesson,Thu 08:30 Dentist' && await text(w, `${TILE} .events-at`) === '1–4/5',
    `show 8: later days' events say their day, four lines in view (${await lines(w, TILE)}; ${await text(w, `${TILE} .events-at`)})`);
  await w.shot('show8-events-week.png');
  await w.tapSel(TILE);
  await w.waitFor(panelOpen);
  await sleep(400);
  const week = await panel(w);
  check(await text(w, '#pop-name') === 'Next 7 days' && await text(w, '#pop-state') === '7 events'
    && week === '# Today|All day Bins out|09:30–10:15 Stand-up|12:30–13:30 Lunch with Sam Café Lumière|18:00–19:00 Swimming lesson|# Tomorrow|08:30–09:00 Dentist|# Fri 23 Oct|14:00–16:00 Quarterly review Room 4|# Sat 24 Oct|19:30–22:00 Dinner at Alex\'s',
  `show 8: every event of the week under its day, the list's five at most aside (got ${week})`);
  check(await w.eval(`!document.querySelector('#popover .pop-actions')`), 'show 8: no link, no button');
  await w.shot('show8-events-panel.png');
  await w.close();

  // The other periods count their own; no list: the grid as it was.
  for (const [period, chip] of [['month', '8 this month'], ['all', '3 upcoming']]) {
    const q = await withEvents(960, 480, { calendars: ['calendar.family', 'calendar.work'], period, max: 3, lines: 0 });
    await load(q, 'device=Echo+Show+5+Bedroom');
    check(await q.waitFor(`document.querySelector('.view.active .events-chip').textContent === ${JSON.stringify(chip)}`) && !(await q.eval(`!!document.querySelector('.view.active .events') || document.querySelector('.view.active').classList.contains('with-events')`)),
      `show 5, ${period}: "${chip}", and with no lines no list (got ${await text(q, '.view.active .events-chip')})`);
    if (period === 'all') {
      await q.tapSel('.view.active .events-chip');
      await q.waitFor(panelOpen);
      check((await panel(q)) === '# Today|All day Bins out|09:30–10:15 Stand-up|12:30–13:30 Lunch with Sam Café Lumière', `show 5, all: the next three, whenever they are (got ${await panel(q)})`);
    }
    await q.close();
  }
}
