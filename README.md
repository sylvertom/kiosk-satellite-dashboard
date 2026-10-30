# Kiosk dashboard for Kiosk Satellite

[![Checks](https://github.com/sylvertom/kiosk-satellite-dashboard/actions/workflows/checks.yml/badge.svg)](https://github.com/sylvertom/kiosk-satellite-dashboard/actions/workflows/checks.yml)
[![Downloads](https://img.shields.io/github/downloads/sylvertom/kiosk-satellite-dashboard/total)](https://github.com/sylvertom/kiosk-satellite-dashboard/releases)
[![HACS](https://img.shields.io/badge/HACS-custom%20repository-41BDF5)](docs/setup.md#through-hacs)

A fast, touch-first Home Assistant dashboard for Echo devices running
[Kiosk Satellite](https://github.com/jxlarrea/kiosk-satellite). One view per room with
its sensors, mode chips, a brightness dial, light tiles that are sliders themselves, a
detail panel for colour and effects, a media card, a music card, the events of its
calendars, a room menu behind the room title, and a menu for the kiosk's own features
with your Music Assistant favourites. It is plain HTML, CSS and JavaScript with no build step and no
dependencies, so it loads in a blink where the Home Assistant frontend takes seconds.

![The dashboard on an Echo Spot, an Echo Show 5 and an Echo Show 8](docs/images/demo.gif)

| Echo Spot (480×480, round) | Echo Show 5 (960×480) | Echo Show 8 (1280×800) |
| --- | --- | --- |
| ![Spot](docs/images/spot-bedroom.png) | ![Show 5](docs/images/show5-bedroom.png) | ![Show 8](docs/images/show8-living.png) |
| ![Spot favourites](docs/images/spot-menu-music.png) | ![Show 5 rooms](docs/images/show5-rooms.png) | ![Show 8 detail panel](docs/images/show8-popover-more.png) |

| Synthwave | Starship | Aqua | CRT |
| --- | --- | --- | --- |
| <img src="docs/images/themes/synthwave-spot.webp" width="180" alt="Synthwave on an Echo Spot"> | <img src="docs/images/themes/starship-spot.webp" width="180" alt="Starship on an Echo Spot"> | <img src="docs/images/themes/aqua-spot.webp" width="180" alt="Aqua on an Echo Spot"> | <img src="docs/images/themes/crt-spot.webp" width="180" alt="CRT on an Echo Spot"> |

Twelve themes, from e-ink to an early 2000s desktop: the [theme gallery](docs/theme-gallery.md)
shows them all.

*(Demo and screenshots from the mock Home Assistant in `tools/`, with the example configuration.)*

## Highlights

- **One page for every kiosk.** The room comes from the kiosk's name in Kiosk Satellite,
  the layout from the screen: the round Echo Spot gets its own, with the dial along the
  rim of the screen.
- **Made for fingers.** Drag to dim, tap to toggle, long-press for colour, white,
  effects and WLED palettes; swipe through a room's lights on the Spot.
- **Rooms at a glance.** The room menu says how many lights each room has on and turns
  them off, one room or the whole house. A room can show what its calendars hold today.
- **The kiosk's own features.** Kiosk Satellite's screensaver, intercom, cameras and
  more, Home Assistant scripts, and Music Assistant favourites with their covers, played
  on the room's speakers.
- **Light and honest.** Subscribes to just the entities on screen and shows what Home
  Assistant reports; [themes](docs/theme-gallery.md) to choose from (and to add), in
  `config.js` or from Settings on the kiosk itself, an accent colour that can follow
  the room's light, and a picture or a gradient behind each room if you like.

## Quick start

1. Install it, through HACS or by hand:
   - **HACS**: add this repository as a custom repository, of type *Integration* (from
     Home Assistant 2026.11, **Settings > Marketplace > Add from link**), install *Kiosk
     dashboard for Kiosk Satellite*, then add the *Kiosk dashboard* integration. The page
     is at `/kiosk_dashboard/index.html`.
   - **By hand**: unzip the latest
     [release](https://github.com/sylvertom/kiosk-satellite-dashboard/releases)'s
     `kiosk-satellite-dashboard-<version>.zip` in `/config/www/`: it holds the `kiosk/`
     folder. The page is at `/local/kiosk/index.html`.
2. Copy `config.example.js` to `/config/www/kiosk/config.js` and replace every entity
   marked `// <-- entity` with yours, and each picture marked `// <-- your picture` (or
   drop it).
3. Check it in a browser: `http://<ha>:8123/kiosk_dashboard/index.html?device=Echo+Spot+Bedroom`
   (by hand, `/local/kiosk/index.html`).
4. Add the page to Kiosk Satellite as a custom page and pick it as the kiosk's default
   dashboard.

The [setup guide](docs/setup.md) goes through each step.

## Documentation

- [Setup](docs/setup.md): installing through HACS or by hand, making it the start page,
  updating.
- [Configuration](docs/configuration.md): rooms, devices, menu, favourites, icons.
- [Theme gallery](docs/theme-gallery.md): every theme on the Show and on the Spot.
- [Themes](docs/themes.md): how a theme is made, and how to add one.
- [Features](docs/features.md): what each screen does.
- [Security](docs/security.md): why the page can sit in `www/`, and how it signs in.
- [Development](docs/development.md): how the code is organised, the mock Home Assistant,
  the check suite and releases.
- [Changelog](CHANGELOG.md): what each release changes.

Found a bug or have an idea? [Open an issue](https://github.com/sylvertom/kiosk-satellite-dashboard/issues/new/choose).

## License

[MIT](LICENSE). The icons are [Material Design Icons](https://pictogrammers.com/library/mdi/)
by Pictogrammers, under the Apache License 2.0.
