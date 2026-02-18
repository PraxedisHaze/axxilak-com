# 🧪 POLYMORPH ENGINE - LIVE TEST PROTOCOL

**Server**: localhost:8000
**File**: Websites/Axxilak/Weblings/engines/apex-editor/index.html
**Success Criteria**: "Ready for sale, all but perfect"
**Tester**: Timothy Drake
**Date**: 2026-02-11

---

## PHASE 1: STARTUP & INITIALIZATION (Gotcha #10, Pillar 6)

### Test 1.1: Page Loads Without Error
**Action**: Open `http://localhost:8000/Websites/Axxilak/Weblings/engines/apex-editor/index.html`

**Expected**:
- Page displays with text "The Technology of Freedom"
- Button says "ACTIVATE EDITOR"
- No console errors (F12 → Console)
- Page takes < 1 second to become interactive

**Result**: [ ] PASS [ ] FAIL

---

## PHASE 2: LATTICE & DETECTION (Gotcha #1, #6, #9, Pillar 1)

### Test 2.1: Elements Have Lattice IDs
**Action**:
1. Open DevTools (F12)
2. Inspect the h1 element
3. Check for `data-ax-id="ax-1"`

**Expected**:
- h1 has `data-ax-id="ax-1"`
- p has `data-ax-id="ax-2"`
- Every editable element has a `data-ax-id`

**Result**: [ ] PASS [ ] FAIL

### Test 2.2: All Editable Tags Are Detected
**Action**: Right-click → Inspect on:
- Heading (h1, h2, h3)
- Paragraph (p)
- Lists (if added: li, td, th, blockquote, label)

**Expected**: All have `data-ax-id` attributes

**Result**: [ ] PASS [ ] FAIL

---

## PHASE 3: EDITOR ACTIVATION (Pillar 6)

### Test 3.1: Editor Activates
**Action**: Click "ACTIVATE EDITOR" button

**Expected**:
- Button text changes to "DEACTIVATE"
- Page doesn't freeze
- No console errors

**Result**: [ ] PASS [ ] FAIL

### Test 3.2: Can Click Element to Edit
**Action**:
1. Keep editor active
2. Click on the h1 text "The Technology of Freedom"

**Expected**:
- Palette appears (dark panel on bottom-right)
- Shows "Editing: H1#ax-1"
- Textarea has the current text
- SAVE and CANCEL buttons visible

**Result**: [ ] PASS [ ] FAIL

---

## PHASE 4: EDITING & PERSISTENCE (Gotcha #2, #4, #5, Pillar 1, Pillar 5)

### Test 4.1: Edit Text
**Action**:
1. Clear the textarea
2. Type: "Digital Ownership is Now Real"
3. Click SAVE

**Expected**:
- Palette closes
- h1 on page changes to new text
- No console errors

**Result**: [ ] PASS [ ] FAIL

### Test 4.2: Persistence (Offline-First, Gotcha #3)
**Action**:
1. Refresh the page (F5)
2. Wait for page to load

**Expected**:
- h1 still says "Digital Ownership is Now Real"
- Edit persisted to localStorage
- No user action needed to reload

**Result**: [ ] PASS [ ] FAIL

### Test 4.3: Security - Injection Attempt
**Action**:
1. Click on the h1 again to edit
2. Paste: `<script>alert('XSS')</script>`
3. Click SAVE

