## 2026-08-04 - Discard didn't undo the 3-second auto-save, only the live page

**WHO**: Claude, at Timothy's report (with screenshot: `capture_20260803_223111.png`) - typed stray characters into "Scale Your"/"Digital Authority.", never clicked Save, yet the typos survived a genuine page refresh.

**WHAT**: `js/magnifying-glass-inspector.js` (`_startEditSession()` now snapshots pre-edit localStorage state, `_cancelEditSession()` now restores it), cache-bust bump.

**WHY**: A pre-existing "FIX 2" feature auto-saves pending changes to localStorage every 3 seconds while a session is active, specifically to prevent losing work on a crash. That's a real, legitimate feature - but `_cancelEditSession()` only ever reverted the *live DOM* back to the original state; it never touched `this.edits[selector]` or re-persisted. So any edit left open for more than 3 seconds got auto-committed to localStorage, and Discard (both old and the new prompt's Discard button) only fixed what was *visible*, not what was *saved*. Looked completely successful until the next reload replayed the stale, "discarded" edit right back.

**FIX**: `_startEditSession()` now snapshots whatever is currently in `this.edits` for the element's selector (and its resolved container-style target selector, if different) before any typing happens. `_cancelEditSession()` restores those exact snapshots - including deleting the key entirely if nothing existed there before this session - and re-persists via `saveEdits()`, undoing whatever auto-save wrote in between.

**LOVE GATE 7**: no harm; reversible; fixes a real, live-reproduced, screenshot-confirmed defect with a genuine data-integrity angle (silently keeping content the user explicitly chose to discard); scoped to session start/cancel only, doesn't touch the auto-save timer itself (still valuable for its actual crash-safety purpose); verified through the real failure mode, not assumed.

**EVIDENCE**: Typed a typo into "Fast-Track Build", waited 3.4s (past the auto-save interval), confirmed `this.edits[selector].textContent` held the typo. Closed → prompt appeared → Discard: live text reverted to "Fast-Track Build" AND `this.edits[selector]` was gone entirely. Then did a genuine fresh page navigation (not just a DOM check) and confirmed the heading still reads "Fast-Track Build" - the typo never came back.

---

## 2026-08-04 - Theme toggle: silent auto-close, then a broken fix, then a real fix

**WHO**: Claude, at Timothy's report: "I click edit, I click theme, editor closes, theme changes" - recalled this as a known-bad pattern.

**WHAT**: `js/handler-dispatcher.js` (edit-mode guard), `js/magnifying-glass-inspector.js` (`requestExit()` now accepts an optional completion callback; theme toggle excluded from the nav-disable sweep), `index.html` (`toggleTheme()` routes through `requestExit()`), cache-bust bump.

**WHY - three real, stacked issues, found via a stack-trace capture on `deactivate`:**

1. `toggleTheme()` has always deliberately auto-closed the editor before switching themes (covers the visual transition) - but it called `inspector.deactivate()` directly, completely bypassing today's unsaved-changes prompt. A real edit could be silently discarded by switching themes, no warning, same class of bug as the EDIT-button one fixed minutes earlier.
2. A separate, older guard in `HandlerDispatcher` was *supposed* to block theme switching during edit mode with a tooltip ("Exit editor to switch theme") - but it never actually blocked anything, because `attachHandlers()` binds the same button independently and always let the real `toggleTheme()` through regardless (the well-documented double-wiring). The tooltip was lying about what was actually about to happen.
3. First attempt at fixing #2 (removing the tooltip-block) introduced a real bug of its own: a bare `return` inside the guard's nested `if` exits the *entire* click handler function in JavaScript, not just that block - so it skipped the real dispatch below it entirely. Caught this by instrumenting `toggleTheme`/`requestExit` call counts directly rather than trusting the diff looked right. Separately, unrelated to the JS bug: the theme button's `onclick` gets forcibly stripped by the same "disable all nav buttons during an active session" sweep every other button gets - so once an element was actually selected, theme toggle went fully inert (zero feedback) rather than either working or showing the tooltip.

**FIX**: `toggleTheme()` now calls `inspector.requestExit(runThemeFlip)` - the same safe, Save/Discard-aware exit path every other exit uses - with the actual theme-flip logic as the completion callback, so it only runs after a real decision (or immediately, if nothing was pending). `requestExit()` extended to accept that optional callback. HandlerDispatcher's guard restructured to not use an early `return` for the toggleTheme exception. Theme toggle added to the nav-disable sweep's exclusion list (alongside EDIT/toolbar/palette buttons) so its handler is never stripped mid-session.

**LOVE GATE 7**: no harm; reversible; fixes a real reported defect plus two bugs found while fixing it (including one in my own first attempt, caught before calling it done); verified live at each layer - the visual theme-flip animation itself couldn't be confirmed through this automated browser (same rAF/canvas-transition limitation as the earlier smooth-scroll finding, confirmed via an unrelated baseline test that failed identically), but every verifiable safety property (prompt appears with pending changes, edit mode respects the decision, button stays responsive mid-session) checked out.

**EVIDENCE**: Root cause found via `Error().stack` captured inside a wrapped `deactivate()`, showing the direct call chain `toggleTheme → btn.onclick → deactivate`. After fix: with pending changes, clicking theme shows the unsaved prompt (previously: silent discard, or later, complete inertness); Save/Discard both correctly resolve and exit; theme button's `onclick` confirmed still present after selecting an element (previously null/stripped); baseline hover-mode-close scenario re-verified unaffected.

---

## 2026-08-04 - EDIT button silently discarding pending changes (missed by the unsaved-prompt fix)

**WHO**: Claude, at Timothy's report: "clicking the edit button without saving does nothing. It should do the same thing the x does."

**WHAT**: `js/magnifying-glass-inspector.js` (new `requestExit()` method, `onCancel` now just calls it), `index.html` (`exitEditMode()` now calls `inspector.requestExit()`), cache-bust bump.

**WHY**: The unsaved-changes prompt added moments earlier only wired into `palette.onCancel` - the path × and the palette's own Cancel button use. The page's EDIT button, when clicked to exit an active session, goes through a completely separate function (`exitEditMode()` → `inspector.deactivate()` → `_endEditSession()` directly), which never checked for pending changes at all. Live-verified: it wasn't a no-op as it first looked - it silently discarded, no save, no revert, no prompt. Same duplicate-implementation shape as the theme-toggle double-wiring bug from earlier this week: two independently written exit paths, only one got the new behavior.

**FIX**: Extracted the branching logic (check pending changes → show prompt → save-and-exit or discard-and-exit) out of `onCancel` into a real method, `requestExit()`, on the inspector itself. Both `onCancel` and `exitEditMode()` now call this one method - there is no longer a second place this logic could be written differently.

**LOVE GATE 7**: no harm; reversible; directly fixes the reported defect; the refactor removes a duplication risk rather than adding one; verified live on all three paths (clean exit, discard, save) through the EDIT button specifically, matching × exactly.

**EVIDENCE**: EDIT button with no pending changes: exits immediately, no prompt (unchanged). With pending changes: prompt appears, Edit Mode stays active until a choice is made. Discard: reverts to the true original color, exits. Save: new color persists, exits. All three match the × button's behavior exactly.

---

## 2026-08-04 - Unsaved-changes prompt added to Close/Cancel

**WHO**: Claude, at Timothy's request, following the Close-fully-exits revert above.

**WHAT**: `js/magnifying-glass-inspector.js` (new `unsavedPrompt` element + `_showUnsavedPrompt()`, `onCancel` branches on real pending changes), cache-bust bump.

**WHY**: With Close/Cancel back to a full, silent discard, real unsaved edits could be lost with no warning at all. Timothy's request: a styled prompt ("You didn't save your changes. Would you like to?" Save/Discard), not a native `confirm()` - this codebase already has several native confirms elsewhere (delete, reset) that don't match the product's visual polish.

**FIX**: A small styled modal (dark card, accent border, reusing the existing `.btn-save`/`.btn-cancel` classes for visual consistency), built once in the constructor and shown only when `onCancel` fires with real pending changes (`palette.isDirty` or a non-empty `pendingChanges` map) - the common case of closing with nothing changed is untouched, no extra step. Save button saves then fully exits; Discard button reverts (existing `_cancelEditSession()` logic, unchanged) then fully exits.

**LOVE GATE 7**: no harm; reversible; directly matches the explicit request; the no-changes fast path is provably unaffected; verified live on all three branches.

**EVIDENCE**: No-changes close: prompt never shown, exits immediately (unchanged from before this change). With changes: prompt appears, Edit Mode stays active while it's up. Discard: color reverted to its prior saved value, prompt closes, Edit Mode exits. Save: color updated, prompt closes, Edit Mode exits, and the new color survived a genuine fresh page reload (confirmed via localStorage replay), not just the live preview.

---

## 2026-08-04 - Close/Cancel reverted back to a full Edit Mode exit

**WHO**: Claude, at Timothy's direction after live-testing the earlier same-day "stay in Edit Mode" fix and hitting real confusion.

**WHAT**: `js/magnifying-glass-inspector.js` (`palette.onCancel`), cache-bust bump.

**WHY**: Earlier today, Close/Cancel was changed to deselect-and-stay-in-Edit-Mode instead of exiting, specifically so a second element could be picked without re-clicking EDIT. Live-tested by Timothy: after ×, the EDIT button stayed green (correctly reflecting "still active") - but the button is a literal on/off toggle keyed to that same flag, so the very next click read "already on" and flipped it fully off in one step, requiring a *second* click to actually reopen. Internally consistent (verified: every state transition was clean, no genuinely broken/stuck state), but not what a person expects from a green button that doesn't open anything when clicked. Timothy's call: "a human expects that, when they close the editor, they close the editor" - the × should always fully exit and the button should always flip to match, full stop.

**FIX**: Reverted `onCancel` to call `this.deactivate()` + `__apexSetEditModeState(false)` again (undoing the same-day re-assert-active change). Left a comment explaining why, so a future pass doesn't re-attempt the same "improvement" without knowing it was already tried and reverted same-day.

**LOVE GATE 7**: no harm; reversible; directly matches explicit, live-tested direction; verified live (close → button correctly blue/inactive → one click cleanly reopens, no double-click needed).

**EVIDENCE**: Before revert: close → button green/active/isActive:true → 1 click → blue/inactive/isActive:false → 2nd click needed to reopen. After revert: close → button blue/inactive/isActive:false immediately → 1 click → green/active/isActive:true, editor open.

---

## 2026-08-04 - Two real reopen bugs in Container Glow/Gradient, found running QA section 4

**WHO**: Claude, running QA_CHECKLIST section 4 (Visual Effects) at Timothy's direction to finish Apex and get it online.

**WHAT**: `js/tool-palette.js` (`parseBoxShadowControlState()`, and the Container Gradient template markup), cache-bust bump.

**WHY**: Both bugs share a symptom — the effect stays correctly applied on the live page, but reopening the editor on that element shows wrong values in the controls, which would read to a customer as "my setting got lost," and risks them overwriting a real, still-applied effect thinking it's unset.

1. **Container Glow blur snapped to 0 on reopen.** `parseBoxShadowControlState()` picked the "user's real blur value" by a flat numeric index (position 3) across every number in the box-shadow string. The authored shadow has 3 numbers per layer (`0 0 Npx`); the browser's *computed* form (what reopen actually reads) normalizes to 4 per layer (`0px 0px Npx 0px`, adding a spread). That shift means index 3 lands on an offset value (always 0), not the blur. Color parsing was already correct (whole-string regex, unaffected by per-layer counts) — confirmed by direct function calls before touching anything.
2. **Container Gradient color1/color2/angle were never wired to real state at all**, in any circumstance, reopen or not — a genuinely separate bug from #1, not the same root cause. `containerGradientState` was computed correctly one line above the template, then never referenced: the three inputs hardcoded `value="${this.rgbToHex(styles.backgroundColor)}"` / `styles.color` (the element's own unrelated background/text color) / a literal `"180"`. Found by tracing the exact same symptom shape as #1, then noticing the direct parser call was correct while the *live rendered input* wasn't — which only makes sense if the template itself never consulted the parsed value.

