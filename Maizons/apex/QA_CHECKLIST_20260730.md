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
- [x] Clicking a second element while first has no pending changes switches cleanly — FIXED 2026-08-04: root cause was the full-viewport lockdown overlay intercepting every click except the active element's, making the existing switch logic dead code. Fixed by having the overlay's own click handler find the real element underneath it (temporarily toggling `pointer-events` + `elementFromPoint`) and hand it to that same logic. Live-verified through real hit-testing (not direct-dispatch, which had been hiding this class of bug all session): clean switch works, `edit-mode` state stays correct on the new element, same-element click is still a no-op, locked elements still can't be selected this way.
- [x] Clicking a second element while first HAS pending changes prompts discard confirmation — FIXED 2026-08-04, same pass: now shows the styled Save/Discard prompt (not a native `confirm()`) before switching. Save persists the first element's edit and moves to the second; Discard reverts the first element and moves to the second. Both live-verified.
- [x] Locked elements (`data-ax-locked`) are not selectable — PASS, verified live against the locked APEX logo span.

## 3. Content Editing
- [x] Typing in Content textarea updates the live on-page element (debounced) — PASS, verified: typed text appeared on the live heading immediately
- [x] Paste into Content textarea works and syncs — INCONCLUSIVE (same class as prior `:hover` limitation): synthetic paste events don't trigger native browser text-insertion, so automated testing can't produce a real paste. Code path looks sound (computes spliced value, syncs to live page, native insertion + follow-up `input` event handle the textarea itself) but needs a real Ctrl+V to confirm.
- [x] Live caret marker appears on the page element while typing — FAIL → FIXED 2026-08-01: `_renderLiveCaret` was called but never defined; implemented and verified live (single marker, correctly relocates, zero console errors). Full record in `potch.md`.
- [x] Clicking inside the on-page text repositions the caret to the correct spot — PASS, verified 2026-08-02: 0 markers before click, 1 immediately after, landed at the correct text offset, no typing needed.
- [x] Backspace/Delete no longer deletes the whole element when a page click lands just outside the selected element's box — FAIL → FIXED 2026-08-02. Reported as "SYSTEM ONLINE v2.0 container... can't replace, only delete." Root cause: a global delete-element keyboard shortcut only checked whether focus was in the textarea, and a click landing just outside the element's rect left focus on `<body>` without restoring it. Full record in `potch.md`.