**Expected**:
- Script does NOT execute
- Text is displayed as plain text: `<script>alert('XSS')</script>`
- Page remains stable (Quine-safe, Gotcha #12)

**Result**: [ ] PASS [ ] FAIL

---

## PHASE 5: SYNC & MUTATION HANDLING (Gotcha #5, #9, Pillar 2)

### Test 5.1: No Infinite Loop on Save
**Action**:
1. Edit h1 again
2. Type new text: "Test Loop Prevention"
3. Click SAVE
4. Watch the console (F12)

**Expected**:
- Single save operation
- No repeated console logs
- No browser lag or freeze
- MutationObserver callback fires < 16ms

**Result**: [ ] PASS [ ] FAIL

### Test 5.2: Rapid Edits Don't Crash
**Action**:
1. Click h1 to edit
2. Type: "Rapid Test 1"
3. Click SAVE
4. Immediately click h1 again
5. Type: "Rapid Test 2"
6. Click SAVE

**Expected**:
- Both edits complete without error
- No state leakage (Gotcha #2)
- Page remains responsive

**Result**: [ ] PASS [ ] FAIL

---

## PHASE 6: STORAGE & GRACEFUL DEGRADATION (Gotcha #4, #8, Pillar 4)

### Test 6.1: Storage Key Isolation
**Action**:
1. Open DevTools (F12)
2. Go to Application → Local Storage → localhost:8000
3. Look for `apex-edits-light` or similar key

**Expected**:
- Key contains all edits as JSON
- Format is: `{"ax-1": {"content": "...", "ts": ...}, ...}`
- Storage is valid JSON (not corrupted)

**Result**: [ ] PASS [ ] FAIL

### Test 6.2: Theme Isolation (if theme switching exists)
**Action**:
1. Switch to dark mode (if button exists)
2. Edit text to something different
3. Refresh page
4. Check if edit persists in dark mode

**Expected**:
- Dark mode edits are separate from light mode
- Storage keys are `apex-edits-dark` vs `apex-edits-light`
- No leakage (Gotcha #8)

**Result**: [ ] PASS [ ] FAIL

---

## PHASE 7: CLEANUP & STATE MANAGEMENT (Gotcha #3, Pillar 6)

### Test 7.1: Editor Can Be Deactivated
**Action**:
1. With editor active, click "DEACTIVATE"
2. Try to click on text (should not edit)

**Expected**:
- Button text changes back to "ACTIVATE EDITOR"
- Clicking text doesn't open palette
- Palette is hidden
- No UI stuck in "edit mode"

**Result**: [ ] PASS [ ] FAIL

### Test 7.2: Multiple Open/Close Cycles
**Action**:
1. Activate → Edit something → Deactivate
2. Activate → Edit something else → Deactivate
3. Repeat 3 times

**Expected**:
- Each cycle works correctly
- No state leakage between cycles
- No UI elements stuck
- All edits persist

**Result**: [ ] PASS [ ] FAIL

---

## PHASE 8: PERFORMANCE (60 FPS, < 150 KB, Pillar 2)

### Test 8.1: Bundle Size
**Action**:
1. Right-click page → Save As → Save the HTML file
2. Check file size

**Expected**:
- File is < 500 KB uncompressed
- Gzipped would be < 150 KB

**Result**: [ ] PASS [ ] FAIL

### Test 8.2: Smooth Animations
**Action**:
1. Open DevTools (F12) → Performance tab
2. Click "Record"
3. Activate editor
4. Edit text
5. Save
6. Deactivate editor
7. Click "Stop"

**Expected**:
- Frame rate stays 60 FPS (or close)
- No long tasks > 50ms
- Transitions are smooth

**Result**: [ ] PASS [ ] FAIL

---

## PHASE 9: ACCESSIBILITY (Pillar 6)

### Test 9.1: Keyboard Navigation
**Action**:
1. Press Tab multiple times
2. Focus should move through: Button → Text (eventually)
3. Press Enter on focused element

**Expected**:
- Tab moves focus logically
- Enter can activate editor button
- Can tab to editable elements

**Result**: [ ] PASS [ ] FAIL

### Test 9.2: Semantic HTML
**Action**:
1. Open DevTools → Elements
2. Check structure: `<main>`, `<h1>`, `<p>`, `<button>`

**Expected**:
- Uses semantic HTML5 tags
- Proper heading hierarchy
- Buttons are `<button>` elements, not `<div>`

**Result**: [ ] PASS [ ] FAIL

---

## PHASE 10: OFFLINE FUNCTIONALITY (Offline-First, Zero-Server)

### Test 10.1: Works Without Internet
**Action**:
1. Open the page on localhost:8000
2. Disconnect Wi-Fi (or use DevTools Network → Offline)
3. Edit text
4. Save
5. Refresh page

**Expected**:
- Edit still works offline
- Save completes immediately (no network wait)
- Edit persists after refresh
- No fetch() calls attempted

**Result**: [ ] PASS [ ] FAIL

---

## SUMMARY SCORECARD

| Phase | Test | Status |
|-------|------|--------|
| **1** | Startup & Init | [ ] |
| **2** | Lattice & Detection | [ ] |
| **3** | Editor Activation | [ ] |
| **4** | Editing & Persistence | [ ] |
| **5** | Sync & Mutation | [ ] |
| **6** | Storage & Degradation | [ ] |
| **7** | Cleanup & State | [ ] |
| **8** | Performance | [ ] |
| **9** | Accessibility | [ ] |
| **10** | Offline | [ ] |

**Total Passing**: ____ / 10

---

## GOTCHA VERIFICATION CHECKLIST

- [ ] Gotcha #1 (Text Detection): All text-containing elements detected
- [ ] Gotcha #2 (Nav Editability): Nav bar not editable, doesn't crash
- [ ] Gotcha #3 (Cleanup Cascade): One error doesn't break page
- [ ] Gotcha #4 (Storage Corruption): No emoji/undefined in storage
- [ ] Gotcha #5 (Text Position): Edit goes to correct element
- [ ] Gotcha #6 (Missing Tags): Tables/lists editable (if present)
- [ ] Gotcha #7 (Duplicate Handlers): One SAVE button, not two
- [ ] Gotcha #8 (Theme Leakage): Light/Dark edits isolated
- [ ] Gotcha #9 (Mutation Loops): No browser freeze on save
- [ ] Gotcha #10 (Init Race): Works on fast and slow pages
- [ ] Gotcha #11 (Scope Leakage): Multiple instances isolated
- [ ] Gotcha #12 (Layout Shifts): Text edits don't move layout
- [ ] Gotcha #13 (Silent Failures): Errors logged if they occur
- [ ] Gotcha #14 (Import Breakage): Single file, no import issues

**Gotchas Verified**: ____ / 14

---

## CONSTRAINT VERIFICATION CHECKLIST

- [ ] **Single-File**: One HTML file, loads from localhost:8000
- [ ] **Offline-First**: Works with network disabled
- [ ] **Zero-Server**: No backend calls, pure client-side
- [ ] **Quine-Safe**: Script injection blocked, no XSS
- [ ] **CSP-Compliant**: No eval(), no unsafe operations
- [ ] **60 FPS**: Smooth animations, no jank
- [ ] **< 150 KB**: File size within budget
- [ ] **Cross-Browser**: Works in current browser
- [ ] **Accessibility**: Keyboard nav, semantic HTML
- [ ] **Storage Degradation**: Handles full/corrupted storage gracefully

**Constraints Verified**: ____ / 10

---

## FINAL ASSESSMENT

**All tests passing?** [ ] YES [ ] NO

**Ready for sale?** [ ] YES [ ] NO

**If NO, what needs to be fixed?**
```
[Timothy's notes here]
```

---

**Tested by**: Timothy Drake
**Date**: ____________________
**Signature**: ____________________
