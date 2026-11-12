---
title: 'Refuse a mock serving another configuration'
type: bugfix
ticket: ''
created: '2026-11-12'
status: built
baseline_revision: 'a0d4d82deacc35dc6e5ba5034f2d8acf2a5702c0'
route: oneshot
route_source: auto
risk: low
review: quick
review_source: pinned
lenses_ran: [quick]
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `node tools/shoot.mjs` refuses a mock that is another folder's or older than `tools/mock-ha.mjs`, but takes one started with `--config config.js`, which `docs/development.md` suggests for trying your own house. The checks then run against the user's own `config.js`, whose entities they don't know, and `--docs` writes screenshots of that house into the tracked `docs/images/` (AGENTS.md forbids copying from `config.js` into a tracked file).

**Approach:** `/__mock` also reports the configuration the mock serves as `config.js`, and the guard in `tools/checks/harness.mjs` refuses anything other than this folder's `config.example.js`, before Chrome starts, with one line saying to restart the mock without `--config`.

</frozen-after-approval>

## Tasks

- `tools/mock-ha.mjs` l. 439–440 -- `/__mock` → `{ root, started, config: CONFIG }` (`CONFIG` is l. 22, already resolved); its comment names the configuration too.
- `tools/checks/harness.mjs` l. 24–37 -- a missing `config` joins the "not a mock of this folder's code" test (l. 34); after the start-time test, `mock.config !== path.join(ROOT, 'config.example.js')` stops with one line naming the configuration served and saying to restart without `--config`. Update the block's comment.
- `docs/development.md` l. 111–113 -- the suite also stops when the mock serves another configuration than `config.example.js`.
- No `CHANGELOG.md` line (nobody at a kiosk notices), no `?v=` or version change, no new check in `tools/checks/` (the guard runs before Chrome, as the check-suite fix's guard does).

## Acceptance

- Given a mock started from this folder without `--config`, when `node tools/shoot.mjs` runs, then every check passes.
- Given a mock started with `--config` naming any other file (a copy of `config.example.js` elsewhere stands in for `config.js`), when `node tools/shoot.mjs` runs, then it exits 1 before any check with one line naming that file and saying to restart without `--config`, and leaves no Chrome running.
- Given a mock started with `--config config.example.js` from this folder, when `node tools/shoot.mjs` runs, then the guard lets it through.

## Implementation Notes

Oneshot: three files, about ten lines; the guard and `/__mock` already exist from the check-suite fix (a0d4d82), this adds one field and one test.

- The branch started at `main` before #21 merged: fast-forwarded to `origin/main` (a0d4d82) first, as the card's guard lives there.
- A missing `config` in `/__mock` joins the "not a mock of this folder's code" test, so a mock from before this change is refused even if its start time passes.
- Verified: a mock with `--config` naming a copy of `config.example.js` in `/tmp` → exit 1 with the line, no Chrome left; `--config config.example.js` → the suite starts checking; no `--config` → 744 checks, 0 failures.

## Review Triage Log

Pass 1 (quick lens): 0 high, 0 medium, 2 low. 2 patch.

| Finding | Verdict | Route | Evidence |
|---|---|---|---|
| harness.mjs guard comment says any `--config` mock is refused; `--config config.example.js` passes (acceptance 3) | low | patch | True: the test compares paths only. Comment now says "naming another file", as AGENTS.md wants comments kept true. |
| harness.mjs refusal reads "serves …/config.example.js as config.js, not config.example.js" for another folder's copy | low | patch | True for worktrees pointed at the main checkout's file. Now "not this folder's config.example.js"; re-ran the refusal. |

## Verification

**Commands:**
- `pkill -f tools/mock-ha.mjs; node tools/mock-ha.mjs --config /tmp/<dir>/config.js &` then `node tools/shoot.mjs` -- expected: exit 1 at once, the line naming that file; `pgrep -f kiosk-shoot-` empty
- `pkill -f tools/mock-ha.mjs; node tools/mock-ha.mjs --config config.example.js &` then `node tools/shoot.mjs` -- expected: passes the guard (stop it once Chrome starts)
- `pkill -f tools/mock-ha.mjs; node tools/mock-ha.mjs &` then `node tools/shoot.mjs` (background, ~8 min) -- expected: "all checks passed"
