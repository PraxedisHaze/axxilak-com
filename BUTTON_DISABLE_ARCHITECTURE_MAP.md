# APEX Editor: Button Disable System Architecture Map

**Generated: 2026-02-08**
**Status: Problem Analysis & Solution Design**
**Mission: When entering edit mode, ALL buttons must be disabled so text can be edited instead of triggering actions.**

---

## SECTION 1: THE CURRENT SYSTEM ARCHITECTURE

### Layer 1: HTML Button Structure
```
BUTTONS ON PAGE:
├── Navigation buttons (header/nav)
│   ├── Some have onclick="function()" attributes (DIRECT)
│   ├── Some have data-handler="scrollTo('#selector')" attributes (DELEGATED)
│   └── Some are <a> tags with href (LINK HANDLER)
│
├── Content buttons (main page)
│   ├── Same mixed patterns as nav
│   └── Some have nested text elements
│
└── Editor UI buttons (MUST STAY ACTIVE)
    ├── #btn-edit / edit-mode-btn (EDIT button)
    ├── #btn-save-changes (SAVE button in palette)
    ├── #btn-cancel-changes (CANCEL button in palette)
    └── Palette controls (should never be disabled)
```

### Layer 2: Event Handling Systems

#### System A: HandlerDispatcher (Document-level delegation)
```javascript
// In apex/js/handler-dispatcher.js

attachListeners() {
    document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-handler]');
        if (!target) return;
        const handlerAttr = target.getAttribute('data-handler');
        if (!handlerAttr) return;
        this.execute(handlerAttr);  // <-- EXECUTES HANDLER
    });
}

// Registered handlers:
// - scrollTo(selector)
// - toggleTheme()
// - toggleMobileMenu()
// - toggleEditMode()
```

**KEY FACT**: HandlerDispatcher listens at DOCUMENT LEVEL with EVENT DELEGATION.
This means it intercepts clicks BEFORE they reach the button element itself.

#### System B: Direct onclick Handlers
```javascript
// Some buttons have:
<button onclick="toggleMobileMenu()">Menu</button>

// The onclick attribute calls the function directly
// Clearing onclick attribute removes this handler
```

#### System C: Link Handlers (href)
```javascript
// Some elements are:
<a href="#section">Link</a>
<a href="javascript:void(0)">Link</a>

// Changing href to javascript:void(0) prevents navigation
```

### Layer 3: Inspector Edit Mode System

**File: `magnifying-glass-inspector.js`**

#### Current Button Disable Attempt (Lines 536-675):
```javascript
_startEditSession(el, data) {
    this.editSession.active = true;
    this.editSession.disabledButtons = [];

    // ATTEMPT 1: Disable ALL buttons by clearing onclick
    document.querySelectorAll('button').forEach(btn => {
        if (btn.id !== 'btn-edit' && !btn.id.startsWith('toolbar-')) {
            this.editSession.disabledButtons.push({
                button: btn,
                originalOnclick: btn.getAttribute('onclick'),
                originalProperty: btn.onclick
            });
            btn.removeAttribute('onclick');    // <-- Removes ATTRIBUTE
            btn.onclick = null;                 // <-- Clears PROPERTY
        }
    });

    // ATTEMPT 2: Disable nav buttons (onclick + data-handler)
    this._disableNavButtons();  // Lines 632-675

    // ATTEMPT 3: Block pointer-events globally
    const scene = document.getElementById('apex-3d-scene');
    if (scene) {
        scene.style.pointerEvents = 'none !important';
        scene.querySelectorAll('*').forEach(el => {
            el.style.pointerEvents = 'none';
        });
    }
}

_disableNavButtons() {
    const interactiveElements = nav.querySelectorAll('button, a[href], [onclick]');

    interactiveElements.forEach(el => {
        // Override onclick
        el.onclick = (e) => {
            e.stopImmediatePropagation();
            e.preventDefault();
            return false;
        };

        // Change href
        if (el.tagName === 'A') {
            el.href = 'javascript:void(0)';
        }
    });
}
```

---

## SECTION 2: THE PROBLEM (Root Cause Analysis)

### Why Button Disable Fails

**The Disconnect**:
- Inspector tries to disable buttons via `onclick = null` and attribute removal
- But buttons use `data-handler` attributes with HandlerDispatcher event delegation
- HandlerDispatcher listens at DOCUMENT LEVEL on the click event
- When user clicks button with `data-handler="scrollTo(...)"`, the event bubbles to document
- HandlerDispatcher catches it BEFORE any onclick attribute or property matters

**The Flow**:
```
User clicks button with data-handler="scrollTo(...)"
  ↓
HandlerDispatcher document listener fires (LINE 78 of handler-dispatcher.js)
  ↓
Finds [data-handler] attribute on target
  ↓
Calls this.execute(handlerAttr)
  ↓
Handler executes (e.g., scrollTo)
  ↓
(onclick clearing had NO EFFECT)
```

### Why pointer-events: none Doesn't Work

Pointer-events only blocks MOUSE EVENTS. But HandlerDispatcher's `document.addEventListener('click')` still fires because:
- Event listeners fire even when target has `pointer-events: none`
- The click event bubbles up regardless of pointer-events setting

