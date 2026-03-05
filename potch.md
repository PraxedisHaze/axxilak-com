# AXXILAK WEBSITE - PROGRESS LOG (THE POTCH)

---

## MISSION STATEMENT: WHAT WE ARE BUILDING

**Axxilak sells customizable multi-variant webpages.** Not templates. Not sites. *Webpages that multiply.*

One Webling can exist as a single version, or as 2 versions (light/dark), or as 4 (light/dark × English/Spanish), or as 10, 50, 100+ variants. Same HTML structure, infinite expressions. The magic is that each variant is independent—you can customize light without touching dark, English without touching Spanish—while every variant carries the inheritance chain (orange dot = inherited, blue dot = your sovereign choice). When you buy a Webling, you buy the right to create as many variants as you want without re-purchasing. No confusion. No fear of breaking something.

**The Sales Narrative**

A boy builds apps. His father doubts him. His mother believes. His brother warns him about chaos. A mouse escapes and leads to the Free Stuff page—off-kilter, sirens flashing, the world upside-down. From that chaos, clarity: pick a Webling, edit it live, own what you make.

**The Customer Journey**

1. Land on axxilak.com. Read the story. Follow the mouse.
2. Discover Free Stuff. See the Webling gallery: 4 templates, each a different promise (Apex: scale. Liquid Gold: luxury. Summit: boldness. Neon Tokyo: rebellion).
3. Pick one. Click EDIT. The magnifying glass scope appears. Point. Target. Edit. Clone. Move up or down. This takes 5 minutes. You feel like a creator.
4. You like what you made. You buy it ($50 on Gumroad).
5. You download: the editor app + your exact website, precisely as you left it.
6. Later, you optionally discover you can make variants. Light and dark. English and Spanish. Ten versions, all living together, all preserved.

**The Editors**

- **Inspector** (the magnifying glass with the scope): The interface for all. Try-it and owned. Discovery-based, intuitive, elite.
- **Sanctuary of Echoes**: Professional power. Multi-variant editing with inheritance tracking. The place where you crystallize your work into infinite echoes of truth.

**The Launch Set (Phase 1)**
- Apex (featured) — "Scale Your Digital Authority"
- Liquid Gold — Premium, physics, shimmer
- Summit — Bold, rugged, tactical
- Neon Tokyo — Cyberpunk, creative, electricity

**The Promise**

Love first. When you buy an Axxilak Webling, you're not buying software. You're buying permission to create something beautiful and keep it. You're buying sovereignty over your own variants. You're buying the knowledge that what you inherit is visible, and what you choose is honored.

---

## 2026-01-25
- **WHO**: Gemmy (Gemini CLI)
- **WHAT**: Websites/Axxilak dot com/index.html
- **WHY**: Applied branding re-alignment from "Bespoke Templates" to "The Webling Collection." Wired Formspree ID (mkojaejr), updated Hero subtitle, and elevated product descriptor for Liquid Gold. Silenced dead social links to pass scrutiny.

## 2026-01-28
- **WHO**: Gemmy (Gemini CLI)
- **WHAT**: Websites/Axxilak dot com/ (Graduated Weblings + Gallery + Editor)
- **WHY**: Consolidated the 13 Webling Collection, the Universal Editor v1.1, and the Gallery Preview into the Axxilak root. The project is now unified and ready for review.

## 2026-02-02
- **WHO**: Claude (Haiku 4.5)
- **WHAT**: Websites/Axxilak/ (UI Refinement, Navigation Consistency, Celebration Theme)
- **WHY**: Fixed logo navigation bug (href="./" → href="index.html"), added Tailwind CSS to free-stuff and portfolio pages, made all three page headers pixel-perfect identical with unified branding, enhanced Free Stuff page with celebratory particle animation and golden shine effects on typography, optimized particle performance (40% slower, 40% dimmer), ensured consistent "AXXILAK Studios / We make beautiful apps." across all pages with proper left-alignment and Cinzel serif font.

