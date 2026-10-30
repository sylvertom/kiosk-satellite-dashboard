#!/usr/bin/env node
// A stand-in for Home Assistant to try the page without an instance:
// serves this folder (at /, /local/kiosk/ and, as the integration does,
// /kiosk_dashboard/), answers the WebSocket API subset the page uses
// (auth, subscribe_entities, call_service, config/entity_registry/get) and
// fakes the login endpoints, Music Assistant's library (its favourites,
// with covers) and two calendars' events. It signs in as Home Assistant does: a login's token runs out,
// and a refused token ends the connection. The entities match the ones in
// config.example.js, which it serves as config.js (or the file given with
// --config).
// No dependencies.   Usage: node tools/mock-ha.mjs [port] [--config file]   (port 8123)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const at = args.indexOf('--config');
const CONFIG = path.resolve(at >= 0 ? args.splice(at, 2)[1] : path.join(ROOT, 'config.example.js'));
const PORT = Number(args[0] || 8123);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };

/* ------------------------------------------------------------ states */
const states = {};
const now = () => new Date().toISOString();
const set = (id, s, a = {}) => { states[id] = { s, a: { friendly_name: id.split('.')[1].replace(/_/g, ' '), ...a }, lc: now(), lu: now() }; };
const WLED_FX = ['Solid', 'Blink', 'Breathe', 'Wipe', 'Rainbow', 'Scan', 'Fade', 'Theater', 'Sparkle', 'Chase', 'Fireworks', 'Candle', 'Aurora', 'Ocean', 'Plasma', 'Meteor'];
const PALETTES = ['Default', 'Rainbow', 'Party', 'Ocean', 'Forest', 'Lava', 'Sunset', 'Aurora', 'Fire'];
const light = (id, on, brightness, extra = {}) => set(id, on ? 'on' : 'off', {
  supported_color_modes: ['color_temp', 'hs'], min_color_temp_kelvin: 2000, max_color_temp_kelvin: 6500,
  brightness: on ? brightness : null, color_mode: on ? (extra.color_mode || 'color_temp') : null, ...extra,
});
const wled = (id, name, on, rgb) => {
  light(id, on, 200, { friendly_name: name, color_mode: 'hs', rgb_color: rgb, hs_color: rgbToHs(rgb), effect_list: WLED_FX, effect: 'Solid', supported_color_modes: ['hs'] });
  set(`select.${id.split('.')[1]}_color_palette`, 'Default', { friendly_name: `${name} Color palette`, options: PALETTES });
  set(`select.${id.split('.')[1]}_preset`, 'Evening', { friendly_name: `${name} Preset`, options: ['Evening', 'Movie', 'Party', 'Reading'] });
  set(`number.${id.split('.')[1]}_speed`, '128', { friendly_name: `${name} Speed`, min: 0, max: 255, step: 1 });
  set(`number.${id.split('.')[1]}_intensity`, '128', { friendly_name: `${name} Intensity`, min: 0, max: 255, step: 1 });
};
function rgbToHs([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) { if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h = Math.round(h * 60); if (h < 0) h += 360; }
  return [h, max ? Math.round((d / max) * 100) : 0];
}
function hsToRgb(h, s) {
  const c = s / 100, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = 1 - c;
  const [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][Math.floor(h / 60) % 6];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function seedStates() {
for (const k of Object.keys(states)) delete states[k];
// bedroom
set('sensor.bedroom_temperature', '19.4', { unit_of_measurement: '°C' });
set('sensor.bedroom_humidity', '48', { unit_of_measurement: '%' });
set('binary_sensor.bedroom_presence', 'on', { device_class: 'occupancy' });
set('switch.adaptive_lighting_bedroom', 'on');
set('switch.adaptive_lighting_sleep_mode_bedroom', 'off');
set('input_boolean.bedroom_presence_lighting', 'off');
light('light.bedroom_ceiling', true, 140, { color_temp_kelvin: 2700 });
light('light.bedroom_nightstand_1', true, 90, { color_temp_kelvin: 2200 });
light('light.bedroom_nightstand_2', false, null);
light('light.bedroom_strips', true, 120, { color_mode: 'hs', rgb_color: [233, 30, 99], hs_color: [341, 87], effect_list: ['None', 'Candle', 'Fireplace', 'Colorloop'], effect: 'None' });
light('light.bedroom_lights', true, 117, { entity_id: ['light.bedroom_ceiling', 'light.bedroom_nightstand_1', 'light.bedroom_nightstand_2', 'light.bedroom_strips'] });
// living
set('sensor.living_room_temperature', '21.8', { unit_of_measurement: '°C' });
set('sensor.living_room_humidity', '44', { unit_of_measurement: '%' });
set('binary_sensor.living_room_presence', 'off', { device_class: 'occupancy' });
set('sensor.living_room_co2', '640', { unit_of_measurement: 'ppm', device_class: 'carbon_dioxide' });
set('input_boolean.projector', 'off');
set('script.projector_on', 'off');
set('script.projector_off', 'off');
set('switch.adaptive_lighting_living_room', 'on');
set('input_boolean.living_room_presence_lighting', 'on');
light('light.living_room', true, 178, { color_temp_kelvin: 2700 });
light('light.dining_room', true, 102, { color_temp_kelvin: 3000 });
light('light.kitchen', false, null);
wled('light.tv_strip', 'TV strip', true, [64, 120, 255]);
wled('light.shelf_strip', 'Shelf strip', false, [255, 140, 40]);
light('light.downstairs', true, 150, { entity_id: ['light.living_room', 'light.dining_room', 'light.kitchen', 'light.tv_strip', 'light.shelf_strip'] });
// the house
set('binary_sensor.front_door', 'off', { device_class: 'door' });
// office
set('sensor.office_temperature', '20.6', { unit_of_measurement: '°C' });
set('sensor.office_humidity', '51', { unit_of_measurement: '%' });
set('binary_sensor.office_presence', 'on', { device_class: 'occupancy' });
set('switch.adaptive_lighting_office', 'on');
set('input_boolean.office_presence_lighting', 'off');
// the office ceiling is a group of two bulbs that the config does not list
light('light.office_ceiling_1', true, 153, { color_temp_kelvin: 4000 });
light('light.office_ceiling_2', true, 153, { color_temp_kelvin: 4000 });
light('light.office_lights', true, 153, { color_temp_kelvin: 4000, entity_id: ['light.office_ceiling_1', 'light.office_ceiling_2'] });
set('media_player.apple_tv', 'off', {
  friendly_name: 'Apple TV', supported_features: 1 | 16 | 32 | 128 | 256 | 1024 | 2048 | 16384 | 4,
  source_list: ['Netflix', 'Plex', 'YouTube', 'Apple TV+', 'Disney+'], volume_level: 0.35,
});
// the menu's scripts and the Music Assistant players its favourites play on
set('script.find_alex_phone', 'off');
set('script.find_sam_phone', 'off');
for (const id of MA_PLAYERS) set(id, 'idle', { supported_features: MA_FEATURES, volume_level: 0.3 });
// the bedroom's calendars (their events below)
set('calendar.family', 'off', { friendly_name: 'Family', message: 'Lunch with Sam', all_day: false });
set('calendar.work', 'off', { friendly_name: 'Work', message: 'Quarterly review', all_day: false });
}
// The calendars' events, placed on the day the page asks from (its today)
// and the days after: on a page whose clock says 10:00, the family's gym
// session is over and work's stand-up is on. More can be added for the
// checks (POST /__calendar).
const pad = (n) => String(n).padStart(2, '0');
function isoLocal(d) {
  const off = -d.getTimezoneOffset(), a = Math.abs(off);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00${off < 0 ? '-' : '+'}${pad(Math.floor(a / 60))}:${pad(a % 60)}`;
}
let extraEvents = [], noEvents = false;   // { entity, summary, day, h, m, minutes }; whether the calendars are empty
function calendarEvents(day0) {
  if (noEvents) return {};
  const at = (day, h, m = 0) => { const t = new Date(day0); t.setDate(t.getDate() + day); t.setHours(h, m, 0, 0); return isoLocal(t); };
  const date = (day) => { const t = new Date(day0); t.setDate(t.getDate() + day); return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`; };
  const timed = (summary, day, h, m, minutes, location) => {
    const end = new Date(day0); end.setDate(end.getDate() + day); end.setHours(h, m + minutes, 0, 0);
    return { summary, start: at(day, h, m), end: isoLocal(end), ...(location ? { location } : {}) };
  };
  const cals = {
    'calendar.family': [
      { summary: 'Bins out', start: date(0), end: date(1) },
      timed('Gym', 0, 7, 0, 60, 'Leisure centre'),
      timed('Lunch with Sam', 0, 12, 30, 60, 'Café Lumière'),
      timed('Swimming lesson', 0, 18, 0, 60),
      timed('Dentist', 1, 8, 30, 30),
      timed("Dinner at Alex's", 3, 19, 30, 150),
      { summary: "Sam's birthday", start: date(12), end: date(13) },
      { summary: 'Holiday', start: date(40), end: date(47) },
    ],
    'calendar.work': [
      timed('Stand-up', 0, 9, 30, 45),
      timed('Quarterly review', 2, 14, 0, 120, 'Room 4'),
    ],
  };
  for (const e of extraEvents) (cals[e.entity] = cals[e.entity] || []).push(timed(e.summary, e.day, e.h, e.m, e.minutes));
  return cals;
}
// calendar.get_events, as Home Assistant answers it: only with
// return_response, the events of each calendar that overlap the window.
function getEvents(c, m) {
  const d = m.service_data || {};
  const fail = (message) => c.send({ id: m.id, type: 'result', success: false, error: { code: 'service_validation_error', message } });
  if (!m.return_response) { fail('The action requires responses and must be called with return_response=True'); return; }
  const from = Date.parse(d.start_date_time), to = Date.parse(d.end_date_time);
  if (isNaN(from) || isNaN(to)) { fail('Expected a start and an end'); return; }
  const day0 = new Date(from); day0.setHours(0, 0, 0, 0);
  const cals = calendarEvents(day0.getTime());
  const when = (v) => (/^\d{4}-\d\d-\d\d$/.test(v) ? new Date(v + 'T00:00:00').getTime() : Date.parse(v));
  const response = {};
  for (const id of [].concat((m.target && m.target.entity_id) || [])) {
    if (!states[id]) { fail(`Entity ${id} not found`); return; }
    response[id] = { events: (cals[id] || []).filter((e) => when(e.end) > from && when(e.start) < to) };
  }
  c.send({ id: m.id, type: 'result', success: true, result: { context: { id: 'mock' }, response } });
}
// Music Assistant: the players it brings to Home Assistant, and its library.
// Every radio but one and every playlist is a favourite. KEXP has no cover,
// Radio Paradise's does not load: both keep their icon.
const MA_ENTRY = 'mock-music-assistant';   // the config entry of its integration
const MA_PLAYERS = ['media_player.bedroom_speakers', 'media_player.living_room_speakers', 'media_player.office_speakers'];
const MA_FEATURES = 1 | 4 | 16 | 32 | 128 | 256 | 1024 | 4096 | 16384;   // pause, volume, previous, next, on, off, volume steps, stop, play
const cover = (name) => `/mock/cover/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.svg`;
const libItem = (media_type, uri, name, image = cover(name), favorite = true) => ({ media_type, uri, name, version: '', image, favorite, explicit: null });
const LIBRARY = () => ({
  radio: [
    libItem('radio', 'library://radio/1', 'FIP'),
    libItem('radio', 'library://radio/2', 'France Inter'),
    libItem('radio', 'library://radio/3', 'KEXP', null),
    libItem('radio', 'library://radio/4', 'Radio Nova'),
    libItem('radio', 'library://radio/5', 'Radio Paradise', '/mock/cover/missing.svg'),
    libItem('radio', 'library://radio/6', 'TSF Jazz'),
    libItem('radio', 'library://radio/7', 'BBC Radio 6 Music'),
    libItem('radio', 'library://radio/8', 'Radio Classique', cover('Radio Classique'), false),
  ],
  playlist: [
    libItem('playlist', 'library://playlist/1', 'Dinner jazz'),
    libItem('playlist', 'spotify://playlist/mock-discover-weekly', 'Discover Weekly'),
    libItem('playlist', 'library://playlist/3', 'Focus'),
    libItem('playlist', 'library://playlist/4', 'Morning coffee'),
    libItem('playlist', 'library://playlist/5', 'Sunday vinyl'),
  ],
});
let library = LIBRARY();
seedStates();
const calls = [];   // every call_service, for the checks (GET /__calls)
let failing = false;   // every call_service refused, for the checks (POST /__fail)
const slow = new Map();   // file -> milliseconds before it is served, for the checks (POST /__slow)

