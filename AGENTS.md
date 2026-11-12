# Notes for coding agents

<!-- bmad:context -->
<!-- Verified 2026-11-11 against 202af5f. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## Kiosk dashboard

A static Home Assistant dashboard for Echo devices running Kiosk Satellite: plain HTML, CSS and JavaScript, and a small Python integration through which HACS installs it. Work comes from the GitHub issues of sylvertom/kiosk-satellite-dashboard; the docs for people setting it up are in `docs/`. Read [docs/development.md](docs/development.md) first: the file layout, how the scripts share `window.Kiosk`, the mock Home Assistant and the check suite.

## Policy

- No build step, no dependencies, in the page and in the tools. The page must work as Home Assistant serves it, from `/local/kiosk/` and from the integration's `/local/kiosk_dashboard/`: Kiosk Satellite opens a Home Assistant page only under `/local/` (1.5.0 served it at `/kiosk_dashboard/` and the kiosks refused it).
- The page talks only to the Home Assistant that serves it: never take an address or a token from the URL, nor an address from the stored session ([docs/security.md](docs/security.md)).
- `config.js` is the user's own house and is not in the repository: never copy from it into a tracked file. Examples, docs and checks use the made-up house of `config.example.js`.
- One branch and one pull request per change. Add a line under **Unreleased** in `CHANGELOG.md` for what someone using or setting up the kiosk would notice.
- Leave every `?v=`, and the integration's version, alone: `tools/release.mjs` sets them all for a release (docs/development.md).
- Never write icon path data into `js/icons.js` by hand: add the icon's name to the list in `tools/fetch_icons.py` and run `python3 tools/fetch_icons.py`.

## Where things are

- In `custom_components/kiosk_dashboard/`: the integration only serves the page, from its `www/`, which a release fills. Home Assistant does not run in the checks: try a change to it on a real one.
- A theme, in `themes/`: [docs/themes.md](docs/themes.md), how to make one and check it.

## Running and verifying

- After a change, run `node tools/mock-ha.mjs &` then `node tools/shoot.mjs`: every check must pass. Add checks for new behaviour, in the file of `tools/checks/` for that part of the page.
- The suite takes about 8 minutes and has no single-file mode: run it in the background, not under a short timeout.
- A run that crashes leaves its Chrome running: `pkill -f kiosk-shoot-` before the next.
- `screenshots/` is ignored by git. Refresh `docs/images/` only on purpose, with `node tools/shoot.mjs --docs`.

## Conventions that differ from defaults

- Plain `<script>` files, never ES modules: kiosks fetch a file again only when its `?v=` changes, and `tools/release.mjs` sets those only in `index.html` and `themes/themes.js`.
- Small, cohesive files. Put new code in the file that owns the feature (the table in docs/development.md). A new file goes into `index.html` in dependency order.
- Load order: a file destructures names from `Kiosk` only for files above it in `index.html`; it calls a file below it through `K.` at the time of the call.
- Comments say what the code does for the person at the kiosk, in plain words. Keep them true when the code changes.
- When an option changes, update `config.example.js`, `docs/configuration.md`, `tools/mock-ha.mjs` and the checks in `tools/checks/` together: `config.example.js` is both the documented example and the configuration of the mock and the checks.

## Known pitfalls

- A check that reads the mock after a tap waits for it with `mockReaches()` (`tools/checks/harness.mjs`): reading at once fails on GitHub's slower macOS runner.

<!-- /bmad:context -->
