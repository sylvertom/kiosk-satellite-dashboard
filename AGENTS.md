# Notes for coding agents

A static Home Assistant dashboard for Echo devices running Kiosk Satellite. Read
[docs/development.md](docs/development.md) first: the file layout, how the scripts share
`window.Kiosk`, the mock Home Assistant and the check suite.

- **No build step, no dependencies**, in the page and in the tools. The page must work as
  Home Assistant serves it, from `/local/kiosk/` and from the integration's
  `/kiosk_dashboard/`.
- **The integration** (`custom_components/kiosk_dashboard/`) is how HACS installs the page:
  it only serves it, from its `www/`, which a release fills. Home Assistant does not run
  in the checks: try a change to it on a real one.
- **Small, cohesive files.** Put new code in the file that owns the feature (the table in
  docs/development.md). A new file goes into `index.html` in dependency order.
- **Load order.** A file destructures names from `Kiosk` only for files above it in
  `index.html`; it calls a file below it through `K.` at the time of the call.
- **Comments** say what the code does for the person at the kiosk, in plain words. Keep
  them true when the code changes.
- **Configuration.** `config.js` is the user's own and is not in the repository.
  `config.example.js` is both the documented example and the configuration of the mock
  and the checks: when an option changes, update `config.example.js`,
  `docs/configuration.md`, `tools/mock-ha.mjs` and `tools/shoot.mjs` together.
- **Checks.** After a change, run `node tools/mock-ha.mjs &` then `node tools/shoot.mjs`:
  every check must pass. Add checks for new behaviour.
- **Changes and releases.** One branch and one pull request per change. Add a line under
  **Unreleased** in `CHANGELOG.md` for what someone using or setting up the kiosk would
  notice. Leave every `?v=`, and the integration's version, alone: `tools/release.mjs`
  sets them all for a release (docs/development.md).
- **Screenshots.** `screenshots/` is ignored by git. Refresh `docs/images/` only on
  purpose, with `node tools/shoot.mjs --docs`.
- **Security.** The page talks only to the Home Assistant that serves it: never take an
  address or a token from the URL ([docs/security.md](docs/security.md)).