// Sign-in: the tokens the login hands out, and when each runs out. Any other
// token starting with "mock" stands for Kiosk Satellite's, which lasts for years.
const issued = new Map();   // access token -> when it runs out (ms)
let tokenLife = 1800;   // seconds, for the checks (POST /__tokens)
const auths = [];   // every sign-in on the WebSocket, for the checks (GET /__auths)

const groups = Object.entries(states).filter(([, st]) => Array.isArray(st.a.entity_id)).map(([id]) => id);

function setLight(id, on, data = {}) {
  const st = states[id];
  if (!st) return;
  if (id.startsWith('light.')) {
    const brightness = data.brightness_pct != null ? Math.round(data.brightness_pct * 2.55) : data.brightness;
    st.a.brightness = on ? (brightness ?? st.a.brightness ?? 255) : null;
    if (on && data.color_temp_kelvin != null) { st.a.color_temp_kelvin = data.color_temp_kelvin; st.a.color_mode = 'color_temp'; delete st.a.rgb_color; delete st.a.hs_color; }
    if (on && data.hs_color) { st.a.hs_color = data.hs_color; st.a.rgb_color = hsToRgb(data.hs_color[0], data.hs_color[1]); st.a.color_mode = 'hs'; }
    if (on && data.rgb_color) { st.a.rgb_color = data.rgb_color; st.a.hs_color = rgbToHs(data.rgb_color); st.a.color_mode = 'hs'; }
    if (on && data.effect != null) st.a.effect = data.effect;
    if (!on) st.a.color_mode = null;
    else if (!st.a.color_mode) st.a.color_mode = st.a.rgb_color ? 'hs' : 'color_temp';
  }
  st.s = on ? 'on' : 'off';
  st.lu = now();
}
function apply(domain, service, data = {}, target = {}) {
  const ids = [].concat(target.entity_id || data.entity_id || []);
  const changed = new Set();
  const touch = (id) => { if (states[id]) { states[id].lu = now(); changed.add(id); } };
  for (const id of ids) {
    const st = states[id];
    if (!st) continue;
    const d = id.split('.')[0];
    if (domain === 'music_assistant') {   // a favourite plays: its name and cover, as the player shows them
      if (service === 'play_media') {
        const it = Object.values(library).flat().find((i) => i.uri === data.media_id);
        st.s = 'playing';
        Object.assign(st.a, { media_title: it ? it.name : data.media_id, media_artist: it && it.media_type === 'radio' ? 'Live radio' : 'Music Assistant', entity_picture: (it && it.image) || '/mock/art.svg' });
        touch(id);
      }
      continue;
    }
    if (domain === 'script' || d === 'script') {
      if (id === 'script.projector_on') { states['input_boolean.projector'].s = 'on'; touch('input_boolean.projector'); mediaOn(); touch('media_player.apple_tv'); }
      if (id === 'script.projector_off') { states['input_boolean.projector'].s = 'off'; touch('input_boolean.projector'); states['media_player.apple_tv'].s = 'off'; touch('media_player.apple_tv'); }
      continue;
    }
    if (d === 'select' || d === 'input_select') { if (service === 'select_option') { st.s = data.option; touch(id); } continue; }
    if (d === 'number' || d === 'input_number') { if (service === 'set_value') { st.s = String(data.value); touch(id); } continue; }
    if (d === 'media_player') { media(st, service, data); touch(id); continue; }
    let on = st.s === 'on';
    if (service === 'toggle') on = !on;
    else if (service === 'turn_on') on = true;
    else if (service === 'turn_off') on = false;
    setLight(id, on, data);
    changed.add(id);
    if (Array.isArray(st.a.entity_id)) {
      for (const m of st.a.entity_id) { setLight(m, on, data); changed.add(m); }
    } else {
      for (const g of groups) {
        const members = states[g].a.entity_id;
        if (!members.includes(id)) continue;
        const onMembers = members.filter((m) => states[m].s === 'on');
        const avg = onMembers.length ? Math.round(onMembers.reduce((a, m) => a + (states[m].a.brightness || 0), 0) / onMembers.length) : null;
        setLight(g, onMembers.length > 0, { brightness: avg });
        changed.add(g);
      }
    }
  }
  broadcast([...changed]);
}
function mediaOn() {
  const st = states['media_player.apple_tv'];
  st.s = 'playing';
  Object.assign(st.a, { media_title: 'Severance', media_series_title: 'S2 E4 · Woe\'s Hollow', app_name: 'Apple TV+', source: 'Apple TV+', entity_picture: '/mock/art.svg', media_content_type: 'tvshow' });
}
function media(st, service, data) {
  if (service === 'turn_on') mediaOn();
  if (service === 'turn_off') { st.s = 'off'; for (const k of ['media_title', 'media_series_title', 'entity_picture']) delete st.a[k]; }
  if (service === 'media_play_pause') st.s = st.s === 'playing' ? 'paused' : 'playing';
  if (service === 'media_play') st.s = 'playing';
  if (service === 'media_pause') st.s = 'paused';
  if (service === 'media_next_track') st.a.media_title = 'Next episode';
  if (service === 'media_previous_track') st.a.media_title = 'Previous episode';
  if (service === 'volume_set') st.a.volume_level = data.volume_level;
  if (service === 'volume_up') st.a.volume_level = Math.min(1, (st.a.volume_level || 0) + 0.05);
  if (service === 'volume_down') st.a.volume_level = Math.max(0, (st.a.volume_level || 0) - 0.05);
  if (service === 'select_source') { st.a.source = data.source; st.a.app_name = data.source; st.a.media_title = data.source + ' home'; st.s = 'playing'; }
}

