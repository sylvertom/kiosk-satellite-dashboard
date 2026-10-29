/* Kiosk dashboard: a room's events, from its Home Assistant calendars. A
 * room's `events` asks Home Assistant what its calendars hold over a period
 * (the rest of today, the next 7 or 30 days, or the next events however far
 * off) and shows them in two ways, each optional: a chip among the header's
 * sensors saying how many there are, and a list that a swipe scrolls
 * through, one line above the main light on the Spot, a wide tile first
 * among the lights on the Show. A tap on either opens them all in the
 * panel, with a button to Kiosk Satellite's calendar when the room gives a
 * link. Home Assistant is asked once connected, whenever one of the
 * calendars changes (an event starts or ends), every ten minutes and at
 * midnight. */
(() => {
  'use strict';
  const K = window.Kiosk;
  const { HA, states, el, esc, icon, clamp, setText, setClass, setVar } = K;
  const { watch, pressFx } = K;

  const PERIODS = {
    day: { days: 1, chip: 'today', title: 'Today', none: 'No events today' },
    week: { days: 7, chip: 'this week', title: 'Next 7 days', none: 'No events this week' },
    month: { days: 30, chip: 'this month', title: 'Next 30 days', none: 'No events this month' },
    all: { days: 365, chip: 'upcoming', title: 'Upcoming', none: 'No upcoming events' },
  };
  const LINES = { round: [1, 1], wide: [3, 6] };   // lines of the list by shape: unless said, and at most
  const STALE = 10 * 60000;   // asked again after this long
  // The dots of a room's calendars, when it has more than one and they have no colour of their own.
  const DOTS = ['var(--accent)', '#5aa9e6', '#e66a8a', '#7bc67e', '#b48ce6'];
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* ------------------------------------------------------------- config */
  // A room's events, filled in: its calendars (an entity each, and a
  // colour), the period, how many to list at most, the chip, the lines of
  // the list on this shape, the link.
  const read = new WeakMap();
  function eventsOf(room) {
    const e = room && room.events;
    if (!e) return null;
    if (read.has(e)) return read.get(e);
    let cfg = null;
    const cals = [].concat(e.calendars || []).map((c) => (typeof c === 'string' ? { entity: c } : c)).filter((c) => c && c.entity);
    if (!cals.length) console.warn(`config.js: the events of "${room.title}" name no calendar`);
    else {
      let period = e.period || 'day';
      if (!Object.hasOwn(PERIODS, period)) { console.warn(`config.js: events' period can be 'day', 'week', 'month' or 'all'; "${period}" counts as 'day'`); period = 'day'; }
      const [usual, most] = LINES[K.shape];
      const lines = e.lines != null && typeof e.lines === 'object' ? e.lines[K.shape] : e.lines;
      const max = Math.max(1, Math.round(e.max ?? 10));
      cfg = {
        calendars: cals.map((c, j) => ({ entity: c.entity, color: c.color || DOTS[j % DOTS.length] })),
        period, max, chip: e.chip !== false, link: e.link || '',
        lines: clamp(Math.round(Number(lines ?? usual)) || 0, 0, most),
        key: JSON.stringify([cals.map((c) => c.entity), period, max]),
      };
    }
    read.set(e, cfg);
    return cfg;
  }

  /* -------------------------------------------------------------- times */
  const pad = (n) => String(n).padStart(2, '0');
  const hm = (t) => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const dayOf = (t) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
  const daysFrom = (a, b) => Math.round((dayOf(b) - dayOf(a)) / 864e5);
  // A moment as Home Assistant reads it, in the kiosk's own time zone: 2026-10-22T07:30:00+02:00.
  function isoLocal(d) {
    const off = -d.getTimezoneOffset(), a = Math.abs(off);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
      + `${off < 0 ? '-' : '+'}${pad(Math.floor(a / 60))}:${pad(a % 60)}`;
  }
  // A date of Home Assistant's: a day (an all-day event's, from midnight here) or a moment.
  const DAY = /^(\d{4})-(\d\d)-(\d\d)$/;
  function when(v) {
    const m = DAY.exec(String(v));
    return m ? new Date(+m[1], m[2] - 1, +m[3]).getTime() : Date.parse(v);
  }
  // The day an event is under: the day it starts, today for one already on.
  const dayUnder = (e, now) => dayOf(Math.max(e.start, now));
  // When an event is, in a few letters for a line of the list: Now while it
  // is on, its time today, its day of the week this week, its date further on.
  function whenShort(e, now) {
    const n = daysFrom(now, dayUnder(e, now)), d = new Date(dayUnder(e, now));
    const day = n === 0 ? '' : n < 7 ? DAYS[d.getDay()] : `${d.getDate()} ${MONTHS[d.getMonth()]}`;
    if (e.allDay) return day || 'All day';
    if (e.start <= now) return 'Now';
    return day ? `${day} ${hm(e.start)}` : hm(e.start);
  }
  // The heading of a day in the panel.
  function dayName(t, now) {
    const n = daysFrom(now, t), d = new Date(t);
    return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  }

  /* -------------------------------------------------------------- asking */
  // One source of events for each set of calendars and period, shared by
  // the rooms that show the same: what Home Assistant last said, and what
  // draws them.
  const sources = new Map();
  function sourceOf(cfg) {
    let s = sources.get(cfg.key);
    if (s) return s;
    s = { cfg, events: null, failed: false, at: 0, timer: null, draws: new Set() };
    sources.set(cfg.key, s);
    // A calendar's state says which event is on or comes next: when it
    // changes, an event has started or ended, or another one comes first.
    const ids = cfg.calendars.map((c) => c.entity);
    let seen = '';
    watch(ids, () => {
      if (ids.some((id) => !states[id])) return;
      const now = ids.map((id) => { const a = states[id].attributes; return [states[id].state, a.message, a.start_time, a.end_time].join('|'); }).join('\n');
      if (now === seen) return;
      seen = now;
      soon(s);
    });
    return s;
  }
  // Ask in a moment: what sets it off often comes in a burst (connecting, several calendars).
  function soon(s) {
    clearTimeout(s.timer);
    s.timer = setTimeout(() => ask(s), 300);
  }
  // Asks Home Assistant for the events of the period, from now on. When it
  // does not answer, the events it gave last time stay.
  function ask(s) {
    const { cfg } = s, now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + PERIODS[cfg.period].days);
    s.at = Date.now();
    HA.request({ type: 'call_service', domain: 'calendar', service: 'get_events', return_response: true,
      target: { entity_id: cfg.calendars.map((c) => c.entity) },
      service_data: { start_date_time: isoLocal(now), end_date_time: isoLocal(end) } })
      .then((r) => {
        const got = (r && r.response) || {}, list = [];
        for (const c of cfg.calendars) {
          for (const ev of (got[c.entity] && got[c.entity].events) || []) {
            const start = when(ev.start), stop = when(ev.end || ev.start);
            if (isNaN(start) || isNaN(stop)) continue;
            list.push({ cal: c.entity, title: String(ev.summary || ''), where: String(ev.location || ''), start, end: stop, allDay: DAY.test(String(ev.start)) });
          }
        }
        const t = Date.now();
        list.sort((a, b) => dayUnder(a, t) - dayUnder(b, t) || b.allDay - a.allDay || a.start - b.start || a.title.localeCompare(b.title));
        s.events = cfg.period === 'all' ? list.slice(0, cfg.max) : list;
        s.failed = false;
      }, (e) => {
        console.warn(`Calendar events (${cfg.calendars.map((c) => c.entity).join(', ')}):`, e);
        if (!s.events) s.failed = true;
      })
      .then(() => draw(s));
  }
  function draw(s) {
    for (const fn of s.draws) fn();
    K.updatePopover();
  }
  // The events still to come or on, in order. null until Home Assistant has said.
  const shown = (s) => (s.events ? s.events.filter((e) => e.end > Date.now()) : null);
  // Asks for every room's events: once connected (js/main.js), or all those
  // last asked for a while ago or on another day.
  function loadEvents(all = true) {
    for (const s of sources.values()) if (all || Date.now() - s.at > STALE || dayOf(s.at) !== dayOf(Date.now())) soon(s);
  }
  // Every minute: the lines say Now as an event starts and lose it once it
  // ends, and what is stale is asked for again. A sleeping kiosk pauses its
  // timers: catch up when the screen comes back.
  const tick = () => { for (const s of sources.values()) draw(s); loadEvents(false); };
  setInterval(tick, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  addEventListener('kiosksatellite:screenon', tick);

  /* --------------------------------------------------------------- shown */
  // The dot of an event's calendar, for a room with more than one.
  const dotOf = (cfg, e) => (cfg.calendars.length > 1 ? `<span class="ev-dot" style="--ev: ${esc((cfg.calendars.find((c) => c.entity === e.cal) || {}).color)}"></span>` : '');
  const note = (s) => (s.failed ? 'The calendar did not answer' : PERIODS[s.cfg.period].none);

  // The chip among the sensors: how many events, "3 today" (the number alone
  // on the Spot), hidden while there are none. A tap opens them.
  function makeEventsChip(cfg) {
    const s = sourceOf(cfg), word = PERIODS[cfg.period].chip;
    const node = el('button', 'sensor events-chip', icon('calendar-blank-outline') + '<span></span>');
    const label = node.querySelector('span');
    node.hidden = true;
    pressFx(node);
    node.addEventListener('click', () => openEvents(cfg));
    s.draws.add(() => {
      const list = shown(s), n = list ? list.length : 0;
      setText(label, K.shape === 'round' ? String(n) : `${n} ${word}`);
      node.setAttribute('aria-label', `${n} ${n === 1 ? 'event' : 'events'} ${word}`);
      if (node.hidden !== !n) {
        node.hidden = !n;
        if (node.onvisibility) node.onvisibility(!!n);
      }
    });
    return node;
  }

  // The list: `lines` events in view (as many lines as there are events,
  // when fewer), a swipe up or down scrolls through the rest a line at a
  // time, a mark in the corner says where (1/3, or 1–3/5). On the Show a
  // wide tile with the calendar's icon (and the period's name, which only a
  // theme with title bars shows); on the Spot a line of its own. A tap
  // opens them all.
  function makeEventsList(cfg) {
    const s = sourceOf(cfg), wide = K.shape !== 'round';
    const node = el('div', 'events' + (wide ? ' tile' : ''));
    node.innerHTML = (wide ? `<span class="tile-icon">${icon('calendar-blank-outline')}</span><span class="tile-text"><span class="tile-name">${esc(PERIODS[cfg.period].title)}</span></span>` : '')
      + '<div class="events-rows"></div><span class="events-at"></span>';
    const rows = node.querySelector('.events-rows'), at = node.querySelector('.events-at');
    // a click, not the finger's release: the panel opens over the list, and must not take the click that follows
    // (a swipe that scrolls makes none)
    pressFx(node);
    node.addEventListener('click', () => openEvents(cfg));
    let html = null, count = 0;
    const mark = () => {
      const h = rows.firstElementChild ? rows.firstElementChild.offsetHeight : 0;
      const first = h ? clamp(Math.round(rows.scrollTop / h), 0, Math.max(0, count - cfg.lines)) + 1 : 1;
      const last = Math.min(first + cfg.lines - 1, count);
      at.hidden = count <= cfg.lines;
      setClass(node, 'paged', !at.hidden);
      setText(at, last > first ? `${first}–${last}/${count}` : `${first}/${count}`);
    };
    s.draws.add(() => {
      const list = shown(s), now = Date.now();
      const items = list ? list.slice(0, cfg.max) : [];
      const h = (list ? !items.length : s.failed) ? `<div class="event none">${esc(note(s))}</div>`
        : items.map((e) => `<div class="event${e.start <= now && !e.allDay ? ' now' : ''}">${dotOf(cfg, e)}<span class="ev-time">${esc(whenShort(e, now))}</span><span class="ev-title">${esc(e.title)}</span></div>`).join('');
      count = items.length;
      setVar(node, '--lines', clamp(count, 1, cfg.lines));
      if (h !== html) { html = h; rows.innerHTML = h; }
      mark();
    });
    let queued = false;
    rows.addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; mark(); }); } }, { passive: true });
    // the end of the screensaver brings back the first event, as it brings back the main light
    addEventListener('kiosksatellite:screensaverstop', () => { rows.scrollTop = 0; });
    return node;
  }

  // The panel: every event of the period, under the day it is on when the
  // period is longer than a day, its hours and where, and a button to Kiosk
  // Satellite's calendar when the room gives a link. Asked for again on
  // opening when it was a while ago.
  function openEvents(cfg) {
    const s = sourceOf(cfg), period = PERIODS[cfg.period];
    let html = null;
    K.openPanel({
      icon: 'calendar-blank-outline', name: period.title,
      actions: cfg.link ? [{ name: 'Open calendar', run: () => { K.closePopover(); K.follow(cfg.link); } }] : [],
      update: (body, stateEl) => {
        const list = shown(s), now = Date.now();
        setText(stateEl, !list ? (s.failed ? note(s) : 'Loading…') : list.length ? `${list.length} ${list.length === 1 ? 'event' : 'events'}` : period.none);
        let h = '', day = null;
        if (list && !list.length) h = `<div class="event-row none">${esc(note(s))}</div>`;
        for (const e of list || []) {
          if (cfg.period !== 'day' && dayUnder(e, now) !== day) { day = dayUnder(e, now); h += `<div class="control-label events-day">${esc(dayName(day, now))}</div>`; }
          const hours = e.allDay ? 'All day' : `${hm(e.start)}–${hm(e.end)}`;
          h += `<div class="event-row${e.start <= now && !e.allDay ? ' now' : ''}">${dotOf(cfg, e)}<span class="ev-time">${esc(hours)}</span>`
            + `<span class="ev-text"><span class="ev-title">${esc(e.title)}</span>${e.where ? `<span class="ev-where">${esc(e.where)}</span>` : ''}</span></div>`;
        }
        if (h !== html) { html = h; body.innerHTML = h; }
      },
    });
    if (Date.now() - s.at > 60000) soon(s);
  }

  Object.assign(K, { eventsOf, makeEventsChip, makeEventsList, loadEvents });
})();
