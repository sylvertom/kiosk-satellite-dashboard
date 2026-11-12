---
title: 'Name callReaches in the AGENTS.md pitfall'
type: chore
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

**Problem:** The check-suite fix (PR #21, merged as `a0d4d82`) added `callReaches()` to `tools/checks/harness.mjs`, for a check that reads the page's last call after a tap, and used it in five places (`music.mjs`, `show.mjs`, `spot.mjs`). The pitfall in `AGENTS.md` still names `mockReaches()` alone, so the next agent could read `lastCall()` at once after a tap, which fails on GitHub's slower macOS runner.

**Approach:** Reword the one pitfall line in `AGENTS.md` so it names both waits: `mockReaches()` for the states, `callReaches()` for the last call. Nothing else changes.

</frozen-after-approval>

## Implementation Notes

Oneshot: one line in one file, about 1 line changed.

- The line sits inside the `bmad:context` block that `bmad-project-context` manages. This is the skill's `record` kind of edit (one pitfall line, shown as a diff): a refresh keeps a line whose evidence still holds, and `callReaches` is in `harness.mjs:198`. The block's provenance line ("Verified 2026-11-11 against 202af5f") stays: only this line was checked, not the whole block.
- No other doc names either wait (`grep` over `docs/`, `README.md`, `CHANGELOG.md`, `.github/`).
- No `CHANGELOG.md` line: nobody using or setting up the kiosk notices.
- Changed: `AGENTS.md` l. 41. Before editing, this worktree's branch was fast-forwarded from `3cfbc53` to `origin/main` (`a0d4d82`), where `callReaches` exists. The check suite was not run: no code changes.
- Verification: the short-form exclude `':!_bmad-output'` fails in git (`Unimplemented pathspec magic '_'`); the command uses `':(exclude)_bmad-output'`.

## Plan Change Log

## Review Triage Log

Pass 1 (quick lens): 0 high, 0 medium, 2 low. 1 patch, 1 reject.

| Finding | Verdict | Route | Evidence |
|---|---|---|---|
| AGENTS.md l. 41 says "after a tap", but both helpers wait after a tap or a drag | low | patch | Real: `harness.mjs:196` says "After a tap or a drag", and drags are waited for at `show.mjs:44/48/55`, `spot.mjs:119/151/153`. The wording was older than this change, but this change rewrites the same sentence: "or a drag" added. No other line touched. |
| AGENTS.md l. 41 offers no wait for a call that is not the last one | low | reject | Real but rare: one check needs it (`show.mjs:85–89` polls `callLog()` by hand); `spot.mjs:305` and `events.mjs:32` read after a `waitFor` on the page. The fix would need a new helper or a new clause, more than a simple correction. |

## Verification

**Commands:**
- `grep -n "callReaches" AGENTS.md tools/checks/harness.mjs` -- expected: the pitfall line, and the definition and export in `harness.mjs`
- `git diff --stat a0d4d82deacc35dc6e5ba5034f2d8acf2a5702c0 -- . ':(exclude)_bmad-output'` -- expected: `AGENTS.md` only, 1 line changed

**Manual checks (if no CLI):**
- The pitfall reads as one sentence and stays true: both helpers wait up to 3 s after a tap or a drag (`harness.mjs:196`).
