# AXXILAK WEBSITE - PROGRESS LOG (THE POTCH)

---

## MISSION STATEMENT: WHAT WE ARE BUILDING

**Axxilak sells customizable multi-variant webpages.** Not templates. Not sites. *Webpages that multiply.*

One Webling can exist as a single version, or as 2 versions (light/dark), or as 4 (light/dark × English/Spanish), or as 10, 50, 100+ variants. Same HTML structure, infinite expressions. The magic is that each variant is independent—you can customize light without touching dark, English without touching Spanish—while every variant carries the inheritance chain (orange dot = inherited, blue dot = your sovereign choice). When you buy a Webling, you buy the right to create as many variants as you want without re-purchasing. No confusion. No fear of breaking something.

---

## THE APEX PROTOCOL (Universal Editor System)

**What it is:** A global protocol for reliable, persistent customization across all Axxilak products. Proven in Apex webling, deployable to all weblings and beyond.

**Core Architecture (Three Components):**

1. **The Lens Interface** - Visual targeting system
   - Circular targeting reticle following mouse
   - Crosshairs, center dot, depth probes, hints
   - Theme-aware aesthetics (neon green dark / gold light)
   - Draggable, intuitive, zero learning curve

2. **The Lattice System** - Persistent data layer (THE INNOVATION)
   - Every editable element assigned stable `data-ax-id="ax-N"`
   - Edits stored by lattice ID, NOT fragile CSS selectors
   - Survives DOM changes, theme switches, variant creation
   - localStorage persistence: `${weblingName}-edits-state`
   - Makes "buy once, own forever" technically possible

3. **The Tool Palette** - Editing interface
   - Rich text (Quill editor) for content
   - Style editing, metadata display
   - Advanced panel: lattice ID, selector, role, children count
   - Special modes: 3D visualization, depth maps, lattice labels
   - Responsive to element type (text, media, structure)

**The Three Safety Guards** (Data Integrity):
1. **HARD PURGE** - Removes corrupted 'undefined' strings on load
2. **DETECTOR SHIELD** - Filters invalid detections, allows media/structure
3. **PALETTE SHIELD** - Refuses to save undefined/null values

**Why It Works:**
- Lattice IDs make edits reliable across sessions
- Three-layer guard system prevents data corruption
- Element detection throttled for performance
- Theme-aware so same code works light/dark
- Modular: each component can be restyled independently

**Universal Deployment Pattern:**
1. Add `data-anothen-internal` to internal UI elements (lens, palette, etc.)
2. Initialize ElementDetector with ignored selectors specific to webling
3. Override CSS variables for color scheme (--primary, --accent, etc.)
4. Load inspector module and attach to Edit button
5. Store edits under `${weblingName}-edits-state` key

**Applies to:** All weblings (Velvet, Liquid Gold, etc.) + future apps (Lenny, CodeGnosis, Cici) + any Axxilak product requiring customization

---

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
- **WHY**: Purged the stray '✏️ EDIT' text from saved edits so it can't overwrite content on reload.

