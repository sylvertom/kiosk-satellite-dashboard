# Security: why the page can sit in `www/`

Everything under Home Assistant's `www/` folder is served at `/local/` without a login, so
**nothing in these files is secret**: markup, styles, code, and the entity IDs and names
in your `config.js`, the same as the custom cards HACS already puts there. Keep anything
you would not show a stranger out of `config.js`; the page never needs a token or a
password in it.

The page signs in with a session it finds in the browser:

- **On the kiosk**, Kiosk Satellite writes its own long-lived token into the page as the
  Home Assistant session (its *Log in automatically* setting, on by default), exactly as it
  does for the Home Assistant frontend. Give Kiosk Satellite a token from a dedicated
  non-admin user rather than your own. Its *Share Home Assistant connection* setting,
  which hands that token's connection to every custom page, is not needed.
- **On your computer**, the page reuses your Home Assistant login if you are signed in on
  the same address, and otherwise offers the normal Home Assistant login screen.

The page only ever talks to the Home Assistant that serves it, at its own address: no
address is taken from a link or from a stored session, and no token is accepted from the
address bar. That is why it has to be served by Home Assistant itself (`/local/kiosk/`,
or `/local/kiosk_dashboard/` through the integration). The
exceptions are plain images, web addresses only, loaded without passing on the page's
address: the covers of your Music Assistant favourites, from wherever Music Assistant
says they are (its own server or the streaming service), the artwork of a media card
when the player's integration gives Home Assistant a web address for it (a streaming
service's, say) rather than passing it through itself, and the background pictures
you put in `config.js`. Keep the pictures in `www/`, or have the page draw a gradient
instead, if the kiosk should load nothing from elsewhere. A theme's name in the address (`?theme=`), or the one Settings keeps on
the kiosk, only chooses among the themes listed in `themes/themes.js`, whose files sit next to the page; a theme's script (Matrix's,
Synthwave's) runs inside the page like the page's own code.

The sign-in code is in [`js/ha.js`](../js/ha.js), about 250 lines with no dependencies.

## Through the integration

Installed through HACS, the *Kiosk dashboard* integration has Home Assistant serve the
same files at `/local/kiosk_dashboard/`, without a login as the rest of `/local/`, and
with them two files of yours from `/config/www/kiosk/`: `config.js` and XP's
`themes/xp/bliss.jpg`, nothing else of that folder. That is all it does: it adds no
entity, no service, and reads nothing from Home Assistant. Its code is in
[`custom_components/kiosk_dashboard/__init__.py`](../custom_components/kiosk_dashboard/__init__.py),
about 60 lines.
