# Changelog

What changes from one release to the next, for the person at the kiosk and the one
writing `config.js`. Each release on
[GitHub](https://github.com/sylvertom/kiosk-satellite-dashboard/releases) comes with a
zip of the files to copy to Home Assistant ([Updating](docs/setup.md#updating)).

## Unreleased

### Changed

- **The Echo Show makes more of its screen**: a smaller dial, and the light tiles as
  rows, each light's icon beside its name and its slider, in as many columns as fit, in
  the middle of the height beside the dial. An Echo Show 8 shows three lights in full
  under the room's events, an Echo Show 5 four, with nothing to scroll; more lights than
  rows have room for are cards in two columns. The events' tile is as tall as its events:
  one event is one line, its title in full.

## 1.3.0 - 2026-10-26

### Added

- **Gradient backgrounds**: `background`, the theme's or a room's, can be a colour the
  page draws as a gradient instead of a picture, with nothing to load: a colour of yours
  (`'#5b3fd1'`), `'accent'`, or `'complement'`, the accent's opposite on the colour
  wheel, so that it stands out (the dark theme's amber on blue). With `followLight` the
  last two change with the room's light ([Theme](docs/configuration.md#theme)).

## 1.2.0 - 2026-10-23

### Added

- **Events**: a room's `events` shows what its Home Assistant calendars hold, for the rest
  of today, the next 7 or 30 days, or the next ones: how many among the sensors, and a
  list that a swipe scrolls through, a line above the main light on the Spot, a tile
  first among the lights on the Show. A tap shows them all, with a button to Kiosk
  Satellite's calendar. To have it, add `events: { calendars: ['calendar.x'] }` to a room
  in your `config.js` ([Events](docs/configuration.md#events),
  [#1](https://github.com/sylvertom/kiosk-satellite-dashboard/issues/1)).

## 1.1.0 - 2026-10-21

### Added

- **Settings** in the kiosk's menu: pick the theme (it switches at once), turn Follow the
  light on or off, and see which version the kiosk runs. The kiosk keeps the choice. To
  have it, add `{ name: 'Settings', icon: 'cog-outline', settings: true }` to `menu` in
  your `config.js` ([Settings](docs/configuration.md#settings)).
- **Alerts**: `alerts` lists values of the house that every room shows first in its
  header, in the warning colour, while they need attention, such as the front door left
  open. On the Spot an alert has the row to itself
  ([Alerts](docs/configuration.md#alerts),
  [#3](https://github.com/sylvertom/kiosk-satellite-dashboard/issues/3)).
- **showWhen on sensors**: a sensor can show only while a state holds, such as the CO2
  level above 1000 ppm: one state or a list, any but some, above or below a number, of
  its own entity or another's. The media card's `showWhen` takes the same forms
  ([Shown when](docs/configuration.md#shown-when)).
- Each release comes with a zip of the files to copy to Home Assistant.

### Changed

- Setup: the page goes into Kiosk Satellite as a custom page, picked like any dashboard,
  instead of through its remote API
  ([Setup](docs/setup.md#3-make-it-the-kiosks-start-page),
  [#2](https://github.com/sylvertom/kiosk-satellite-dashboard/issues/2)).
- Echo Show: the menu on the right sits in the height under the clock, which a long menu
  reached on the Show 5.

## 1.0.0 - 2026-10-20

The first public release.
