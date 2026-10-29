/* Kiosk dashboard: the menu, for the kiosk's own features. On the wide
 * screens a rail of round buttons on the right edge, always there. On the
 * round Spot a ring of large buttons in the middle of the screen, opened by
 * a tap or a swipe on the tab at the bottom; picking one, or a tap anywhere
 * but on one, closes it. An item is a link, a Home Assistant script, or a
 * folder of such items (one level) that may also hold Music Assistant
 * favourites (js/favorites.js), or Settings (js/settings.js): on the Spot a
 * folder opens as a ring of its own, Back in the middle; on the Show, as a
 * grid of cards like the room menu's, Back first. Settings' list of themes
 * is a list like the room menu's on both. An item may be kept to one
 * shape. A Now playing item
 * shows only while Kiosk Satellite has something to play: it says so from
 * its October 2026 versions on; with an older one, or outside it, the item
 * stays. A folder shows only with something in it, its favourites only when
 * the kiosk's room names a player. */
(() => {
  'use strict';
  const K = window.Kiosk;
  const { CFG, HA, $, KS, params, el, esc, icon, setClass, toast, warn } = K;
  const { pressFx, armIdle, dim, undim, closeOverlay, dimmed, showView } = K;
  const { homePlayer, favoriteKinds, folderItems, favoritesBar, addCover, playFavorite, loadFavorites, settingsItems } = K;

  const app = $('app'), menuEl = $('menu'), handle = $('menu-handle');
  let swipedAt = 0, menuRoot = [], ringFolder = null;   // the folder on the Spot's ring, if one is
  let playerLoaded = !(KS && typeof KS.getKioskState === 'function');   // hidden until it says
  const isNowPlaying = (it) => /^ks:\/\/now-playing\/*$/.test(String(it.link || ''));
  const isFolder = (it) => Array.isArray(it.items) || it.favorites != null || !!it.settings;
  const kindOf = (it) => (isFolder(it) ? 'folder' : it.script ? 'script' : it.link ? 'link' : '');

  /* ------------------------------------------------------------ entries */
  // An entry of the menu: an icon and a name; a tap picks it. A folder's entry
  // carries a small arrow in its corner: it opens more. A setting that is on
  // takes the accent; one that does not apply is faded.
  function makeItem(item, cls, pick) {
    const folder = isFolder(item) || !!item.opens;
    const node = el('button', cls + (folder ? ' folder' : '') + (item.on ? ' on' : '') + (item.idle ? ' idle' : ''), icon(item.icon || 'apps') + `<span class="item-label">${esc(item.name || '')}</span>` + (folder ? `<span class="more">${icon('chevron-right')}</span>` : ''));
    node.setAttribute('aria-label', item.name || item.link || '');
    if (item.on != null) node.setAttribute('aria-pressed', String(!!item.on));
    if (item.cover) addCover(node, node, item.cover);
    pressFx(node);
    node.addEventListener('click', pick);
    return node;
  }

  // Round buttons (.ring-item) spread evenly on a ring around a button in the
  // middle (centre: its icon, label and what it does; marked .back when it
  // goes back out of a folder), in the middle of the screen. The fewer the
  // buttons, the larger: as large as fits with 30% of a
  // button between two and the farthest edge 10.9rem from the middle (the
  // button at the bottom stops short of the tab's touch area; 9.6rem under
  // the favourites' switch at the top of the screen), 7rem across at most. A
  // short ring keeps close to the middle button, 1rem from it; that one
  // grows a little with the others (--mid). Sizes are in rem. Each button's
  // angle is its --a. A ring is made for ten buttons at most.
  const RING = { reach: 10.9, underSwitch: 9.6, max: 7, gap: 0.3, inner: 1, most: 10 };
  function makeRing(nodes, centre, reach = RING.reach) {
    const node = el('div', 'ring');
    const n = nodes.length, sin = n > 1 ? Math.sin(Math.PI / n) : 0;
    const size = sin ? Math.min(RING.max, (2 * reach * sin) / (1 + RING.gap + sin)) : RING.max;
    const middle = Math.max(2.6, size * 0.45);
    const radius = Math.max(middle / 2 + RING.inner + size / 2, sin ? (size * (1 + RING.gap)) / (2 * sin) : 0);
    node.style.setProperty('--size', size + 'rem');
    node.style.setProperty('--mid', middle + 'rem');
    node.style.setProperty('--r', radius + 'rem');
    nodes.forEach((it, j) => it.style.setProperty('--a', `${(360 / n) * j + (n === 2 ? 270 : 0)}deg`));   // two: left and right
    const mid = el('button', centre.back ? 'ring-close back' : 'ring-close', icon(centre.icon));
    mid.setAttribute('aria-label', centre.label);
    pressFx(mid);
    mid.addEventListener('click', centre.pick);
    node.append(...nodes, mid);
    return node;
  }

  /* --------------------------------------------------------------- menu */
  // The items to show, in config.js order, a folder's items inside it.
  function menuItems(items, depth = 0) {
    const out = [];
    for (const it of items || []) {
      if (!it || !kindOf(it)) { console.warn('config.js: a menu item needs a link, a script, items or favorites:', it); continue; }
      if (isFolder(it) && depth) { console.warn(`config.js: menu folders go one level deep; "${it.name}" is left out`); continue; }
      if ((it.shape && it.shape !== K.shape) || (!playerLoaded && isNowPlaying(it))) continue;
      if (!isFolder(it)) { out.push(it); continue; }
      if (it.settings) { out.push({ ...it, items: [], favorites: [], list: settingsItems }); continue; }
      const inside = menuItems(it.items, depth + 1), kinds = homePlayer() ? favoriteKinds(it) : [];
      if (inside.length || kinds.length) out.push({ ...it, items: inside, favorites: kinds });
    }
    return out;
  }
  // What a folder holds: Settings and its list of themes as they stand, or
  // its favourites and its items.
  const contents = (folder, most) => (folder.list ? folder.list() : folderItems(folder, most));
  // An entry that opens more of Settings (its list of themes), and Back from there.
  const sub = (it, parent) => ({ items: [], favorites: [], ...it.opens, parent });
  // A setting changes as it is picked: the folder stays open, then shows it.
  const change = (it, redraw) => Promise.resolve(it.pick()).then(redraw);

  // What a tap on an item does. A script or a favourite leaves the page as
  // it is, so a toast says what was asked once Home Assistant has taken it.
  function act(it, folder) {
    const done = () => toast((folder ? folder.name + ' · ' : '') + it.name), failed = () => toast('Home Assistant did not answer');
    if (it.script) HA.call('script', 'turn_on', {}, it.script).then(done, failed);
    else if (it.uri) playFavorite(it).then(done, failed);
    else follow(it.link);
  }

  function buildMenu() {
    menuRoot = menuItems(CFG.menu && CFG.menu.items);
    menuEl.innerHTML = '';
    menuEl.hidden = !menuRoot.length;
    if (K.shape === 'round') {
      handle.hidden = !menuRoot.length;
      if (!menuRoot.length) { setMenu(false); return; }
      showRing(null);
    } else {
      closeFolder();
      const panel = el('div', 'menu-panel');
      for (const it of menuRoot) {
        const node = makeItem(it, 'menu-item', () => { if (isFolder(it)) toggleFolder(it, node); else { closeOverlay(); act(it); } });
        panel.appendChild(node);
      }
      menuEl.appendChild(panel);
      setClass(app, 'with-rail', menuRoot.length > 0); // the views keep clear of it
    }
  }
  // The Spot's ring: the menu's items, or a folder's with Back in the middle
  // (and the favourites' switch above). A ring that takes another's place
  // while the menu is open grows in; one redrawn for a setting just changes.
  // Settings' list of themes opens in the room menu's place.
  function showRing(folder, grow = true) {
    const items = folder ? contents(folder, RING.most) : menuRoot;
    const centre = folder ? { icon: 'arrow-left', label: 'Back', back: true, pick: () => showRing(null) } : { icon: 'close', label: 'Close', pick: closeMenu };
    const pick = (it) => () => {
      if (isFolder(it)) { showRing(it); loadFavorites(it.favorites); }
      else if (it.opens) openFolder(sub(it, folder));
      else if (it.stay) change(it, () => { if (ringFolder === folder && menuEl.classList.contains('open')) showRing(folder, false); });
      else { act(it, folder); closeMenu(); }
    };
    const bar = folder && favoritesBar(folder, () => showRing(folder));
    const ring = makeRing(items.map((it) => makeItem(it, 'ring-item', pick(it))), centre, bar && bar.querySelector('.fav-switch') ? RING.underSwitch : RING.reach);
    const swap = grow && menuEl.classList.contains('open');
    if (swap) ring.classList.add('swap');
    menuEl.replaceChildren(...(bar ? [bar] : []), ring);
    if (swap) { void ring.offsetWidth; ring.classList.remove('swap'); }   // laid out once small, then grows
    ringFolder = folder;
  }
  // Kiosk Satellite's media player: playing, paused, or idle with nothing loaded.
  function followPlayer(state) {
    const loaded = !(state && state.mediaPlayer && state.mediaPlayer.state === 'idle');
    if (loaded !== playerLoaded) { playerLoaded = loaded; buildMenu(); }
  }

  function setMenu(open) {
    if (K.shape !== 'round' || (open && menuEl.hidden)) return;
    if (open && ringFolder) showRing(null);   // the menu always opens on its first ring
    setClass(menuEl, 'open', open);
    if (open) dim(closeMenu); else undim(closeMenu);
  }
  function closeMenu() { setMenu(false); }
  // The menu opened on a folder's ring: Back from the list of themes.
  function openRing(folder) {
    showRing(folder, false);
    setClass(menuEl, 'open', true);
    dim(closeMenu);   // closes the list
  }
  handle.addEventListener('click', () => { if (performance.now() - swipedAt > 80) { if (dimmed()) closeOverlay(); else setMenu(true); } });
  menuEl.addEventListener('pointerdown', armIdle);
  handle.innerHTML = icon('chevron-up');
  pressFx(handle);
  // A swipe on the tab opens the menu too, like a tap.
  let swipeFrom = null;
  handle.addEventListener('pointerdown', (e) => { swipeFrom = { x: e.clientX, y: e.clientY }; });
  handle.addEventListener('pointermove', (e) => {
    if (!swipeFrom || Math.hypot(e.clientX - swipeFrom.x, e.clientY - swipeFrom.y) < 12) return;
    swipeFrom = null;
    swipedAt = performance.now();
    setMenu(true);
  });
  for (const ev of ['pointerup', 'pointercancel']) handle.addEventListener(ev, () => { swipeFrom = null; });

  /* ------------------------------------------------------- menu folders */
  // On the Show a folder opens from its rail button, which stays marked: a
  // grid of cards in the room menu's place and look, Back first, then the
  // folder's items (and the favourites' switch at the top). Back, the rail
  // button again, picking an item, or a tap anywhere else closes it.
  // Another folder's button swaps the cards. Settings' list of themes takes
  // the place of Settings' cards, and Back brings them back; on the Spot
  // the list opens from Settings' ring, its cards the rows of the room
  // menu's list, and Back brings the ring back. A card shows how a setting
  // stands under its name, marked while it is on.
  const folderEl = $('folder-menu');
  let folderButton = null, folderShown = null;   // the rail button of the open folder (the Show's), and the folder on screen
  function toggleFolder(folder, button) {
    if (folderButton === button) { closeFolder(); return; }
    if (folderButton) folderButton.classList.remove('active');
    folderButton = button;
    button.classList.add('active');
    openFolder(folder);
    loadFavorites(folder.favorites);
  }
  function openFolder(folder) {
    folderShown = folder;
    folderEl.hidden = false;
    fillFolder();
    requestAnimationFrame(() => setClass(folderEl, 'open', !!folderShown));
    dim(closeFolder);   // closes the Spot's menu, if it is open
  }
  // Its cards; redrawn for a setting, where the list was scrolled to.
  // Opened, a list shows the theme on screen in its middle.
  function fillFolder(redraw = false) {
    const folder = folderShown, items = contents(folder);
    const card = (it, cls, pick) => {
      const node = el('div', 'room-card' + cls + (it.current ? ' current' : '') + (it.on ? ' on' : '') + (it.idle ? ' idle' : ''),
        `<button class="room-go"><span class="room-icon">${icon(it.icon || 'apps')}</span><span class="room-text"><span class="room-name">${esc(it.name)}</span>`
        + (it.state ? `<span class="room-state">${esc(it.state)}</span>` : '') + '</span></button>');
      const go = node.querySelector('.room-go');
      if (it.on != null) go.setAttribute('aria-pressed', String(!!it.on));
      if (it.cover) addCover(go, go.querySelector('.room-icon'), it.cover);
      pressFx(go);
      go.addEventListener('click', pick);
      return node;
    };
    const pick = (it) => () => {
      if (it.opens) { folderShown = sub(it, folder); fillFolder(); }
      else if (it.stay) change(it, () => { if (folderShown === folder) fillFolder(true); });
      else { closeFolder(); act(it, folder); }
    };
    const back = () => {
      if (!folder.parent) closeFolder();
      else if (K.shape === 'round') openRing(folder.parent);
      else { folderShown = folder.parent; fillFolder(); }
    };
    const list = el('div', 'rooms');
    list.style.setProperty('--cols', Math.min(4, items.length + 1));
    list.append(card({ name: 'Back', icon: 'arrow-left' }, ' back', back), ...items.map((it) => card(it, '', pick(it))));
    const bar = favoritesBar(folder, fillFolder);
    const was = folderEl.querySelector('.rooms'), top = redraw && was ? was.scrollTop : 0;
    folderEl.replaceChildren(...(bar ? [bar] : []), list);
    const now = !redraw && list.querySelector('.room-card.current');
    if (now) {
      const l = list.getBoundingClientRect(), c = now.getBoundingClientRect();
      list.scrollTop = c.top - l.top - (l.height - c.height) / 2;
    } else list.scrollTop = top;
  }
  function closeFolder() {
    if (!folderShown) return;
    if (folderButton) folderButton.classList.remove('active');
    folderButton = folderShown = null;
    folderEl.classList.remove('open');
    setTimeout(() => { if (!folderShown) folderEl.hidden = true; }, 250);
    undim(closeFolder);
  }
  folderEl.addEventListener('pointerdown', armIdle);

  // New favourites of a kind from Music Assistant: redraw the folder on
  // screen that shows them, if one does.
  function redrawFavorites(kind) {
    if (ringFolder && ringFolder.favorites.includes(kind) && menuEl.classList.contains('open')) showRing(ringFolder);
    if (folderShown && folderShown.favorites.includes(kind)) fillFolder();
  }
  // The kinds of favourites the menu's folders show, to fetch before one opens.
  const menuFavoriteKinds = () => [...new Set(menuRoot.flatMap((it) => (isFolder(it) ? it.favorites : [])))];

  /* -------------------------------------------------------------- links */
  // Where a menu item (or the events' Open calendar) may lead: another room,
  // a Kiosk Satellite or Android app link, a page on Home Assistant, or a web
  // address. Nothing else.
  function follow(link) {
    link = String(link || '');
    if (link.startsWith('view:')) { showView(link.slice(5)); return; }
    if (/^(ks|app):\/\//.test(link)) {
      // Only a kiosk app understands these links; in a desktop browser just say so.
      const inApp = KS || window.flutter_inappwebview || /\bwv\b|Android/.test(navigator.userAgent) || params.has('ks');
      if (!inApp) { toast('Opens in Kiosk Satellite'); return; }
      location.href = link;
      return;
    }
    if (link.startsWith('/')) { location.href = link; return; }
    if (/^https?:\/\//.test(link)) { location.href = link; return; }
    warn(`config.js: the link "${link}" is not supported`);
  }

  Object.assign(K, { buildMenu, followPlayer, redrawFavorites, menuFavoriteKinds, follow });
})();
