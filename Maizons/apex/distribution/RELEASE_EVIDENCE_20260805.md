# Apex First Edition 1.0 â€” Release Evidence

Date: 2026-08-05
Status: **LOCAL RELEASE CANDIDATE â€” MOBILE FIRST-SELECTION REPAIRED; MANUAL PUBLISH GATES REMAIN**

## Package proof

- Generated package: `release-candidates\Apex-First-Edition-1.0\`
- Generated ZIP: `release-candidates\Apex-First-Edition-1.0.zip`
- ZIP contains 20 expected customer-facing entries including the page, CSS, editor modules, icons, Edge visual asset, launcher, guide, license candidate, and manifest.
- ZIP excludes internal source logs, QA/checklists, archives, `js\_archive`, other Maisons, engines, `Last Try`, Stripe/payment material, distribution-source files, and recursive release artifacts.
- `node --check` passes for `js\tool-palette.js` and `js\magnifying-glass-inspector.js`.
- `git diff --check` passes.
- Local package URL returned HTTP 200.

## Real browser proof â€” desktop

Tested the generated package URL in Playwright, not the development path.

- Page loaded with the expected public controls and zero browser console messages (zero errors, zero warnings).
- `document.elementFromPoint()` at the desktop EDIT coordinate returned the actual EDIT button; a physical mouse click entered Edit Mode.
- `document.elementFromPoint()` at the hero paragraph coordinate returned the actual `P`; a physical mouse click selected it and opened the palette.
- The visible `EXPORT HTML` control appeared in the active palette.
- `document.elementFromPoint()` at its coordinate returned the actual export button; a physical click ran the export path, then the expected native confirmation was accepted. The editor remained active, as designed.
- The CLI does not expose its download list, so the actual downloaded file was not independently opened in this pass. The click reached the native post-download confirmation and produced no console errors.

## Real browser proof â€” phone width (375 x 667)

- Mobile Theme, EDIT, and menu controls are visibly present in the generated package.
- During an active edit session, real hit-testing at the visible Theme and EDIT positions returns `#apex-lockdown-overlay`, as expected for this architecture.
- A physical mouse click at the overlay-covered EDIT coordinate successfully forwarded to EDIT and fully exited the active selection. This confirms the mobile forwarding route works.

## Release blocker: first selection on mobile

After re-entering mobile Edit Mode before choosing an element, the page's hero paragraph occupies approximately `x=24..351`, `y=410..522`. Five real hit-test probes across that entire area returned editor UI (`Lattice Standby` / `#palette-content`), never the underlying paragraph. The current standby/palette surface therefore blocks ordinary page-element selection in that region at phone width.

This is a functional mobile-editor blocker. Do not publish First Edition until the mobile pre-selection standby/palette placement or hit-testing behavior is repaired and re-tested through `document.elementFromPoint()` plus a physical click on page content.

## Commercial boundary

No public deployment, checkout configuration, payment credential use, price publication, or marketplace listing was performed. The proposed $9.95 First Edition / later free-gift transition remains a local sales draft pending Timothy's external decision.
## Corrective follow-up â€” mobile standby selection repaired in canonical source

Root cause was isolated to `ToolPalette.showStandby()`: it used the full mobile palette geometry (`55dvh`) before any element was selected. At `375x667`, the standby/palette surface physically covered the hero paragraph.

Repair: standby now adds a dedicated `palette-standby` state. At phone width only, that state becomes a compact bottom-right status chip and uses `pointer-events: none`. `update()` removes the state immediately when a real element is selected; `hide()` also clears it. No overlay forwarding, selection routing, navigation, or selected-palette layout logic was changed.

Real browser source retest at `375x667`: after a physical EDIT click, `document.elementFromPoint()` at the formerly blocked hero-paragraph center returned the actual `P`, with standby active, `pointer-events: none`, and a compact `185.7px x 107.1px` palette at the lower right. A physical click at that point selected the paragraph; standby became false, the palette became interactive (`pointer-events: auto`), and the browser console reported zero errors/warnings. The package will be regenerated from this source and rechecked before the hold is lifted.

## Final package recheck â€” mobile first selection passes

The generated `Apex-First-Edition-1.0` package was regenerated from the repaired canonical source and re-opened at `375x667`.

- Real hit-testing at the visible EDIT control returned the actual `BUTTON` with text `EDIT`; a physical mouse click entered Edit Mode.
- With `Lattice Standby` visible, real hit-testing at the hero paragraph center (`188,466`) returned the underlying `P`, not the editor surface.
- A physical mouse click at that verified point selected the paragraph and opened the normal editable palette, including Content, Save, Export HTML, Media help, Layout, and zero-or-greater Layer Depth.
- The package browser console finished with **0 errors and 0 warnings**.

The phone-width first-selection release blocker is therefore cleared for this local package. This is still not a public-publish authorization: Timothy's visual acceptance, an independently opened exported HTML download, final license/terms wording, price, and the actual Axxilak sales-page/checkout decision remain separate external gates.
## Follow-up package refresh — light Reset contrast and Cancel restoration

The First Edition package was regenerated after two canonical Apex repairs. The generated copy contains the `editor-20260805-cancel-reset1` inspector import, the light-theme Reset dropdown styles, and the `fontSize` edit-session snapshot. Source-browser acceptance in light theme used real hit-testing and physical clicks: both Reset options became readable; an unsaved hero size change from `20px` to `32px`, followed by `CANCEL` then `Discard`, closed the editor and restored `20px` with zero console errors/warnings. The regenerated ZIP is local-only and still has no publication/checkout activation.