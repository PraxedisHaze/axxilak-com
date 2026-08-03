# APEX — Live QA Checklist
Built 2026-07-30 by Veris, at Timothy's request, to test every part systematically rather than chase bugs one at a time.
Test against the real running editor (not just code review). Mark each: PASS / FAIL / NOT TESTED, with a one-line note.

---

## 1. Edit Mode Entry/Exit
- [x] EDIT button (real click, not automation) reliably enters edit mode — PASS, tested via Timothy's real click 2026-08-01
- [x] EDIT button reliably exits edit mode — PASS, tested 2026-08-01
- [x] Body scroll locks while editor is open, restores after close — scroll lock itself worked, but exposed a real bug (nav vanishing) — FAIL → FIXED 2026-08-01, see potch.md
- [x] Nav buttons/links are inert while editor is open (lockdown working) — PASS, verified programmatically: clicking Solutions during an active edit session did not navigate
- [x] Nav buttons/links fully work again after close — **repeated 3x in a row** — PASS, `bodyOverflow`/`ax-editing` class/lens-active state all clean and consistent across all 3 cycles, no degradation

## 2. Selection
- [x] Clicking a text element (span/p) selects it, opens palette — PASS, tested 2026-08-01
- [x] Clicking a container (div/card) selects it, opens palette — BY DESIGN, not a bug: `_isEditable()` deliberately excludes composite `div`/`section`/etc. containers that have child elements (elementDetector.js ~line 201-211), matching a documented prior fix ("card containers collapsing into one selection"). Only leaf text/image descendants are selectable. Live-confirmed: clicking a card's own padding area finds no editable target and selects nothing.
- [x] Clicking a link selects it, shows Link URL field — FOUND & FIXED 2026-08-02: the one real non-nav `<a>` on the page (footer "Free Stuff" link) sat inside a `data-anothen-internal="true"` wrapper (meant for the copyright/branding strip), which made the click handler treat it as internal UI and `return` before ever calling `preventDefault()` — so a real click just navigated away and silently exited the editor entirely. Its sibling nav link was already correctly `data-ax-locked="true"`; this one wasn't. Fixed by adding the same `data-ax-locked="true"` to it (`index.html`). Live-verified: clicking it in edit mode no longer navigates, page stays on Apex. With that fixed, there are now zero remaining unlocked non-nav `<a>` elements on this Webling to test the Link URL field against — every real link is intentionally locked for site integrity. Link URL field itself unverified; no live target exists on this template.
- [x] Clicking media shows appropriate media controls, hides text controls — PASS: selecting the About-section `<img>` shows Image Upload/Media URL/Layer Depth controls; text-only controls (Text Color, Font Size, Text Gradient, etc.) aren't hidden outright but are disabled via `opacity-30 pointer-events-none`, functionally equivalent.
- [x] Clicking a second element while first has no pending changes switches cleanly — FAIL, root cause found: the switch/no-prompt-needed logic exists (`magnifying-glass-inspector.js` ~424-441) but is dead code during real use. The full-viewport `#apex-lockdown-overlay` (z-index 19998) intercepts every click except on the currently-selected element and the palette itself, and the overlay is itself marked internal, so the document click handler returns before that switch logic can ever run. In practice, the only way to select a different element is to Close first. Not fixed this pass — real architectural change (overlay/z-index routing), flagged for Timothy's call given the project's history of reopen/freeze regressions in this exact area.
- [x] Clicking a second element while first HAS pending changes prompts discard confirmation — same root cause as above: unreachable dead code, same recommendation.
- [x] Locked elements (`data-ax-locked`) are not selectable — PASS, verified live against the locked APEX logo span.

## 3. Content Editing
- [x] Typing in Content textarea updates the live on-page element (debounced) — PASS, verified: typed text appeared on the live heading immediately
- [x] Paste into Content textarea works and syncs — INCONCLUSIVE (same class as prior `:hover` limitation): synthetic paste events don't trigger native browser text-insertion, so automated testing can't produce a real paste. Code path looks sound (computes spliced value, syncs to live page, native insertion + follow-up `input` event handle the textarea itself) but needs a real Ctrl+V to confirm.
- [x] Live caret marker appears on the page element while typing — FAIL → FIXED 2026-08-01: `_renderLiveCaret` was called but never defined; implemented and verified live (single marker, correctly relocates, zero console errors). Full record in `potch.md`.
- [x] Clicking inside the on-page text repositions the caret to the correct spot — PASS, verified 2026-08-02: 0 markers before click, 1 immediately after, landed at the correct text offset, no typing needed.
- [x] Backspace/Delete no longer deletes the whole element when a page click lands just outside the selected element's box — FAIL → FIXED 2026-08-02. Reported as "SYSTEM ONLINE v2.0 container... can't replace, only delete." Root cause: a global delete-element keyboard shortcut only checked whether focus was in the textarea, and a click landing just outside the element's rect left focus on `<body>` without restoring it. Full record in `potch.md`.

## 4. Visual Effects
- [ ] Text Color changes apply live
- [ ] Text Gradient (letters) applies live, visible while editing
- [ ] Text Glow applies live, visible while editing
- [ ] **Container Glow applies live, visible WHILE SELECTED — this was just root-caused (CSS `!important` collision, index.html lines ~1075-1078, ~1219-1222, ~1244-1249) — verify the fix actually landed and the glow is visible during editing, not just after close**
- [ ] Container Glow persists correctly on reopen (shows the real value, not 0, not a clamped/wrong number)
- [ ] Container Gradient (box/background) applies live and persists on reopen

