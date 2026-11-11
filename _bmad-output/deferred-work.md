- source_plan: `_bmad-output/plan-make-the-check-suite-reliable.md`
  summary: The harness should refuse a mock that serves another configuration than config.example.js (started with --config config.js).
  evidence: `/__mock` reports only `root` and `started`, so a mock started from this folder with `--config config.js` passes the guard. The checks then run against the user's own house, and `--docs` writes its screenshots into the tracked `docs/images/`. This happened before the change too.
- source_plan: `_bmad-output/plan-make-the-check-suite-reliable.md`
  summary: The AGENTS.md pitfall should name callReaches() beside mockReaches(), for a check that reads the last call after a tap.
  evidence: The change adds `callReaches()` and uses it at music.mjs:31, show.mjs:131/143 and spot.mjs:321/330. The pitfall still points to `mockReaches()` alone. Deferred because the fix edits an agent-context file.
