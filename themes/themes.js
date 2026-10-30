// Kiosk dashboard: the themes. config.js picks one by name (theme.name), a
// kiosk can have its own (devices), Settings in the menu picks another on
// the kiosk itself, and ?theme=<name> in the address tries one. Each theme
// starts from the dark or the light palette of css/base.css (`scheme`) and
// may bring files of its own, from its folder next to this one: a
// stylesheet that changes the palette and the shapes, a script that moves a
// scene behind the rooms (Kiosk.addScene in js/theme.js). A `mono` theme
// has one colour, its accent, for every light as well: the accent of
// config.js and followLight do not apply. `name` and `icon` are how
// Settings lists it (its key, capitalised, and a palette without them).
// docs/themes.md says how to make one. After editing a theme's file, bump
// its ?v= here.
window.KIOSK_THEMES = {
  dark: { scheme: 'dark', icon: 'weather-night' },
  light: { scheme: 'light', icon: 'white-balance-sunny' },
  nord: { scheme: 'dark', icon: 'snowflake', files: ['nord/theme.css?v=1.4.0'] },
  eink: { name: 'E-ink', scheme: 'light', mono: true, icon: 'book-open-page-variant-outline', files: ['eink/theme.css?v=1.4.0'] },
  crt: { name: 'CRT', scheme: 'dark', mono: true, icon: 'monitor', files: ['crt/theme.css?v=1.4.0'] },
  handheld: { scheme: 'light', mono: true, icon: 'gamepad-variant-outline', files: ['handheld/theme.css?v=1.4.0'] },
  xp: { name: 'XP', scheme: 'light', icon: 'image-filter-hdr', files: ['xp/theme.css?v=1.4.0'] },
  aqua: { scheme: 'light', icon: 'water-outline', files: ['aqua/theme.css?v=1.4.0'] },
  steampunk: { scheme: 'dark', icon: 'cogs', files: ['steampunk/theme.css?v=1.4.0'] },
  starship: { scheme: 'dark', icon: 'rocket-launch-outline', files: ['starship/theme.css?v=1.4.0'] },
  matrix: { scheme: 'dark', mono: true, icon: 'pill', files: ['matrix/theme.css?v=1.4.0', 'matrix/rain.js?v=1.4.0'] },
  synthwave: { scheme: 'dark', icon: 'weather-sunset', files: ['synthwave/theme.css?v=1.4.0', 'synthwave/scene.js?v=1.4.0'] },
};