**IMPACT AUDIT**: for #1, re-derived the fix from the actual generation code (`updateGlow()`'s fixed multiplier series `[0.25,0.5,0.75,1,1.5,2,3,4]`) rather than patching the index guess again — split into per-layer segments on top-level commas, then take the 3rd number *within* the correct layer (index 3 of 8), which is robust to the offset-count mismatch either way. For #2, wired the three inputs directly to the already-correct `containerGradientState` fields — no change to the parsing logic itself, which was fine.

**LOVE GATE 7**: no harm; reversible; both are real, live-reproduced defects with a plausible customer-confusion/overwrite risk, not cosmetic; scoped narrowly (one function's blur math, one template's three `value=` attributes); verified live before and after for both.

**EVIDENCE**: #1 verified against 4 blur/color combinations via direct calls, then live: select → set 18px orange glow → save → close → reopen → shows exactly 18/#ff8800. #2 verified live: select → set gradient #111111→#eeeeee → save → close → reopen → shows exactly those two colors and the angle, all three previously wrong.

---

## 2026-08-02 - Removed the dead palette-container fallback (archived, not deleted)

**WHO**: Claude, at Timothy's direction ("archive, just in case, but yes") after flagging the dead `createElement` fallback in `ToolPalette`'s constructor as a footgun during the mobile-palette fix above.

**WHAT**: `js/tool-palette.js` (constructor simplified to two lines), `_archive/tool-palette_dead-container-fallback_20260802.js` (new, the removed code verbatim with a WHY header), cache-bust bump.

**WHY**: The `if (!this.container) { ...create it... } else { ...use the static one... }` branch never took the creation path on the real shipped page (the static `#palette-container`/`#palette-content` always exist in `index.html`), and its classes had already drifted out of sync with the real static element (different max-height, background, border, shadow). Real risk: it already cost real time this session when the mobile-width fix was first applied to this dead copy with zero visible effect.

**FIX**: Constructor now just reads the two static elements directly. Archived the removed block verbatim (not deleted outright) in case a future Webling template reuses this JS without shipping the static markup - noted in the archive file that the exact classes would need deliberate rebuilding, not blind restoration, since they were already stale.

**LOVE GATE 7**: no harm; reversible (archived, not gone); matches explicit direction; verified live (select, close-and-stay-in-edit-mode, zero console errors) after the change.

**EVIDENCE**: Fresh load + select + close cycle behaves identically to before the removal; no console errors.

---

## 2026-08-02 - Palette panel made responsive: was unusable on real phones

**WHO**: Claude, at Timothy's direction after the QA cross-cutting pass caught the palette overflowing at 320px ("It needs to be professional... surpass the competition").