### Current State on Localhost

**What happens when you click EDIT:**
1. Page lock overlay appears ✓ (semi-transparent, blocks clicks)
2. Palette opens ✓
3. Element gets pulsing green outline ✓
4. BUT: You can STILL click buttons and they STILL execute
   - Because HandlerDispatcher is listening and executing handlers
   - Because pointer-events doesn't stop event listeners

---

## SECTION 3: SOLUTION ARCHITECTURE

### Fix Strategy: Intercept at Dispatcher Level

**Principle**: Don't try to disable buttons. Instead, make HandlerDispatcher aware of edit mode.

**Implementation**:
```
When edit mode ACTIVATES:
  → Set inspector.editSession.active = true
  → HandlerDispatcher checks this flag
  → If active AND click is not on palette/editor → SKIP HANDLER

When edit mode DEACTIVATES:
  → Set inspector.editSession.active = false
  → HandlerDispatcher resumes normal execution
```

### Why This Works

1. **Single Point of Control**: One flag controls all handlers
2. **No HTML Modification**: Doesn't touch onclick attributes or properties
3. **Respects Event System**: Works WITH event delegation, not against it
4. **Clean Recovery**: No complex state to restore, just flip a flag

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ USER CLICKS BUTTON WITH data-handler ATTRIBUTE                  │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ HandlerDispatcher document listener fires (ALWAYS)              │
│ Line 78 of handler-dispatcher.js                               │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ↓
        ┌────────────────┐
        │ NEW GUARD:     │
        │ Is inspector   │──→ YES: Check if click is ON palette
        │ in edit mode?  │       or editor
        └────────────────┘
              NO ↓
                 │
                 ↓
        ┌─────────────────────────────────┐
        │ Click is on palette/editor?     │
        │ (Allow navigation within editor)│
        └────────────────┬────────────────┘
              NO ↓       YES ↓
                 │            └────→ ALLOW (skip guard, execute handler)
                 │
                 ↓
        ┌──────────────────────────────────┐
        │ BLOCK: stopImmediatePropagation  │
        │ preventDefault, return false     │
        └──────────────────────────────────┘
                 │
                 ↓
    HANDLER DOES NOT EXECUTE ✓
    Button click is disabled ✓
```

---

## SECTION 4: IMPLEMENTATION PLAN (Step-by-Step)

### Phase 1: Modify HandlerDispatcher to Check Edit Mode

**File**: `Websites/Axxilak/Weblings/apex/js/handler-dispatcher.js`

**Change**: Lines 77-87 (attachListeners method)

```javascript
// BEFORE:
attachListeners() {
    document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-handler]');
        if (!target) return;
        const handlerAttr = target.getAttribute('data-handler');
        if (!handlerAttr) return;
        this.execute(handlerAttr);
    });
}

// AFTER:
attachListeners() {
    document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-handler]');
        if (!target) return;

        // NEW GUARD: Check if inspector is in edit mode
        if (window.handlerDispatcher && window.handlerDispatcher.inspectorEditMode) {
            // Allow clicks only if target is inside palette/editor
            const inPalette = e.target.closest('#palette-container');
            const inEditor = e.target.closest('[data-anothen-internal]');

            if (!inPalette && !inEditor) {
                e.stopImmediatePropagation();
                e.preventDefault();
                return false;  // Block handler execution
            }
        }

        const handlerAttr = target.getAttribute('data-handler');
        if (!handlerAttr) return;
        this.execute(handlerAttr);
    });
}
```

**Checkpoint 1**: ✓ HandlerDispatcher has edit mode guard

### Phase 2: Export Inspector State to HandlerDispatcher

**File**: `Websites/Axxilak/Weblings/apex/index.html`

**Change**: After HandlerDispatcher initialization (around line 1222)

```javascript
// After: const dispatcher = new HandlerDispatcher();

