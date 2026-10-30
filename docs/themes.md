# Themes

A theme is a name in [`themes/themes.js`](../themes/themes.js) and, for most, a folder
next to it. `config.js` picks one with `theme.name`, a kiosk can have its own (see
[Devices](configuration.md#devices)), [Settings](configuration.md#settings) in the menu
picks another on the kiosk itself, and `?theme=<name>` in the address tries one without
changing anything. The [theme gallery](theme-gallery.md) shows each of them on
the Show and on the Spot.

**XP's wallpaper** is `themes/xp/bliss.jpg`, a picture you put there yourself (through
HACS, in `/config/www/kiosk/themes/xp/`, where updates leave it): it is not part of the
repository (`.gitignore` leaves it out). Without it, XP draws a blue sky
over a green hill.

A **mono** theme has one colour, its accent: it stands for every light's colour too, and
`accent` and `followLight` in `config.js` do not apply to it. The colour and temperature
pickers of the detail panel keep their colours.

## Making one

1. Make a folder in `themes/`, named after the theme: lowercase letters, digits and
   dashes (`themes/sunset/`).
2. Write its `theme.css`. Every rule starts with `html[data-theme="sunset"]`, so that it
   applies only to this theme and wins over the page's own rules:

   ```css
   html[data-theme="sunset"] {
     --accent-rgb: 255, 120, 80;
     --on-accent: #2a0d05;
     --bg: #1f1420;
     --bg-2: #2b1622;
     --r: 0.6rem;
   }
   html[data-theme="sunset"] .chip.on { background-image: linear-gradient(#ff9a70, #ff6a4a); }
   ```

3. Add it to `themes/themes.js`, with its scheme and its files (and `mono: true` for a
   theme of one colour). `icon` and `name` are how Settings lists it: an icon the page
   has (see [Icons](configuration.md#icons)), a palette when not set, and its key
   capitalised when it has no `name`:

   ```js
   sunset: { scheme: 'dark', icon: 'palette', files: ['sunset/theme.css?v=0.1.0'] },
   ```

4. Try it: `index.html?theme=sunset`. Then pick it in `config.js`.
5. Sharing it? Add it to the [gallery](theme-gallery.md): with the mock running,
   `node tools/shoot.mjs --docs` takes its pictures along with the other documentation
   pictures (`docs/images/themes/sunset-show.webp` and `sunset-spot.webp`).

After editing a theme's file, bump its `?v=` in `themes/themes.js`: Home Assistant
caches what it serves from `/local/`.

## The scheme

A theme starts from the dark or the light palette of
[`css/base.css`](../css/base.css), its `scheme`, and changes what it needs. The scheme
also tells the page how to keep a light's colour legible as the accent (lighter on a
dark theme, darker on a light one), and how the background pictures fade.

## What a theme can change

The **tokens**, the custom properties at the top of `css/base.css`. A theme sets them
on `html[data-theme="<name>"]`; colours must be plain colours (a gradient goes in a rule
of its own, below).

| Token | What it colours or shapes |
| --- | --- |
| `--accent-rgb` | The accent, as three numbers (`242, 175, 72`): what is on, the dial, the selection |
| `--on-accent` | Text and icons on the accent |
| `--bg`, `--bg-2` | The background, a gradient from one to the other |
| `--surface`, `--surface-2` | Tiles, chips and sliders; buttons and tracks on them. See-through |
| `--surface-solid` | Menus, the detail panel, the menu's tab. Solid |
| `--border` | Their edges |
| `--text`, `--muted` | Text, and quieter text and icons |
| `--danger` | The status pill when Home Assistant is lost |
| `--shadow` | The shadow of what floats: menus, the detail panel |
| `--veil-rgb` | The colour a background picture or gradient fades into, as three numbers |
| `--lift` | The shadow that lifts text off a background picture or gradient |
| `--knob` | The dial's knob and a slider's thumb |
| `--on-tile` | An icon on a button in its light's colour (the Spot) |
| `--scrim`, `--pop-scrim`, `--pop-dim` | Behind the menus; behind the Spot's detail panel, whose text sits on it; behind the Show's, a card |
| `--r` | Corners of the cards: tiles, the media card, the room cards |
| `--r-panel` | Corners of the detail panel |
| `--r-pill` | Corners of chips, sliders, tabs, the rows of the Spot's room list, the menu's tab (`999px`: round ends) |
| `--r-round` | Corners of round buttons and icons (`50%`: circles) |
| `--r-inner` | Corners of covers and of the title's button |
| `--border-w` | The width of the edges |
| `--font`, `--font-title` | The text; the room's title and the clock |

**Rules** of its own, each starting with `html[data-theme="<name>"]`, for what tokens
cannot say: a gradient on a button, a texture, a border style, letters in capitals. The
classes are those of `css/`; the browser's inspector shows which one an element has.
Keep animations to `transform` and `opacity`: the Echo's graphics are modest. Keep every
element within about the size of the screen too: an element tilted in 3D, or much larger
than the screen, takes more graphics memory than an Echo has, and other parts of the page
then go missing, at random. A clock in a typeface whose digits are not all as wide needs
a `min-width` (in `em`) as wide as its widest time, or the header moves every minute. A
value the theme uses in several rules goes in a custom property named after it (`--xp-bar`,
`--brass`). To give one part of the page other colours, set the tokens on it, and its
`color` as well, as text otherwise keeps the colour it takes from `body`: XP writes
white on its hill this way, black in its windows. A rule for what is on (`.chip.on`,
`.room-card.current`, a ring button `.pressed`) also covers a setting that is on, in
Settings: `.room-card.on`, `.ring-item.on`.

**The dial's knob** is a path drawn around its centre, a circle of radius 1, the x axis
pointing out of the arc; the page scales it up (3.2 on the Show's dial, 1.35 on the
Spot's rim). A theme gives it another shape with the `d` property:

```css
html[data-theme="crt"] .dial-knob .knob { d: path("M -0.8 -1.2 H 0.8 V 1.2 H -0.8 Z"); }   /* a cursor's block */
html[data-theme="crt"] .dial.rim .dial-knob .knob { transform: scale(1.7); }            /* larger on the rim */
```

Two more layers of the dial stay hidden until a theme shows them with `display: block`:
`.dial-groove` under the track, wider than it, for an edge; and `.dial-shine` along the
level, narrower than the fill, for a gloss. XP and Aqua draw their troughs and tubes of
gel with them.

A theme's files are the only ones the page loads for it. They come from its folder,
never from elsewhere: a font or a picture goes in the folder too, under a licence that
lets you share it (with the licence next to it, as `OFL.txt` for the fonts here), and the
page asks for nothing outside Home Assistant.

**Fonts.** Declare one in the theme's stylesheet with a name of its own, and use it
through `--font` or `--font-title`:

```css
@font-face { font-family: "Kiosk VT323"; src: url("vt323.woff2") format("woff2"); font-display: block; size-adjust: 118%; }
html[data-theme="crt"] { --font: "Kiosk VT323", ui-monospace, monospace; }
```

The page shows once the theme's fonts have loaded, so the text never changes typeface
under your eyes. `size-adjust` evens out a typeface that looks small at the same size;
`font-synthesis: none` keeps the browser from faking a bold the font does not have.
Fonts from [Google Fonts](https://fonts.google.com) are under the OFL: their `latin`
`.woff2` file is a few tens of kilobytes.

## Scenes

A theme can move something behind the rooms: Matrix's falling code, Synthwave's grid. Its
script, one of its files, hands the page a function that fills the layer behind the rooms
(`#scene`) and returns one that stops it:

```js
window.Kiosk.addScene((host, { still }) => {
  const canvas = host.appendChild(document.createElement('canvas'));
  // … draw, again and again unless `still` …
  return () => { /* stop drawing */ canvas.remove(); };
});
```

The page runs the scene once the theme has loaded and while the page is in sight: hidden,
it stops it and empties the layer, shown again, it starts it afresh. Another theme picked
in Settings stops it too; the page keeps it, and starts it afresh when its theme is picked
again (its script runs once). `still` is true when
the device asks for less motion: the scene then draws once and stays as it is (a scene
moved by CSS stops its animation under `@media (prefers-reduced-motion: reduce)`). On the
Spot the layer is cut to the round screen. A scene runs all day on a kiosk: keep it to one
canvas the size of the screen, drawn twenty or thirty times a second at most, as Matrix and
Synthwave do (Synthwave draws its sky once, and its floor at each step); a theme without
one costs nothing.

A theme's script runs inside the page, with the page's rights over your Home Assistant:
add only scripts you have read.

## Checking

The check suite (see [Development](development.md#the-check-suite)) opens every theme of
`themes/themes.js` on the Spot and on the Show, checks that its files load and that its
text stands out from its background, that no layer of the page is much larger than the
screen, that the Show's clock keeps one width, that a theme with a scene moves it (and
stops it while the page is hidden, and when less motion is asked for), that Settings switches
the Show to it in place as it shows on a fresh page, and saves a screenshot of
each, `theme-<name>-spot.png` and `theme-<name>-show.png`; with `--docs`, the gallery's
pictures too.