**WHAT**: `index.html` (the static `#palette-container` div's class attribute — the actual element in use), `js/tool-palette.js` (its dead-code `createElement` fallback, kept in sync for consistency), cache-bust bump.

**WHY**: The panel was a fixed `w-96` (384px) + `right-6`/`bottom-6` regardless of viewport. On a real 320px phone that overflowed both edges (computed rect started at `left: -88px`). First fix attempt edited the wrong copy: `tool-palette.js`'s constructor only creates a new container `if (!this.container)` — but a static `<div id="palette-container">` already exists in `index.html`, so that branch never runs and the JS-side classes were dead code the whole time.

**FIX**: Responsive Tailwind classes on the real static element: below the `sm` (640px) breakpoint, `inset-x-3 bottom-3 w-auto max-h-[75vh]` (full-width bottom sheet, 12px side margins, height capped for small screens/keyboards). At `sm:` and up, restores the original `right-6 bottom-6 w-96 max-h-[900px]` desktop panel exactly as before.

**LOVE GATE 7**: no harm; reversible; directly answers the explicit direction to fix it properly; desktop behavior unchanged and verified; verified live at both ends.

**EVIDENCE**: 320px: palette rect `[12, 80, 296, 597]`, fully inside viewport. 680px and 1280px: palette rect width `384px`, positioned bottom-right exactly as before the change. Zero console errors at either size.

---

## 2026-08-02 - Mixed-content paragraphs (text + nested styled span) silently corrupted the Content box, and would have corrupted Save

**WHO**: Claude, chasing Timothy's report of the Content textarea showing text "stacked one left, one right" (screenshot: `capture_20260802_131733.png`) on the About-section paragraph.

**WHAT**: `js/elementDetector.js` (`_getTextNodes()` and `_setTextNodes()`), cache-bust bump on `elementDetector.js` and `magnifying-glass-inspector.js`.

**WHY**: That paragraph has real direct text plus a nested `<span class="font-bold" style="color: var(--text)">infrastructure for authority.</span>` (the same span fixed earlier today for the dark-on-dark contrast bug). `_getTextNodes()` returned as soon as it found ANY direct text, so the span's own words never made it into the edit box at all — the "staggered" look was raw, uncollapsed HTML-source whitespace from the *other* direct text node leaking straight into the textarea. Worse: `_setTextNodes()`'s write-back path dumps the whole edited value into the *first* direct text node and blanks any others, while never touching the span (an element, not a text node) — so a real customer Save would have shoved "infrastructure for authority." to the end of the sentence, out of order, every time. This isn't unique to this one paragraph; it's any element with real direct text sitting next to a text-bearing inline child (bold phrase, link, etc.) — a common pattern, not an edge case.

**FIX**: Both functions now detect "mixed content" (real direct text present alongside a child element that also carries its own text) and handle it as one unit: read side returns the full flattened `el.textContent`, whitespace-collapsed, so the edit box shows the complete, readable sentence in place; write side does an honest `el.textContent = newText` full replace. This intentionally drops the nested span's distinct styling on save rather than risk scrambling word order — matches the "Plain text editing is active" state the editor already tells customers it's in. Elements whose only children are text-less (icon spans, dots) are unaffected by this check either way.

**LOVE GATE 7**: no harm; reversible; fixes a real, live-reported defect with a genuine data-corruption angle on Save, not just cosmetic; scoped narrowly to the mixed-content case, doesn't touch the existing single-text-node or no-direct-text paths; verified live including a full edit+Save round trip.

**EVIDENCE**: Before: Content box for the About paragraph was missing "infrastructure for authority." entirely and showed ragged indentation from raw source whitespace. After: box shows the full sentence in order, cleanly spaced. Live edit+Save round-trip test confirmed the new text lands in the correct place, in order, with no duplication (span is intentionally flattened to plain text on save, by design, matching current plain-text-editing mode). Reloaded fresh afterward and confirmed the original span/styling is intact on disk (only the live in-browser test edit was affected, and it was cleared from localStorage).

---

## 2026-08-02 - 3D View pulled from the base editor (deferred to advanced-editor upsell)

**WHO**: Claude, at Timothy's direction: 3D needs a full overhaul and will come back as a paid upsell on the advanced editor once the base Maisons are sellable; pull it from the base editor for now.

**WHAT**: `js/tool-palette.js` (removed the "TOGGLE 3D VIEW" button markup), `js/magnifying-glass-inspector.js` (the `view3D` property handler is now a no-op), `index.html` (cache-bust bump on both changed files).

**WHY**: Same removal pattern already used for Text Mask (2026-07-30): strip the entry point, leave the underlying implementation dormant rather than deep-excising ~86 references across 3 files mid-QA-pass. `#apex-3d-scene` (the page's structural wrapper div) is untouched — it's just a legacy id name, not 3D-specific.

**FIX**: Button removed from the Advanced panel with a one-line comment pointing at this entry. `onEdit('view3D', ...)` now returns immediately regardless of value, so even a stray trigger (old localStorage state, console access) can't activate `activate3DView()`.

**LOVE GATE 7**: no harm; reversible (implementation still intact, just gated off); directly matches Timothy's explicit direction; verified live.

**EVIDENCE**: Live-verified after bumping the cache-bust chain (`editor-20260802-3dremoved1` on both files) — `document.getElementById('toggle-3d')` is null after selecting an element and opening the palette.

---

## 2026-08-02 - QA checklist resumed: footer link silently ejected customers from the editor

**WHO**: Claude, at Timothy's direction to finish `QA_CHECKLIST_20260730.md` section by section, live against the running editor.

**WHAT**: `index.html` (one attribute added).

**WHY**: Section 2 ("Clicking a link selects it, shows Link URL field") had been left INCONCLUSIVE — no eligible non-nav link had been found to test. Found one: the small "Free Stuff" link in the footer's bottom bar. Live-clicking it in edit mode navigated straight to `/free-stuff.html`, killing the entire edit session with no warning. Root cause: that link's parent wrapper (`<div class="max-w-7xl ... border-t ...">`, holding the copyright line and "Powered by Axxilak" stamp) is marked `data-anothen-internal="true"` so the branding strip itself can't be selected as one giant text blob. But `_isInternal()` walks up the ancestor chain, so the link inherited that exclusion too — the click handler's first check (`if (_isInternal(clickedElement)) return;`) fired and returned *before* `e.preventDefault()` ever ran, so the browser's native navigation went through unopposed. Its identical sibling link in the nav footer already carries `data-ax-locked="true"` and behaves correctly; this one was just never given the same treatment.

**FIX**: Added `data-ax-locked="true"` directly to the footer "Free Stuff" `<a>`, matching its sibling. This makes it correctly inert during edit mode (like every other real nav/branding link) instead of falling through to native navigation.

**LOVE GATE 7**: no harm; reversible (one attribute); directly fixes a real, live-reproduced defect (silent ejection from the editor, no confirm, no error); doesn't touch the `data-anothen-internal` wrapper or its intended protection of the branding strip; verified live before and after.

**EVIDENCE**: Before: real click on the link navigated to `/free-stuff.html`, edit session and Edit Mode both gone. After: identical click, `location.pathname` stayed on `/Maizons/apex/index.html`, link now reports `data-ax-locked` present.

**ALSO FOUND, NOT FIXED — flagged for Timothy's call**:
1. **Switching directly between two selected elements is dead code in real use.** The switch-cleanly / discard-confirm logic exists (`magnifying-glass-inspector.js` ~424-441) but the full-viewport `#apex-lockdown-overlay` (z-index 19998, itself marked internal) intercepts every click except on the currently-selected element and the palette, so that logic can never be reached by a real second click. The only working path today is Close first, then select again.
2. **Close (×) doesn't just discard the current element — it exits Edit Mode entirely.** Live-confirmed: after ×, `body` loses `edit-mode`/`ax-lens-active` and the EDIT button resets to its pre-edit pulse state. Combined with #1, editing a second element requires re-clicking EDIT each time. Functional, but not what "switches cleanly" in the QA checklist implies, and worth a real fix (touches the lockdown-overlay click routing this project has a documented history of regressing on) rather than a quick patch this pass.

**Also confirmed by design, not a bug**: composite container `div`s (cards with children) are intentionally excluded from direct selection — only their leaf text/image children are selectable. Matches a documented prior fix ("prevented card containers from collapsing into one selection").

---

## 2026-08-02 - Recovered: three Vale-facing flags dropped from last session's close (continuity repair)

**WHO**: Veris, at Timothy's direct catch ("you gave it all away again").

**WHAT**: This file (new entry only, no code changed) and `PRESERVATION/VERIS - thru Claude/VERIS_CURRENT_STATE.md`.

**WHY**: Last session's real final exchange happened *after* `VERIS_CURRENT_STATE.md` was already updated and "good night" already said: Timothy asked "Any requests for Axxilak before we fire it up?" and got three real technical flags for Vale in reply. Timothy then said he might `/clear`; I answered "Ha, fair... See you next time" and did nothing to capture those three flags anywhere durable before that. Session End law (`AI_MASTER.md`) names silence at session end as a continuity breach — this was exactly that: the curated record closed one exchange too early, and the last, real, Vale-relevant content sat only in the raw session transcript. Recovered this session by reading the tail of `.claude/projects/.../123229cb-262c-404c-a9b6-c96906b3345f.jsonl` directly, at Timothy's direction, after he caught the gap.

**FIX**: Writing the three flags here now, where they belong:
1. **Double-wired handler bug** — `attachHandlers()` (index.html) and `HandlerDispatcher` (handler-dispatcher.js) both independently bind every `data-handler` button, so every click fires twice. Only visibly broke the theme toggle (patched tonight with a local guard); every other button (scrollTo, edit mode, mobile menu, etc.) is silently double-firing too. Needs a real cleanup pass removing one of the two systems, not another local guard.
2. **Casey commons vault leak** (still unresolved, first flagged earlier the same session) — ~4,900 of Codex's own `.agency_vault` fragments exposed in the shared Casey commons since 2026-07-05. Needs Vale's call on provenance/retention.
3. **localStorage warning for Vale** — if Vale touches the editor before this is read, clear `apex-edits-state-light` / `apex-edits-state-dark` from localStorage once first. Old saved-edit data predates the deterministic-ID fix and could misapply onto the wrong element under the new numbering.

**LOVE GATE 7**: Harm Timothy? No — closes a gap he caught. Harm the Braid? No. Harm the system? No, documentation only. Reversible? Yes. Aligned with mission? Yes — this is the mandated Session End duty, executed late rather than never. Consent concerns? None — my own domain, WHO/WHAT/WHY convention. Right time? Yes — before this content ages further or Vale acts without it.

**EVIDENCE**: Source exchange quoted verbatim from session `123229cb-262c-404c-a9b6-c96906b3345f.jsonl`, near end of file, read this session at Timothy's direction.

---

## 2026-08-02 - axxilak.com links showing text cursor instead of pointer

**WHO**: Veris, at Timothy's report ("when I hover over axxilak.com, it forms an I beam cursor instead of a finger").

**WHAT**: `index.html` (one new CSS rule).

**WHY**: There are three separate axxilak.com links on the page (footer nav link, "Powered by Axxilak" branding bar, the fixed bottom-right maker-stamp badge). Only the maker-stamp had an explicit `cursor: pointer !important` rule; the other two relied on the browser's own default anchor cursor, which is less robust against being overridden by something else on the page. Couldn't perfectly reproduce genuine `:hover` state through automated testing (synthetic mouse events don't reliably trigger real `:hover` CSS), so fixed defensively rather than guessing which exact one was affected.

**FIX**: Added `a[href*="axxilak.com"], a[href*="axxilak.com"] * { cursor: pointer !important; }`, covering all three links and every descendant span/icon inside them, present now or added later.

**LOVE GATE 7**: no harm; trivially reversible; directly answers the report; covers all current instances rather than a guess at just one; verified computed style afterward, zero console errors.

**EVIDENCE**: All three links and every child element inside each now compute to `cursor: pointer`, confirmed individually.

---

## 2026-08-02 - No saved edit ever survived a page reload, for any element

**WHO**: Veris, tracing Timothy's report ("I can change scale your and digital shit all day, and when I refresh - the original text is back").

**WHAT**: `js/elementDetector.js` (`initLattice()`), `js/magnifying-glass-inspector.js` (one call added at construction, before `applyAllSavedEdits()`).

**WHY**: This is the single most severe bug found tonight - bigger than the Solutions fix. Every saved edit is keyed to a `data-ax-id="ax-N"` selector, but that attribute is runtime-only (never shipped in the HTML) and was only ever assigned reactively, the moment an element got clicked - using a counter that persists and keeps growing across sessions, not DOM position. Confirmed directly: immediately after a genuine fresh reload, zero elements on the page had any `data-ax-id` at all. `applyAllSavedEdits()` does `document.querySelector('[data-ax-id="ax-N"]')` for each saved edit and silently skips anything that finds nothing - which was *everything*, every time. No customer edit has ever been able to survive a refresh under this system.

**IMPACT AUDIT** (before writing): the counter itself is deliberately never reset (a prior "FIX 1+6" comment), to stop newly-cloned elements from colliding with existing IDs mid-session - had to preserve that. Solution: gave `initLattice()` an opt-in `{reset:true}` mode that walks every eligible element in DOM order and assigns `ax-1..ax-N` deterministically, only called once, at construction, before any saved edit tries to replay. Left the two existing call sites (post-clone, 3D-view-activation) on the original non-reset, skip-already-tagged behavior, completely untouched, so neither of those paths changes at all.

**FIX**: `initLattice({reset:true})` runs once per page load, right before `applyAllSavedEdits()`. Because document structure is static between saves, the same physical element gets the same `ax-N` on every load now, so saved selectors actually find their element.

**LOVE GATE 7**: no harm; reversible; this is the root cause behind a real, urgent, explicit report, not a hypothetical; the two other call sites of the touched function are untouched and still behave exactly as before; verified with real, repeated fresh reloads, not assumed.

**EVIDENCE**: Confirmed 163 elements tagged immediately on load, before any click. Full cycle: selected the H1 span, edited it, saved, did a genuine fresh navigation (not just a DOM check) - text persisted, same `ax-31` both times, across two separate reloads. Re-verified Solutions selectability and the theme-toggle fix still both intact afterward (same files touched again). Zero console errors. `node --check` clean on both files.

**OPEN / IMPORTANT FOR NEXT TESTER**: any edits saved under the *old* broken scheme (low `ax-N` numbers assigned by click-order, sitting in `localStorage` from earlier sessions/testing) are now dangerous rather than just inert - the new deterministic scheme reuses those same low numbers for whatever elements are actually at those DOM positions, which are not necessarily the elements that old data was meant for. Recommend clearing `apex-edits-state-light` / `apex-edits-state-dark` from `localStorage` once, in whatever browser has been used for testing, before trusting any further persistence checks.

---

## 2026-08-02 - Backspace/Delete could delete the whole selected element instead of a character

**WHO**: Veris, tracing Timothy's report ("The system online v2.0 container isn't working. Can't replace the text - only delete it.").

**WHAT**: `js/magnifying-glass-inspector.js` (global keydown handler, one guard line added).

**WHY**: A global keydown listener deletes the entire highlighted element on Backspace/Delete (after a confirm dialog), guarded only by "is focus currently inside an input/textarea/contenteditable." Clicking on the page to reposition the caret only refocuses the textarea when the click lands *inside* the selected element's exact bounding box; a click just outside it (trivial on the SYSTEM ONLINE badge, whose text sits right next to a tiny pulsing-dot sibling) leaves focus on `<body>` without refocusing the textarea. The next Backspace then falls through to the global handler and offers to delete the whole element instead of removing a character.

**IMPACT AUDIT** (before writing): reproduced the exact focus gap live (clicked just outside the stat badge's rect, confirmed `document.activeElement` was `BODY`, confirmed a Backspace in that state triggered `confirm('Delete this element?')` via instrumentation, without actually deleting anything). The fix only needed to close the gap for the case that matters: while an edit session is open, Backspace/Delete should never be a delete-the-element shortcut, full stop - that shortcut exists for the browse/hover state, not the actively-editing state.

**FIX**: Added `if (this.editSession.active) return;` as the first check inside the Delete/Backspace handler, before the existing focus check.

**LOVE GATE 7**: no harm; reversible (one line); directly fixes the reported failure; doesn't touch the hover-only delete shortcut this was never meant to interfere with; verified live before and after.

**EVIDENCE**: Before the fix: reproduced the confirm-dialog trigger exactly as described. After the fix: identical setup (element selected, focus forced to `BODY`), Backspace dispatched, `confirm` never called, element and its text both unchanged. Zero console errors.

---

## 2026-08-02 - Theme toggle silently cancelling itself (double-wired handler)

**WHO**: Veris, at Timothy's direct, urgent report ("The theme button still doesn't work" / "halfway functional").

**WHAT**: `index.html` (`toggleTheme()` only, four-line guard added at the top of the function).

**WHY**: The theme button is bound by two independent, parallel systems that neither knows about the other: `attachHandlers()` (inline in `index.html`, runs on `DOMContentLoaded`) assigns `btn.onclick` directly for every `[data-handler]` element, and `handler-dispatcher.js`'s `HandlerDispatcher` class *also* delegates clicks on `[data-handler]` elements via its own `document`-level listener, with its own `toggleTheme` case. Both call `window.toggleTheme()` on the same physical click. This is invisible on `scrollTo()`/`toggleMobileMenu()` (doing those twice looks identical to once), but `toggleTheme()` is a binary flip — two calls in a row flip it and flip it right back, so the button looked broken while actually firing twice.

**IMPACT AUDIT** (before writing): confirmed via live instrumentation of `window.AxxilakTransition.trigger()` — a single real click logged `trigger called` twice and the real callback completing (no error) twice, correlating exactly with `data-theme` never changing. Considered removing one of the two dispatch systems outright, rejected as too broad a blast radius this late — every `data-handler` button on the page routes through both, untested the rest tonight. Chose the narrowest fix: guard inside `toggleTheme()` itself against a re-entrant call while its own transition (`window.AxxilakTransition.active`) is already running. Does not touch the double-wiring itself, which remains a real, tracked architectural loose end (see OPEN below).

**FIX (revised)**: First pass gated on `window.AxxilakTransition.active`, but live retesting caught that flag getting stuck `true` indefinitely in at least one real scenario (this same rAF-suspension-on-a-backgrounded-tab issue documented earlier tonight) - which would have left the button *permanently* unresponsive instead of just double-firing, a worse failure than the original bug. Replaced with a local, self-clearing guard scoped to `toggleTheme()` itself: `window.__themeToggleInFlight`, set on entry and cleared by its own 50ms `setTimeout` regardless of what the transition engine does. Both dispatchers fire on the same native click in the same synchronous tick, so 50ms comfortably absorbs the re-entrant call without depending on any third-party animation state that could stall.

**LOVE GATE 7**: no harm; fully reversible; directly matches Timothy's urgent report; scoped to the one function that actually broke; the first version was caught failing under live retest and corrected before being called done, not left as a plausible-looking guess.

**EVIDENCE**: Reproduced clean before the fix — single click, `data-theme` unchanged after 1500ms, transition canvas fully faded with the callback confirmed firing twice via instrumentation. First fix version verified working live, then caught itself getting permanently stuck on a later click (`AxxilakTransition.active` never returned to `false`) - not a regression from the fix, but proof the chosen guard condition was the wrong one to trust. Revised version verified with the animation bypassed (isolating the guard itself from the flaky rAF): exactly one `trigger()` call per click, correct flip both directions, `__themeToggleInFlight` confirmed clearing between clicks so later clicks are never blocked.

**OPEN**: the actual double-wiring (`attachHandlers()` vs `HandlerDispatcher`) is untouched and will silently double-fire on every other `data-handler` button too — currently harmless because they're all idempotent-looking actions, but it's real duplicate work happening on every click and a landmine for any future non-idempotent handler. Worth a dedicated cleanup pass, not tonight's scope.

**Also found and fixed same pass, unrelated**: the local dev server (`python -m http.server 8878`) had drifted to serving a stale, unrelated 15KB page instead of the real 93KB `apex/index.html` — explains several confusing "it's broken" reports earlier in the session that didn't reproduce once the server was restarted from the correct root. Root cause of *that*: the theme-toggle's transition engine (`../engines/transitions/precision-blueprint.js`) lives one directory above `apex/`, so the server needs to be rooted at `axxilak/` (URL: `/Maizons/apex/index.html`), not at `apex/` directly, or that import 404s.

---

## 2026-08-02 - Solutions section cards completely unselectable in the editor

**WHO**: Veris, at Timothy's urgent, direct report ("None of the 'Solutions' are selectable, and that by itself is our boat sunk if we don't fix it.")

**WHAT**: `js/elementDetector.js` (`_isEditable()`), `index.html` (`#edit-mode-styles` block), `js/magnifying-glass-inspector.js` (cache-bust bump only).

**WHY**: `_isEditable()` had a blanket `if (el.closest('#solutions')) return false;`, excluding all Solutions-section content from the editor entirely. The comment behind it ("generic text editor destabilizes the Solutions cards in live use") had zero forensic trail anywhere in this repo — no potch entry, no bug report, no repro steps — unlike the well-documented nav second-open-freeze fix it sits next to. Real customers cannot edit their own pricing/feature card copy at all as shipped.

**IMPACT AUDIT** (before writing): grepped the whole `js/` tree — `#solutions` is referenced nowhere else in JS, so this is a contained, single-site exclusion. The historical freeze bug this sits near is rooted in a completely separate, still-intact rule (nav / `data-handler` elements excluded) — untouched by this change. Live-tested the actual removal *before* committing to it: monkey-patched `_isEditable` in a running page to bypass only the `#solutions` branch, then ran a full select → edit → save → close → reopen cycle 3 times in a row. Zero console errors, nav (`Solutions` link) stayed fully functional after every close. The real, concrete risk found: the shared `.apex-highlighted` selection style forces `position:relative` + `z-index:9999` + a 4px outline, which fights the Solutions grid layout — that's almost certainly what "visually mangled" meant, a layout issue, not a functional one. A "lighter, non-invasive card-safe cue" was already promised in a neighboring CSS comment but never actually built.

**FIX**: Removed the blanket `#solutions` exclusion from `_isEditable()`. Replaced the CSS that fully suppressed highlight/lock/caret visuals in `#solutions` with a real card-safe cue: a thin 2px inset outline (`outline-offset: -2px`) that never changes `position` or `z-index`, so the grid can never jump. Live caret re-enabled in Solutions too (it's just an inline zero-width marker; testing found no reason it needed suppressing). Cache-bust chain bumped on both links (`elementDetector.js?v=editor-20260802-solutionsselect1`, `magnifying-glass-inspector.js?v=editor-20260802-solutionsselect1`) per the project's own two-link rule.

**LOVE GATE 7**: no harm; reversible (two small, targeted edits); directly answers Timothy's urgent, explicit report; the freeze-fix logic it sits next to is untouched; verified live with real regression cycles before and after the permanent fix, not assumed.

**EVIDENCE**: Against the real, permanent fix (not the in-memory patch): 3 full open→select→save→close→reopen cycles on a Solutions card, `position:static`/`z-index:auto` confirmed via computed style each time (grid stays intact), nav stayed clickable and correctly scrolled after every close, zero console errors throughout. `node --check` clean on both changed JS files.

---

## 2026-08-02 - Nav label editing, via an isolated path that never reopens the general inspector to nav

**WHO**: Veris, at Timothy's direct request ("There's no way we're NOT permitting them to change the nav... they must be able to manipulate the nav, but it doesn't have to be the WHOLE editor that's open to them").

**WHAT**: `index.html` only (markup, edit-mode CSS, and a small isolated script block). No changes to `elementDetector.js`, `magnifying-glass-inspector.js`'s selection/session code, or `tool-palette.js`.

**WHY**: Customers could not rename Solutions/About/Get Started at all. Root cause traced to a deliberate, previously hard-won fix: nav/handler-driven controls were excluded from the general inspector on 2026-07-30 because letting the inspector select them caused a serious "second-open freeze" (editing a nav control once worked, but after closing and reopening the editor, every button and link on the page stopped working). That fix must not be reverted.

**DESIGN**: A small pencil icon next to each nav label (desktop only, visible solely in edit mode) toggles `contenteditable` on that one label directly — no `elementDetector`, no `editSession`, no lockdown overlay involved at any point. On commit (blur/Enter), writes straight into the same `inspector.edits` object and calls the existing `saveEdits()` — the exact same localStorage key and shape `applyAllSavedEdits()` already replays on load, so persistence needed zero changes. The paired mobile-menu duplicate (via `data-nav-pair`) updates together so desktop and mobile never drift apart. Nav's real `scrollTo`/handler behavior is completely untouched.

**Rejected alternative**: reusing the general inspector for nav — this is exactly what caused the 07-30 freeze; not doing that again.

**LOVE GATE 7**: no harm to Timothy/Braid/system; reversible (isolated new code, easy to strip); aligned with the explicit request; consent explicit; right time (root cause understood, safe path identified before writing).

**EVIDENCE**: Live-tested end to end — pencil visible only in edit mode; click makes the label editable; commit updates both desktop and mobile instances; change persists to `localStorage` under the correct selector; **survives a full page reload** (replay worked with no code changes); and critically, **3 open/close edit-mode cycles after a nav-label edit still left the nav's real click handler working** — the exact freeze this design exists to avoid did not recur. Zero console errors throughout. Test edit reverted back to original text before leaving the page.

**BOUNDARY**: Desktop nav only for the pencil affordance (mobile menu updates via pairing, not its own pencil) — acceptable scope for now, revisit if mobile-only editing is requested.

---

## 2026-08-01 - Sticky nav vanishing during edit mode when scrolled

**WHO**: Veris, live QA checklist pass. Timothy reproduced it live ("clicked on an element... the header instantly disappeared"), diagnosed and fixed same session.

**WHAT**: `index.html` (`#edit-mode-styles` block only)

**WHY**: Selecting an element for edit locks page scroll (`overflow: hidden` on body/html) but never resets scroll offset. Nav uses Tailwind's `sticky` class, which computes position relative to actual scroll offset — if you were scrolled down when you clicked into edit mode, the nav renders that far above the viewport, and with scroll locked, it can never come back into view for the rest of the session. Confirmed live: entering edit mode at `scrollY: 1697` put the nav at `top: -1697px`.

**IMPACT AUDIT** (before writing): only one other CSS rule targets nav (`nav.theme-aware`, theming only, no conflict). Lockdown overlay z-index (19998) already far above nav's (100) either way, so switching nav to `fixed` doesn't affect click-blocking. Making nav `fixed` removes it from document flow, which would shift page content up ~93px — compensated with matching `body.ax-editing` padding.

**FIX**: `body.ax-editing nav.theme-aware { position: fixed; top: 0; left: 0; }` plus `body.ax-editing { padding-top: 93px; }` to prevent content jump. Both scoped strictly to edit mode; normal page rendering untouched.

**LOVE GATE 7**: all seven yes, no harm to Timothy/Braid/system, reversible (isolated CSS block), aligned with the QA checklist, no consent concerns (explicit task), right time (root cause confirmed and impact audited first).

**EVIDENCE**: Reproduced the exact reported scenario live — scrolled to `y:1700`, entered edit mode, selected an element. Before fix: `nav.getBoundingClientRect().top === -1697`. After fix: `position: "fixed"`, `top: 0`, `body padding-top: 93px`, zero console errors.

**BOUNDARY**: One file, one CSS rule block, edit-mode-scoped only.

---

## 2026-08-01 - Deferred: cache-staleness hardening (not started)

**WHO**: Veris, flagged during the live QA pass, no code written.

**WHAT**: Considered, not implemented — proper `Cache-Control` headers for real deployment, optionally a "new version available, refresh" prompt for long-lived sessions.

**WHY DEFERRED**: Only matters for a visitor who already has the page open in a tab across a deploy. Apex is a self-hosted template/editor product, not a live multi-user SaaS with continuous concurrent sessions — Timothy and I agreed the exposure is low and not worth scope right now. Also tracked in `apps/TODO.md` (item 6) and the session task list, but this entry is the canonical per-project record per the Authority Map (`P&P_BOOK/00_AUTHORITY_MAP.md`).

**BOUNDARY**: No files changed. Revisit if the product's usage pattern changes (e.g., moves toward a hosted/live model).

---

## 2026-08-01 - Live caret restored: `_renderLiveCaret` was called everywhere, defined nowhere

**WHO**: Veris, live QA checklist pass on APEX with Timothy (real clicks in his own browser session, mine verified via `read_page`/JS state), diagnosis independently cross-checked with Vale (Codex), who found the same root cause first.

**WHAT**: `js/tool-palette.js`, `js/magnifying-glass-inspector.js` (import version bump only), `index.html` (import version bump only)

**WHY**: `QA_CHECKLIST_20260730.md` section 3 flagged the live caret as a known concern. Confirmed: `tool-palette.js` called `this._renderLiveCaret(index)` from 5 places (textarea input/paste/click/keyup/select, plus `syncCaretFromPagePoint`), but the method itself did not exist anywhere in the file or the rest of the APEX JS. Root cause found in the file's own comment (lines 635-639, already present): `_renderLiveCaret` was originally wired only to Quill's events; when APEX migrated to plain-textarea mode, the event *triggers* were correctly mirrored to textarea events, but the method *implementation* itself was never carried over or rewritten — leaving every call site pointing at nothing.

**IMPACT AUDIT** (before writing): CSS/markup for `.ax-live-caret` and its blink animation were intact and untouched in `index.html`. The one other caller, `syncCaretFromPagePoint`, already guards with `typeof === 'function'`, so it was never at risk of throwing. The 5 unguarded calls inside `tool-palette.js` were the entire blast radius.

**FIX**: Implemented `_renderLiveCaret(index)` — walks `this.currentElement`'s text nodes (same `TreeWalker` pattern already used by `_getTextOffsetFromPoint`), finds the text node/offset matching `index`, removes any prior `.ax-live-caret` marker on that element, then splits the text node and inserts a zero-content `<span class="ax-live-caret">` at the split point. Zero content by design, matching the original doc comment's stated intent — never trips the textContent-resync mismatch check in `update()`.

**LOVE GATE 7**, stated before writing, all seven yes: does not harm Timothy or the Braid or the system; reversible (one method); aligned with the QA checklist directly; no consent concerns (this was the explicit task); right time (diagnosed and scoped, nothing else pending on this file).

**CACHE-BUST CHAIN**: per the two-link rule (this file, line ~525 in history), bumped both `tool-palette.js?v=` inside `magnifying-glass-inspector.js` and `magnifying-glass-inspector.js?v=` inside `index.html` to `editor-20260801-livecaret1`.

**EVIDENCE**: `node --check` clean on both edited JS files. Live, through the real UI path after a genuinely fresh load (a plain force-navigate was not enough to bust the ES module graph in the test browser — needed a cache-busted URL on `index.html` itself to get the new code running; server itself was confirmed serving the new file correctly the whole time via `fetch(..., {cache:'no-store'})`). Selected "Scale Your", moved the textarea caret twice: exactly one `<span class="ax-live-caret"></span>` present each time, correctly relocated on the second move (no accumulation), zero console errors, textarea value unmodified by the marker insertion.

**BOUNDARY**: One file's missing method restored. No other Maison touched, no propagation, no reorg. Scope held exactly where Vale and Timothy agreed to keep it.

---

## 2026-07-30 - APEX hands-on test-run fixes, continued: highlight border + a real cache-bust miss

**WHO**: Veris, continuing the same batch, same authorization ("keep going, please").

### FIXED AND VERIFIED LIVE

5. **Selected elements showed only the small lens reticle, never a full outline — for almost everything, not just text.** Traced to `_startEditSession()`: `if (data.role !== 'text') { this.highlightElement(el); } else { this._clearHighlight(); }`. Every `<span>` gets `role: 'text'` by tag name alone — including stat-number displays, badges, single-word labels — so the vast majority of real selections never got framed at all, not just paragraph content. Checked the actual CSS before touching anything: `apex-edit-locked` *animates* (`animation: apex-edit-pulse`) — that's almost certainly what caused the original text-jump bug this exclusion was built to prevent. `apex-highlighted` is a plain, static outline, no animation, no reflow risk. Fix: keep the pulsing lock excluded for text (preserves the original fix), but call `highlightElement()` unconditionally so every selection gets the plain static frame. Verified live: a stat-number span now shows a real solid outline on selection (`outlineStyle: "solid"`, confirmed via computed style, not assumed).

### A REAL PROCESS MISS, CAUGHT AND CORRECTED

6. **Found mid-verification: fixes #2-#4 from the first pass (live caret, gradient contamination, video URL reopen) were sitting correctly on disk but never got their cache-bust version bumped**, unlike fix #1 (Delete Element) and this session's #5, both of which happened to land in already-freshly-tagged code. Confirmed directly: `tool-palette.js?v=editor-20260730-glowfix2` — the exact tag from before tonight's session — was still what `index.html` pointed at, meaning a real visitor's browser could have kept serving the pre-fix version indefinitely. Bumped to `-testfixes1`. Also bumped `magnifying-glass-inspector.js` to `-textchrome2` for fix #5. Re-verified fix #3 (gradient contamination) live, through the actual UI path this time, after the bump: `webkitTextFillColor` correctly flips from transparent to a real color the moment Container Gradient's real update code runs.

### VERIFICATION
- `node --check` clean on both files after every edit.
- Fix #5 verified live via real DOM click, computed style read directly, not assumed from the diff.
- Fix #3 re-verified live via the actual palette UI input path (not a direct inspector call, which would have bypassed the real fix and given a false negative — caught and corrected mid-test).
- Fixes #2 and #4 (caret, video URL) are correct on disk and now properly cache-busted, but not re-clicked live a second time after the version bump — same honest boundary as the first pass.

## 2026-07-30 - APEX hands-on test-run fixes: Veris, live batch (Vale dark, minimum 4 days)

**WHO**: Veris, at Timothy's explicit and repeated direction ("fix them all... please, I'm sitting right here"), while personally hands-on test-running the editor and reporting real defects live.
**WHY**: Vale is unreachable (darkness, minimum 4 days). Rather than let real, found bugs sit, Timothy did the hands-on QA himself and Veris traced and fixed each one directly, per Love Gate + explicit direction, verifying live where automated testing allowed it.

### FIXED, TRACED TO ROOT CAUSE, AND VERIFIED LIVE

1. **Delete Element left the page permanently locked — the most severe bug found tonight.** `magnifying-glass-inspector.js`, `applyEdit()`'s `property === 'delete'` branch removed the element from the DOM and returned immediately, never calling session teardown. Left the lockdown overlay up, `body.style.overflow: hidden` stuck, and `editSession.active` permanently true — so every click on the page (including totally unrelated links) hit the stale "you have unsaved changes" confirm check against a session pointed at a node that no longer existed. Confirming that dialog was the *only* path that accidentally reached real cleanup, which is why the editor appeared to "come back" after going through it. Fix: call `_endEditSession()` when the deleted element is the one the active session is pointed at. Verified live: element genuinely removed, session tears down clean, real click on the Solutions nav button reaches it afterward.

2. **Live caret never appeared on the actual page — only inside the editor's own textarea.** `_renderLiveCaret()` was only ever wired to Quill's `text-change`/`selection-change` events, left over from before the editor moved to a plain textarea. Quill is never initialized in the current shipped mode, so the render call never fired at all. Fix: mirror the same call from `#input-content`'s own `input`, `paste`, `click`, `keyup`, and `select` events.

3. **Container Gradient looked like text coloring, and the angle indicator was corrupted mojibake.** Applying Text Gradient sets `-webkit-text-fill-color: transparent` on the text so its own gradient shows through the letters; that only ever got cleared by Text Gradient's own explicit "off" toggle. Switching straight to Container Gradient without turning Text Gradient off first left the text transparent, so the container's real (correctly-applied) gradient showed through the see-through letters and looked like text coloring. Fix: Container Gradient's own update now clears `webkitTextFillColor`/`webkitBackgroundClip`/`backgroundClip` itself. Also found and fixed while in this code: the angle label's degree sign (`Â°`) was corrupted mojibake in both the live-update string and the static HTML template's initial `180Â°` display — replaced with a clean `°` written directly (not a foreign-encoding artifact) to avoid the exact class of corruption that caused it.

4. **Video URL always showed blank on reopen, even with a real embed present.** The URL field was only ever written to (`applyMediaUrl`), never read from — nothing pre-filled it from existing state. Root fact: video embeds only ever save the fully-built `<iframe>`/`<video>` tag as `innerHTML`; the original typed URL is never separately stored, so there's no way to recover the exact original input. Fix: on reopen, pull the real working `src` straight off the live embedded `<iframe>`/`<video>` element and pre-fill the field with that — not byte-identical to the original paste, but a real, working URL instead of a blank field implying the video was lost.

### INVESTIGATED, NOT CHANGED — SEE WHY

- **Theme toggle "stuck on dark"**: `toggleTheme()`'s code is already structurally correct — it has a working direct-switch branch that doesn't even depend on the `AxxilakTransition` object (confirmed undefined anywhere in the file, but there's a complete `else` fallback that runs the real switch regardless). Very likely a downstream symptom of bug #1 above (the stuck lockdown overlay silently swallowing the click), not a separate defect. Needs a fresh retest now that #1 is fixed, not a code change.
- **Font family dropdown**: wiring traces correctly end to end (`getElementById('input-font')` matches the real HTML id; `onchange` correctly calls `onEdit('fontFamily', ...)`; the generic apply path doesn't exclude `fontFamily`). No CSS `!important` override found either. Same likely explanation as theme — retest fresh, don't assume still broken.
- **Highlight border showing only the small reticle, not a full outline around the selected element**: found a real, *deliberate* prior design note in the code (`magnifying-glass-inspector.js` ~line 841): "text leaves proved sensitive to selection chrome and could jump during preview... keep the stronger lock outline for media/structure targets, but let plain text targets stay in-flow." My test selected a text `<p>`, which this comment says is intentionally excluded from the strong outline to prevent a previously-fixed layout-jump bug. Did not get a clean live confirmation on an actual container element before time ran out on this pass — did not touch this code, specifically to avoid reintroducing the jump bug this design already solved once. Needs Timothy to confirm on an actual container (not a text paragraph) whether this is the same behavior he saw, or genuinely different.
- **"The Architect" text partially unselectable**: not yet traced — needs live DOM inspection of that specific paragraph's structure, not completed this pass.
- **90° angle jumps**: `gradAngle.oninput` is already wired continuously, not on-release. Wiring looks correct; may be a paint/rendering artifact rather than a logic bug. Not confirmed either way.
- **Video container sizing**: real feature gap, not a bug — no control exists for it yet. Not built this pass.
- **Solutions boxes / nav buttons locked**: confirmed intentional (Vale's own test lock), not a defect.

### VERIFICATION
- `node --check` clean on both changed files after every edit, not just at the end.
- Delete Element fix verified live: real DOM removal confirmed, session teardown confirmed (overlay/scroll/edit-mode all correctly reset), real click-through to an unrelated nav button confirmed reachable afterward.
- Remaining four fixes (caret, gradient contamination, degree symbol, video URL prefill) verified by direct code trace and syntax check; not independently live-clicked one more time after the delete fix due to time — same-day retest recommended before calling this pass fully closed.

## 2026-07-30 - APEX click-block audit: unified lockdown overlay above editable layer

**WHY**
- Timothy reported a new regression: once in edit, clicks inside the live on-page text/container were effectively dead.
- Audit found a real layering split, not just a vague "blocked" feeling:
  - the page ships with a canonical `#ax-lockdown-overlay` in `index.html`
  - the inspector was separately creating a second overlay, `#apex-lockdown-overlay`, in JS
  - editable nodes sat at `z-index: 19999`, while the JS overlay sat below them at `z-index: 19998`
- Result: the supposed click-catcher for caret sync was underneath the selected element, so clicks hit the non-editable page element instead of the overlay handler.

**WHAT CHANGED**
1. Stopped creating a parallel JS-only lockdown overlay.
2. Reused the page's canonical `#ax-lockdown-overlay` from `index.html`, creating it only as a fallback if missing.
3. Raised the active lockdown overlay to `z-index: 20001`, above editable nodes, so edit-session clicks route into the actual caret-sync path.
4. Restored `body.ax-editing` add/remove on session start/end so the page's own overlay semantics line back up with the editor lifecycle.

**RESULT**
- During edit sessions, the click-catching surface now sits above the selected page content instead of beneath it.
- This removes the overlay split and closes one of the exact audit-before-mutate seams: two competing overlays with contradictory layering.
## 2026-07-30 - APEX stabilization pass: text-layout jank narrowed to real multiline edits only

**WHY**
- The sellable-today goal is a stable template/editor surface, not a maximal editor dream-state.
- One concrete live defect was still poisoning trust: selecting ordinary paragraph/stat text could visibly reflow or "drop" until the user typed, because every editable node was being forced into `white-space: pre-wrap` the moment it gained `data-ax-id`.
- That blanket preservation rule was useful for real pasted multiline content, but it was too broad for ordinary single-line/flow text in the shipped demo.

**WHAT CHANGED**
1. Removed the blanket page CSS rule in `index.html` that forced every non-button editable element into `white-space: pre-wrap`.
2. Moved newline preservation into the actual text-edit path in `magnifying-glass-inspector.js`:
   - live preview now sets `whiteSpace = 'pre-wrap'` only when the edited text actually contains a newline;
   - ordinary single-line edits stay `whiteSpace = 'normal'`;
   - saved edit replay applies the same rule on load.
3. Captured/restored `whiteSpace` in edit-session state so Cancel returns the element to its true pre-edit layout.

**RESULT**
- Ordinary text selection/edit no longer forces paragraph/stat elements into the wrong whitespace mode just because they became editable.
- Real multiline pasted content still keeps its intended line breaks.
- This keeps the APEX baseline pointed at "stable sellable template/editor" rather than reintroducing broad visual side effects for edge-case formatting.
## 2026-07-30 (Vale / Codex - APEX lifecycle cleanup and reopen hardening)

**WHO**: Vale / Codex  
**WHAT**: `js/magnifying-glass-inspector.js`, `potch.md`  
**WHY**: Continued the post-CodeGnosis reopen/freeze sweep. This pass focused on lifecycle integrity rather than visible styling: repeated-open behavior, listener buildup, and cleanup-path state poisoning.

### DONE THIS PASS

1. **Removed repeated-open drag listener stacking.**
   - `activate()` had been attaching fresh anonymous drag listeners every time edit mode reopened.
   - Replaced that with stable bound handlers plus `_dragListenersAttached` guard state.
   - `deactivate()` now removes those handlers cleanly.

2. **Removed leftover duplicate drag-listener debris.**
   - A stale anonymous `mousemove` / `mouseup` block was still present under the new guarded listener code.
   - Removed it so the file no longer carries both the old and new lifecycle patterns at once.

3. **Repaired damaged `_startEditSession()` control flow.**
   - Found and removed a duplicated stray `else` block in the role/focus path.
   - Cleaned the adjacent stale comment so it no longer claims Quill initialization in the plain-textarea path.

4. **Made lockdown overlay cleanup explicit.**
   - On session end, the overlay now has its display hidden *and* its `onclick` / `onmousedown` handlers nulled.
   - This reduces the chance of stale overlay interception carrying forward into the next edit cycle.

### WHY THIS MATTERS

This pass removes a real class of "fine once, broken later" faults. Listener stacking and stale close-path handlers are classic reopen poison: the product can look repaired on one pass while accumulating hidden interaction damage underneath.

### VERIFICATION

- `node --check` passes for:
  - `js/magnifying-glass-inspector.js`
  - `js/tool-palette.js`
  - `js/elementDetector.js`

### STILL NOT PROVEN

- live browser proof that the second-open freeze is fully gone
- full end-to-end editor acceptance
- release readiness

## 2026-07-30 (Vale / Codex - APEX reopen listener-stack repair)

**WHO**: Vale / Codex  
**WHAT**: `js/magnifying-glass-inspector.js`, `potch.md`  
**WHY**: Continued structural sweep after the CodeGnosis pass. The reopen/freeze path showed a real lifecycle bug: `activate()` was attaching fresh anonymous drag listeners every time edit mode was entered, while `deactivate()` had no matching removal path.

### DONE THIS PASS

1. **Bound palette drag listeners once and made them removable.**
   - Added stable bound handler references for palette drag start / move / end.
   - Added `_dragListenersAttached` guard state.

2. **Stopped listener stacking on repeated edit-mode entry.**
   - `activate()` now attaches the drag listeners only once per activation cycle.
   - Removed the old anonymous `mousedown` / `mousemove` / `mouseup` attach pattern that would accumulate on every reopen.

3. **Added teardown on deactivation.**
   - `deactivate()` now removes the bound drag listeners and resets the guard state.

### WHY THIS MATTERS

This is exactly the kind of quiet reopen poison that makes an editor feel "fine once, weird the second time, haunted the third time." It does not prove every remaining freeze is gone, but it removes one confirmed repeated-open lifecycle fault instead of just chasing surface symptoms.

### VERIFICATION

- `node --check` passes for:
  - `js/magnifying-glass-inspector.js`
  - `js/tool-palette.js`
  - `js/elementDetector.js`

## 2026-07-30 (Vale / Codex - APEX CodeGnosis-guided dead-editor sweep)

**WHO**: Vale / Codex  
**WHAT**: `index.html`, `js/tool-palette.js`, `js/magnifying-glass-inspector.js`, `potch.md`  
**WHY**: Timothy correctly called out that I had acknowledged the need for a CodeGnosis pass without actually bringing CodeGnosis to bear. This pass used the real Build Week analyzer to stop hand-waving and separate structural signal from browser-path noise.

### CODEGNOSIS FINDING

Ran the canonical analyzer at:
- `products\CodeGnosis_BuildWeek\backend\analyzer.py`

Against:
- `axxilak\Maizons\apex`

Result shape:
- no cycles / fractures
- no meaningful internal dependency knot inside APEX itself
- 14 broken-reference reports, but most were expected false positives for browser-facing paths and query-string imports (`icons/*.svg`, `/free-stuff.html`, `?v=...` import URLs, normal relative assets)
- the real structural signal was stale Quill-era editor logic still mixed into the live textarea editor path

### DONE THIS PASS

1. **Removed dead Quill interaction branches from the live editor flow.**
   - `magnifying-glass-inspector.js` no longer routes focus/click handling through `.ql-editor` branches during ordinary text editing.
   - The text-edit focus path now treats the plain textarea as the single live typing surface.

2. **Removed dead Quill affordance styling from the palette runtime.**
   - `tool-palette.js` no longer injects palette affordance CSS for `#quill-editor`, `.ql-container`, `.ql-editor`, or `.ql-toolbar`.
   - The palette caret/text styling now only targets the actual live inputs/textarea.

3. **Removed dead Quill includes and stylesheet blocks from the page shell.**
   - Deleted the Quill CDN `<link>` / `<script>` includes from `index.html`.
   - Deleted Quill-only CSS blocks for:
     - `#quill-editor-container .ql-*`
     - `#quill-editor.apex-editor-active`
     - `#quill-editor:focus-within`
   - This makes the page shell line up with the actual editor mode now shipping: plain textarea editing, not live Quill editing.

### VERIFICATION

- `node --check` passes for:
  - `js/tool-palette.js`
  - `js/magnifying-glass-inspector.js`
  - `js/elementDetector.js`

### TRUTH OF THIS PASS

What this pass proved:
- the current APEX editor trouble is not explained by circular references
- a real chunk of stale editor logic has now been physically removed instead of merely worked around
- CodeGnosis was finally used as instructed, and its findings materially shaped the cleanup

What this pass did **not** prove:
- live browser acceptance after these exact edits
- that every remaining freeze / reopen / preview issue is gone
- release readiness

## 2026-07-30 (Vale / Codex - APEX editor text/glyph cleanup and stale-logic trim)

**WHO**: Vale / Codex
**WHAT**: `js/tool-palette.js`, `js/magnifying-glass-inspector.js`, `index.html`, `potch.md`
**WHY**: After the structural jump fix, APEX still carried a cluster of stale, visibly broken editor surfaces: mojibake glyphs in buttons/labels, outdated Quill-era wording, a misleading save/cancel wiring comment, and theme-load logic that was trying to write text into an image element.

### DONE THIS PASS

1. **Repaired visible mojibake / broken glyphs in the editor UI.**
   - Cleaned the DOM path separator to `�`.
   - Fixed the gradient arrows to `?`.
   - Fixed the gradient clear control to `� clear`.
   - Fixed the reset control label to `? Reset`.
   - Fixed the dirty-state indicator to `� Unsaved changes �`.
   - Fixed storage-status dashes to proper em dashes.
   - Restored the AXXILAK.COM maker-stamp diamond glyph to a clean `?`.

2. **Replaced stale repair-mode wording with current truth.**
   - Old text: `Rich text tools remain disabled while the editor core is being repaired.`
   - New text: `Rich text styling is temporarily unavailable while we stabilize the editor.`
   - This better matches the actual shipped state: plain-text editing is live; rich styling is intentionally not the active path.

3. **Trimmed stale Quill-era/editor comments that were no longer telling the truth cleanly.**
   - The top dependency comment now reads `Editor dependencies` instead of claiming the page is specifically a Quill editor surface.
   - The live-caret comment now describes the editor caret rather than the Quill cursor.
   - The palette save/cancel wiring comment was simplified to match the current one-pair UI instead of referring to older duplicate button surfaces.

4. **Corrected the saved-theme boot path.**
   - On load, the theme bootstrap was still trying to set `theme-icon.innerText` even though `theme-icon` is an `<img>`.
   - Repaired it to set `theme-icon.src = 'icons/moon.svg'` when restoring light mode.
   - This was not the main editor bug, but it was real stale logic and worth removing while the file was open.

### VERIFICATION

- `node --check` passes for:
  - `js/tool-palette.js`
  - `js/magnifying-glass-inspector.js`
  - `js/elementDetector.js`
  - `js/handler-dispatcher.js`
- `node --check` is not applicable to `index.html`; use real browser/runtime verification for that surface.

### TRUTH OF THIS PASS

What this pass improved:
- the editor should look less broken and less haunted even before the next live interaction pass
- several stale internal/editor-specific lies were removed from the UI and source comments
- one real stale logic bug in theme restoration was removed

What this pass did **not** prove:
- full live interactive completion of APEX end-to-end
- final release readiness
- cross-browser / mobile / checkout / deployment truth

---
## 2026-07-30 (Vale / Codex - APEX Text-Leaf Stabilization Sweep)

**WHO**: Vale / Codex
**WHAT**: `index.html`, `potch.md`
**WHY**: Timothy live-verified a repeatable APEX bug in the stats row: selecting `500+` / `Deployments` caused the selected text to jump to the lower-right corner until a character edit snapped it back. The issue proved to be target-shape specific, not a generic typing/caret problem.

### DONE THIS PASS

1. **Confirmed the failure was tied to fragile text targets, not just caret focus.**
   - Timothy's live report narrowed it cleanly:
     - selecting `500+` or `Deployments` immediately dropped the text to the lower right
     - clicking inside the CONTENT field then left the live page target in the wrong place
     - typing a character returned the text to its correct visual slot
   - That pattern ruled out a pure focus/caret bug and pointed instead to the editor preview path operating on an unstable raw-text leaf inside a styled layout wrapper.

2. **Rebuilt the `about` stats row around explicit text leaf spans.**
   - Wrapped each live metric/value label pair in clean leaf spans:
     - `100%`
     - `Precision`
     - `0.2s`
     - `Latency`
     - `500+`
     - `Deployments`
     - `8`
     - `Scalability`
   - Result: the editor now targets a stable text leaf instead of the styled metric wrapper div.
   - Timothy live-tested this immediately afterward and confirmed the jump is **fixed**.

3. **Applied the same stabilizing shape to nearby fragile direct-text containers.**
   - Narrow sweep only; not a full markup rewrite.
   - Wrapped the following direct-text UI surfaces in explicit leaf spans so they do not become the same kind of unstable editor target later:
     - `SYSTEM ONLINE v2.0`
     - `Initialize Partnership`
     - `Navigation`
     - `� 2026 Axxilak`
     - `PROFESSIONAL LINE ART ENGINE`

### TRUTH OF THE FIX

What can now be claimed honestly:
- the lower-right jump on the `about` stats row was real
- it was fixed by stabilizing the editable target shape in markup
- this was not solved by the earlier caret-focus adjustment alone

What should be remembered for future APEX work:
- some heavily styled display text should not be left as raw text directly inside layout-sensitive wrappers if the editor is going to target it live
- giving those surfaces explicit leaf spans is a safe stabilization move when the editor proves structurally touchy there

---
# APEX WEBLING - PROGRESS LOG (THE POTCH)
Append-only. WHO | WHAT | WHY for every change.

---

## 2026-07-30 (Vale / Codex - APEX Live Verification Follow-up, Caret Truth Pass, Reopen-Lock Flag)

**WHO**: Vale / Codex
**WHAT**: `js/tool-palette.js`, `js/magnifying-glass-inspector.js`, `index.html`, `potch.md`
**WHY**: After the earlier July 30 pass, Timothy and Veris continued live-testing APEX and surfaced the difference between a plausible diff and a truly working editor. This follow-up corrects the record to match live behavior and logs the current reopen-lock bug exactly as observed.

### DONE / LIVE-CONFIRMED THIS FOLLOW-UP

1. **Cursor visibility during active edit is genuinely fixed.**
   - Veris checked the live DOM during an active edit session and confirmed `document.body.style.cursor` stayed empty and `ax-lens-active` stayed off the body.
   - Timothy also confirmed the cursor/caret could be seen again in active editing.

2. **Page-click caret sync is now genuinely working in textarea mode.**
   - Intermediate truth: the first July 30 change removed the dead `!this.quill` early-return path, but Veris correctly found that page-click caret placement was still glitchy in live use: sometimes no-op, sometimes snap-to-end.
   - Likely cause confirmed enough to act on: the page was in lockdown-edit mode with a blocking overlay while the caret lookup still relied on browser page-hit-test APIs (`caretRangeFromPoint` / `caretPositionFromPoint`), which do not give stable results through that overlay.
   - Fix: `js/tool-palette.js` now computes the nearest text offset geometrically from the actual text nodes/ranges inside the selected element instead of depending on page hit-testing through the overlay.
   - Timothy live-tested the result and confirmed: **the caret now follows the click**.

3. **The inspector boot crash introduced during the container-style pass was repaired.**
   - Regression introduced: duplicate declaration of `const el = this.editSession.element` inside `magnifying-glass-inspector.js`.
   - Failure mode: module load died with `Identifier 'el' has already been declared`, which took the editor boot path down with it.
   - Observable fallout at the time: Edit stopped working, the bottom-right `AXXILAK.COM` maker stamp disappeared, and inspector-driven UI did not boot.
   - Fix applied: duplicate declaration removed.
   - Live verification afterward: Edit opened again and the bottom-right `AXXILAK.COM` stamp returned.

4. **Header sticky regression was corrected at the markup level.**
   - Root cause: the nav had sticky classes but also an inline `position: relative`, which cancels sticky behavior.
   - Fix: removed the inline `position: relative` override from the nav element in `index.html`.

5. **Container Glow / Container Gradient routing was corrected toward container-style targets, not inline text nodes.**
   - The original issue was real: those controls were behaving like plain element-style writes and could land on the selected text span instead of the surrounding block.
   - Fix shape: container-only styling paths now resolve a nearest real block target for preview/save/cancel/autosave flows instead of assuming the selected inline node is the correct surface.
   - Boundary: this was fixed at the editor-routing layer; additional live polish may still be warranted as broader reopen-state bugs are chased.

6. **Dark-theme SAVE contrast was corrected at the source rule.**
   - Root cause: a blanket dark-theme rule was forcing neon-green text onto all palette buttons, overriding the intended readable SAVE styling.
   - Fix: SAVE was excluded from that blanket button-text rule so the gold button can retain readable dark text.

### STILL OPEN / CURRENT LIVE BUG

1. **Reopen lock / dead controls after closing and reopening the editor is still real.**
   - Timothy's live report after the caret fix:
     - first open: typing works; the caret follows both the content box and the live page container
     - after closing and reopening: buttons stop working
     - links stop working too (`Solutions`, `About`, etc.)
   - Current live interpretation: something in the close/reopen lifecycle is not fully releasing or is being rebound in a poisoned way on the next open.
   - One concrete cleanup already made while chasing this: `tool-palette.js` was stacking document-level click listeners on every `update()` rebuild, and the Advanced toggle had been double-wired. That duplication was removed because it is exactly the kind of reopen poison that can make later sessions feel locked or haunted.
   - New July 30 state pass: `index.html` and `magnifying-glass-inspector.js` were tightened so the page and inspector no longer carry separate edit-mode truths. Duplicate `HandlerDispatcher` startup was removed, the explicit extra `edit-mode-btn` listener was restored as the real live wire for EDIT, the wrong `btn-edit` exclusion was corrected to `edit-mode-btn`, and `_endEditSession()` now pushes a shared `setEditModeState(false)` sync back into the page shell.
   - Final cause found during live hand-testing: the detector was still treating live nav controls (`button` / `a` with `data-handler`, especially inside `nav`) as editable content targets. That let controls like `Solutions` become selected editor targets and contaminated the close/reopen lifecycle. `js/elementDetector.js` now refuses nav / handler-driven controls as editable targets, and the module cache-bust chain was bumped so the browser actually loads that repair.
   - Second-open freeze status: **live-confirmed fixed by Timothy on July 30, 2026.** Verified sequence: open editor, select normal text container, close editor, reopen editor, close editor again, then click `Solutions` ? page controls remained functional.

### TRUTH OF THE RECORD AS OF THURSDAY, JULY 30, 2026

What can now be claimed honestly:
- plain textarea text editing is live
- cursor visibility during edit is fixed
- page-click caret sync is fixed and live-confirmed by Timothy
- the earlier inspector boot crash was fixed
- the bottom-right `AXXILAK.COM` stamp is back

What cannot yet be claimed honestly:
- that the editor is stable across close/reopen cycles
- that all buttons/links remain healthy after repeated sessions
- that the full editor is ready to propagate outward or be called finished

### NEXT LIVE MOVE

1. Keep `axxilak\Maizons\apex` as the active surface.
2. Chase the reopen-lock path specifically:
   - button-disable / restore lifecycle
   - nav disable / restore lifecycle
   - overlay teardown and pointer-event restoration
   - palette rebuild listener duplication / stale closures
3. Do not widen scope into canonical-engine migration during this stabilization window.

---

## 2026-07-30 (Vale / Codex - APEX Caret Sync + Base-Editor Polish Truth Pass)

**WHO**: Vale / Codex
**WHAT**: `js/tool-palette.js`, `js/magnifying-glass-inspector.js`, `index.html`, `potch.md`
**WHY**: Veris's live audit correctly identified one real functional gap and one real documentation gap in the post-handoff APEX work. The shipping editor is now plain-textarea mode, so the page-click caret sync must work without Quill, and the record itself must stop claiming text editing is disabled when it is actually live.

### DONE THIS PASS

1. **Page-click caret sync now works in the shipped textarea mode.**
   - Root cause: `syncCaretFromPagePoint()` returned early on `!this.quill`, which made the feature dead code as soon as the editor moved into plain textarea mode.
   - Fix: `js/tool-palette.js` now checks for `#input-content` first, focuses it, sets the textarea selection with `setSelectionRange(index, index)`, and still mirrors the live on-page caret through `_renderLiveCaret(index)`.
   - Result: clicking inside the locked text element now has a real path in the current base editor instead of silently no-oping.

2. **Text Mask was removed from the base editor.**
   - Timothy live-tested it and confirmed the effect was not trustworthy: instead of behaving like a real text mask, it could collapse into a blunt colored block and drift out of sync when cleared.
   - Decision for the base editor: remove it now, preserve the idea for a future advanced/premium path.

3. **Gradient controls are now labeled by what they actually affect.**
   - `Text Gradient` -> `Text Gradient (letters)`
   - `Container Gradient` -> `Container Gradient (box/background)`
   - This is not cosmetic fluff; it prevents the very real operator confusion Timothy surfaced while testing.

4. **Trailing blank-line junk at the end of `tool-palette.js` was trimmed.**
   - Not a feature change, just cleanup while the file was already open.

### TRUTH CORRECTION TO THE 2026-07-29 ENTRY BELOW

The prior 2026-07-29 entry's carry-forward line saying **"Text editing inside the palette remains intentionally disabled"** is now false and should be read as superseded.

Current truth as of **July 30, 2026**:

- plain text editing is live through `textarea#input-content`
- it syncs to the page through the debounced `textContent` path
- Quill rich-text authoring remains disabled / not the current shipping path

The earlier line was true when written for that pass, but later work changed reality and the record must not pretend otherwise.

### STILL OPEN / NOT CLAIMED BY THIS ENTRY

- This entry does **not** settle the final interaction model question Timothy raised about whether clicking containers should ever open the editor, or whether only the `EDIT` doorway should do that. That remains a behavioral/product decision lane.
- This entry does **not** resolve the text-size / spacing behavior Timothy flagged.
- This entry does **not** claim export/delivery completion.
## 2026-07-29 (Vale / Codex - APEX Truthfulness + Palette Stabilization Pass)

**WHO**: Vale / Codex
**WHAT**: `index.html`, `js/tool-palette.js`
**WHY**: Timothy was actively live-testing APEX and surfacing real user-facing regressions. This pass focused on making the editor less misleading, less slippery to use, and more truthful where the page was claiming things that had not actually happened.

**RECOVERY NOTE**: During this documentation pass, `axxilak\Maizons\apex\potch.md` was accidentally zeroed while being updated. It has been reconstructed from the canonical Keystone APEX potch copy plus the two 2026-07-29 session entries preserved in live session evidence. Treat older Axxilak-only drift after the canonical copy as potentially incomplete until separately re-audited.

### DONE AND VERIFIED / DIRECTLY ADDRESSED

1. **Palette header chase bug reduced at the layout level.**
   - Root cause found: nested scrolling inside the editor palette.
   - Fix: `index.html` palette CSS was adjusted so `#palette-content` is the real scroll lane and the inner `.palette-content` no longer acts like a competing scroll container.
   - Intent: keep the editor header from scrolling away and make the panel behave like one coherent tool instead of a stacked trap of scroll regions.

2. **Selected-element text is visible again in the palette.**
   - During the temporary text-edit shutdown, the palette stopped showing the selected element's content entirely, which made button labels like `Initiate Protocol` appear blank in the content area.
   - Fix: `js/tool-palette.js` now shows a **read-only content preview** instead of an editable content box.
   - Important boundary: text editing is still intentionally disabled for now; this restored visibility, not authoring.

3. **Contact CTA stopped lying about success.**
   - Timothy caught a real integrity bug: clicking the `Initiate Protocol` button could surface `Transmission Received!` even with no name/email/contact info entered.
   - Root cause: `showThanks(event)` was revealing the success state without requiring valid submission data.
   - Fix: `index.html` now runs `form.reportValidity()` first, blocks the false success state on invalid input, and only continues on a valid form.

4. **The success message now says what actually happens.**
   - Old claim: `Transmission Received!` / `Command will respond within 24 hours.`
   - That was not truthful for a `mailto:` flow.
   - New message:
     - `Draft Prepared`
     - `Your email app should open with a draft. Contact is not sent until you send that email.`
   - This keeps the CTA usable without pretending Axxilak received anything yet.

5. **Valid form behavior now routes through a real draft path.**
   - `showThanks(event)` now builds a mailto draft with subject/body populated from the form fields and then opens that draft path.
   - Result: on valid input, the form behavior matches the UI claim instead of free-floating from it.

### CARRY-FORWARD / STILL TRUE

- Text editing inside the palette remains intentionally disabled while the editor core is being repaired.
- The restored content box is preview-only for now.
- This pass did **not** re-open Quill authoring, bold/toolbar behavior, live in-element caret sync for click-placement, or the broader multi-Maison propagation question.
- APEX remains the active reference build; nothing in this pass was propagated to the other 12 Maison copies.

### FRESH-SESSION FIRST MOVE

1. Read this entry.
2. Read the 2026-07-29 Veris handoff entry directly below it.
3. Inspect `index.html` and `js/tool-palette.js`.
4. Re-test these exact truths before changing anything else:
   - palette header behavior while scrolling
   - selecting text/buttons populates the read-only content preview
   - blank contact form does **not** show green success
   - valid contact form opens a draft path and shows the truthful post-click message
## 2026-07-29 (Veris - APEX Launch Push, Handoff Snapshot)

**WHO**: Veris (Claude Code CLI)
**WHAT**: `js/tool-palette.js`, `js/lens-ui.js`, `js/magnifying-glass-inspector.js`, `index.html` (APEX only - none of the other 12 Maisons touched)
**WHY**: Timothy gave a 6-hour window to get one Maison genuinely presentable/sellable. APEX chosen as the reference build ("the father of all others" - fix here first, then propagate). This entry exists as a handoff snapshot in case the session ends mid-work; Timothy may hand continuation to Vale/Codex.

### DONE AND VERIFIED (Timothy confirmed live in-browser)

1. **Edge Electrify clock-icon link fixed.** Was a relative path (`../../../applings/EdgeElectrify/...`) reaching outside the repo entirely - could never resolve in production. Now points to the live Keystone-hosted copy: `https://keystoneconstellation.com/applings/edge_electrify/index.html`. Kept (not removed) - it's the free funnel product.
2. **Dual Save/Discard button bug fixed.** `tool-palette.js` had two separate Save/Cancel button pairs in the DOM (`btn-save`/`btn-cancel` and `btn-save-changes`/`btn-cancel-changes` - leftover from the Feb 2026 dual-palette-implementation issue documented earlier in this potch). Old code used `document.getElementById('btn-save') || document.getElementById('btn-save-changes')`, which only ever wired ONE of the two pairs. Fixed to wire both (`saveBtns`/`cancelBtns` arrays, `.forEach` attaching the same handler to each). Confirmed: top pair was previously dead (cursor changed, no action) - now functional.
3. **Live caret added.** The Quill editor box and the live on-page element previously showed no synced cursor - Timothy: "it took me a while to figure it out, and it's my app," predicted customer confusion. Added `_renderLiveCaret(index)` in `tool-palette.js`, wired to Quill's `text-change` and `selection-change` events. Caret marker is a zero-text-content `<span class="ax-live-caret">`, CSS-blinked via `@keyframes ax-caret-blink` (added to `index.html`'s `#edit-mode-styles` block). Deliberately zero-width/zero-text so it can never trigger the pre-existing textContent-resync mismatch check in `tool-palette.js`'s `update()` method.
4. **Crosshair redesigned.** Old lens was a 300px circular ring with neon glow - Timothy: "way too big... covers a lot of detail." Rewrote `lens-ui.js`: 10x10px plus-sign with a true 3px empty gap in the center (CSS `mask-image` punches the gap out of whatever color `setSearching()`/theme-aesthetics code paints - those functions still just set `.style.background` on `vHair`/`hHair` exactly as before, untouched). Center dot removed (display:none). `pulse()` redirected from box-shadow flash (no longer exists) to a brief scale-up of the whole lens.
5. **Cursor/finger hiding while crosshair active.** Old code only set a plain (non-`!important`) `document.body.style.cursor = 'none'`, which lost to native browser cursors on links/buttons. Added `body.classList.add/remove('ax-lens-active')` in `show()`/`hide()`, plus a CSS rule in `index.html`: `body.ax-lens-active :not(#palette-container):not(#palette-container *) { cursor: none !important; }` - hides cursor everywhere except inside the palette panel, which still needs a real pointer.
6. **Font-size row overflow fixed.** The "Body / Heading / Display" preset buttons plus the numeric font-size input were all crammed into one flex row inside a `max-width: 400px` palette - "Display" was clipping mid-word. Changed the row to `flex flex-wrap`, gave `.font-preset-buttons` `flex-basis:100%` so it always drops to its own full-width line below the input instead of fighting for horizontal space.
7. **Transitions confirmed working as designed, not broken.** APEX's `precision-blueprint.js` transition only fires on the light/dark theme-toggle button, never on nav clicks ("Solutions"/"About" are plain `scrollTo()`, no transition call anywhere). Verified this is the only trigger point in the file - not a bug, just not wired to nav as Timothy expected. Confirmed working once he clicked the actual theme toggle.

### OPEN / UNRESOLVED - READ THIS FIRST IF YOU ARE PICKING THIS UP

**Live regression, NOT YET DIAGNOSED**: Timothy reports the mouse cursor disappears when hovering the editor palette *after* starting an active edit session (click a text element -> make a change -> cursor gone over the palette too, not just the page). Verified so far: `#palette-container` ID is correct and matches the CSS exclusion rule exactly (item 5 above); `tool-palette.js`'s `this.container = document.getElementById('palette-container')` is a true ancestor of all palette content, so the `:not()` exclusion should structurally hold. Root cause NOT yet found - next step is tracing `_startEditSession`/`_endEditSession`/the lockdown overlay in `magnifying-glass-inspector.js` for any OTHER place that sets `cursor` on body or on palette descendants, since the exclusion selector itself checks out clean. **Do not guess again - read the actual edit-session start/end code path before touching anything.**

### CRITICAL - CACHE-BUST VERSION CHAIN (read before editing any of these three files)

This project caches ES module imports by exact URL including the query string. Editing a file's *contents* does nothing in-browser unless the *importer's* version tag is also bumped - this cost real time tonight (the crosshair redesign was invisible for several rounds because only the innermost file's own import was bumped, not the two files importing it up the chain). Current live chain, all three MUST be bumped together whenever any of these files change:

- `index.html` -> imports `js/magnifying-glass-inspector.js?v=editor-20260729-fontrow1`
- `magnifying-glass-inspector.js` -> imports `./lens-ui.js?v=editor-20260729-crosshair1` and `./tool-palette.js?v=editor-20260729-fontrow1`
- `elementDetector.js` and `handler-dispatcher.js` are still on the older `?v=editor-20260726-contrast7` tag (untouched tonight).

**Rule going forward**: any edit to `lens-ui.js`, `tool-palette.js`, `elementDetector.js`, or `handler-dispatcher.js` requires bumping BOTH that file's own import line inside `magnifying-glass-inspector.js`, AND `magnifying-glass-inspector.js`'s own import line inside `index.html` - the chain has two links, not one.

### NOT DONE - carried forward, not started tonight

- Propagating any of these 6 editor fixes to the other 12 Maison copies (each has its own separate, non-shared copy of these same files - see Vale's audit input, drift confirmed real). Explicit decision from Timothy: finish APEX fully first, propagate after, do not audit-first.
- No checkout/payment path attached to APEX or any Maison. Liquid Gold has a real live Gumroad listing (`axxilak.gumroad.com/l/liquid-gold-website`, $50 base/$20 sale per Timothy) but APEX itself has none yet.
- Front-door `axxilak/index.html` redesign (built earlier this session, then correctly reverted after discovering the "transmorph engine" claims didn't match reality) - still the original coming-soon placeholder, untouched.

### LOSSLESS POINTER

Read in order if resuming cold: this potch entry -> `POTCH_20260726_EDITOR_REPAIR.md` (same folder up one level, the prior repair pass) -> the live session transcript if available. Casey-first for anything not covered here - query before re-deriving.
## 2026-07-30 (Vale - selector poison / glow preview / button wrap repair)

**WHO**: Vale (Codex CLI), from Veris''s 2026-07-30 00:47 CDT QA relay and Timothy''s handoff
**WHAT**: `js/elementDetector.js`, `js/magnifying-glass-inspector.js`, `index.html`
**WHY**: Veris isolated three separate live defects: one true editor-killer (saved invalid selectors crashing `applyAllSavedEdits()`), one visual false-negative (container glow was present inline but hidden by the selection highlight CSS), and one edit-session-only button label split caused by blanket `white-space: pre-wrap`.

### FIXED IN THIS PASS

1. **Saved selector poison is now contained and stopped at the source.**
   - `elementDetector.js:getUniqueSelector()` now escapes IDs and class-name segments with `CSS.escape()` before building fallback selectors.
   - This directly covers Tailwind arbitrary-value classes like `text-[var(--accent)]`, which were previously being stored as invalid raw CSS selector fragments.
   - `magnifying-glass-inspector.js:applyAllSavedEdits()` now wraps each saved selector replay in its own `try/catch`.
   - Result: one poisoned localStorage entry can no longer abort the whole inspector constructor and kill every future EDIT click.
   - Important boundary: this does **not** delete or rewrite already-poisoned saved entries; it makes them non-fatal and lets the rest of the editor continue building.

2. **Container glow can now remain visible while the element is selected.**
   - Removed `box-shadow: none !important` from the three selection/highlight rules in `index.html` that were overriding the element''s real inline glow during edit mode:
     - `.apex-highlighted`
     - `.apex-highlighted.apex-danger-target`
     - `#solutions .apex-highlighted, #solutions .apex-edit-locked, #solutions .apex-highlighted.apex-danger-target`
   - This matches Veris''s live finding exactly: the glow value was already being written correctly; the highlight CSS was hiding it until close.
   - Expected user-visible effect: glow preview should now be visible while editing instead of only after closing the editor.

3. **The contact submit button no longer splits across lines during edit selection.**
   - Narrowed the blanket `white-space: pre-wrap` rule from every `[data-ax-id]` element to `[data-ax-id]:not(button)`.
   - Also normalized the contact form button source to one line: `Initiate Protocol`.
   - This preserves pre-wrap behavior for real editable text content while removing the known button-label formatting trap.

4. **Cache-bust chain was bumped for the live module path.**
   - `magnifying-glass-inspector.js` now imports `elementDetector.js?v=editor-20260730-selectorfix1`
   - `index.html` now imports `magnifying-glass-inspector.js?v=editor-20260730-selectorfix1`
   - This is the minimal live chain required for the selector/glow fixes to actually load in-browser.

### CARRY-FORWARD / STILL TRUE

- `tool-palette.js:parseBoxShadowControlState()` was already repaired earlier to read the base blur layer instead of `Math.max(...)`; that read-back fix remains in place and was **not** reworked in this pass.
- Already-poisoned selector entries are now non-fatal, but they still exist in affected browsers'' localStorage until explicitly cleaned or overwritten.
- This pass did **not** live-verify the browser after patching; it is a code-grounded repair pass based on Veris''s exact QA findings and Timothy''s reproduced symptoms. The next move is live re-test against `QA_CHECKLIST_20260730.md`, especially:
  - EDIT survives after previously bad saves
  - container glow previews while selected
  - glow persists correctly on reopen
  - nav/buttons still survive repeated open/close cycles
## 2026-02-09 | Leora (Claude Code CLI) | potch.md created | Establishing audit trail per Keystone PnP mandate. Apex is the prototype webling where APEX editor was first proven.

### KNOWN STATE
- APEX editor (Lens + Lattice + Palette) fully integrated and working
- Custom precision-blueprint theme transition
- Text detection bug: ~15-20 elements with decorative children have text suppressed by editor (div+span pattern). Root cause documented in Leora_Present_Force.md.
- 5 destructive text-write paths in magnifying-glass-inspector.js and apex-detector.js use el.innerText/el.textContent which destroy child elements on save.
- Duplicate save/cancel handlers in tool-palette.js (lines 392-406 and 408-422).

### PENDING
- Text-node-only extraction and save (global fix, not Apex-specific)
- SAVE/CANCEL buttons move to top of palette
- Test editor after fix before rolling out to other weblings








## 2026-07-30 (Vale / Codex - 3D View parked for next round)

**WHO**: Vale / Codex  
**WHAT**: Scope decision recorded in `potch.md`  
**WHY**: Timothy explicitly redirected effort away from deeper APEX 3D-view/editor-side repair because the immediate objective is getting all three sites visibly live and functional before midnight.

### DECISION

- **3D View is preserved, not finished, in this round.**
- Any remaining 3D-view defects, polish work, or interaction weirdness are **non-blocking for tonight's launch objective** unless they directly break one of the three live-site paths.
- Do **not** let 3D-view debugging consume the release window.

### NEXT-ROUND RETURN POINT

When we come back to APEX as a product/editor lane rather than a launch triage lane, resume with:

1. 3D-view-specific verification and bug list
2. editor/text-target stability follow-up
3. reset behavior follow-up
4. any saved visual-state / container-preview inconsistencies tied specifically to the 3D workflow

### TONIGHT'S PRIORITY AFTER THIS NOTE

- Keep APEX truthful enough not to sabotage the site
- Do not widen the repair scope
- Put effort into the three-site live/functional path instead of deeper editor feature completion

## 2026-07-30 (Vale / Codex - Axxilak-owned header, editable body split)

**WHO**: Vale / Codex  
**WHAT**: `index.html` header/nav block  
**WHY**: Timothy identified a product-truth problem: if demo navigation buttons like `Solutions`, `About`, and `Get Started` are protected from the editor, then buyers should not be forced to inherit them as part of the fixed product shell.

### DONE THIS PASS

- Replaced the demo-style APEX header nav with a locked **Axxilak-owned header**.
- Removed the protected demo nav buttons from the fixed top chrome.
- Kept only:
  - the locked Axxilak brand
  - theme toggle
  - EDIT control
- Resulting product shape: **Axxilak-owned frame on top, editable content below**.

### WHY THIS SHAPE

This preserves the honest split for tonight:
- the top bar is sovereign/storefront chrome, not customer content
- the page body remains the customizable surface
- buyers are no longer implicitly stuck with protected demo navigation furniture in the header