## 2026-02-05 (Evening Update)
- **WHO**: Gemmy (Gemini CLI)
- **WHAT**: Websites/Axxilak/Weblings/apex/ (Lattice Stability & Depth Map)
- **WHY**: Pushed the "Anothen" standard into the third dimension.
    - **Lattice ID System**: Implemented a stable element tagging system (`data-ax-id`) to prevent "Selector Shift" and ensure edits stick across sessions.
    - **3D Lattice View**: Added a toggle to tilt the entire page into a 3D perspective, physically "lifting" elements based on their Z-index to visualize the stack.
    - **Theme-Aware Inspector**: Created "Anothen Mode" (Dark: Neon Green/Cyan) and "Bedrock Mode" (Light: Gold/Blue) for the Scope and Cursor, making the editor part of the world it's observing.
    - **Shift-Lock Targeting**: Implemented a 'Shift' key protocol that locks the targeting scope in place, allowing the mouse to leave the lens and interact with the ToolPalette while the targeting remains fixed.
    - **[CRITICAL BUG] The Obliteration**: Discovered a persistent bug where the editor overwrites targeted elements with the string "undefined" when transitioning focus. Multiple guards (null checks, source checks, lattice purges) have been attempted but the race condition persists in Dark Mode. This is the primary handoff point.

## 2026-02-05 (Evening - Leora & Laslo: Scope Blinking Fix)
- **WHO**: Leora (Claude Code CLI) + Laslo (Anothen-Aris, Research)
- **WHAT**: Weblings/apex/js/elementDetector.js, lens-ui.js, & index.html
- **WHY**: Fixed the editor blinking via the "Sanctuary Boundary" pattern. Root cause: The palette UI appearing near the cursor becomes the detected element on the next mousemove, causing the system to think the target changed (Recursive Gaze). Solution: Marked both lens-container and palette-container with `data-anothen-internal` attribute. In detect(), added a check: if the detected element or any of its parents have this attribute, skip detection entirely. This is topologically safe (works at any resolution/position) and prevents false detections without changing initialization order or adding cross-object references. The UI is now "invisible" to its own detection system.


## 2026-02-06
- **WHO**: Codex (GPT-5)
- **WHAT**: Websites/Axxilak/Weblings/apex/elementDetector.js
- **WHY**: Restored detector to emit full inspector payload (element, selector, styles, textContent), added data-ax-id lattice + stable selector, and throttled detection so edit mode can open the palette reliably instead of only showing the reticle.

## 2026-02-06
- **WHO**: Codex (GPT-5)
- **WHAT**: Websites/Axxilak/Weblings/apex/js/magnifying-glass-inspector.js, Websites/Axxilak/Weblings/apex/js/tool-palette.js
- **WHY**: Added minimal diagnostic logging hooks to trace detector → palette flow and detect Quill load failures without changing behavior.

## 2026-02-06
- **WHO**: Codex (GPT-5)
- **WHAT**: Websites/Axxilak/Weblings/apex/elementDetector.js
- **WHY**: Added detector trace logs to distinguish no-hit, internal-skip, and non-editable skips while diagnosing why the palette never opens.

## 2026-02-06
- **WHO**: Codex (GPT-5)
- **WHAT**: Websites/Axxilak/Weblings/apex/elementDetector.js
- **WHY**: Added an on-screen detector status badge to bypass console/cache issues and confirm detect() execution + skip reason.

## 2026-02-06
- **WHO**: Codex (GPT-5)
- **WHAT**: Websites/Axxilak/Weblings/apex/elementDetector.js
- **WHY**: Constrained detection to leaf text elements and added large-container skips to prevent the palette from binding to giant wrapper text blocks.

## 2026-02-06
- **WHO**: Codex (GPT-5)
- **WHAT**: Websites/Axxilak/Weblings/apex/elementDetector.js
- **WHY**: Removed div-level targeting so the detector only binds to leaf text elements (h/p/span/a/button), preventing card containers from collapsing into one selection.

## 2026-02-06
- **WHO**: Codex (GPT-5)
- **WHAT**: Websites/Axxilak/Weblings/apex/elementDetector.js, Websites/Axxilak/Weblings/apex/js/tool-palette.js
- **WHY**: Enforced leaf-only text targeting and switched text edits to textContent to prevent container edits from stripping child layout elements (logo box, dots).

## 2026-02-06
- **WHO**: Codex (GPT-5)
- **WHAT**: Websites/Axxilak/Weblings/apex/js/magnifying-glass-inspector.js
- **WHY**: Ensured text edits write via textContent (not innerHTML) so button/link text changes persist without stripping child elements.

## 2026-02-06
- **WHO**: Codex (GPT-5)
- **WHAT**: Websites/Axxilak/Weblings/apex/js/magnifying-glass-inspector.js
- **WHY**: Purged the stray '✏️ EDIT' text from saved edits so it can’t overwrite content on reload.
