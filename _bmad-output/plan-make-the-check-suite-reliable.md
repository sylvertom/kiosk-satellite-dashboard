---
title: 'Make the check suite reliable'
type: bugfix
ticket: ''
created: '2026-11-11'
status: built
baseline_revision: '3cfbc5319d4a555eedf25190d9bf1c27023e5eec'
route: full
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

**Problem:** The check suite fails, or passes, for reasons unrelated to the change being tested. On GitHub's macOS runner, 10 Spot checks failed together three times (#5, after #14, after #20 today). "no layer of the page much larger than the screen" measured nothing (`-Infinity`) twice. Locally, a mock left running from older code, or from another worktree, holds port 8123, and the checks test it without a word.

**Approach:** Make the harness's tap one the page can't take for a long-press. Have every check that expects the mock to change wait for it. Ask Chrome again for the layer tree until it comes. Refuse to run against a mock that isn't this folder's or that started before `tools/mock-ha.mjs` last changed, and have the mock say clearly when its port is taken. Then drop the two notes in `AGENTS.md` that the card names.

## Boundaries & Constraints

**Always:** No dependencies, no build step. Only `tools/` and the docs change: the page itself stays as it is. Comments in plain words about what the code does. Every check keeps its meaning and its name (CI's annotations match by name).

**Never:** No `CHANGELOG.md` line (nobody at a kiosk notices). No `?v=` or version change. Don't raise timeouts to hide a failure. A check that a tap changes *nothing* must not become a wait that passes at once.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Slow tap | the page is slow to see the touch end | still a tap, never a long-press | — |
| Slow call | the call reaches the mock late | the check waits up to 3 s and passes | fails with the value it got |
| No layer tree yet | Chrome hasn't reported layers | asks again for up to 5 s | still none: FAIL, saying Chrome reported no layers |
| No mock | nothing on BASE | stops before Chrome starts, says to start the mock | exit 1 |
| Old mock | no `/__mock`, or started before `tools/mock-ha.mjs` changed | stops, says to `pkill -f tools/mock-ha.mjs` and start it again | exit 1 |
| Other folder's mock | `/__mock` root ≠ this folder | stops, naming both folders | exit 1 |
| Port taken | a second `node tools/mock-ha.mjs` | one clear line on stderr, exit 1 | — |

</frozen-after-approval>

## Code Map

- `tools/checks/harness.mjs` -- `tap()` (l. 98): touchStart, its ack, 60 ms, touchEnd. If the gap passes the page's 480 ms hold (`js/touch.js` `attachPress`), the light's popover opens and covers the main light. Forcing a long-press at `spot.mjs` l. 62 reproduces CI's 10 failures exactly, "(got 100%)" included. `mockReaches` (l. 160), `lastCall` (l. 167), `layers()` (l. 142). Chrome is spawned at the top level (l. 25).
- `tools/checks/spot.mjs` -- most of the mock reads at once after a tap or drag: l. 87, 91, 118, 124, 130, 153, 156, 175, 179, 182, 184, 214, 217, 245, 257, 275, 387; `lastCall` l. 330, 340. Reads that check *nothing changed* (l. 83, 95, 210–212) stay reads at once: l. 95 first waits for the tap at l. 92 to land. The l. 59 comment ("first call … slow") is no longer true.
- `tools/checks/show.mjs` -- reads at l. 43, 47, 50, 55, 191, 194, 197, 208, 213, 216, 220; `lastCall` l. 130, 142.
- `tools/checks/rooms.mjs` -- `sleep(100)` + read at l. 17–20, 33, 65–67.
- `tools/checks/theme.mjs` -- l. 31 read after a tap; l. 194–195 the layer check.
- `tools/checks/music.mjs` -- `lastCall` at l. 31, right after a tap.
- `tools/mock-ha.mjs` -- `server.listen` l. 490 has no `error` handler. Routes are at l. 438–472: add `/__mock` there.
- `AGENTS.md` l. 27, 42; `docs/development.md` "The check suite" (l. 104–119).
- Left alone: `events.mjs` l. 24/32, `show.mjs` l. 82–89, `spot.mjs` l. 315 and `lightsOn()` (they read after the page has shown the answer); `sign-in.mjs`.

## Tasks & Acceptance

**Execution:**
- [x] `tools/checks/harness.mjs` -- `tap()` sends touchStart and touchEnd together, without waiting between. Generalise the wait: `until(read, ok, ms)`, with `mockReaches` (states) and a new exported `callReaches` (the last call) built on it. `layers()` changes the page until a tree that draws arrives, 5 s at most. Before Chrome starts, check `/__mock` (refused, not JSON, other root, `started` < mtime of `tools/mock-ha.mjs`), print one line saying what to do, exit 1 -- the root causes found
- [x] `tools/checks/spot.mjs`, `show.mjs`, `rooms.mjs`, `theme.mjs`, `music.mjs` -- every read listed in the Code Map becomes `mockReaches`/`callReaches`; keep the "(got …)" by reading again in the message; drop the `sleep(100)`s in rooms.mjs -- reads at once can fail on a slow runner
- [x] `tools/checks/theme.mjs` -- the layer check names an empty answer ("Chrome reported no layers") instead of `-Infinity`
- [x] `tools/mock-ha.mjs` -- `/__mock` → `{ root, started }`; `server.on('error')`: on `EADDRINUSE` one line naming the port and `pkill -f tools/mock-ha.mjs`, exit 1 -- a second mock dies unseen
- [x] `AGENTS.md` -- delete l. 27, and "About 20 older checks still read at once: don't copy them." from l. 42 -- as the card asks
- [x] `docs/development.md` -- one sentence: the suite stops when the mock on 8123 isn't this folder's current one, and how to restart it -- humans meet that message

**Acceptance Criteria:**
- Given the mock started from this folder, when `node tools/shoot.mjs` runs, then every check passes.
- Given a mock started, then `tools/mock-ha.mjs` touched, when `node tools/shoot.mjs` runs, then it stops before any check with a line saying to restart the mock, and leaves no Chrome running.
- Given a mock on 8123, when a second `node tools/mock-ha.mjs` starts, then it prints one line about the taken port and exits 1.
- Given `tools/checks/`, when grepping for `mockStates()` and `lastCall()` within two lines after a tap or drag, then only the reads that check nothing changed remain.

## Implementation Notes

- `until()` treats a test that throws on what it read (an earlier call without a target) as "not yet", instead of crashing the run.
- Reads at once that remain: spot l. 83 and l. 205 (nothing changed), spot l. 95 (after waiting for the tap at l. 92), rooms' "what must stay on" (right after the wait for the lights to go off), show l. 45/56 (the level for the page's text, after `mockReaches` passed), spot l. 70 (a baseline, after `mockReaches`).
- The implementer verified: no mock, the baseline mock (no `/__mock`), a second mock on the taken port, the new mock from another folder, `touch tools/mock-ha.mjs`: each stops with its line, exit 1, no Chrome left. Two full runs: 744 checks, 0 failures.
- Not provable locally: the slow-tap row. The CI cascade never reproduced here (see Design Notes); GitHub's macOS runner is the test.