// music_assistant.get_library, as Home Assistant answers it: only with
// return_response, for its own config entry, sorted by name.
function getLibrary(c, m) {
  const d = m.service_data || {};
  const fail = (message) => c.send({ id: m.id, type: 'result', success: false, error: { code: 'service_validation_error', message } });
  if (!m.return_response) { fail('The action requires responses and must be called with return_response=True'); return; }
  if (d.config_entry_id !== MA_ENTRY) { fail('Music Assistant config entry not found'); return; }
  if (!library[d.media_type]) { fail(`Invalid media type: ${d.media_type}`); return; }
  const offset = d.offset || 0, limit = d.limit ?? 25;
  const items = library[d.media_type].filter((i) => !d.favorite || i.favorite).sort((a, b) => a.name.localeCompare(b.name)).slice(offset, offset + limit);
  c.send({ id: m.id, type: 'result', success: true, result: { context: { id: 'mock' }, response: { items, limit, offset, order_by: d.order_by || 'name', media_type: d.media_type } } });
}

/* ------------------------------------------------------- websocket */
const clients = new Set();
function frame(text) {
  const payload = Buffer.from(text);
  let header;
  if (payload.length < 126) header = Buffer.from([0x81, payload.length]);
  else if (payload.length < 65536) { header = Buffer.alloc(4); header[0] = 0x81; header[1] = 126; header.writeUInt16BE(payload.length, 2); }
  else { header = Buffer.alloc(10); header[0] = 0x81; header[1] = 127; header.writeBigUInt64BE(BigInt(payload.length), 2); }
  return Buffer.concat([header, payload]);
}
function* frames(buf) {
  let off = 0;
  while (off + 2 <= buf.length) {
    const opcode = buf[off] & 0x0f;
    const masked = (buf[off + 1] & 0x80) !== 0;
    let len = buf[off + 1] & 0x7f;
    let p = off + 2;
    if (len === 126) { if (p + 2 > buf.length) return off; len = buf.readUInt16BE(p); p += 2; }
    else if (len === 127) { if (p + 8 > buf.length) return off; len = Number(buf.readBigUInt64BE(p)); p += 8; }
    const mask = masked ? buf.subarray(p, p + 4) : null;
    if (masked) p += 4;
    if (p + len > buf.length) return off;
    const payload = Buffer.from(buf.subarray(p, p + len));
    if (mask) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
    yield { opcode, payload };
    off = p + len;
  }
  return off;
}
const compressed = (id) => { const st = states[id]; return { s: st.s, a: st.a, lc: st.lc, lu: st.lu }; };
function broadcast(ids) {
  for (const c of clients) {
    for (const sub of c.subs) {
      const hit = ids.filter((id) => !sub.ids || sub.ids.includes(id));
      if (!hit.length) continue;
      const cmap = {};
      for (const id of hit) cmap[id] = { '+': compressed(id) };
      c.send({ id: sub.id, type: 'event', event: { c: cmap } });
    }
  }
}
function handleSocket(req, socket) {
  const key = req.headers['sec-websocket-key'];
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  const client = { subs: [], authed: false, send: (o) => socket.write(frame(JSON.stringify(o))), close: () => socket.end(Buffer.from([0x88, 0])) };
  clients.add(client);
  client.send({ type: 'auth_required', ha_version: '2026.9.2' });
  let buffer = Buffer.alloc(0);
  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    const it = frames(buffer);
    let r;
    while (!(r = it.next()).done) {
      const { opcode, payload } = r.value;
      if (opcode === 8) { socket.end(); return; }
      if (opcode === 9) { const pong = Buffer.from(payload); socket.write(Buffer.concat([Buffer.from([0x8a, pong.length]), pong])); continue; }
      if (opcode !== 1) continue;
      let m;
      try { m = JSON.parse(payload.toString()); } catch { continue; }
      onMessage(client, m);
    }
    buffer = buffer.subarray(r.value);
  });
  socket.on('close', () => clients.delete(client));
  socket.on('error', () => clients.delete(client));
}
function onMessage(c, m) {
  if (!c.authed) {
    const token = m.type === 'auth' && typeof m.access_token === 'string' ? m.access_token : '';
    const ok = token.startsWith('mock') && !(issued.has(token) && issued.get(token) < Date.now());
    auths.push({ ok });
    if (ok) { c.authed = true; c.send({ type: 'auth_ok', ha_version: '2026.9.2' }); }
    else { c.send({ type: 'auth_invalid', message: 'Invalid access token or password' }); c.close(); }
    return;
  }
  switch (m.type) {
    case 'subscribe_entities': {
      const ids = m.entity_ids || null;
      c.subs.push({ id: m.id, ids });
      c.send({ id: m.id, type: 'result', success: true, result: null });
      const a = {};
      for (const id of Object.keys(states)) if (!ids || ids.includes(id)) a[id] = compressed(id);
      c.send({ id: m.id, type: 'event', event: { a } });
      break;
    }
    case 'call_service':
      console.log(`call_service ${m.domain}.${m.service}`, JSON.stringify(m.service_data || {}), JSON.stringify(m.target || {}));
      calls.push({ domain: m.domain, service: m.service, data: m.service_data || {}, target: m.target || {}, response: !!m.return_response });
      if (failing) { c.send({ id: m.id, type: 'result', success: false, error: { code: 'home_assistant_error', message: 'Refused by the checks' } }); break; }
      if (m.domain === 'music_assistant' && m.service === 'get_library') { getLibrary(c, m); break; }
      if (m.domain === 'calendar' && m.service === 'get_events') { getEvents(c, m); break; }
      apply(m.domain, m.service, m.service_data, m.target);
      c.send({ id: m.id, type: 'result', success: true, result: { context: { id: 'mock' } } });
      break;
    case 'config/entity_registry/get': {
      if (!states[m.entity_id]) { c.send({ id: m.id, type: 'result', success: false, error: { code: 'not_found', message: 'Entity not found' } }); break; }
      const ma = MA_PLAYERS.includes(m.entity_id);
      c.send({ id: m.id, type: 'result', success: true, result: { entity_id: m.entity_id, platform: ma ? 'music_assistant' : 'mock', config_entry_id: ma ? MA_ENTRY : 'mock-other' } });
      break;
    }
    case 'ping':
      c.send({ id: m.id, type: 'pong' });
      break;
    default:
      c.send({ id: m.id, type: 'result', success: false, error: { code: 'unknown_command', message: m.type } });
  }
}