// Expose a setter for edit mode
window.setHandlerDispatcherEditMode = (active) => {
    if (window.handlerDispatcher) {
        window.handlerDispatcher.inspectorEditMode = active;
    }
};
```

**Checkpoint 2**: ✓ Inspector can toggle dispatcher edit mode

### Phase 3: Update Inspector to Toggle Dispatcher

**File**: `Websites/Axxilak/Weblings/apex/js/magnifying-glass-inspector.js`

**Change A**: In `_startEditSession()` method (around line 532)

```javascript
// ADD THIS LINE near the start of _startEditSession:
window.setHandlerDispatcherEditMode(true);  // Enable guard
```

**Change B**: In `_endEditSession()` method (or wherever edit session ends)

```javascript
// ADD THIS LINE:
window.setHandlerDispatcherEditMode(false);  // Disable guard
```

**Change C**: In `_cancelEditSession()` method (if exists)

```javascript
// ADD THIS LINE:
window.setHandlerDispatcherEditMode(false);  // Disable guard
```

**Checkpoint 3**: ✓ Inspector controls dispatcher guard

### Phase 4: Remove Ineffective Code (Cleanup)

**File**: `magnifying-glass-inspector.js`

**Remove** (because they don't work and cause confusion):
- Lines 539-551: `document.querySelectorAll('button')` loop (clearing onclick)
- Lines 608-623: `pointer-events: none` attempt
- The `_disableNavButtons()` and `_restoreNavButtons()` methods (no longer needed)

**Keep** (they work via CSS overlay):
- Lines 595-606: Lockdown overlay click handlers (blocks non-palette clicks via overlay)

**Checkpoint 4**: ✓ Removed ineffective code

---

## SECTION 5: VERIFICATION CHECKLIST

### Before Testing

- [ ] Code changes reviewed for syntax errors
- [ ] All imports present (HandlerDispatcher exported correctly)
- [ ] Edit mode toggle points added to all exit paths

### During Testing (localhost:8000/Weblings/apex/index.html)

**Test 1: Navigation Button Disable**
- [ ] Click EDIT button to enter edit mode
- [ ] Try clicking a navigation button (e.g., "Back to Gallery")
- [ ] Button should NOT trigger its action
- [ ] Lockdown overlay should still be visible

**Test 2: Palette Operations**
- [ ] While in edit mode, click on a page element
- [ ] Palette should show
- [ ] Type in Quill editor or change color
- [ ] Palette interactions should work normally

**Test 3: Save/Cancel**
- [ ] Make changes to element
- [ ] Click SAVE or CANCEL button in palette
- [ ] Should properly exit edit mode
- [ ] Normal button functionality restored

**Test 4: Multiple Elements**
- [ ] Edit one element, cancel
- [ ] Click a different element
- [ ] Should enter new edit session
- [ ] Previous element should be deselected

**Test 5: Theme Toggle**
- [ ] While NOT in edit mode, click theme toggle
- [ ] Theme should change
- [ ] Editor should work in both light and dark
- [ ] Enter edit mode in new theme
- [ ] Buttons should still be disabled

**Test 6: Mobile Menu**
- [ ] Click hamburger menu while NOT in edit mode
- [ ] Menu should toggle
- [ ] Enter edit mode
- [ ] Click menu button
- [ ] Menu should NOT toggle

---

## SECTION 6: DEPLOYMENT CHECKLIST

### When Ready to Deploy

**Step 1: Test on Apex** ✓
- All verification tests pass on apex webling

**Step 2: Copy to Other Weblings**
- Copy updated handler-dispatcher.js to all 12 other weblings
- Copy updated magnifying-glass-inspector.js (if changed) to all weblings

**Step 3: Verify Each Webling**
- liquid-gold: Test buttons disabled
- neon-tokyo: Test buttons disabled
- (... all 12 weblings ...)

**Step 4: Publish**
- When all 12 weblings verified, mark as ready

---

## SECTION 7: RISK ANALYSIS

### Potential Issues & Mitigations

**Risk 1**: HandlerDispatcher in one webling breaks others if shared instance
- **Mitigation**: Each webling has its own HandlerDispatcher instance (verified in code)

**Risk 2**: Toggle flag gets stuck in "true" state if _endEditSession doesn't call it
- **Mitigation**: Add the toggle to ALL exit paths (cancel, save, escape key, etc.)

**Risk 3**: Palette buttons themselves get blocked
- **Mitigation**: Check includes `#palette-container` and `[data-anothen-internal]` in guard

**Risk 4**: Third-party buttons added later won't work
- **Mitigation**: Document that ALL buttons need either onclick OR data-handler; both will be handled

---

## SECTION 8: LOVE CHECKLIST (Keystone PnP Section V.D)

**Before Implementation**:

- [ ] **What breaks if this fails?**
  Answer: If guard isn't properly checked, buttons will execute even in edit mode. User could accidentally trigger navigation while editing.

- [ ] **How does it recover?**
  Answer: Toggle flag is simple to reset. Can manually call `window.setHandlerDispatcherEditMode(false)` in console.

- [ ] **What's the worst-case state?**
  Answer: User stuck in edit mode with buttons active. But lockdown overlay still provides fallback protection. Not a complete failure.

- [ ] **Does deactivate/cleanup handle partial states?**
  Answer: YES. _endEditSession() will be called which resets flag. Partial edit abandoned, but UI recovers cleanly.

- [ ] **Are there cascading failures?**
  Answer: NO. This is isolated to HandlerDispatcher. Other systems (lens, palette, 3D) unaffected.

- [ ] **Will the user be trapped?**
  Answer: NO. Lockdown overlay always provides visual feedback. Click "X" or ESC to exit (if implemented).

- [ ] **Did I add error handling?**
  Answer: YES. Guard checks `if (window.handlerDispatcher && window.handlerDispatcher.inspectorEditMode)` before accessing.

✓ LOVE CHECKLIST PASSED - SAFE TO IMPLEMENT

---

## SECTION 9: TIMELINE & EFFORT

**Implementation Time**: ~20 minutes (4 files, ~15 lines of actual changes)
**Testing Time**: ~30 minutes (verify all 12 weblings)
**Total**: ~50 minutes
**Risk Level**: LOW (isolated change, minimal dependencies)

---

**Document Complete**
Generated for Timothy Drake, 2026-02-08
Ready for approval to proceed to implementation phase.