## Plan Change Log

## Review Triage Log

Pass 1 (quick lens): 0 high, 1 medium, 3 low, 1 false-by-rule. 2 patch, 2 defer, 1 reject.

| Finding | Verdict | Route | Evidence |
|---|---|---|---|
| harness.mjs guard: a mock started with `--config config.js` passes (root and start time only); with `--docs` the user's house could reach `docs/images/` | medium | defer | Real: `/__mock` reports no config. Not caused by this change: before it, any mock was taken. Deferred-work entry and a task card. |
| harness.mjs guard: anything else on 8123 (a local Home Assistant) is told it "runs older code" | low | patch | The message is this change's own; a wording fix. |
| harness.mjs `until()` comment: "an earlier call without a target" cannot happen | low | patch | mock-ha.mjs:388 records `target: m.target \|\| {}`; the empty log after a reset is the real case. |
| AGENTS.md pitfall names `mockReaches()` alone, not `callReaches()` | low | defer | Real, but the fix edits an agent-context file. Deferred-work entry and a task card. |
| Criterion 4 not met as worded: show.mjs l. 45/56 read within two lines of a drag | reject | — | Those reads follow a `mockReaches` that passed. The fix would edit this build's plan. |

## Design Notes

A tap that is one gesture for the page:

```js
async tap(x, y) { await Promise.all([this.touch('touchStart', [{ x, y }]), this.touch('touchEnd', [])]); },
```

CDP handles messages in order, so touchEnd follows touchStart through Chrome without a round trip to Node. Testing the new tap under CPU throttling (20×) or with a page busy for 500 ms in a touchstart listener did not reproduce the failure. Chrome holds timers back after a touchstart. So the evidence for this fix is the matching cascade, and the delay can only come from the round trip. Drags keep their timing: no CI failure points at them.

## Verification

**Commands:**
- `pkill -f tools/mock-ha.mjs; node tools/mock-ha.mjs &` then `node tools/shoot.mjs` (background, ~8 min) -- expected: "all checks passed"
- `touch tools/mock-ha.mjs && node tools/shoot.mjs` -- expected: exit 1 at once, the restart message; `pgrep -f kiosk-shoot-` empty
- a second `node tools/mock-ha.mjs` -- expected: one line about port 8123, exit 1
