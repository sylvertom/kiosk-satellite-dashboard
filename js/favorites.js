/* Kiosk dashboard: Music Assistant favourites. A menu folder's `favorites`
 * are the Music Assistant favourites of those kinds, played on the player of
 * the room this kiosk belongs to. They come first in the folder, before its
 * own items, their covers for icons; the Spot's ring takes as many as it has
 * room for, the first by name. With two kinds, a switch at the top of the
 * screen picks the one shown, and the page remembers it. A room's music
 * card (js/music.js) shows them too, and plays them on that room's player.
 * Home Assistant hands them over (Music Assistant's Get library action, on
 * the instance the room's player comes from) once connected, and again
 * whenever a folder of them opens: one starred in Music Assistant shows up
 * the next time. */
(() => {
  'use strict';
  const K = window.Kiosk;
  const { CFG, HA, el, esc } = K;
  const { pressFx } = K;

  const FAVORITES = { radio: { name: 'Radios', icon: 'radio' }, playlist: { name: 'Playlists', icon: 'playlist-music' } };
  const favorites = {};   // kind -> { items } as Music Assistant last said, or { failed: true }
  const shown = new Set();   // the music cards' redraws, for new favourites or another kind picked
  let favKind = null, entryAsked = null;   // the kind picked last; the instance's config entry (a Promise)
  // The player of the room this kiosk belongs to, where the menu's favourites play.
  const homePlayer = () => ((CFG.rooms || {})[K.home] || {}).player || '';
  // The player whose Music Assistant hands the favourites over: that one, or the first music card's.
  const libraryPlayer = () => homePlayer() || (Object.values(CFG.rooms || {}).find((r) => r.music && r.player) || {}).player || '';
  function favoriteKinds(folder) {
    const kinds = [].concat(folder.favorites || []);
    for (const k of kinds) if (!Object.hasOwn(FAVORITES, k)) console.warn(`config.js: favorites can be 'radio' and 'playlist'; "${k}" is left out`);
    return [...new Set(kinds.filter((k) => Object.hasOwn(FAVORITES, k)))];
  }
  const kindIn = (folder) => (folder.favorites.includes(favKind) ? favKind : folder.favorites[0]);
  // What a folder holds: its favourites of the kind picked, then its items;
  // `most` of them in all, at most.
  function folderItems(folder, most = Infinity) {
    if (!folder.favorites.length) return folder.items;
    const kind = kindIn(folder), got = (favorites[kind] && favorites[kind].items) || [];
    const room = Math.max(0, most - folder.items.length);
    return [...got.slice(0, room).map((f) => ({ name: f.name, icon: FAVORITES[kind].icon, cover: f.image, uri: f.uri, type: f.media_type || kind })), ...folder.items];
  }
  // The switch between the kinds, when there are two. Picking the other
  // kind redraws the folder, and the music cards.
  function favoritesSwitch(folder, redraw) {
    if (folder.favorites.length < 2) return null;
    const kind = kindIn(folder), sw = el('div', 'fav-switch');
    for (const k of folder.favorites) {
      const b = el('button', k === kind ? 'on' : '', esc(FAVORITES[k].name));
      b.setAttribute('aria-pressed', String(k === kind));
      pressFx(b);
      b.addEventListener('click', () => {
        if (k === kindIn(folder)) return;
        favKind = k;
        redraw();
        for (const fn of shown) if (fn !== redraw) fn();
      });
      sw.appendChild(b);
    }
    return sw;
  }
  // What stands in the favourites' place while there are none to show.
  function favoritesNote(folder) {
    const kind = kindIn(folder), got = favorites[kind];
    return !got ? 'Loading…' : got.failed ? 'Music Assistant did not answer' : got.items.length ? '' : `No favourite ${FAVORITES[kind].name.toLowerCase()} in Music Assistant`;
  }
  // The switch and that line, at the top of a menu folder.
  function favoritesBar(folder, redraw) {
    if (!folder.favorites.length) return null;
    const bar = el('div', 'fav-bar'), sw = favoritesSwitch(folder, redraw), note = favoritesNote(folder);
    if (sw) bar.appendChild(sw);
    if (note) bar.appendChild(el('div', 'fav-note', esc(note)));
    return bar.childElementCount ? bar : null;
  }
  // A music card's redraw, for new favourites or another kind picked.
  const onFavorites = (fn) => { shown.add(fn); };
  // A cover in an icon's place (a favourite's artwork), shown once it has
  // loaded: one that does not load leaves the icon. Web addresses only, and
  // the page's own address is not passed on to where the cover comes from.
  function addCover(button, slot, src) {
    let url;
    try { url = new URL(src, location.href); } catch (_) { return; }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
    const img = el('img', 'cover');
    img.alt = '';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('load', () => button.classList.add('with-cover'));
    img.addEventListener('error', () => img.remove());
    img.src = url.href;
    if (img.complete && img.naturalWidth) button.classList.add('with-cover');   // cached: no flash of the icon
    slot.prepend(img);
  }
  // Plays a favourite on a player, the menu's on this kiosk's room's.
  const playFavorite = (it, player = homePlayer()) => HA.call('music_assistant', 'play_media', { media_id: it.uri, media_type: it.type }, player);
  // Asks Music Assistant for the favourites of these kinds, and redraws the
  // folder on screen and the music cards when they have changed. When it
  // does not answer, the ones it gave last time stay.
  function loadFavorites(kinds) {
    if (!libraryPlayer()) return;
    for (const kind of kinds || []) {
      musicAssistant()
        .then((entry) => HA.request({ type: 'call_service', domain: 'music_assistant', service: 'get_library', return_response: true,
          service_data: { config_entry_id: entry, media_type: kind, favorite: true, order_by: 'name', limit: 50 } }))
        .then((r) => ({ items: ((r && r.response && r.response.items) || []).filter((f) => f && f.uri && f.name) }),
          (e) => { console.warn(`Music Assistant favourites (${kind}):`, e); return favorites[kind] && favorites[kind].items ? favorites[kind] : { failed: true }; })
        .then((now) => {
          if (JSON.stringify(now) === JSON.stringify(favorites[kind])) return;
          favorites[kind] = now;
          K.redrawFavorites(kind);
          for (const fn of shown) fn();
        });
    }
  }
  // The Music Assistant instance (its config entry) the room's player comes
  // from. Asked once, and again after a failure.
  function musicAssistant() {
    if (!entryAsked) {
      const player = libraryPlayer();
      entryAsked = HA.request({ type: 'config/entity_registry/get', entity_id: player }).then((e) => {
        if (!e || e.platform !== 'music_assistant' || !e.config_entry_id) throw new Error(`config.js: ${player} is not a Music Assistant player`);
        return e.config_entry_id;
      });
      entryAsked.catch(() => { entryAsked = null; });
    }
    return entryAsked;
  }

  Object.assign(K, { homePlayer, favoriteKinds, folderItems, favoritesSwitch, favoritesNote, favoritesBar, onFavorites, addCover, playFavorite, loadFavorites });
})();
