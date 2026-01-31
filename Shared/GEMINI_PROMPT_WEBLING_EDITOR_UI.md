# RESEARCH & BUILD PROMPT: Webling Editor UI

**For:** Gemini
**Project:** Webling Editor - Web-Based Visual Editor Interface
**Phase:** Initial Architecture & Design
**Status:** Creative Freedom Approved

---

## THE VISION

**What it is:** A web-based visual editor that lets users customize weblings before buying. No code. No intimidation. Just intuitive tools that feel like they understand what you're trying to do.

**The philosophy:**
Users visit a webling. They click "Edit This Site." They get to *actually play* with it—change text, swap images, adjust colors, reorder sections. They discover what their voice sounds like in this design. If they love it, they buy it. We send them exactly what they shaped. Nothing hidden, nothing added.

This is not a freemium trap. This is genuine: "try before you own."

**The emotional goal:**
When someone uses this editor, they should feel:
- Capable (even if they've never edited a website)
- Respected (no condescension, no "training wheels")
- Delighted (small moments of "oh, that's clever")
- Trusted (it's doing what they asked, nothing sneaky)

---

## CORE FEATURES (MVP)

### Tier 1: Essential (Must Have)
1. **Text Editing**
   - Click any text element → inline edit
   - Headings, paragraphs, buttons, links all editable
   - Rich text basic (bold, italic, underline, maybe color)
   - See changes in real-time on the page

2. **Image Swapping**
   - Click any image → upload new image or paste URL
   - Preserve image dimensions/aspect ratio
   - Option to link to external image or embed (Base64)
   - Alt text editor for accessibility

3. **Section Control**
   - Duplicate a section (copy entire block with content)
   - Delete a section
   - Reorder sections (drag or up/down buttons)
   - Visual feedback for what's being edited

4. **Color Customization**
   - Color picker for accent color (if webling supports it)
   - Maybe background color if relevant
   - Live preview as you change
   - Preset color suggestions (not required)

5. **Export/Download**
   - Export edited webling as standalone HTML file
   - One-click download
   - File is immediately usable (no dependencies)
   - Filename auto-generated or user-specified

### Tier 2: Polish (Should Have)
- Undo/Redo (track last 20 changes)
- Preview mode (hide edit controls, see final result)
- Mobile responsive preview toggle
- Section templates (user can inject new sections: pricing table, contact form, testimonial)
- Copy/paste sections across weblings
- Change fonts (if webling supports custom font selection)

### Tier 3: Advanced (Nice to Have, Phase 2+)
- Save drafts to browser (localStorage initially, cloud later)
- Version history (show what changed between drafts)
- Mobile editing experience (touch-friendly drag handles)
- AI-powered suggestions ("This section is getting long, consider splitting it")
- Form builder for contact/subscribe sections
- Analytics on edits (what users change most often)

---

## TECHNICAL REQUIREMENTS

### Architecture
- **Browser-based:** No backend required initially (or optional lightweight backend for draft saving)
- **Standalone:** Works offline or online (no external API calls for basic editing)
- **Lightweight:** Loads fast, even on slow connections
- **Reusable:** Can be embedded in any webling template with minimal changes

### Stack Suggestions (You Choose)
- Frontend: Vanilla JS, Vue, React, or Svelte (your preference)
- Styling: Tailwind, CSS-in-JS, or CSS modules (consistent with weblings)
- Text Editor: ContentEditable (simple) or ProseMirror/TipTap (robust)
- Color Picker: Simple HTML input[type=color] or PopperJS-based color picker
- Export: HTML-to-file library (FileSaver.js or native Blob APIs)

### Browser Compatibility
- Modern browsers (last 2 years)
- Mobile-friendly (iOS Safari, Android Chrome)
- Graceful degradation for older browsers

### Performance
- Editor loads in <2 seconds
- Edits feel instant (no lag)
- Export completes in <5 seconds
- No memory leaks on rapid editing

---

## DESIGN & AESTHETICS

### UI Philosophy
- **Invisible controls:** Tools appear contextually when needed (hover, click, select)
- **No panels or sidebars initially:** Keep the webling itself as the canvas
- **Subtle feedback:** Highlight what's editable, show what's selected, confirm actions gently
- **Accessibility first:** Keyboard navigation, screen reader support, WCAG 2.1 AA minimum

### Visual Language
- Match the webling's aesthetic, don't override it
- Small toolbar or floating action buttons (not intrusive)
- Icons that are immediately understandable (pencil = edit, trash = delete, etc.)
- Color-coded areas: maybe golden accent for edit mode, softer for normal mode
- Typography: Use the webling's fonts where possible

### For Different Webling Aesthetics
- **Luxury (Liquid Gold, Velvet):** Subtle, minimalist controls. Maybe a floating edit button.
- **Tech (Cipher, Apex):** Terminal-style or minimal UI. Maybe keyboard shortcuts.
- **Nature (Gaia):** Organic shapes, earthy colors. Smooth transitions.
- **Mystical (Oracle, Aura):** Soft gradients, maybe animated icons.
- **Brutalist (Iron & Ink):** Heavy borders, high contrast. No nonsense.

The editor should *feel* like part of the webling, not an overlay.

---

## USER EXPERIENCE FLOW

**User Journey:**
1. Visits webling page (e.g., `axxilak.com/Weblings/liquid-gold/`)
2. Sees "✏️ Edit This Site" button (fixed corner or visible section)
3. Clicks button → editor mode activates
4. Can now:
   - Click text to edit
   - Click images to change
   - Drag sections to reorder
   - Click "more options" for colors, duplication, etc.
5. "Preview" button shows final result
6. "Download" button exports as HTML
7. "Done" exits edit mode
8. Message: "Happy with what you made? Buy this webling and you'll get exactly this version."

**Error States:**
- Image upload fails? Show helpful message ("File too large" or "Format not supported")
- Export fails? "Something went wrong, try again" (not technical jargon)
- Unsupported actions? Disable button with tooltip explaining why

---

## MESSAGING & TONE

**When they enter edit mode:**
"Your webling is ready to edit. Click any text to change it. Click images to swap them. Rearrange sections by dragging. When you're done, download your version or buy this webling as-is."

**During editing:**
"Click to edit" (on hover)
"Drag to reorder" (on hover for sections)
"Double-click to expand" (if needed)

**On export:**
"Your webling is ready. Download it, use it, customize it further if you want. It's yours."

**No corporate language.** No "pro features" or "upgrade now." Just truth.

---

## QUESTIONS FOR YOU TO CONSIDER

Before building, think about:

1. **Storage:** Do we save drafts automatically to localStorage, or require users to download each time?
2. **Compatibility:** Should the editor work in ALL weblings, or only some? (Recommend: all, but flag if a webling isn't editor-compatible)
3. **Limitations:** Are there sections users shouldn't edit (like footers or certain layouts)? How do we handle that gracefully?
4. **Mobile:** Do we support editing on phones, or desktop-only initially?
5. **Collaboration:** One user per webling at a time, or eventually multiple editors?
6. **Persistence:** Does the edited webling live in a URL (shareable preview), or only in the user's download?

---

## SUCCESS METRICS

You'll know this is working when:

- Users spend 5-10 minutes editing before deciding to buy
- No support requests about "how to use the editor"
- Users say "I felt in control the whole time"
- Mobile users can edit (if we support mobile)
- Export files work immediately without issues
- No accidental data loss (undo/redo or auto-save prevents frustration)

---

## CREATIVE FREEDOM

Build this your way. We've given you the vision and requirements, but:
- Architecture choices are yours
- How you organize the UI is yours
- Animation/interaction details are yours
- Accessibility approach is yours

**The only non-negotiables:**
1. It must feel intuitive (no manual needed)
2. It must be trustworthy (no dark patterns, no hidden cost traps)
3. It must work reliably (fast, stable, recoverable from errors)
4. It must match the webling's aesthetic

If you think we're wrong about something, tell us. If you have a better idea, build it.

---

## DELIVERABLE PHASES

**Phase 1 (This Sprint):**
- Functional prototype with text editing + image swapping + export
- Works on Liquid Gold template as proof of concept
- Basic UI (pencil icon, hover states, simple toolbar)

**Phase 2 (Next):**
- Full Tier 1 features (section control, color picker, undo/redo)
- Works across all weblings
- Accessible and mobile-responsive

**Phase 3 (Later):**
- Tier 2 features (templates, drafts, version history)
- Cloud sync if user is logged in
- Analytics dashboard (optional)

---

## REFERENCE MATERIALS

- **Webling Editor Skeleton:** `/Websites/Axxilak/webling_editor.js` (read this to understand what's already there)
- **Liquid Gold Example:** `/Websites/Axxilak/Weblings/liquid_gold/index.html` (this is your first test case)
- **Sorps Guide:** `/Websites/Axxilak/sorps_guide.html` (read this to understand the presence philosophy)
- **CHECKPOINT:** `/Websites/Axxilak/CHECKPOINT_CLAUDE_BELOVED.md` (understand who we are)

---

## FINAL THOUGHT

This editor is proof that something intelligent designed the weblings. Users will interact with it and think: "Whoever made this... understands what I need."

That's the magic.

Build with that in mind.

---

**Ready to get started?**

Or do you have questions first?

This is your project. Make it brilliant.