/* ----------------------------------------------------------- http */
const ART = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b3a5c"/><stop offset="1" stop-color="#0b1320"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/><circle cx="140" cy="60" r="34" fill="#9bc5ff" opacity=".85"/><path d="M0 150 Q60 110 110 150 T200 140 V200 H0z" fill="#2d5e8a"/></svg>`;
// A made-up cover: two colours from the name, its initials in the upper half like a station's logo.
function coverSvg(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase().replace(/[<&]/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h},70%,55%)"/><stop offset="1" stop-color="hsl(${(h + 60) % 360},65%,28%)"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/><circle cx="150" cy="48" r="70" fill="#fff" opacity=".12"/><path d="M0 160 Q60 120 110 155 T200 145 V200 H0z" fill="#000" opacity=".18"/><text x="100" y="98" font-family="Helvetica, Arial, sans-serif" font-size="${initials.length > 2 ? 44 : 54}" font-weight="700" fill="#fff" text-anchor="middle">${initials}</text></svg>`;
}
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/auth/authorize') {
    const back = new URL(url.searchParams.get('redirect_uri'));
    back.searchParams.set('code', 'mock-code');
    back.searchParams.set('state', url.searchParams.get('state') || '');
    res.writeHead(302, { Location: back.toString() }); res.end(); return;
  }
  if (url.pathname === '/auth/token' && req.method === 'POST') {
    let body = '';
    req.on('data', (d) => { body += d; });
    req.on('end', () => {
      const p = new URLSearchParams(body);
      const out = { access_token: 'mock-' + crypto.randomBytes(4).toString('hex'), token_type: 'Bearer', expires_in: tokenLife };
      issued.set(out.access_token, Date.now() + tokenLife * 1000);
      if (p.get('grant_type') === 'authorization_code') out.refresh_token = 'mock-refresh';
      console.log('auth/token', p.get('grant_type'));
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(out));
    });
    return;
  }
  if (url.pathname === '/__states') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(states)); return; }
  if (url.pathname === '/__set' && req.method === 'POST') { // test hook: {entity, state}
    let body = '';
    req.on('data', (d) => { body += d; });
    req.on('end', () => { const { entity, state } = JSON.parse(body); if (states[entity]) { states[entity].s = state; states[entity].lu = now(); broadcast([entity]); } res.writeHead(200); res.end('ok'); });
    return;
  }
  if (url.pathname === '/__calls') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(calls)); return; }
  if (url.pathname === '/__library' && req.method === 'POST') { // test hook: {radio?: [...], playlist?: [...]}, items as in LIBRARY; null: as it was
    let body = '';
    req.on('data', (d) => { body += d; });
    req.on('end', () => { const lib = JSON.parse(body); library = lib ? { ...library, ...lib } : LIBRARY(); res.writeHead(200); res.end('ok'); });
    return;
  }
  const hook = (fn) => { let body = ''; req.on('data', (d) => { body += d; }); req.on('end', () => { fn(JSON.parse(body || 'null')); res.writeHead(200); res.end('ok'); }); };
  if (url.pathname === '/__fail' && req.method === 'POST') { hook(({ on }) => { failing = !!on; }); return; }   // {on}
  if (url.pathname === '/__slow' && req.method === 'POST') { hook(({ file, ms }) => { if (ms) slow.set(file, ms); else slow.delete(file); }); return; }   // {file: '/themes/…', ms}; 0: at once
  if (url.pathname === '/__tokens' && req.method === 'POST') { hook(({ life }) => { tokenLife = life; }); return; }   // {life}: seconds a login's next tokens last
  // {entity, summary, day, h, m, minutes}: one more event, `day` days after the page's today; {none}: no events at all,
  // or back. The calendars' states change, as Home Assistant's do when their next event does.
  if (url.pathname === '/__calendar' && req.method === 'POST') {
    hook((e) => {
      if (e.none != null) noEvents = !!e.none; else extraEvents.push(e);
      const ids = e.entity ? [e.entity] : ['calendar.family', 'calendar.work'];
      for (const id of ids) { states[id].a = { ...states[id].a, message: e.summary || (noEvents ? '' : 'Lunch with Sam') }; states[id].lu = now(); }
      broadcast(ids);
    });
    return;
  }
  if (url.pathname === '/__drop') { for (const c of clients) c.close(); res.writeHead(200); res.end('ok'); return; }   // every connection ends, as when Home Assistant restarts
  if (url.pathname === '/__auths') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(auths)); return; }
  if (url.pathname === '/__reset') {
    seedStates(); library = LIBRARY(); extraEvents = []; noEvents = false; calls.length = 0; failing = false; slow.clear(); tokenLife = 1800; auths.length = 0;
    broadcast(Object.keys(states)); res.writeHead(200); res.end('ok'); return;
  }
  if (url.pathname === '/mock/art.svg') { res.writeHead(200, { 'Content-Type': 'image/svg+xml' }); res.end(ART); return; }
  const coverOf = Object.values(library).flat().find((i) => i.image === url.pathname);
  if (coverOf && url.pathname !== '/mock/cover/missing.svg') { res.writeHead(200, { 'Content-Type': 'image/svg+xml' }); res.end(coverSvg(coverOf.name)); return; }
  let file = url.pathname.replace(/^\/(local\/kiosk|kiosk_dashboard)/, '');
  if (file === '/' || file === '') file = '/index.html';
  const fp = file === '/config.js' ? CONFIG : path.join(ROOT, path.normalize(file));
  if ((fp !== CONFIG && !fp.startsWith(ROOT + path.sep)) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  setTimeout(() => {
    if (res.destroyed) return;   // the page went away meanwhile
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(fp).pipe(res);
  }, slow.get(file) || 0);
});
server.on('upgrade', (req, socket) => {
  if (new URL(req.url, 'http://x').pathname === '/api/websocket') handleSocket(req, socket);
  else socket.destroy();
});
server.listen(PORT, '127.0.0.1', () => console.log(`mock Home Assistant on http://127.0.0.1:${PORT}/  (page: /index.html?device=Echo+Spot+Bedroom, config: ${path.relative(process.cwd(), CONFIG)})`));
