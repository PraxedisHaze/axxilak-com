# Maison editor repair - 2026-07-26

## Scope

The thirteen customer Maison source bundles: APEX, Aura, Canvas, Cipher, Ether, Gaia, Iron & Ink, Liquid Gold, Neon Tokyo, Oracle, Scholar, Summit, and Velvet.

## What changed

- Every `js/tool-palette.js` now gives the palette an explicit inline layer above the editor lockdown overlay. Runtime Tailwind class generation could leave the palette below that overlay.
- Every palette now uses viewport-safe placement below the navigation, preventing a tall palette from covering the Edit-mode exit control on short viewports.
- APEX now routes Save and Discard through its actual `onEdit` session engine when optional host callbacks are absent.
- Aura no longer calls the removed `preventButtonDisableOnInspectorMode()` dispatcher method, which had caused a runtime TypeError.

## Evidence

- Each of the thirteen canonical Maison pages returned HTTP 200 from the local source server.
- Static checks verified the explicit layer and viewport-safe layout in all thirteen palette bundles.
- APEX browser proof: enter edit mode; Discard is clickable; exit edit mode; ordinary Solutions navigation resumes and scrolls to `#solutions` (`scrollY` 1028, target top 0).
- Aura browser proof: the editor opens and exits; after removing the obsolete call its console has no errors.
- `git diff --check` passed.

## Still open before an outward sale claim

- Run a complete browser console/interaction sweep for all thirteen, not just APEX and Aura.
- Replace the production Tailwind CDN dependency or deliberately accept/document it.
- Resolve APEX's local Edge Electrify iframe 404.
- Build and verify clean customer ZIPs, with hosting/use instructions and no internal development records.
- Attach a ratified price and an actual Keystone/Gumroad/Stripe checkout-delivery path.

## Follow-up - Neon Tokyo visitor controls and shared editor affordances

### Why

A live visitor review found two editor cues working against the intended action: the open palette could hide the ordinary pointer, and dark-mode text entry had an invisible caret. The Neon Tokyo header also needed its useful navigation restored and its animated background needed an explicit visitor-controlled fade.

### What changed

- All thirteen Maison inspector bundles now use the normal pointer over the non-interactive lockdown overlay instead of the red not-allowed cursor.
- The thirteen product palette bundles and the shared apex-editor palette now explicitly show a normal pointer in the palette, a text cursor in editable fields, and a light visible caret in Quill/text inputs. The seven pages that explicitly hid the browser cursor in edit mode now retain the normal cursor.
- Neon Tokyo now has System and Contact links plus a Motion Full/Faded control. Faded motion dims and pauses the animated layers and persists the preference in local storage. A system reduced-motion preference keeps the page faded and disables the control as already satisfied.
- Neon Tokyo no longer requests the failing legacy polyfill.io script; modern browsers already supply the required ES6 support.

### Browser evidence

- Neon Tokyo has zero console errors after the polyfill removal; one Tailwind CDN production warning remains.
- Selecting The Snider Manifold in edit mode immediately focuses the editor. Computed editor cursor is text and computed caret color is rgb(248, 250, 252); palette and overlay cursors are normal defaults.
- Motion Faded stored faded in local storage and remained faded after a same-session reload; grid opacity remained 0.06.
- At 375px width, Contact and Motion remain present with no horizontal page overflow.
- System navigation reaches #manifold (target top 0 after click). Contact resolves to mailto:contact@axxilak.com; mail delivery was not sent as part of browser verification.
## Follow-up - Editor completion controls and light-mode readability

### Why

A hands-on reviewer found three release-blocking editor failures: light-mode utility text could become hard to read, the insertion caret was not reliably visible, and the close control plus session save action either could not be found or could not execute. The root cause for the latter was the editor lockdown overwriting handlers inside its own palette.

### What changed

- Neon Tokyo light mode now maps the reused dark surfaces and muted Tailwind text to readable light surfaces and dark ink. This keeps the visual design while avoiding light text on a light surface.
- All thirteen Maison palettes now expose persistent, named `Save`, `Discard`, and `Exit` controls at the top of the editor. The palette X is explicitly labelled as discard-and-close.
- All thirteen text inspectors explicitly focus Quill and set a collapsed insertion selection when text is selected. Light mode uses a blue caret; dark mode uses a gold caret.
- The inspector's navigation lock now excludes controls inside the palette and lens. It still locks the ordinary page, but no longer replaces the palette's own Save, Exit, or X handlers.

### Evidence

