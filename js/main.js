/* Kiosk dashboard: boot. Finds which kiosk this is, its room and its
 * theme, picks the arrangement from the screen, builds the views and the
 * menus, then connects to Home Assistant. Also the status pill, which says
 * when the page is connecting, has no session or has lost Home Assistant. */
(() => {
  'use strict';
  const K = window.Kiosk;
  const { CFG, HA, $, KS, params, root, icon, esc, lookup, applyTheme } = K;
  const { render, sensorIds, eventsOf, loadEvents, buildView, showView, startClock, views, buildRoomMenu, buildMenu, followPlayer, menuFavoriteKinds, loadFavorites, musicOf, musicKinds, closeOverlay, closePopover } = K;

  /* ------------------------------------------------------------- status */
  const statusEl = $('status');
  let statusAction = null;
  function showStatus(s) {
    if (!s) { statusEl.hidden = true; statusAction = null; return; }
    statusEl.innerHTML = (s.icon ? icon(s.icon) : '') + `<span>${esc(s.text)}</span>`;
    statusEl.className = 'status' + (s.kind ? ' ' + s.kind : '');
    statusEl.hidden = false;
    statusAction = s.action || null;
  }
  HA.onStatus(showStatus);
  statusEl.addEventListener('click', () => { if (statusAction) statusAction(); });

  /* --------------------------------------------------------------- boot */
  async function deviceName() {
    if (params.get('device')) return params.get('device');
    try {
      if (KS && typeof KS.getDeviceInfo === 'function') {
        const info = await Promise.race([KS.getDeviceInfo(), new Promise((r) => setTimeout(() => r(null), 1500))]);
        if (info && info.name) return info.name;
      }
    } catch (_) { /* not in Kiosk Satellite */ }
    return '';
  }
  function guessShape() {
    const w = innerWidth, h = innerHeight;
    const square = Math.abs(w - h) <= Math.min(w, h) * 0.08;
    return square && Math.min(w, h) <= 640 ? 'round' : 'wide';
  }
  function entityIds() {
    const ids = (CFG.alerts || []).flatMap(sensorIds);
    for (const r of Object.values(CFG.rooms || {})) {
      for (const s of r.sensors || []) ids.push(...sensorIds(s));
      for (const c of r.modes || []) ids.push(c.entity);
      if (r.main) ids.push(r.main.entity);
      for (const l of r.lights || []) { ids.push(l.entity); for (const c of l.controls || []) ids.push(c); }
      if (r.media) { ids.push(r.media.entity); if (r.media.showWhen) ids.push(r.media.showWhen.entity); }
      const events = eventsOf(r);
      if (events) ids.push(...events.calendars.map((c) => c.entity));
      const music = K.shape !== 'round' && musicOf(r);
      if (music) ids.push(music.player);
    }
    return ids.filter(Boolean);
  }

  async function main() {
    if (!window.KIOSK_CONFIG) {
      showStatus({ kind: 'error', text: 'No config.js: copy config.example.js to config.js and edit it', icon: 'alert-circle-outline' });
      return;
    }
    const name = await deviceName();
    const device = lookup(CFG.devices, name);   // a room, or { room, theme }
    const own = device && typeof device === 'object' ? device : { room: device };
    const rooms = CFG.rooms || {};
    const roomKey = params.get('room') || own.room || CFG.defaultRoom || Object.keys(rooms)[0];
    const shape = K.shape = params.get('shape') || guessShape();
    root.classList.add('shape-' + shape);
    if (shape !== 'round' && Math.min(innerWidth, innerHeight) < 600) root.classList.add('density-compact');
    const themed = applyTheme(own.theme);

    const container = $('views');
    const canSwitch = Object.keys(rooms).length > 1;
    for (const [key, room] of Object.entries(rooms)) container.appendChild(buildView(key, room, canSwitch));
    K.home = roomKey;
    buildMenu();
    if (KS && typeof KS.getKioskState === 'function') {
      addEventListener('kiosksatellite:kiosk-state', (e) => followPlayer(e.detail));
      Promise.resolve(KS.getKioskState()).then(followPlayer, () => {});
    }
    buildRoomMenu(rooms);
    startClock();
    await themed;
    $('app').hidden = false;
    showView(roomKey);
    render();

    HA.start(entityIds());
    // Music Assistant's favourites, there before a folder of them opens and for the music cards; the rooms' events.
    const cards = shape !== 'round' ? musicKinds(rooms) : [];
    HA.onStatus((s) => { if (!s) { loadFavorites([...new Set([...menuFavoriteKinds(), ...cards])]); loadEvents(); } });

    // Kiosk Satellite tells the page when the screensaver ends: start from a clean view.
    addEventListener('kiosksatellite:screensaverstop', () => { closePopover(); closeOverlay(); for (const v of Object.values(views)) v.restore(); });
    addEventListener('resize', () => {
      clearTimeout(main.rt);
      main.rt = setTimeout(() => { if (!params.get('shape') && guessShape() !== shape) location.reload(); }, 200);
    });
  }

  main();
})();
