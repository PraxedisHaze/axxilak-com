# Audit request for Codex — Apex editor, post-2026-08-04 session

## Context

`axxilak/Maizons/apex` is the Apex Webling editor — close to sellable, actively being QA'd today by Claude across a long session. `QA_CHECKLIST_20260730.md` and `potch.md` (both in this folder) have the full record; read `potch.md` top-down for tonight specifically, it's dense with real bugs found and fixed in sequence.

Tonight's session found and fixed a *pattern*, not just individual bugs: several fixes were shipped, verified as working, then quietly regressed by a *later* fix in the same session — because the verification method (dispatching JS events directly on a target element) bypasses real browser hit-testing, and several of tonight's real bugs were specifically about hit-testing (the full-screen `#apex-lockdown-overlay` intercepting clicks meant for other elements). Each regression was only caught by explicitly re-testing through `document.elementFromPoint()` + dispatching on *that* element, not the assumed target.

**Please do not repeat that mistake in this audit.** Anywhere you test click behavior, use `document.elementFromPoint(x, y)` to find the real hit-test target first, and dispatch on that — not on the element you expect to be there.

## What changed tonight (chronological, see potch.md for full detail)

1. Footer link lockdown, page-wide cursor scoping, dark-on-dark text fix, 3D View removed from base editor, mixed-content text extraction/write-back fix, stray live-caret sweep, responsive mobile palette, dead-code fallback archived.
2. Container Glow/Gradient reopen bugs (blur-parsing math, gradient controls never wired to real state).
3. Close/Cancel reverted from "stay in Edit Mode" back to "fully exit" (a same-day experiment that was tried and undone after live-testing).
4. Styled unsaved-changes prompt (Save/Discard) added to Close/Cancel.
5. Same prompt extended to the EDIT button's own exit path (`requestExit()`), which had been silently discarding instead.
6. Theme toggle (`toggleTheme()`) routed through the same `requestExit()` so switching themes mid-edit can't silently discard either — required two follow-up fixes (a broken early-`return` in `handler-dispatcher.js`, and the theme button's `onclick` getting stripped by the nav-disable sweep).
7. **EDIT button found completely unreachable once an element was selected** — the lockdown overlay sits visually on top of it, so a real click lands on the overlay and gets swallowed. Fixed by having the overlay's `onclick` detect clicks on the button's real screen rect and forward them.
8. **Direct element switching added** — previously, moving from one selected element to another required closing the editor first, every time, even right after a Save. Generalized fix #7 into `_processContentClick()` (shared with the normal document click handler) and `_staysLiveDuringEdit()` (shared with the nav-disable sweep). Two more regressions caught and fixed while building this: switching stripped `edit-mode` visual state, and the theme-toggle fix (#6) regressed a second time because the overlay's forwarding logic wasn't generalized to it.

The throughline: `js/magnifying-glass-inspector.js`'s lockdown-overlay click routing (`onclick`/`onmousedown` on `this.lockdownOverlay`, plus `_processContentClick()`, `_staysLiveDuringEdit()`, `requestExit()`, `_showUnsavedPrompt()`) is now the single most load-bearing, most-edited piece of logic in the file. That's exactly where the next hidden regression is most likely to be.

## What to actually audit

1. **Every interactive element that should stay reachable during an active edit session** — EDIT button and theme toggle are confirmed working via `_staysLiveDuringEdit()`. Is that list exhaustive? Check: mobile menu toggle, Edge Electrify mount (`#edge-electrify-mount`, uses inline `onclick`, not `data-handler` — does it even go through this system?), the axxilak.com maker-stamp link, any other `data-anothen-internal` or `data-ax-locked` element that might *look* like it should still work mid-session but doesn't. Use real hit-testing to check each one, both with and without an active session.

2. **A live, specific bug report from Timothy tonight, not yet reproduced**: "the buttons are no longer editable." Claude tested `data-handler` CTA buttons (never editable, confirmed unchanged in `elementDetector.js` — no commits touched that file today) and nav-label pencil editing (still works) without finding the regression. Worth a fresh look with different assumptions about which "buttons" are meant.

3. **`_processContentClick()` and the old inline document-click logic it replaced** — confirm the extraction was behavior-preserving. Diff against `git show HEAD~5:Maizons/apex/js/magnifying-glass-inspector.js` (approximate — check `git log` for the exact pre-refactor commit) to compare old inline logic vs the new shared method line-by-line, not just by re-testing happy paths.

4. **Cache-bust chain consistency** — every JS file edited tonight needs its `?v=` query string bumped everywhere it's imported (`index.html` for `magnifying-glass-inspector.js` and `handler-dispatcher.js`; `magnifying-glass-inspector.js` itself for `tool-palette.js` and `elementDetector.js`). Grep for mismatched version strings across files.

5. **The unsaved-changes prompt (`_showUnsavedPrompt`)** — confirm every exit/switch path that can discard real edits routes through it: Close, Cancel, EDIT button, theme toggle, direct element switching. Is there any *other* way to leave an active session with pending changes that was missed (keyboard shortcuts? browser back/forward via the Edge Electrify overlay's `history.pushState` handling? window unload?).

6. **Known, deliberately deferred, not bugs** — don't re-flag these: 3D View removed (intentional), mobile nav has no EDIT entry at all (flagged, deferred), Content-box text wrapping doesn't visually match the live page (inherent to plain-textarea editing, a decision pending from Timothy).

## Output format

A written report: confirmed-working items (with how you verified, specifically noting real-hit-test vs direct-dispatch), real bugs found (root cause + repro steps), and anything you flagged but couldn't confirm either way. Do not fix anything without checking in first — this is an audit pass, not a fix pass.