## 4. Visual Effects
- [x] Text Color changes apply live — PASS
- [x] Text Gradient (letters) applies live, visible while editing — PASS (background-clip:text + transparent fill confirmed live)
- [x] Text Glow applies live, visible while editing — PASS (multi-layer text-shadow confirmed live)
- [x] Container Glow applies live, visible WHILE SELECTED — PASS, confirmed live (box-shadow applied directly to the selected element)
- [x] Container Glow persists correctly on reopen — FOUND & FIXED 2026-08-04: `parseBoxShadowControlState()` picked the blur value by flat index across *all* numbers in the computed box-shadow string, but the browser's computed form has 4 numbers per shadow layer (offsetX/offsetY/blur/spread) where the authored string only had 3 — the flat index landed on an offset (always 0), not the blur. Rewrote to split into per-layer segments first, then take the 3rd number within the correct layer. Verified across 4 blur/color combinations, then live via a real select→set→save→close→reopen cycle (18px orange glow round-tripped exactly).
- [x] Container Gradient (box/background) applies live and persists on reopen — FOUND & FIXED 2026-08-04: applies live correctly, but on reopen the color1/color2/angle inputs were never wired to the actual parsed gradient state at all — the template hardcoded `value="${this.rgbToHex(styles.backgroundColor)}"`/`styles.color`/`"180"` (the element's own unrelated background/text color, and a hardcoded angle), completely ignoring `containerGradientState` which was computed correctly one line above but never used. Wired the three inputs to `containerGradientState.color1/.color2/.angle`. Verified live: save→close→reopen now shows the exact colors/angle that were set.

## 5. Typography
- [x] Font size slider + number input stay in sync — PASS, both directions
- [x] Body/Heading/Display preset buttons apply correct sizes — PASS, all 3 verified (16/32/48px)
- [x] Font size row wraps cleanly at narrow palette widths — PASS at 320px against the now-responsive palette (no overflow)
- [x] Font family dropdown applies live — PASS

## 6. Save / Cancel / Close
- [x] Save commits changes, session stays open (by design), pending-changes clears — PASS, verified programmatically
- [x] Cancel with pending changes reverts to original state (text, styles, container glow, everything) — PASS, fully re-verified 2026-08-04: set text color + container glow as pending changes (both applied live correctly), Cancel reverted both back to the exact original (white, no shadow).
- [x] Close button (×) behaves the same as Cancel (discard) — SETTLED 2026-08-04 after going back and forth same-day: × and Cancel fully exit Edit Mode (button flips off), full stop. Briefly tried "stay in Edit Mode, just deselect" instead, but that left the EDIT button green with nothing to click into — the button is a literal on/off toggle keyed to the same active flag, so the very next click read "already on" and turned it off in one step, needing a second click to actually reopen. Technically consistent, practically confusing. Timothy's direction after hitting it live: closing the editor should close the editor. Reverted to full exit, verified: close → button correctly blue/inactive → one click reopens clean.
- [x] After Save, glow/effects persist on page after eventually closing — PASS, verified 2026-08-04 (container glow survived save→close)
- [x] **Saved edits survive an actual page reload** — FAIL → FIXED 2026-08-02: this was the most severe bug found tonight. Every saved edit was keyed to an element ID that only got assigned reactively on click and never persisted, so on a fresh reload zero elements had any ID and every saved edit silently failed to replay — no edit had ever survived a refresh for any element. Fixed by assigning IDs deterministically (DOM order) once on every load, before replay runs. Verified: same H1 edit persisted across 2 separate fresh reloads. Full record in `potch.md`. **Old localStorage edit data from before this fix should be cleared once, not trusted.**

## 7. Contact Form
- [x] No specific issue was ever reported this pass — ran the two regression checks below cold, both clean.
- [x] Blank submit does NOT show false success — PASS. Native `reportValidity()` correctly blocks submission before any network call; success box stays hidden.
- [x] Valid submit — PASS, though the checklist's "opens mailto draft" description is stale/inaccurate: current implementation is a real AJAX POST to Formspree (`fetch`, not `mailto:`), better than a mailto link. Verified (fetch mocked to avoid a live third-party POST during testing, not the real endpoint): correct POST+FormData to the real Formspree URL, green "Transmission Received" success shown, form reset, button text updates. Code's failure path (network/non-OK response → red "Transmission Failed" message) read correctly but wasn't separately live-triggered.

## 8. Nav & Page Behavior (outside editor)
- [x] Solutions/About links scroll to correct sections — INCONCLUSIVE via automated testing: code is correct (proper `querySelector` + `scrollIntoView`, verified in both `attachHandlers()` and `HandlerDispatcher`), and `scrollIntoView({behavior:'instant'})` on the same target works perfectly. But `{behavior:'smooth'}` (what the real buttons use) never completes in this automated browser — same class of limitation as the earlier `:hover`/native-paste gaps. Needs a real click to confirm, but nothing in the code looks wrong.
- [x] Get Started button works — same `scrollTo()` handler, same inconclusive-for-smooth-scroll caveat as above.
- [x] Theme toggle (dark/light) actually changes visible theme — FAIL → FIXED 2026-08-02: root cause was two independent handler-wiring systems (`attachHandlers()` in index.html + `HandlerDispatcher` class) both bound the same button, so every real click fired `toggleTheme()` twice, flipping the theme and immediately flipping it back. Guarded `toggleTheme()` against the re-entrant call. Verified live both directions (light→dark, dark→light), single real click each time, zero console errors. Full record in `potch.md`.
- [x] Edge Electrify link (clock icon) points to the live Keystone-hosted copy, resolves correctly — PASS. Modal opens correctly; the actual Keystone iframe target (`https://keystoneconstellation.com/applings/edge_electrify/index.html`) returns a real 200 OK, not broken/404.
- [x] Axxilak.com brand stamp (bottom-right) links out correctly — PASS (`href="https://axxilak.com"`, `target="_blank"`).

## 9. Cross-Cutting / Regression
- [x] Do a full cycle 3x in a row on 3 different elements — PASS. Ran 2026-08-02 after tonight's fixes (footer-link lock, cursor scoping, 3D removal, mixed-content text, live-caret sweep, Cancel/Close edit-mode-stay): 3 rounds × (text leaf, mixed-content paragraph, media image) select→close. Identical, clean results every round — `body.edit-mode` never dropped, mixed-content box showed the full sentence every time, no drift by round 3.
- [x] Check browser console for errors at each major step — PASS, zero console errors across the full 3×3 cycle plus a fresh baseline load.
- [x] Mobile/narrow viewport (320px) — FIXED 2026-08-02: palette was a fixed `w-96` (384px) regardless of viewport, overflowing both edges at 320px. Made responsive: full-width bottom sheet with 12px side margins and a `75vh` height cap below the `sm` (640px) breakpoint; restores the original fixed bottom-right 384px panel at `sm:` and up. Verified live at 320px (fits fully, 296px wide with margins) and at 680px/1280px (unchanged 384px desktop panel, correct position). Zero console errors.

---

## Notes / Findings Log
*Append here as we go — what failed, what the actual cause was, don't just check boxes silently.*

- **2026-08-02: Solutions section cards were completely unselectable** — Timothy: "None of the 'Solutions' are selectable, and that by itself is our boat sunk if we don't fix it." A blanket exclusion in `elementDetector.js` blocked all `#solutions` content from the editor, with no documented reason beyond a vague comment. Live-tested removing it (3 full open/select/save/close/reopen cycles, zero errors, nav unaffected) before committing to the fix. Removed the exclusion, replaced full visual suppression with a grid-safe selection cue. Full record in `potch.md`.
- **2026-08-02: dev server was serving a stale, wrong file** — `python -m http.server 8878` had drifted to a different, older directory somewhere earlier in the session, serving a 15KB page instead of the real 93KB `apex/index.html`. Explains several bug reports that didn't reproduce once restarted from the correct root. Correct root is `axxilak/` (URL `/Maizons/apex/index.html`), not `apex/` directly — the theme transition engine lives one directory above `apex/` and 404s otherwise.