- Neon Tokyo light-mode primary text measured `#4b5563` on `#f3f4f6` (6.87:1) and card text `#374151` on white (10.31:1). These sampled body-text pairs meet WCAG AA normal-text contrast; this is not a full-page WCAG certification.
- Browser proof in light mode: selecting a heading focused `.ql-editor`, produced a collapsed selection, and computed caret color `rgb(29, 78, 216)`.
- Browser proof in dark mode: the same flow focused `.ql-editor`, produced a collapsed selection, and computed caret color `rgb(251, 191, 36)`.
- Browser proof: `Exit` leaves `editMode: false` and hides the palette. The labelled X does the same. The actual former failure was reproduced before the lock exclusion and no longer occurs after it.
- JavaScript syntax checks passed for all 26 product editor bundles (13 palettes plus 13 inspectors). Neon Tokyo finished with zero browser console errors; the remaining warning is the known Tailwind CDN production warning.
## Correction - APEX Particle Dimmer restoration

### Why

The prior Neon Tokyo Motion Full/Faded toggle was a functional accommodation but not the existing Axxilak control Timothy identified. The canonical APEX-complete branch's Free Stuff page contains a real `Particle Dimmer`: `Dim`, a 0–100 range, and `Blast` / percentage / `Off` feedback. The product needed that proven interaction, not a replacement abstraction.

### What changed

- Replaced Neon Tokyo's Motion toggle with the APEX Particle Dimmer form and feedback model.
- The slider now controls Matrix canvas, moving cyber-grid, and CRT overlay intensity together. At `Off`, it stops the Matrix timer and pauses animated grid/glitch effects; any nonzero value resumes the Matrix.
- The selected value persists in local storage under `neon-tokyo-particle-intensity`. The older `neon-tokyo-motion=faded` preference is honored as an `Off` fallback once, preserving existing visitor intent.

### Evidence

- Source comparison verified the original APEX Particle Dimmer markup, labels, and 0–100 opacity behavior from `origin/claude/evaluate-code-desktop-5L7RX:free-stuff.html`.
- Local browser proof exposed the slider as `Particle intensity` with its initial `100` / `Blast` state and no console errors (only the known Tailwind CDN warning).
- Keyboard interaction drove the slider to `0`; the live DOM reported `0|Off|true|none`: slider Off, motion-off state active, and Matrix canvas hidden after its timer stopped.
- After restoring Blast and reloading, live computed opacities returned to Matrix `0.16` and grid `0.35` with motion-off false.
- JavaScript syntax check and `git diff --check` passed.
## Follow-up - APEX-derived section navigation and honest contact destination

### Why

Neon Tokyo's header Contact link pointed directly at a `mailto:` URL. That is not a dependable in-page action and appears broken whenever the visitor has no configured mail application. Its lone System link also went only to the first section, leaving the rest of the product structure unrepresented. APEX is the source template for a navigation-plus-contact-footer shape.

### What changed

- Replaced the header's single System link with direct anchors for 01 Snider Manifold, 02 Snider Limit, 03 Metric Formalization, and 04 Phase Topology. The section links are visible in the full desktop navigation and always available in the footer navigation.
- Changed header Contact to `#contact`, providing a visible, dependable destination.
- Rebuilt the footer as an APEX-derived contact section beneath the four page sections: named/email/message fields, a clear Compose Email action, and a complete section navigation list.
- The form uses `mailto:contact@axxilak.com` and explicitly says that sending occurs only after the visitor confirms it in their email application. No false submission-success state is claimed.

### Evidence

- Local browser snapshot exposes all four named header anchors, the Contact link, a labeled contact form, its three required fields, and the full footer section navigation.
- Live Contact activation landed at `#contact` with the contact section 112px below the viewport top (clear of the fixed navigation); the form action is `mailto:contact@axxilak.com`, method `post`.
- The page completed with zero console errors and only the existing Tailwind CDN production warning.
- JavaScript syntax and `git diff --check` passed.
## Follow-up - Social sharing and mobile header containment

### Why

A customer should be able to carry a Maison to a social platform without manually copying a URL. During the same review, a 375px viewport exposed the desktop header controls colliding because the fixed navigation forced every control into a single row.

### What changed

- Added X, Facebook, LinkedIn, and Copy Link controls to Neon Tokyo's contact area. Share URLs are generated from the visitor's current page URL; they open the platform's own compose/share screen in a separate tab rather than posting on anyone's behalf.
- Copy Link uses the browser clipboard API and reports a clear success or a visible manual-copy fallback.
- The mobile navigation is now intentionally two rows: brand row first, controls row second. Desktop behavior remains a single row.

### Evidence

- At 375px, measured mobile control bounds are non-overlapping: Contact `75–135`, Dim slider `144–216`, Theme `265–313`, and Edit `317–359`, all on the dedicated second row.
- Local browser snapshot exposes valid generated X, Facebook, and LinkedIn share destinations containing the current page URL.
- An actual Copy Link click produced the live status `Link copied.`.
- Browser console remains at zero errors; the only warning is the known Tailwind CDN production warning. `git diff --check` and JavaScript syntax checks passed.
### Icon refinement

