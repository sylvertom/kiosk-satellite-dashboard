# Features

What the page does, screen by screen. [Configuration](configuration.md) says how to set each part up.

- **One page for every kiosk.** The room it starts on comes from the Kiosk Satellite
  device name (`devices` in `config.js`); the layout from the screen: a square screen gets
  the round Echo Spot layout, anything else the wide one, with a tighter density on the
  Show 5. A few [address parameters](configuration.md#address-parameters) help on a
  desktop browser.
- **Room view.** A header with the room title, the sensors under it (one without a value,
  such as an unavailable one, is left out, and one can show only while a state holds),
  the house's alerts first among them in the warning colour while they need attention
  (the front door left open; on the Spot they have the row to themselves), the mode chips (toggles, or a pair of scripts
  for things like a projector; when the header has no room for their names, they show
  their icons alone) and a large 24 hour clock. Under it, the dial for
  the room's lights: drag along its arc or across it to dim, tap the name in its middle to
  toggle, long-press for the panel. Beside it the light tiles: tap toggles, the pill
  under the name is that light's own slider, long-press or the dots open the panel. Each
  tile is a row, its icon beside its name and pill, in as many columns as the screen
  has room for; where that would stack four lights or more in one column (an Echo Show
  8 has room for one), they are cards in two columns, the icon above the name. They
  sit in the middle of the height beside the dial, and scroll when there are more than
  fit. With the media card on, the dial shrinks to a small ring beside the name and its
  column widens.
- **Spot.** The dial is a thick rim along the edge of the round screen. From the top: the
  room title, the sensors and the modes as round icons; a large power button for the
  room's lights beside their name and state, faint arrows either side; under it a strip
  of round light buttons, three in view, that scrolls one light at a time (the media
  card at its end); a large tab for the menu. No clock. Only the rim dims: a swipe
  across the main light slides the room's lights through, one after another, like a
  carousel (a tap on an arrow does too), and the rim and power button follow the one
  shown (the end of the screensaver brings back the room's main light).
- **Single-light room.** Just the dial, in the middle of the screen.
- **Room menu.** Tap the room title to change room. Every room says how many of its lights
  are on (what its main light says under its name: the members of its group that are on;
  its own tiles that are on when Home Assistant does not list the group's members) and
  has a power button that turns those off; a tile that is another room's main light
  counts in that room only. A last card turns off every light on the page. On the Spot
  the rooms are rows across the screen, in a list that scrolls (the menu tab points down
  meanwhile, and closes it); on the Echo Show they are a grid of cards. Turning lights
  off leaves the menu open.
- **Detail panel.** Brightness, then tabs for what the light supports: White (colour
  temperature), Colour (hue, saturation, swatches), Effects (the light's effect list),
  More (any select, number or switch entities you list under `controls`, such as the
  palette, preset, speed and intensity entities WLED creates), Lights (members of a
  group). On the Echo Show it is a card with Off and On buttons. On the Spot there is no
  card: the controls stand in a column that keeps inside the circle, evenly spaced, over
  the menus' dark backdrop: the light's name at the top, then a power button before the
  brightness slider; a long tab scrolls, and the tab at the bottom, or a tap beside the
  controls, closes it.
- **Media card.** Artwork, title, transport, volume and source chips for a media player,
  shown only while `showWhen` matches (the projector is on). Compact on small screens.
- **Events.** What a room's Home Assistant calendars hold today, this week, this month or
  next: how many, after the sensors, and a list that a swipe scrolls through, a line just
  above the main light on the Spot, a wide tile first among the lights on the Show, the
  one on now marked. A tap shows them all with their hours and where, and a button to
  Kiosk Satellite's calendar. An event added to a calendar shows at once.
- **Menu.** On the Echo Show, a rail of icons on the right edge, always there. On the
  Spot, a ring of large buttons in the middle of the screen, opened by a tap or a swipe
  on the tab at the bottom; picking one, or a tap anywhere but on one, closes it. The
  fewer the buttons, the larger they are, their names too (up to ten on a ring). An item
  is a `ks://` link handled by Kiosk Satellite, a Home Assistant page or another room, a
  Home Assistant script to run, or a folder of such items (*Find my phone*, *Music*): on
  the Spot a folder opens as a ring of its own with *Back* in the middle, on the Show as a
  grid of cards with *Back* first. An item can be kept to the Spot or to the Show. *Now
  playing* shows only while Kiosk Satellite has something to play (its versions from
  October 2026 say so; with an older one the item stays).
- **Music Assistant favourites.** A folder can hold your favourite radios and playlists
  from Music Assistant (*Music*), shown with their covers, a switch at the top of the
  screen between the two. Picking one plays it on the speakers of the room the kiosk
  belongs to. The list comes from Music Assistant each time the folder opens, so a
  station you star there shows up the next time; the Spot's ring shows the first ten by
  name. A script or a favourite says what it did in a short toast.
- **Themes.** Twelve to choose from: dark, light, Nord, E-ink, an amber CRT, a handheld
  console's greens, two desktops of the early 2000s, steampunk brass, a starship's
  console, and two that move: Matrix's falling code and a synthwave sunset. One for the whole house or one per kiosk, each with its own accent colour, or
  yours. The accent can take the colour of the light the dial
  controls (the main light on the Show, the light in the main slot on the Spot), fading
  from one to the next. A picture can sit behind every room, or each room its own, faded
  into the theme so that the text stays legible; or a gradient the page draws from a
  colour of yours, from the accent, or from the accent's opposite, following the light
  with it.
- **Fast.** Live states come over the Home Assistant WebSocket, subscribed to just the
  entities on the page (plus the members of a light group, once it says who they are).
  Only the widgets whose entity changed are redrawn, in one frame. A level you set stays
  on screen until Home Assistant answers with the new state, and no longer: what you see
  is always what Home Assistant reports. Every animation moves only transform and opacity.
