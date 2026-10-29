/* Kiosk dashboard: a room's music card, on the wide screens under the
 * dial, for a room with `music` and a `player`. While the player plays,
 * what it plays: the media card, its cover, title, pause, next and volume.
 * The rest of the time, the room's kinds of Music Assistant favourites
 * (js/favorites.js), their covers and names in a strip a swipe scrolls
 * through, with a switch between radios and playlists when it has both: a
 * tap plays one on the room's player. Music Assistant hands them over once
 * connected, and again when the player stops: one starred meanwhile shows
 * up then. */
(() => {
  'use strict';
  const K = window.Kiosk;
  const { el, esc, icon, toast } = K;
  const { pressFx, makeMedia, favoriteKinds, folderItems, favoritesSwitch, favoritesNote, onFavorites, addCover, playFavorite, loadFavorites } = K;

  // A room's music: the kinds of favourites its card offers, and the player
  // they play on. null without, or without a player.
  const read = new WeakMap();
  function musicOf(room) {
    if (!room || !room.music) return null;
    if (read.has(room)) return read.get(room);
    let music = null;
    if (!room.player) console.warn(`config.js: the music of "${room.title}" plays on the room's player, and it has none`);
    else {
      const kinds = favoriteKinds({ favorites: room.music });
      if (kinds.length) music = { kinds, player: room.player };
    }
    read.set(room, music);
    return music;
  }

  function makeMusic(music) {
    const folder = { favorites: music.kinds, items: [] };
    const node = el('div', 'music');
    const favs = el('div', 'music-favs');
    const now = makeMedia({ entity: music.player, icon: 'music', showWhen: { state: ['playing', 'buffering'] } }, false);
    node.append(favs, now);
    // The favourites of the kind picked, redrawn when Music Assistant or the
    // switch changes them; the same kind where the strip was scrolled to.
    let drawn = null, kind = null;
    const draw = () => {
      const items = folderItems(folder), note = favoritesNote(folder), sw = favoritesSwitch(folder, draw);
      const picked = sw && sw.querySelector('.on').textContent, key = JSON.stringify([picked, note, items.map((it) => [it.name, it.cover])]);
      if (key === drawn) return;
      drawn = key;
      const strip = el('div', 'music-strip');
      for (const it of items) {
        const b = el('button', 'music-fav', `<span class="music-cover">${icon(it.icon)}</span><span class="music-name">${esc(it.name)}</span>`);
        b.setAttribute('aria-label', it.name);
        if (it.cover) addCover(b, b.querySelector('.music-cover'), it.cover);
        pressFx(b);
        b.addEventListener('click', () => playFavorite(it, music.player).then(() => toast(it.name), () => toast('Home Assistant did not answer')));
        strip.appendChild(b);
      }
      const was = favs.querySelector('.music-strip'), left = was && picked === kind ? was.scrollLeft : 0;
      favs.replaceChildren(...(sw ? [sw] : []), note ? el('div', 'music-note', esc(note)) : strip);
      strip.scrollLeft = left;
      kind = picked;
    };
    onFavorites(draw);
    draw();
    // the favourites while nothing plays, asked for again as it stops
    now.onvisibility = (playing) => {
      favs.hidden = playing;
      if (!playing) loadFavorites(music.kinds);
    };
    return node;
  }

  // The kinds of favourites the rooms' music cards show, to fetch once connected.
  const musicKinds = (rooms) => [...new Set(Object.values(rooms || {}).flatMap((r) => (musicOf(r) || { kinds: [] }).kinds))];

  Object.assign(K, { musicOf, makeMusic, musicKinds });
})();