- Replaced the text-only social controls with inline X, Facebook, LinkedIn, and copy-link vector marks while retaining readable labels and accessible link/button names.
- Verified again at 375px: the mobile header stays non-overlapping, share controls retain their destinations, JavaScript syntax and `git diff --check` pass, and the page has zero console errors apart from the known Tailwind CDN warning.
### Supplied official social marks

- Timothy supplied X, Facebook, and LinkedIn PNG assets from `Pictures\icons`; copied the selected originals into `neon-tokyo\icons\social` as product-local assets.
- Replaced the temporary inline social vectors with those files. All are rendered at a shared 20px height with automatic width so their official proportions remain intact: X 19.5px wide, Facebook 20px, LinkedIn 23.4px.
- Local browser verification confirmed all three assets load successfully and the page retains zero console errors apart from the known Tailwind CDN warning.
## Follow-up — universal close control and readable editor text

### Why
- The editor exposed two ways to leave: its recognizable X and a second `Exit` button. That was redundant and language-dependent.
- The content editor could inherit the inspected page element's colors, producing white-on-white or black-on-black text.

### What changed
- Removed the redundant `Exit` control and handler from all thirteen product editor bundles. The X remains the single close action; it is labeled for assistive technology as “Discard current changes and close editor.”
- Forced the internal Quill editor, text inputs, and textareas to a stable zinc-900 surface with slate-50 text, a visible placeholder, and a theme-appropriate caret.
- Versioned the editor import chain so cached pages fetch this repaired bundle.

### Evidence
- `node --check` passed for all 13 `tool-palette.js` bundles.
- `git diff --check -- axxilak/Maizons` passed.
- Fresh local browser test of Neon Tokyo: no `Exit` button; X plus Save and Discard present; computed editor ink `rgb(248, 250, 252)` on `rgb(24, 24, 27)`; zero console errors.
## Follow-up — clear selection, honest controls, and maker stamp

### Why
- The particle control had duplicate language around its two ends.
- The visible 3D card did not have a functioning scene behind it.
- Clicking a selected target removed its outline before focus moved to the palette, leaving the operator without a clear target.
- `DIV [TEXT]` did not communicate what the label meant or distinguish targets that share text.

### What changed
- Neon Tokyo now calls the slider `Motion` and reports `Off`, a percentage, or `Full`.
- Removed the visible 3D affordance from the twelve standard product palettes. The underlying experiment remains dormant rather than being represented as a working feature.
- The palette now says `Editing selected element:` and identifies the tag, role, and unique lattice ID.
- The selection outline and context bar are restored immediately after original-style capture, so the selected target stays visible while editing.
- Added a fixed AXXILAK.COM maker wordmark link. It is marked internal and locked, so the visual editor cannot select or edit it; ordinary source-level changes remain possible by design.

### Evidence
- Syntax checks passed for all 26 shared editor modules and `git diff --check -- axxilak/Maizons` passed.
- Fresh Neon Tokyo browser check: no visible 3D button; selected-element label present; selected DIV retained an outline; maker link resolves to `https://axxilak.com/` and carries both internal and locked markers; zero console errors.
## Follow-up — hierarchy-aware target paths

### Why
A text-bearing wrapper, its child label, and its child value can all be valid editor targets. Their inherited text is not an identity; the DOM hierarchy is.

### What changed
- Added a bounded DOM target path to every editor palette, including the Apex variant. Paths include tag names, IDs, or lattice IDs for each ancestor level.
- Kept the existing unique tag/role/lattice summary, but now expose the containing chain beside it so nested targets are distinguishable instead of appearing as duplicate text.

### Evidence
- All 26 editor modules parse successfully.
- Fresh Neon Tokyo browser check found one rendered DOM-path indicator, no visible 3D control, zero console errors.
## Follow-up — composite parents are no longer default targets

### Why
The target path exposed the nested structure, but the detector still marked mixed-content parents editable. That allowed a wrapper and each child to compete as click targets.

### What changed
- Updated all thirteen `elementDetector.js` modules so composite `div`/section-like containers are structural context, not default edit targets.
- Text leaves, media, and standalone buttons/links remain selectable. Buttons and links retain their control-level edit affordance even when they contain icon spans.

### Evidence
- All 13 detector modules pass `node --check`.
- The full editor import chain is cache-busted through the detector version.
- Fresh Neon Tokyo load reports zero console errors.
## Follow-up — deliberate structural selection

### Why
Disabling accidental composite-parent targeting must not make structural editing impossible. Moving a wrapper is a legitimate operation distinct from editing its leaf text.

### What changed
- Added an explicit Select parent container action to all thirteen palettes.
- Added the matching inspector action: it promotes the current target to its immediate parent, reopens that target as the selected structural node, and leaves Move Up/Move Down available.
- Leaf selection remains the default; parent selection is now deliberate.

### Evidence
- Fresh desktop-sized Neon Tokyo browser check: selecting Motion exposes Select parent container and Move Up/Down; visible 3D control remains absent; zero console errors.