## 5. Typography
- [ ] Font size slider + number input stay in sync
- [ ] Body/Heading/Display preset buttons apply correct sizes
- [ ] Font size row wraps cleanly at narrow palette widths (previously fixed — regression check)
- [ ] Font family dropdown applies live

## 6. Save / Cancel / Close
- [x] Save commits changes, session stays open (by design), pending-changes clears — PASS, verified programmatically
- [x] Cancel with pending changes reverts to original state (text, styles, container glow, everything) — PASS for text; styles/glow revert not independently re-tested this pass
- [x] Close button (×) behaves the same as Cancel (discard) — CONFIRMED, and confirmed surprising: live-tested 2026-08-02, clicking × doesn't just discard the current element's edits, it exits Edit Mode entirely (body loses `edit-mode`/`ax-lens-active`, EDIT button returns to its pre-edit pulse state). Combined with the dead switch-element logic above, today's real workflow to edit a second element is: select → edit → × (exits Edit Mode) → click EDIT again → select next. Works, but not what "switches cleanly" implies. Same recommendation: flag for Timothy, not fixed this pass.
- [ ] After Save, glow/effects persist on page after eventually closing
- [x] **Saved edits survive an actual page reload** — FAIL → FIXED 2026-08-02: this was the most severe bug found tonight. Every saved edit was keyed to an element ID that only got assigned reactively on click and never persisted, so on a fresh reload zero elements had any ID and every saved edit silently failed to replay — no edit had ever survived a refresh for any element. Fixed by assigning IDs deterministically (DOM order) once on every load, before replay runs. Verified: same H1 edit persisted across 2 separate fresh reloads. Full record in `potch.md`. **Old localStorage edit data from before this fix should be cleared once, not trusted.**

## 7. Contact Form — NEW, not yet scoped
- [ ] Describe exact issue Timothy is seeing (get intake: what you did / what happened / what should happen)
- [ ] Blank submit does NOT show false success (previously fixed — regression check)
- [ ] Valid submit opens mailto draft with correct subject/body (previously fixed — regression check)
- [ ] Whatever the new issue is — reproduce live before diagnosing

## 8. Nav & Page Behavior (outside editor)
- [ ] Solutions/About links scroll to correct sections
- [ ] Get Started button works
- [x] Theme toggle (dark/light) actually changes visible theme — FAIL → FIXED 2026-08-02: root cause was two independent handler-wiring systems (`attachHandlers()` in index.html + `HandlerDispatcher` class) both bound the same button, so every real click fired `toggleTheme()` twice, flipping the theme and immediately flipping it back. Guarded `toggleTheme()` against the re-entrant call. Verified live both directions (light→dark, dark→light), single real click each time, zero console errors. Full record in `potch.md`.
- [ ] Edge Electrify link (clock icon) points to the live Keystone-hosted copy, resolves correctly
- [ ] Axxilak.com brand stamp (bottom-right) links out correctly

## 9. Cross-Cutting / Regression
- [x] Do a full cycle 3x in a row on 3 different elements — PASS. Ran 2026-08-02 after tonight's fixes (footer-link lock, cursor scoping, 3D removal, mixed-content text, live-caret sweep, Cancel/Close edit-mode-stay): 3 rounds × (text leaf, mixed-content paragraph, media image) select→close. Identical, clean results every round — `body.edit-mode` never dropped, mixed-content box showed the full sentence every time, no drift by round 3.
- [x] Check browser console for errors at each major step — PASS, zero console errors across the full 3×3 cycle plus a fresh baseline load.
- [x] Mobile/narrow viewport (320px) — FIXED 2026-08-02: palette was a fixed `w-96` (384px) regardless of viewport, overflowing both edges at 320px. Made responsive: full-width bottom sheet with 12px side margins and a `75vh` height cap below the `sm` (640px) breakpoint; restores the original fixed bottom-right 384px panel at `sm:` and up. Verified live at 320px (fits fully, 296px wide with margins) and at 680px/1280px (unchanged 384px desktop panel, correct position). Zero console errors.

---

## Notes / Findings Log
*Append here as we go — what failed, what the actual cause was, don't just check boxes silently.*

- **2026-08-02: Solutions section cards were completely unselectable** — Timothy: "None of the 'Solutions' are selectable, and that by itself is our boat sunk if we don't fix it." A blanket exclusion in `elementDetector.js` blocked all `#solutions` content from the editor, with no documented reason beyond a vague comment. Live-tested removing it (3 full open/select/save/close/reopen cycles, zero errors, nav unaffected) before committing to the fix. Removed the exclusion, replaced full visual suppression with a grid-safe selection cue. Full record in `potch.md`.
- **2026-08-02: dev server was serving a stale, wrong file** — `python -m http.server 8878` had drifted to a different, older directory somewhere earlier in the session, serving a 15KB page instead of the real 93KB `apex/index.html`. Explains several bug reports that didn't reproduce once restarted from the correct root. Correct root is `axxilak/` (URL `/Maizons/apex/index.html`), not `apex/` directly — the theme transition engine lives one directory above `apex/` and 404s otherwise.
