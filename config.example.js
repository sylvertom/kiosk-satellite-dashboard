// Kiosk dashboard configuration: an example house. Copy this file to
// config.js, next to index.html, and make it yours: replace every entity
// marked  // <-- entity  with one of your own. Plain JavaScript, no build step.
// docs/configuration.md describes every option.
//
// Structure
//   theme     the theme, its accent colour and the background (a picture or a colour)
//   menu      the launcher for the kiosk's own features
//   devices   the room (and theme) of each kiosk, keyed by its Kiosk Satellite device name
//   alerts    values of the house every room shows while they need attention
//   rooms     one view per room
//
// The arrangement follows the screen and is not configurable: on the round
// Echo Spot the menu is a ring of large buttons opened from a tab at the
// bottom, and a tap on the room title shows the rooms as a list; on the wide
// Echo Show the menu is a rail of icons on the right edge, and the room title
// opens a grid of the rooms. Both room menus say how many lights each room
// has on, turn them off, and turn off every light at once.
window.KIOSK_CONFIG = {

  /* ------------------------------------------------------------ theme */
  theme: {
    name: 'dark',          // a theme of themes/themes.js: 'light', 'nord', 'xp', 'steampunk'… (docs/themes.md)
    // accent: '#f2af48',  // any CSS hex colour, over the theme's own
    followLight: true,     // the accent takes the colour of the light the dial controls
                           // (the main light on the Show, the light in the main slot on
                           // the Spot), and the colour above while it is off
    // background: '/local/kiosk/wallpaper.jpg',   // a picture behind every room: a web
                           // address, or a file in Home Assistant's www/ folder. A room
                           // can have its own (see the rooms below). Or a colour the
                           // page draws as a gradient: '#5b3fd1', 'accent' (the light's
                           // with followLight), or 'complement', the accent's opposite
                           // on the colour wheel, so that it stands out
    fade: 0.5,             // 0 to 1: how far the picture or the gradient fades into the
                           // theme's colour, so that text on it stays legible
  },

  /* ------------------------------------------------------------- menu */
  // An item has a name, an icon and one of:
  //   link       a ks:// or app:// link (handled by Kiosk Satellite), a page on
  //              Home Assistant ('/lovelace/0'), or 'view:<room>' to switch room
  //   script     a Home Assistant script to run
  //   items      a folder of more items, one level deep. On the Spot a folder
  //              opens as a ring of its own, Back in the middle; on the Show as
  //              a grid of cards, Back first.
  //   favorites  (a folder, before its items) your Music Assistant favourites:
  //              'radio', 'playlist' or both, then with a switch at the top of
  //              the screen. They play on the player of the room this kiosk
  //              belongs to (the room's `player`, below) and show their covers.
  //              The Spot's ring shows the first ten by name.
  //   settings   true: Settings, a folder for the theme and following the light,
  //              set on the kiosk itself, which keeps them (over the theme
  //              below). Leave it out where the kiosk's look should not change.
  // shape: 'round' keeps an item to the Echo Spot, 'wide' to the Echo Show.
  // A ks://now-playing item shows only while Kiosk Satellite has something to
  // play, favourites only when the kiosk's room has a player, a folder only
  // with something in it.
  menu: {
    items: [
      { name: 'Now playing', icon: 'play-circle-outline', link: 'ks://now-playing' },
      { name: 'Screensaver', icon: 'weather-night', link: 'ks://screensaver' },
      { name: 'Intercom', icon: 'account-voice', link: 'ks://intercom' },
      { name: 'Cameras', icon: 'cctv', link: 'ks://camera' },
      { name: 'Find my phone', icon: 'cellphone-sound', items: [
        { name: 'Alex', icon: 'cellphone', script: 'script.find_alex_phone' }, // <-- entity
        { name: 'Sam', icon: 'cellphone', script: 'script.find_sam_phone' },     // <-- entity
      ] },
      { name: 'Music', icon: 'music', favorites: ['radio', 'playlist'], items: [
        { name: 'Music Assistant', icon: 'music-box-multiple', link: 'ks://music-assistant', shape: 'wide' },
      ] },
      { name: 'Settings', icon: 'cog-outline', settings: true },
    ],
  },

  /* ---------------------------------------------------------- devices */
  // Keys are the device name in Kiosk Satellite (Settings > Device), values the
  // room that kiosk starts on, or { room, theme } for a kiosk with a theme of
  // its own. Matching ignores case, punctuation and a "ks-" prefix.
  devices: {
    'Echo Spot Bedroom': 'bedroom',
    'Echo Show 5 Bedroom': 'bedroom',
    'Echo Spot Living Room': 'living',
    'Echo Show 8 Living Room': 'living',
    'Echo Spot Kitchen': 'living',
    'Echo Spot Office': { room: 'office', theme: 'light' },
  },
  // Room shown when the device is not listed above (and on a desktop browser).
  defaultRoom: 'bedroom',

  /* ----------------------------------------------------------- alerts */
  // Shown first in every room's header, in the warning colour, while they need
  // attention: each is written like a room's sensor (below) and shows while its
  // showWhen holds, or while its own entity is on. On the Spot an alert has the
  // row to itself.
  alerts: [
    { entity: 'binary_sensor.front_door', icon: 'door-open', on: 'Front door open' }, // <-- entity
  ],

  /* ------------------------------------------------------------ rooms */
  // The order here is the order in the room menu.
  // title, icon      header and room menu
  // sensors          small read-only values in the header. showWhen shows one only
  //                  while a state holds: { state: 'on' } (or a list), { not: 'idle' },
  //                  { above: 1000 }, { below: 10 }, of its own entity or another:
  //                  { entity: 'input_boolean.guests', state: 'on' }
  // modes            toggle chips in the header: anything with on/off (the header
  //                  has room for three or four). A mode may instead run scripts:
  //                  { entity: <state>, turnOn: 'script.x', turnOff: 'script.y' }
  // main             the big slider, a light or light group: tap toggles, drag dims.
  //                  On the Spot the rim dims it, and a swipe across it shows the
  //                  room's lights in its place, one after another. The room
  //                  menu counts the lights on as it does ("All lights · 3 on":
  //                  the members of a group that are on; for a group whose
  //                  members Home Assistant does not list, the room's own tiles
  //                  that are on). A tile that is another room's main light
  //                  counts there. The power button turns off what it counts.
  // lights           tiles: tap toggles, long-press (or the dots) opens the detail panel.
  //                  controls: extra entities shown in the panel (select, number, switch),
  //                  e.g. the palette / preset / speed / intensity entities WLED creates.
  //                  A room with one light needs no tiles: `main` alone is enough.
  // media            a player card, shown while showWhen holds (or always)
  // player           the Music Assistant player (or group of players) the menu's
  //                  favourites play on, for the kiosks that belong to this room
  // music            on the Show, a card under the dial for the room's player: while
  //                  it plays, what it plays; the rest of the time, your Music
  //                  Assistant favourites of these kinds, 'radio', 'playlist' or both,
  //                  a tap to play one there
  // events           what the room's Home Assistant calendars hold: how many
  //                  events, a chip among the sensors ("3 today"; chip: false
  //                  leaves it out), and a list a swipe scrolls through, on the
  //                  Spot a line above the main light, on the Show a tile first
  //                  among the lights. A tap on either shows them all, with a
  //                  button to Kiosk Satellite's calendar when `link` is set.
  //                  calendars  calendar entities, or { entity, color } for the
  //                             colour of their dots (with more than one)
  //                  period     'day' (the rest of today), 'week' or 'month'
  //                             (the next 7 or 30 days), 'all' (the next events)
  //                  max        how many the list shows at most (10)
  //                  lines      the lines of the list on each shape: { round: 1,
  //                             wide: 3 } unless said (the Spot has room for one,
  //                             the Show for six); a number for both, 0 for none
  // background, fade the room's own picture or colour behind it, and how far it
  //                  fades (over the theme's)
  rooms: {
    bedroom: {
      title: 'Bedroom',
      icon: 'bed-outline',
      sensors: [
        { entity: 'sensor.bedroom_temperature', icon: 'thermometer', unit: '°', digits: 1 }, // <-- entity
        { entity: 'sensor.bedroom_humidity', icon: 'water-percent', unit: '%', digits: 0 }, // <-- entity
        { entity: 'binary_sensor.bedroom_presence', icon: 'motion-sensor', iconOff: 'motion-sensor-off', on: 'Present', off: 'Away' }, // <-- entity
      ],
      modes: [
        { entity: 'switch.adaptive_lighting_bedroom', name: 'Adaptive', icon: 'theme-light-dark' }, // <-- entity
        { entity: 'switch.adaptive_lighting_sleep_mode_bedroom', name: 'Night', icon: 'moon-waning-crescent' }, // <-- entity
        { entity: 'input_boolean.bedroom_presence_lighting', name: 'Presence', icon: 'account-outline' }, // <-- entity
      ],
      main: { entity: 'light.bedroom_lights', name: 'All lights', icon: 'lightbulb-group' }, // <-- entity (light group)
      lights: [
        { entity: 'light.bedroom_ceiling', name: 'Ceiling', icon: 'ceiling-light' }, // <-- entity
        { entity: 'light.bedroom_strips', name: 'Ambiance', icon: 'led-strip-variant' }, // <-- entity
        { entity: 'light.bedroom_nightstand_1', name: 'Bedside left', icon: 'lamp' }, // <-- entity
        { entity: 'light.bedroom_nightstand_2', name: 'Bedside right', icon: 'lamp-outline' }, // <-- entity
      ],
      player: 'media_player.bedroom_speakers', // <-- entity (Music Assistant group)
      events: {
        calendars: ['calendar.family', { entity: 'calendar.work', color: '#5aa9e6' }], // <-- entities
        period: 'day',
        link: 'ks://calendar/day',
      },
      background: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1280&q=75&auto=format&fit=crop', // <-- your picture
    },

    living: {
      title: 'Living room',
      icon: 'sofa-outline',
      sensors: [
        { entity: 'sensor.living_room_temperature', icon: 'thermometer', unit: '°', digits: 1 }, // <-- entity
        { entity: 'sensor.living_room_humidity', icon: 'water-percent', unit: '%', digits: 0 }, // <-- entity
        { entity: 'binary_sensor.living_room_presence', icon: 'motion-sensor', iconOff: 'motion-sensor-off', on: 'Present', off: 'Away' }, // <-- entity
        { entity: 'sensor.living_room_co2', icon: 'molecule-co2', unit: ' ppm', showWhen: { above: 1000 } }, // <-- entity
      ],
      modes: [
        { entity: 'input_boolean.projector', name: 'Projector', icon: 'projector', // <-- entity (reflects the projector state)
          turnOn: 'script.projector_on', turnOff: 'script.projector_off' },     // <-- entities
        { entity: 'switch.adaptive_lighting_living_room', name: 'Adaptive', icon: 'theme-light-dark' }, // <-- entity
        { entity: 'input_boolean.living_room_presence_lighting', name: 'Presence', icon: 'account-outline' }, // <-- entity
      ],
      main: { entity: 'light.downstairs', name: 'All lights', icon: 'lightbulb-group' }, // <-- entity (light group)
      lights: [
        { entity: 'light.living_room', name: 'Living room', icon: 'sofa-outline' }, // <-- entity
        { entity: 'light.dining_room', name: 'Dining room', icon: 'silverware-fork-knife' }, // <-- entity
        { entity: 'light.kitchen', name: 'Kitchen', icon: 'countertop' }, // <-- entity
        { entity: 'light.tv_strip', name: 'TV strip', icon: 'led-strip-variant', // <-- entity (WLED)
          controls: ['select.tv_strip_color_palette', 'select.tv_strip_preset', 'number.tv_strip_speed', 'number.tv_strip_intensity'] }, // <-- entities
        { entity: 'light.shelf_strip', name: 'Shelf strip', icon: 'string-lights', // <-- entity (WLED)
          controls: ['select.shelf_strip_color_palette', 'select.shelf_strip_preset', 'number.shelf_strip_speed', 'number.shelf_strip_intensity'] }, // <-- entities
      ],
      media: {
        entity: 'media_player.apple_tv', // <-- entity
        name: 'Apple TV',
        icon: 'apple',
        showWhen: { entity: 'input_boolean.projector', state: 'on' }, // <-- entity
      },
      player: 'media_player.living_room_speakers', // <-- entity (Music Assistant group)
      music: ['radio', 'playlist'],
      background: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1280&q=75&auto=format&fit=crop', // <-- your picture
      fade: 0.6,
    },

    office: {
      title: 'Office',
      icon: 'desk',
      sensors: [
        { entity: 'sensor.office_temperature', icon: 'thermometer', unit: '°', digits: 1 }, // <-- entity
        { entity: 'sensor.office_humidity', icon: 'water-percent', unit: '%', digits: 0 }, // <-- entity
        { entity: 'binary_sensor.office_presence', icon: 'motion-sensor', iconOff: 'motion-sensor-off', on: 'Present', off: 'Away' }, // <-- entity
      ],
      modes: [
        { entity: 'switch.adaptive_lighting_office', name: 'Adaptive', icon: 'theme-light-dark' }, // <-- entity
        { entity: 'input_boolean.office_presence_lighting', name: 'Presence', icon: 'account-outline' }, // <-- entity
      ],
      main: { entity: 'light.office_lights', name: 'Ceiling', icon: 'ceiling-light' }, // <-- entity
      player: 'media_player.office_speakers', // <-- entity (Music Assistant group)
    },
  },
};
