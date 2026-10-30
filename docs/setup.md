# Setup

You need Home Assistant, and an Echo Show or Echo Spot running
[Kiosk Satellite](https://github.com/jxlarrea/kiosk-satellite). Music Assistant is
optional: without it, the menu just has no favourites.

## 1. Install the page

Two ways to the same page:

- **Through HACS**, the *Kiosk dashboard* integration serves the page at
  `/kiosk_dashboard/index.html`, and HACS offers each new release as an update.
- **By hand**, the page sits in `/config/www/kiosk/`, which Home Assistant serves at
  `/local/kiosk/index.html`, and you copy each release yourself.

Either way your own files, `config.js` and your pictures, live in `/config/www/kiosk/`:
you can move from one to the other and keep them.

### Through HACS

1. Add this repository to HACS as a custom repository:
   `https://github.com/sylvertom/kiosk-satellite-dashboard`. In HACS, that is
   **⋮ > Custom repositories**, of type *Integration*; from Home Assistant 2026.11, where
   HACS is built in as the Marketplace, **Settings > Marketplace > Add from link**.
2. Install *Kiosk dashboard for Kiosk Satellite* from it, and restart Home Assistant if it
   asks.
3. In **Settings > Devices & services**, **Add integration** and pick *Kiosk dashboard*.

The page is now at `http://<ha>:8123/kiosk_dashboard/index.html`. The integration adds
nothing else to Home Assistant: no entity, no service.

### By hand

Download `kiosk-satellite-dashboard-<version>.zip` from the latest
[release](https://github.com/sylvertom/kiosk-satellite-dashboard/releases) and unzip it in
`/config/www/`: it holds the `kiosk/` folder, with `index.html`, `css/`, `js/`, `themes/`
and `config.example.js`. (From a copy of the repository, those are the ones to copy to
`/config/www/kiosk/`; `docs/` and `tools/` can stay behind.) If `www/` did not exist yet,
restart Home Assistant once so it starts serving `/local/`.

The integration can be installed by hand too, which is all HACS does: unzip the release's
`kiosk_dashboard.zip` in `/config/custom_components/kiosk_dashboard/`, restart Home
Assistant and add the integration as above.

## 2. Write your `config.js`

Copy `config.example.js` to `/config/www/kiosk/config.js` and make it yours. By hand, the
example is already in that folder; through HACS, it is in
`/config/custom_components/kiosk_dashboard/www/`, and at
`http://<ha>:8123/kiosk_dashboard/config.example.js` in a browser. The example describes
a made-up house with three rooms; everything marked `// <-- entity` is an entity to
replace with one of yours.

- Under `devices`, list your kiosks' names (the name under **Settings > Device** in
  Kiosk Satellite), each with the room it starts on.
- Under `rooms`, describe each room: its sensors, mode chips, main light (a light group),
  light tiles, media card and Music Assistant player.
- Under `menu`, keep the items you want and put in your own scripts.

[Configuration](configuration.md) describes every option. `config.js` is yours: it is not
part of the repository, so an update never overwrites it. Pictures of yours go in
`/config/www/` too, at their `/local/` address (restart Home Assistant once if `www/` is
new).

Check the result on your computer first (through HACS, `/kiosk_dashboard/` in place of
`/local/kiosk/`):

```
http://<ha>:8123/local/kiosk/index.html?device=Echo+Spot+Bedroom
http://<ha>:8123/local/kiosk/index.html?device=Echo+Show+8+Living+Room
http://<ha>:8123/local/kiosk/index.html?room=living&shape=round
http://<ha>:8123/local/kiosk/index.html?room=bedroom&theme=light
```

Outside Kiosk Satellite, menu items that point at `ks://` links only show a note; add
`?ks` to the address to make them navigate anyway.

## 3. Make it the kiosk's start page

Add the page to Kiosk Satellite as a
[custom page](https://kiosksatellite.com/docs/custom-pages/), on the kiosk or in its
remote administration page:

1. Open **Settings > Home Assistant > Custom Pages** and tap **Add page**.
2. Give it a name (*Kiosk*) and the path, `/kiosk_dashboard/index.html` through HACS or
   `/local/kiosk/index.html` by hand, then tap **Save & Validate**.
3. Pick it as the **Default dashboard**: it is listed under *Custom Pages* in every
   dashboard picker, and in the kiosk's ESPHome dashboard selects in Home Assistant.

Every kiosk gets the same page: it finds which kiosk it is on by itself.
Keep **Log in automatically** on (Settings > Home Assistant Configuration); that is what
signs the page in (see [Security](security.md)). *Share Home Assistant connection*, at the
top of Custom Pages, can stay off: the page does not use it.

## 4. After editing the files

Through HACS, the integration hands the kiosks your `config.js` as it is now: **Reload
page** in the kiosk drawer (or its ESPHome button) shows your change.

By hand, Home Assistant tells browsers to cache `/local/` files. After editing `config.js`
(or any other file), bump its `?v=` in `index.html` (`1.0.0` to `1.0.1`, say), then use
**Reload page**. If `index.html` itself looks stale, use **Clear cache** instead.

## Updating

[CHANGELOG.md](../CHANGELOG.md) says what each release changes, and what to add to
`config.js` for something new.

- **Through HACS**, the new release shows as an update: install it, and restart Home
  Assistant when it asks. Your files in `/config/www/kiosk/` stay.
- **By hand**, unzip the release's zip over the old folder: it has no `config.js`, so yours
  stays, and so does a picture of yours in `themes/xp/`.

The new `index.html` comes with new `?v=` versions, so the kiosks fetch the new files;
Settings > Version on a kiosk says which release it runs.

**From by hand to HACS:** install the integration, give Kiosk Satellite's custom page the
path `/kiosk_dashboard/index.html`, then delete what the release's zip put in
`/config/www/kiosk/`: `index.html`, `config.example.js`, `css/`, `js/`, and `themes/` but
for a `themes/xp/bliss.jpg` of yours. Keep your `config.js` and your pictures.
