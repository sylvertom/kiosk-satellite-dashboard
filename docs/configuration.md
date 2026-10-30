# Configuration

Everything you set up lives in `config.js`, a copy of
[`config.example.js`](../config.example.js) in `/config/www/kiosk/`, next to `index.html`
when you installed the page by hand ([Setup](setup.md)). It is plain
JavaScript: one object, `window.KIOSK_CONFIG`. The example documents every option next to
its use; this page is the reference.

```js
theme:       { name: 'dark', accent?: '#f2af48', followLight?: true, background?: '<picture>' | '#colour' | 'accent' | 'complement', fade?: 0.5 }
menu:        { items: [{ name, icon, shape?: 'round' | 'wide', link | script | items | settings, favorites? }] }
devices:     { '<Kiosk Satellite device name>': '<room key>' | { room: '<room key>', theme?: '<theme>' } }
defaultRoom: '<room key>'
alerts:      [{ entity, icon, on?, unit?, digits?, showWhen? }]
rooms:       { <key>: { title, icon, sensors, modes, main, lights, media, player, music?, events?, background?, fade? } }
```

The arrangement is not configurable: it follows the screen. A square screen (the round
Echo Spot) gets the round layout, anything else the wide one.

## Theme

`name` is one of the themes in [`themes/themes.js`](../themes/themes.js), `'dark'` when
not set; the [theme gallery](theme-gallery.md) shows them all, and [Themes](themes.md)
says how to make one. Each is dark or
light and has its own accent colour; `accent`, any CSS hex colour, replaces it, except in
a theme of one colour (`eink`, `crt`, `handheld`, `matrix`), which keeps its own and does not
follow the light. A kiosk can have a theme of its own (see [Devices](#devices)), and
[Settings](#settings) in the menu lets someone at the kiosk pick another theme and turn
`followLight` on or off there.

- **`followLight: true`** gives the accent the colour of the light the dial controls: the
  room's `main` light on the Show, and on the Spot the light in the main slot, whichever
  a swipe has brought there. A white light gives the tint of its temperature (warm
  amber, a paler gold, grey for daylight). While that light is off, or has no colour,
  the accent is `accent`, or the theme's. The colour is adjusted to stay legible: a deep
  blue is lightened on a dark theme, a pale yellow darkened on a light one.
- **`background`** is a picture behind every room: a web address
  (`'https://images.unsplash.com/photo-…?w=1280&q=75'`) or a file of yours in Home
  Assistant's `www/` folder (`'/local/kiosk/wallpaper.jpg'`). A room's own `background`
  replaces it for that room. The pictures load from the start; one that does not load
  leaves the usual background. Around 1280 pixels wide is plenty for an Echo Show 8.

  It can instead be a colour, which the page draws as a gradient, from that colour in
  the top corner to a deeper neighbour of it in the far one (amber runs to red, blue to
  indigo). Nothing is loaded:
  - a colour of yours, any CSS hex colour (`'#5b3fd1'`), for instance one for each room;
  - `'accent'`, the accent: with `followLight`, the colour of the room's light, changing
    with it;
  - `'complement'`, the accent's opposite on the colour wheel, so that the accent stands
    out from it: the dark theme's amber on a blue running to indigo, a pink light's
    accent on a green. It follows the light the same way.

  A theme of one colour keeps its plain background instead.
- **`fade`**, from 0 to 1 (0.5 when not set), covers the picture or the gradient with
  the theme's own colour, dark or light, so that the text on it stays legible: the
  busier or brighter the picture, the higher. A room can have its own. On a picture or
  a gradient, the tiles and chips are more solid and the text stands out with a soft
  shadow.

## Devices

Keys are the kiosks' names in Kiosk Satellite (**Settings > Device**), values the room
each one starts on. Matching ignores case, punctuation and a `ks-` prefix: `Echo Spot
Bedroom` and `ks-echo-spot-bedroom` both match. `defaultRoom` is the room shown when the
device is not listed (and in a desktop browser).

A kiosk can also have a theme of its own, over `theme.name`: give it `{ room, theme }`
in place of the room alone.

```js
'Echo Spot Office': { room: 'office', theme: 'light' },
```

The room a kiosk starts on is also the room it *belongs to*: Music Assistant favourites
play on that room's `player`, whichever room is on screen.

## Rooms

The order of `rooms` is the order in the room menu. Each room has:

| Key | What it is |
| --- | --- |
| `title`, `icon` | Shown in the header and in the room menu |
| `sensors` | Small read-only values in the header. One without a value is left out, and one with a `showWhen` is shown only while it holds |
| `modes` | Toggle chips in the header: anything with on/off. The header has room for three or four |
| `main` | The room's main light, usually a light group: the dial on the Show, the power button and rim on the Spot. The room menu counts the lights of its group that are on, and its power button turns those off (see *Groups* below) |
| `lights` | Light tiles: tap toggles, long-press (or the dots) opens the detail panel. A room with one light needs no tiles: `main` alone is enough |
| `media` | A media player card, shown while `showWhen` matches (or always) |
| `player` | The Music Assistant player (or group of players) the menu's favourites play on, for the kiosks that belong to this room |
| `music` | On the Show, a card under the dial for the room's `player`: what it plays, or your favourites to play there (see [The music card](#the-music-card)) |
| `events` | What the room's Home Assistant calendars hold: how many among the sensors, and a list (see [Events](#events)) |
| `background`, `fade` | The room's own picture or colour behind it, and how far it fades, over the theme's (see [Theme](#theme)) |

The entries:

```js
sensors: { entity, icon, unit, digits, showWhen? }
         { entity, icon, iconOff, on: 'Present', off: 'Away' }     // a binary sensor
modes:   { entity, name, icon }
         { entity, name, icon, turnOn: 'script.a', turnOff: 'script.b' }
main, lights: { entity, name, icon, controls?: ['select.x', 'number.y'] }
media:   { entity, name, icon, showWhen?: { entity, state } }
player:  'media_player.x'
music:   ['radio', 'playlist']
events:  { calendars: ['calendar.x' | { entity, color }], period?, max?, chip?, lines?, link? }
```

- **Scripted modes.** A mode with `turnOn` and `turnOff` runs those scripts instead of
  toggling its entity, which then only shows the state. The example's projector works
  this way, and its media card's `showWhen` points at the same entity.
- **WLED.** List the strip's `select.*` and `number.*` entities under `controls` to get
  them in the detail panel's *More* tab (palette, preset, speed, intensity). The light's
  own effects come from Home Assistant on their own.
- **Groups.** When `main` is a light group, the page finds its members by itself, to say
  how many are on; they need not be listed. The room menu counts those members, and a
  room's power button turns them off, leaving on a tile outside the group. Some groups do
  not list their members (a Zigbee2MQTT group, a template light): `main` then stands for
  the room's own tiles, the room menu counts those that are on (one while `main` alone
  is on), and the power button turns off `main` and those tiles.
- **Other rooms' lights.** A tile can be another room's `main` light, such as the
  kitchen's lights shown in the living room: it counts in its own room only, and only
  that room's power button turns it off.

### Shown when

`showWhen` on a sensor (or an alert, or the media card) shows it only while a state
holds, of its own entity or of another one named with `entity`:

```js
showWhen: { state: 'on' }                  // 'on' when not given; or a list: ['open', 'opening']
showWhen: { not: ['idle', 'off'] }         // any state but these
showWhen: { above: 1000 }                  // a number above, below, or both
showWhen: { entity: 'input_boolean.guests', state: 'on' }   // another entity's state
```

The example's living room shows its CO2 level only above 1000 ppm.

### Alerts

`alerts`, at the top level, lists values of the house that every room shows while they
need attention, such as the front door left open. Each is written like a sensor and shows
while its `showWhen` holds, or while its own entity is `on` when it has none. Alerts come
first in the header, in the theme's warning colour; on the Spot an alert has the row to
itself while it shows.

```js
alerts: [
  { entity: 'binary_sensor.front_door', icon: 'door-open', on: 'Front door open' },
  { entity: 'sensor.freezer_temperature', icon: 'snowflake', unit: '°', showWhen: { above: -12 } },
],
```

### Events

`events` shows what the room's Home Assistant calendars hold, such as the day's
appointments on a bedside kiosk:

```js
events: {
  calendars: ['calendar.family', { entity: 'calendar.work', color: '#5aa9e6' }],
  period: 'day',                  // 'day', 'week', 'month' or 'all'
  max: 10,                        // how many the list shows, at most
  chip: true,                     // how many, among the sensors
  lines: { round: 1, wide: 3 },   // the list's lines on the Spot and on the Show; 0: no list
  link: 'ks://calendar/day',      // Open calendar, in the panel
},
```

Only `calendars` is needed; the rest is shown with its default.

- **The period.** `'day'` is the rest of today: the events on now and those before
  midnight. `'week'` and `'month'` are today and the 6 or 29 days after it, `'all'` the
  next `max` events, up to a year ahead.
- **How many.** A chip after the room's sensors: *4 today* on the Show (*this week*, *this
  month*, *upcoming*), the number alone on the Spot. It hides while there are none, and
  while an alert has the Spot's row. `chip: false` leaves it out.
- **The list.** On the Spot a line just above the main light, on the Show a wide tile
  first among the lights. It shows `lines` events (one at most on the Spot, six on the
  Show; one number sets both), fewer while there are fewer, and a swipe up or down moves
  through the others, `max` in all; a mark in its corner says which are in view (*2/4*).
  Each event has its time (*Now* while it is on, *All day*, its day of the week this
  week, its date further on) and its title, and when the room has more than one
  calendar, a dot in its calendar's colour: `color`, any CSS colour, or one the page
  picks. Three lines leave room for four lights on an Echo Show 5, three on an Echo Show
  8; with more, the lights scroll.
- **The panel.** A tap on the chip or on the list shows every event of the period, under
  the day it is on when the period is longer than a day, with its hours and where. With a
  `link`, an *Open calendar* button under them follows it: `ks://calendar` opens Kiosk
  Satellite's calendar, `ks://calendar/day` (`week`, `month`, `schedule`) on that view.
  It takes any link a menu item takes, such as Home Assistant's own `/calendar`. A menu
  item with the same link reaches the calendar from every room.
- **Kept up to date.** The page asks Home Assistant (its `calendar.get_events` action) once
  connected, whenever one of the calendars changes (an event starts or ends, or another
  one comes next), every ten minutes and after midnight. While Home Assistant does not
  answer, the events it gave last stay.

## Menu

The menu is the launcher for the kiosk's own features: a rail of icons on the Show, a
ring of buttons on the Spot. Each item has a `name`, an `icon` and one of:

| Item | Does |
| --- | --- |
| `link: 'ks://now-playing'`, `ks://music-assistant`, `ks://screensaver`, `ks://camera`, `ks://apps`, `ks://intercom`, `ks://alarms` | A Kiosk Satellite feature ([list](https://kiosksatellite.com/docs/dashboard-links/)) |
| `link: 'app://<package>'` | Another Android app |
| `link: '/lovelace/0'` | A page on Home Assistant (the kiosk's own *Dashboard* menu entry brings you back) |
| `link: 'view:living'` | Another room on this page |
| `link: 'https://...'` | Any other web page |
| `script: 'script.find_my_phone'` | Runs the Home Assistant script, and says so in a toast |
| `items: [...]` | A folder of items, one level deep. On the Spot it opens as a ring of its own, *Back* in the middle; on the Show as a grid of cards, *Back* first |
| `favorites: ['radio', 'playlist']` | (on a folder) Your Music Assistant favourites, before the folder's own items |
| `settings: true` | Settings: the theme and following the light, set on the kiosk itself (see [Settings](#settings)) |

- `shape: 'round'` keeps an item to the Echo Spot, `shape: 'wide'` to the Echo Show.
- A `ks://now-playing` item shows only while Kiosk Satellite has something to play.
- The Spot's ring holds ten buttons at most.

### Music Assistant favourites

A folder with `favorites` lists your favourite radios and playlists in Music Assistant
(the heart on a station or a playlist), with their covers and, with both kinds, a switch
between them. They play on the room's `player`: the `media_player` entity Music Assistant
creates for the group of speakers in that room (the kiosk itself is one of them once its
Sendspin player is on). The page finds your Music Assistant instance from that player.

- A room without a `player` gets no favourites.
- A `player` that Music Assistant does not provide makes the folder say *Music Assistant
  did not answer*.
- A cover that does not load, for example an `http://` image on an `https://` dashboard,
  leaves the icon in its place.

### The music card

A room's `music` puts a card under the dial on the Show, for the room's `player`:

```js
player: 'media_player.kitchen_speakers',
music: ['radio', 'playlist'],     // or one of them
```

- **While the player plays nothing**, your Music Assistant favourites of those kinds, as in
  the menu: their covers and names in a strip a swipe scrolls through, the switch between
  radios and playlists above it with both. A tap plays one on the room's `player`, the
  room on screen (the menu's play on the kiosk's own room's).
- **While it plays**, what it plays: the cover, the title, pause, next and the volume.
  Pausing it brings the favourites back.
- The dial makes room for it. While the room's `media` card shows, the music card steps
  aside.
- It needs the room's `player`; without one there is no card. The Spot has none: its
  menu's favourites do the same.

### Settings

`{ name: 'Settings', icon: 'cog-outline', settings: true }` adds a folder of what can be
changed on the kiosk itself, without editing `config.js`:

- **Theme** opens the list of every theme in `themes/themes.js`, a list like the room
  menu's: the theme on screen is marked, and the one `config.js` gives this kiosk says
  *Default*. A tap switches the page to that theme at once and leaves the list open, to
  try another. *Back* returns to Settings.
- **Follow the light** turns `followLight` on or off. A mono theme keeps its own colour,
  so the entry is faded with one.
- **Version** says which release of the dashboard the kiosk runs (on the Spot, with a
  tap), the one to give in a bug report.

The kiosk keeps what is set, in its browser's storage, over `theme.name`, its own theme
in `devices` and `followLight`. A setting that matches `config.js` is not kept: picking
the *Default* theme hands the theme back to `config.js`. `?theme=` in the address still
wins. Settings goes in the menu itself, not in a folder; leave it out where the
kiosk's look should not change.

## Icons

Icon names are [Material Design Icons](https://pictogrammers.com/library/mdi/) names
without the `mdi:` prefix. The page carries only the icons it uses, in `js/icons.js`. To
add one, run `python3 tools/fetch_icons.py sofa-outline ceiling-fan` (it extends the
file) and bump `js/icons.js?v=` in `index.html`. An unknown name shows a light bulb.

## Address parameters

These override the configuration, mostly to try the page in a desktop browser:

| Parameter | Sets |
| --- | --- |
| `device` | Which kiosk to act as, by its Kiosk Satellite name |
| `room` | The room to start on |
| `shape` | `round` or `wide`, whatever the screen |
| `theme` | A theme's name, over the one picked in Settings, the kiosk's own and `theme.name` |
| `ks` | Lets `ks://` and `app://` links navigate outside Kiosk Satellite |