## 2026-02-06 (Session with Timothy - Leora/Claude Haiku)
- **WHO**: Leora (Claude Code CLI)
- **WHAT**: Websites/Axxilak/Weblings/apex/index.html, js/magnifying-glass-inspector.js, js/tool-palette.js + Weblings navigation + Checklists
- **WHY**: Polished Apex editor to production quality and prepared deployment infrastructure.
  - **Editor Method Fix**: Fixed method name mismatch (activate/deactivate → enable/disable) so EDIT button actually activates inspector
  - **Drag & Drop**: Added full click-and-drag functionality to both lens-container and palette-container with grab cursor feedback
  - **Visual Feedback System**:
    - Neon green pulse glow on highlighted elements (4px outline + 30px box-shadow animation)
    - 85% grayscale filter on entire page (applied only on click, not during hover)
    - Off-screen glow indicator that appears on screen edge when target scrolls away (positioned dynamically: top/bottom/left/right/corners)
  - **Theme-Aware Colors**:
    - Dark mode: Neon green (#00ff00) on dark areas, black in input boxes, green glow effects
    - Light mode: Gold (#d4af37) on dark areas, black in input boxes, gold glow effects
  - **Text Content Separation**: Moved typing animation from Apex ("Digital Authority") to Scholar ("Thought") to improve visibility
  - **Static Webling Navigation**: Added "Back to Gallery" links to liquid-gold, iron-ink, neon-tokyo, oracle, and scholar (AXXILAK logo clickable + nav link)
  - **Deployment Infrastructure**: Created EDITOR_DEPLOYMENT_CHECKLIST.md in root + customized checklists in all 13 webling folders with:
    - Phase-by-phase deployment steps
    - Webling-specific ignored selectors for detector
    - Copy-paste ready code blocks
    - Testing checklist for each webling
  - **Critical Discovery**: ES6 modules require HTTP server (not file:// protocol). Must run `python -m http.server 8000` from Axxilak root and access via `http://localhost:8000/...`
  - **!important Audit**: Reviewed all uses of `!important` against Google/Microsoft criteria. Attempted to remove unnecessary ones from `.apex-highlighted` styles (outline, outline-offset, box-shadow, position). **MISTAKE**: Removal broke the editor. Those styles ARE necessary because they override inline styles applied by JavaScript highlighting system. Reverted. **LESSON**: Just because a rule uses `!important` doesn't mean it's unnecessary—sometimes it's the only way to guarantee a visual effect works across dynamic content. Check *why* before removing.
  - **Status**: Apex editor fully functional. Ready for deployment to remaining 12 weblings following checklist template.

## 2026-02-06 (Evening - Issue: Palette Not Appearing on Hover)
- **WHO**: Leora (Claude Code CLI)
- **WHAT**: Websites/Axxilak/Weblings/apex/ (Debugging palette visibility)
- **ISSUE**: After CSS changes, palette-container no longer appears when hovering over elements. Lens reticle works fine (moves with mouse), but no palette box appears.
- **FINDINGS**:
  - palette-container exists in HTML with `class="hidden"`
  - No console errors
  - `_setBadge()` diagnostic badge IS present and firing
  - When hovering, badge says "[APEX DETECT] internal DIV" - detector is marking ALL detected elements as "internal"
  - This suggests either: (a) All hovered content is wrapped in something with `data-anothen-internal`, OR (b) The detector is incorrectly flagging all DIVs as internal
  - The ignored selectors include `'#palette-container'` which is correct, but something else is being marked internal
- **NEXT STEPS FOR CODEX**:
  1. Check if page content is wrapped in a div with `data-anothen-internal` attribute
  2. Verify `_isInternal()` logic in elementDetector.js is working correctly
  3. Try hovering over specific elements (h1, p, span) and check what the badge says
  4. May need to remove or adjust ignored selectors if they're too broad

## 2026-02-06
- **WHO**: Codex (GPT-5)
- **WHAT**: Websites/Axxilak/Weblings/apex/elementDetector.js
- **WHY**: Switched detection to `elementsFromPoint` and select the first non-internal, editable element so the lens overlay no longer blocks detection; added stack-level debug badges for internal-only vs non-editable stacks.

## 2026-02-06
- **WHO**: Codex (GPT-5)
- **WHAT**: Websites/Axxilak/Weblings/apex/index.html, Websites/Axxilak/Weblings/apex/js/tool-palette.js
- **WHY**: Set the Quill TEXT CONTENT area text to neon green and aligned the editor surface to a dark palette background for readability.
2 0 2 6 - 0 2 - 0 6   |   G e m i n i   C L I   |   W e b s i t e s / A x x i l a k / i n d e x . h t m l ,   j s / t r a n s i t i o n - c r a c k . j s   |   S t a n d a r d i z e d   L a n d i n g   P a g e   t o   A p e x   ' P a r c h m e n t '   L i g h t   M o d e ,   i m p l e m e n t e d   C i r c l e   R e v e a l   t r a n s i t i o n ,   a n d   a d d e d   ' S t a b i l i t y '   s e t t i n g   f o r   u s e r - c o n t r o l l e d   s h a r d   d e n s i t y   ( p e r f o r m a n c e   o p t i m i z a t i o n ) .   |   i n d e x . h t m l ,   t r a n s i t i o n - c r a c k . j s   |   U s e d - B y :   A x x i l a k   M a r k e t p l a c e   |   D e p e n d e n c y :   W e b l i n g s / e n g i n e s / t r a n s i t i o n s / c i r c l e - r e v e a l . j s  
 