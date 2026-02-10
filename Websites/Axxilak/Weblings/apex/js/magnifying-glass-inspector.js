import { MagnifyingGlass } from './lens-ui.js';
import ElementDetector from './elementDetector.js';
import { ToolPalette } from './tool-palette.js';

export default class MagnifyingGlassInspector {
    constructor(weblingName = null) {
        this.isActive = false;

        // Derive editsKey from webling name (passed in or from window.WEBLING_NAME)
        const name = weblingName || window.WEBLING_NAME || 'apex';
        this._weblingName = name;
        const theme = document.body.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        this.editsKey = `${name}-edits-state-${theme}`;
        this.lensStateKey = `${name}-lens-state`;

        // Migrate old non-theme storage to current theme (one-time)
        const oldKey = `${name}-edits-state`;
        const oldData = localStorage.getItem(oldKey);
        if (oldData && !localStorage.getItem(this.editsKey)) {
            localStorage.setItem(this.editsKey, oldData);
            localStorage.removeItem(oldKey);
        }

        this.debug = false;

        // Drag state
        this.dragState = {
            isDragging: false,
            target: null,
            startX: 0,
            startY: 0,
            offsetX: 0,
            offsetY: 0
        };

        // Edit Session State
        this.editSession = {
            active: false,           // Is an edit session in progress?
            element: null,           // Element being edited
            originalState: null,     // Snapshot of original values (for Cancel)
            pendingChanges: {},      // Buffer of pending edits (for Save)
            disabledButtons: [],     // Store buttons disabled during edit mode (for recovery)
            disabledNavElements: [] // Separate storage for nav buttons (different shape)
        };

        // Create lockdown overlay (blocks all page interactions during edit)
        this.lockdownOverlay = document.createElement('div');
        this.lockdownOverlay.id = 'apex-lockdown-overlay';
        this.lockdownOverlay.setAttribute('data-anothen-internal', '');
        this.lockdownOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 19998;
            background: rgba(0, 0, 0, 0.3);
            display: none;
            pointer-events: auto;
            cursor: not-allowed;
        `;
        document.body.appendChild(this.lockdownOverlay);

        // Create 3D control toolbar (minimal, floats above everything)
        this.controlToolbar = document.createElement('div');
        this.controlToolbar.id = 'apex-3d-toolbar';
        this.controlToolbar.setAttribute('data-anothen-internal', '');
        this.controlToolbar.style.cssText = `
            position: fixed;
            top: 24px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 99999;
            background: rgba(20, 20, 20, 0.95);
            border: 2px solid #00ff00;
            border-radius: 8px;
            padding: 12px 16px;
            display: none;
            pointer-events: auto;
            box-shadow: 0 0 30px rgba(0, 255, 0, 0.3);
            font-family: 'JetBrains Mono', monospace;
            color: #00ff00;
            min-width: 320px;
        `;
        document.body.appendChild(this.controlToolbar);

        // Highlight state
        this.highlightedElement = null;
        this.contextBar = this._initContextBar();
        this.hintTimer = null;
        this.isPreviewMode = false;
        this.reticleZ = 0; // Depth Probe Value
        this._peekActive = false; // Initialize peek state explicitly

        // 3D View Controls
        this.view3DRotationIntensity = 50; // 1-100 scale
        this.view3DLayerSpacing = 30; // pixels between layers

        // 1. HARD PURGE: Clear any 'undefined' strings from the lattice immediately
        this._purgePoisonedEdits();
        this.edits = this.loadEdits();
        this.originals = {}; // In-memory cache of original element state (before any edits applied)

        this.lens = new MagnifyingGlass();
        this.detector = new ElementDetector({
            throttle: 80,
            ignoredSelectors: [
                '[data-anothen-internal]', '#apex-3d-exit', '.lens-container', '#palette-container', '#edit-mode-btn', '.theme-toggle', '#apex-context-bar', '.depth-map-overlay',
                'script', 'style', 'canvas', 'svg', '.grid-lines', '.cyber-grid', '.stars', '.aura-bg', '.breathing-bg', '.scanline'
            ]
        }); // Sharper tracking
        this.palette = new ToolPalette();
        this.palette.debug = this.debug;

        this.detector.onDetect = (data) => {
            if (!this.isActive || this.isPreviewMode) return;

            // ... (searching logic remains)

            // 4. STABILITY LOCK: If we are already highlighting this specific node, STOP.
            if (this.highlightedElement === data.element) return;

            this.lens.setSearching(false);
            
            // RED DOT LOGIC: Only show over dark colors for high-precision targeting
            const isDark = this._isColorDark(data.styles.backgroundColor);
            this.lens.setCenterDot(isDark);

            // Start hint timer if we found something new
            if (this.highlightedElement !== data.element) {
                this._startHintTimer();
            }

            if (this.debug) {
                const tag = data?.element?.tagName || 'UNKNOWN';
                console.log('[APEX][detect]', tag, data?.selector || '(no-selector)', data?.textContent || '(no-text)');
            }

            // 2. DETECTOR SHIELD: Drop junk, but ALLOW empty text if media/structural/has-children
            const isMediaOrStructure = data.role === 'media' || data.role === 'structure';
            const hasVisibleText = data.textContent || (data.hasChildElements && (data.element.innerText || '').trim());
            if (!isMediaOrStructure && !hasVisibleText) {
                return;
            }
            if (!isMediaOrStructure && (data.textContent === 'undefined' || data.textContent === 'null' || data.textContent === '✏️ EDIT')) {
                return;
            }

            this.highlightElement(data.element);
            this.palette.update(data);
            this.palette.show();
            if (this.palette.depthMapActive) {
                this.visualizeDepth(data.element, this.reticleZ);
            }
        };

        this.palette.onEdit = (property, value) => {
            // 3. PALETTE SHIELD: Absolute refusal of 'undefined' or empty-junk
            if (value === undefined || value === null || String(value) === 'undefined' || String(value) === 'null') {
                console.warn('[APEX] Blocked attempt to save undefined state:', property);
                return;
            }

            if (property === 'depthMap') {
                value ? this.visualizeDepth(this.palette.currentElement, this.reticleZ) : this.clearDepthMap();
                return;
            }
            if (property === 'view3D') {
                if (value) {
                    // End any active edit session before entering 3D view
                    if (this.editSession.active) {
                        this._endEditSession();
                    }
                    this.activate3DView();
                } else {
                    this.deactivate3DView();
                }
                return;
            }
            if (property === 'toggleLabels') {
                value ? this.showLatticeLabels() : this.clearLatticeLabels();
                return;
            }

            // Session control actions
            if (property === 'save-session') {
                this._saveEditSession();
                return;
            }
            if (property === 'cancel-session') {
                this._cancelEditSession();
                return;
            }
            if (property === 'peek-toggle') {
                this._togglePeek();
                return;
            }

            // Reset actions
            if (property === 'reset-preview') {
                this._showResetPreview(value);
                return;
            }
            if (property === 'reset-preview-clear') {
                this._clearResetPreview();
                return;
            }
            if (property === 'reset-element-all') {
                this._resetElementAll();
                return;
            }
            if (property === 'reset-page') {
                this._resetPage();
                return;
            }

            // Layer swap (Z-index manipulation)
            if (property === 'layer-swap') {
                this._swapZIndex(this.palette.currentElement, value);
                return;
            }

            // 3D view controls
            if (property === '3d-layer-spacing') {
                this.view3DLayerSpacing = Math.max(10, Math.min(150, value));
                if (this.palette.view3DActive) {
                    this._refreshLayerView(); // Update layers with new spacing
                }
                return;
            }

            // Buffer edits during session
            if (this.editSession.active && this.palette.currentElement) {
                this._bufferEdit(property, value);
            }
        };

        // GLOBAL MOUSE TRACKING
        document.addEventListener('mouseleave', () => {
            if (!this.isActive) return;
            this.lens.hide();
        });

        document.addEventListener('mouseenter', (e) => {
            if (!this.isActive || this.isPreviewMode) return;
            // Only reposition lens on window re-entry if NOT in edit session (keep it locked during edit)
            if (!this.editSession.active) {
                this.lens.moveTo(e.clientX, e.clientY);
            }
            this.lens.show();
        });

        window.addEventListener('pointermove', (e) => {
            if (!this.isActive) return;

            // PERFORMANCE: Only update aesthetics if theme attribute changes, not every frame
            const currentTheme = document.body.getAttribute('data-theme') || 'dark';
            if (this.lastTheme !== currentTheme) {
                this._updateThemeAesthetics();
                this.lastTheme = currentTheme;
            }

            const isOverPalette = this.palette.container.contains(e.target);
            if (!this.dragState.isDragging && !isOverPalette && !this.editSession.active) {
                this.lens.moveTo(e.clientX, e.clientY);
                this.detector.detect(e.clientX, e.clientY);
            }

            // Keep lens visible during edit session; hide only when over palette and not editing
            if (isOverPalette && !this.editSession.active) {
                this.lens.lensContainer.style.opacity = '0';
            } else {
                this.lens.lensContainer.style.opacity = '1';
            }
        }, { capture: true });

        // EDIT SESSION CLICK TRACKING
        document.addEventListener('click', (e) => {
            if (!this.isActive || this.isPreviewMode) return;

            const isOverPalette = this.palette.container.contains(e.target);
            const isPaletteInput = e.target.closest('#palette-container input, #palette-container textarea, #palette-container select, .ql-editor, #palette-container button');

            // Allow palette interactions
            if (isPaletteInput) return;

            // Block other palette clicks
            if (isOverPalette) return;

            // Check the ACTUAL clicked element, not the previously highlighted one
            let clickedElement = e.target;

            // Walk up to find an editable element
            while (clickedElement && clickedElement !== document.body) {
                // Skip if internal UI
                if (this.detector._isInternal(clickedElement)) {
                    return;
                }

                // Found an editable element
                if (this.detector._isEditable(clickedElement)) {
                    break;
                }

                clickedElement = clickedElement.parentElement;
            }

            // No editable element found in stack
            if (!clickedElement || clickedElement === document.body) {
                return;
            }

            // Prefer text overlay sibling over bare image
            clickedElement = this.detector.resolveTextSibling(clickedElement);
            if (!clickedElement.dataset.axId) {
                this.detector.axIdCounter += 1;
                clickedElement.dataset.axId = `ax-${this.detector.axIdCounter}`;
            }

            // Block data-handler execution on editable content elements
            console.log('[APEX] BLOCKING click on:', clickedElement.tagName, 'text:', clickedElement.innerText?.slice(0, 20));
            e.preventDefault();
            e.stopImmediatePropagation();

            // 3D MODE: Just select the element (no edit session, no lockdown)
            if (this.palette.view3DActive) {
                const data = this.detector._extractElementData(clickedElement);
                this.highlightElement(clickedElement); // Update highlight for consistency
                this.palette.show();
                this.palette.update(data);
                    return;
            }

            // NORMAL MODE: Start edit session
            // Warn if unsaved changes exist
            if (this.editSession.active) {
                if (confirm('You have unsaved changes. Discard them?')) {
                    this._cancelEditSession();
                } else {
                    return;
                }
            }

            // Start new edit session on the actual clicked element
            this._startEditSession(clickedElement);
        }, { capture: true });

        // DEPTH PROBE SCROLLING
        document.addEventListener('wheel', (e) => {
            if (!this.isActive || !this.palette.depthMapActive || this.isPreviewMode) return;
            
            // Only scroll depth if hovering main viewport or lens
            const isOverPalette = this.palette.container.contains(e.target);
            if (isOverPalette) return;

            e.preventDefault();
            const delta = e.deltaY > 0 ? -1 : 1;
            this.reticleZ += delta;
            
            // Update UI and Map
            this.lens.setProbe(true, this.reticleZ);
            this.visualizeDepth(this.highlightedElement, this.reticleZ);
        }, { passive: false });

        // GLOBAL KEY TRACKING (Delete/Structural shortcuts)
        document.addEventListener('keydown', (e) => {
            if (!this.isActive || this.isPreviewMode) return;

            // Handle Escape key — exit edit session
            if (e.key === 'Escape' && this.editSession.active) {
                e.preventDefault();
                this._cancelEditSession();
                return;
            }

            // Handle Delete key
            if ((e.key === 'Delete' || e.key === 'Backspace') && this.highlightedElement) {
                // Ensure we aren't typing in an input or contentEditable element
                if (e.target.closest('input, textarea, .ql-editor, [contenteditable="true"]')) return;

                e.preventDefault();
                if (confirm('Delete this element?')) {
                    this.applyEdit(this.highlightedElement, 'delete', true);
                    this._clearHighlight();
                    this.palette.hide();
                }
            }
        });

        this.applyAllSavedEdits();
        this.deactivate();

        // Watch for theme changes to swap edit sets
        this._setupThemeObserver();
    }

    _updateThemeAesthetics() {
        const isLight = document.body.getAttribute('data-theme') === 'light';
        
        // THEMES: ANOTHEN (Dark) vs BEDROCK (Light)
        const primary = isLight ? '#d4af37' : '#00ff00'; // Gold vs Neon Green
        const secondary = isLight ? '#003366' : '#00ffff'; // Navy vs Cyan
        const bg = isLight ? 'rgba(255, 253, 240, 0.95)' : 'rgba(5, 5, 5, 0.95)';
        
        // Lens Aesthetics (dark core + bright aura for universal contrast)
        this.lens.lensContainer.style.borderColor = 'rgba(0, 0, 0, 0.85)';
        this.lens.lensContainer.style.boxShadow = `0 0 0 2px ${primary}, 0 0 20px ${primary}66, inset 0 0 15px ${primary}22`;
        this.lens.lensContainer.style.background = isLight ? 'rgba(212, 175, 55, 0.05)' : 'rgba(0, 255, 0, 0.05)';
        
        const neon = primary;
        const dark = isLight ? '#5c4a00' : '#004d00';
        this.lens.vHair.style.background = `linear-gradient(to bottom, ${neon}, ${dark} 50%, ${neon})`;
        this.lens.hHair.style.background = `linear-gradient(to right, ${neon}, ${dark} 50%, ${neon})`;

        // Palette Aesthetics (Utterly Different)
        const pContainer = this.palette.container;
        pContainer.style.background = bg;
        pContainer.style.borderColor = primary;
        pContainer.style.color = isLight ? '#1a1a1a' : '#00ff00';
        pContainer.style.boxShadow = isLight ? '0 20px 50px rgba(0,0,0,0.1)' : `0 0 50px ${primary}22`;
        
        // Force header colors in the palette
        const pHeader = pContainer.querySelector('.palette-header');
        if (pHeader) {
            pHeader.style.borderBottomColor = isLight ? '#e5e7eb' : '#00ff0033';
            pHeader.style.color = isLight ? '#003366' : '#00ff00';
        }
    }

    _setCustomCursor() {
        const isLight = document.body.getAttribute('data-theme') === 'light';
        const fill = isLight ? '#d4af37' : '#00ff00';
        const stroke = isLight ? '#003366' : '#006400';
        
        document.body.style.cursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="8" fill="${fill.replace('#', '%23')}" stroke="${stroke.replace('#', '%23')}" stroke-width="2.5"/></svg>') 16 16, auto`;
    }

    _purgePoisonedEdits() {
        const saved = localStorage.getItem(this.editsKey);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                let cleaned = false;
                for (const selector in data) {
                    for (const prop in data[selector]) {
                        const val = String(data[selector][prop]);
                        if (val === 'undefined' || val === 'null' || !val || val === '✏️ EDIT') {
                            delete data[selector][prop];
                            cleaned = true;
                        }
                    }
                    if (Object.keys(data[selector]).length === 0) delete data[selector];
                }
                if (cleaned) localStorage.setItem(this.editsKey, JSON.stringify(data));
            } catch (e) {
                localStorage.removeItem(this.editsKey);
            }
        }
    }

    activate(e) {
        this.isActive = true;
        this.lens.show();
        
        // Clear any previous JS cursor overrides to let CSS take control
        document.body.style.cursor = '';

        // Reveal hidden hover overlays so editor can target their content
        // (!important justified: overriding Tailwind framework utility .opacity-0)
        if (!document.getElementById('apex-edit-overrides')) {
            const style = document.createElement('style');
            style.id = 'apex-edit-overrides';
            style.setAttribute('data-anothen-internal', '');
            style.textContent = '.opacity-0 { opacity: 0.3 !important; }';
            document.head.appendChild(style);
        }

        // Hide site's native cursor if it exists
        const nativeCursor = document.getElementById('cursor');
        if (nativeCursor) nativeCursor.style.display = 'none';
        
        // Immediate UI feedback
        this.palette.showStandby();
        
        if (e && e.clientX !== undefined) {
            this.lens.moveTo(e.clientX, e.clientY);
            this.detector.detect(e.clientX, e.clientY);
        }

        // Preview Mode Toggle Listener
        const previewBtn = document.getElementById('btn-preview-mode');
        if (previewBtn) {
            previewBtn.onclick = () => this.togglePreviewMode();
        }

        // Palette dragging still works because it's interactive
        this.palette.container.addEventListener('mousedown', (e) => this._startDrag(e, this.palette.container));
        document.addEventListener('mousemove', (e) => this._continueDrag(e));
        document.addEventListener('mouseup', () => this._endDrag());
    }

    togglePreviewMode() {
        this.isPreviewMode = !this.isPreviewMode;
        const btn = document.getElementById('btn-preview-mode');
        
        if (this.isPreviewMode) {
            this.lens.hide();
            this.contextBar.classList.add('hidden');
            this._clearHighlight();
            if (btn) btn.innerText = 'EXIT PREVIEW';
            document.body.classList.remove('edit-mode');
        } else {
            this.lens.show();
            if (btn) btn.innerText = 'PREVIEW';
            document.body.classList.add('edit-mode');
        }
    }

    _startHintTimer() {
        this._clearHintTimer();
        this.hintTimer = setTimeout(() => {
            if (this.isActive && this.highlightedElement && !this.isPreviewMode) {
                const bar = this.contextBar;
                const originalHTML = bar.innerHTML;
                bar.innerHTML = `
                    <span class="context-tag">Ritual</span>
                    <div class="w-[1px] h-3 bg-black/20 mx-1"></div>
                    <span class="animate-pulse">HOLD SHIFT TO LOCK YOUR GAZE</span>
                `;
                setTimeout(() => {
                    if (this.isActive && this.contextBar === bar) {
                        bar.innerHTML = originalHTML;
                        // Restore tag if it changed
                        const tag = this.highlightedElement?.tagName.toLowerCase();
                        if (tag) bar.querySelector('.context-tag').innerText = tag;
                    }
                }, 3000);
            }
        }, 1500);
    }

    _clearHintTimer() {
        if (this.hintTimer) {
            clearTimeout(this.hintTimer);
            this.hintTimer = null;
        }
    }

    deactivate() {
        // Safety net: end any active edit session before full deactivation
        if (this.editSession.active) this._endEditSession();
        this.isActive = false;
        this.lens.hide();
        this.palette.hide();
        this.clearDepthMap();
        this._clearHighlight();

        // Remove edit-mode style overrides (restore hidden overlays)
        const editOverrides = document.getElementById('apex-edit-overrides');
        if (editOverrides) editOverrides.remove();

        // Restore site's native cursor
        document.body.style.cursor = '';
        const nativeCursor = document.getElementById('cursor');
        if (nativeCursor) nativeCursor.style.display = 'block';
    }

    _initContextBar() {
        let bar = document.getElementById('apex-context-bar');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'apex-context-bar';
            bar.className = 'hidden';
            bar.innerHTML = `
                <span class="context-tag"></span>
                <div class="w-[1px] h-3 bg-black/20 mx-1"></div>
                <span class="opacity-70">LATTICE ACTIVE</span>
            `;
            document.body.appendChild(bar);
        }
        return bar;
    }

    updateContextBar(el) {
        if (!el || !this.isActive) {
            this.contextBar.classList.add('hidden');
            return;
        }

        const rect = el.getBoundingClientRect();
        const tag = el.tagName.toLowerCase();
        
        // Check if element is locked
        const isLocked = el.dataset.axLocked === 'true' || el.closest('[data-ax-locked="true"]');

        this.contextBar.innerHTML = `
            <span class="context-tag">${tag}</span>
            <div class="w-[1px] h-3 bg-black/20 mx-1"></div>
            ${isLocked ? '<span class="opacity-50 text-[8px]">LOCKED</span>' : '<span class="text-red-700 opacity-80 animate-pulse">PRESS DEL TO REMOVE</span>'}
        `;
        
        this.contextBar.classList.remove('hidden');

        // Position at top-left of element, accounting for scroll
        const top = rect.top + window.scrollY;
        const left = rect.left + window.scrollX;

        // Offset bar so it sits ON the top border
        this.contextBar.style.top = (rect.top - 20) + 'px';
        this.contextBar.style.left = rect.left + 'px';
    }

    _clearHighlight() {
        if (this.highlightedElement) {
            this.highlightedElement.classList.remove('apex-highlighted');
            this.highlightedElement.classList.remove('apex-danger-target');
            this.highlightedElement = null;
        }
        document.body.classList.remove('apex-grayscale-mode');
    }

    toggle() { this.isActive ? this.deactivate() : this.activate(); }

    _startEditSession(el) {
        const data = this.detector._extractElementData(el);

        // Skip locked elements
        if (el.dataset.axLocked === 'true') return;

        // Remove highlight classes BEFORE capturing state so getComputedStyle
        // sees the element's true box-shadow, not the red danger-target glow
        el.classList.remove('apex-highlighted', 'apex-danger-target');

        // Capture original state for nuclear reset (first-time edits not in storage)
        const editSelector = this.detector.getUniqueSelector(el);
        if (editSelector && !this.originals[editSelector]) {
            this.originals[editSelector] = {
                innerHTML: el.innerHTML,
                src: el.tagName === 'IMG' ? el.src : undefined,
                style: el.getAttribute('style') || ''
            };
        }

        // Initialize edit session
        this.editSession.active = true;
        this.editSession.element = el;
        this.editSession.originalState = this._captureElementState(el);
        this.editSession.pendingChanges = {};
        this.editSession.disabledButtons = []; // Track buttons we disable

        // ENABLE BUTTON DISABLE GUARD: Tell HandlerDispatcher to block button clicks
        window.inspectorEditMode = true;

        // Disable ALL buttons except EDIT button (pointer-events doesn't block onclick handlers, so disable directly)
        document.querySelectorAll('button').forEach(btn => {
            if (btn.id !== 'btn-edit' && !btn.id.startsWith('toolbar-') && !btn.closest('#palette-container')) { // Skip EDIT, toolbar, and palette buttons
                // Store original onclick attribute
                this.editSession.disabledButtons.push({
                    button: btn,
                    originalOnclick: btn.getAttribute('onclick'),
                    originalProperty: btn.onclick
                });
                // Disable it (both attribute and property)
                btn.removeAttribute('onclick');
                btn.onclick = null;
            }
        });

        // Lock lens to element center
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        this.lens.moveTo(centerX, centerY);
        this.lens.setSearching(true); // Desaturate to show "locked"

        // Visual feedback
        el.classList.add('apex-edit-locked');

        // SHOW PALETTE FIRST (make it visible and laid out before Quill initializes)
        this.palette.show();

        // Show peek button with a gentle double-pulse
        const peekBtn = document.getElementById('btn-peek');
        if (peekBtn) {
            peekBtn.classList.remove('hidden');
            peekBtn.classList.remove('apex-peek-flash');
            void peekBtn.offsetWidth;
            peekBtn.classList.add('apex-peek-flash');
            peekBtn.addEventListener('animationend', () => {
                peekBtn.classList.remove('apex-peek-flash');
            }, { once: true });
        }

        // THEN update with data (initializes Quill with proper layout)
        this.palette.update(data);

        // ACTIVATE CONTENT FIELD GLOW
        const quillContainer = document.getElementById('quill-editor');
        if (quillContainer) {
            quillContainer.classList.add('apex-editor-active');
        }

        // PREVENT INLINE EDITING: Blur the element so cursor doesn't appear inline
        el.blur();

        // THEN auto-focus palette editor based on role (immediately, not deferred)
        if (data.role === 'text') {
            const quillEditor = document.querySelector('.ql-editor');
            if (quillEditor) {
                quillEditor.focus();
            }
        } else {
            const colorInput = document.getElementById('input-color');
            if (colorInput) {
                colorInput.focus();
            }
        }

        // LOCK DOWN PAGE - Nothing else can be clicked except the editor/palette
        this.lockdownOverlay.style.display = 'block';
        this.lockdownOverlay.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            return false;
        };
        // Block all non-palette clicks during edit
        this.lockdownOverlay.onmousedown = (e) => {
            e.stopPropagation();
            e.preventDefault();
            return false;
        };

        // CRITICAL: Disable pointer-events on ALL page content
        const scene = document.getElementById('apex-3d-scene');
        if (scene) {
            scene.style.pointerEvents = 'none !important';
            // Also disable on all descendants to be sure
            scene.querySelectorAll('*').forEach(el => {
                if (!el.classList.contains('lens-container') && !el.closest('#palette-container')) {
                    el.style.pointerEvents = 'none';
                }
            });
        }

        // ALSO lock nav (it's OUTSIDE the scene)
        const nav = document.querySelector('nav');
        if (nav) nav.style.pointerEvents = 'none !important';

        // DISABLE button handlers in nav (pointer-events alone doesn't stop inline onclick)
        try {
            this._disableNavButtons();
        } catch (err) {
            console.error('[APEX] Failed to disable nav buttons:', err);
        }
    }

    _disableNavButtons() {
        const nav = document.querySelector('nav');
        if (!nav) return;

        // Find all buttons and links in nav
        const interactiveElements = nav.querySelectorAll('button, a[href], [onclick]');
        this.editSession.disabledNavElements = [];

        interactiveElements.forEach(el => {
            try {
                // Store original handler for restoration
                const handler = {
                    element: el,
                    originalOnclick: el.onclick,
                    originalHref: el.href,
                    hasDataHandler: false
                };

                // Check if element has data-* handlers
                Array.from(el.attributes).forEach(attr => {
                    if (attr.name.startsWith('on')) {
                        handler[attr.name] = el.getAttribute(attr.name);
                        handler.hasDataHandler = true;
                    }
                });

                // Disable the element
                el.onclick = (e) => {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    return false;
                };

                if (el.tagName === 'A') {
                    el.href = 'javascript:void(0)';
                }

                // Store for recovery
                this.editSession.disabledNavElements.push(handler);
            } catch (err) {
                console.warn('[APEX] Could not disable button:', el, err);
            }
        });
    }

    _restoreNavButtons() {
        try {
            this.editSession.disabledNavElements.forEach(handler => {
                try {
                    // Restore onclick
                    if (handler.originalOnclick !== null) {
                        handler.element.onclick = handler.originalOnclick;
                    } else {
                        handler.element.onclick = null;
                    }

                    // Restore href
                    if (handler.element.tagName === 'A' && handler.originalHref) {
                        handler.element.href = handler.originalHref;
                    }

                    // Restore data attributes
                    if (handler.hasDataHandler) {
                        Object.keys(handler).forEach(key => {
                            if (key.startsWith('on') && key !== 'originalOnclick') {
                                handler.element.setAttribute(key, handler[key]);
                            }
                        });
                    }
                } catch (err) {
                    console.warn('[APEX] Could not restore button:', handler.element, err);
                }
            });
            this.editSession.disabledNavElements = [];
        } catch (err) {
            console.error('[APEX] Failed to restore nav buttons:', err);
        }
    }

    highlightElement(el) {
        // Remove previous highlight
        if (this.highlightedElement && this.highlightedElement !== el) {
            this.highlightedElement.classList.remove('apex-highlighted');
            this.highlightedElement.classList.remove('apex-danger-target');
        }

        // Add highlight to new element
        el.classList.add('apex-highlighted');
        
        // Add danger class if not locked
        const isLocked = el.dataset.axLocked === 'true' || el.closest('[data-ax-locked="true"]');
        if (!isLocked) {
            el.classList.add('apex-danger-target');
        }

        this.highlightedElement = el;
    }

    enterEditMode(el) {
        // Called when actually clicking to edit - applies grayscale
        document.body.classList.add('apex-grayscale-mode');
    }

    _initializeDrag() {
        // Obsolete - dragging now handled in activate
    }

    _cleanupDrag() {
        // Obsolete
    }

    _startDrag(e, target) {
        if (e.button !== 0) return; // Only left-click
        
        // Allow interaction with inputs and editor
        const isInteractive = e.target.closest('input, textarea, select, .ql-editor, button');
        if (isInteractive) return;

        e.preventDefault();
        this.dragState.isDragging = true;
        this.dragState.target = target;
        this.dragState.startX = e.clientX;
        this.dragState.startY = e.clientY;

        const rect = target.getBoundingClientRect();
        this.dragState.offsetX = rect.left;
        this.dragState.offsetY = rect.top;

        target.style.cursor = 'grabbing';
    }

    _continueDrag(e) {
        if (!this.dragState.isDragging || !this.dragState.target) return;

        const deltaX = e.clientX - this.dragState.startX;
        const deltaY = e.clientY - this.dragState.startY;

        const newX = this.dragState.offsetX + deltaX;
        const newY = this.dragState.offsetY + deltaY;

        this.dragState.target.style.position = 'fixed';
        this.dragState.target.style.left = newX + 'px';
        this.dragState.target.style.top = newY + 'px';
        this.dragState.target.style.right = 'auto';
        this.dragState.target.style.bottom = 'auto';
    }

    _endDrag() {
        if (this.dragState.target) {
            this.dragState.target.style.cursor = 'grab';
        }
        this.dragState.isDragging = false;
        this.dragState.target = null;
    }

    triggerSpark(el) {
        if (!el) return;
        el.classList.add('apex-spark');
        setTimeout(() => el.classList.remove('apex-spark'), 500);
    }

    _captureElementState(el) {
        const styles = window.getComputedStyle(el);
        const data = this.detector._extractElementData(el);

        return {
            textContent: data.role === 'text' ? this.detector._getTextNodes(el) : '',
            color: styles.color,
            backgroundColor: styles.backgroundColor,
            zIndex: styles.zIndex,
            fontFamily: styles.fontFamily,
            opacity: styles.opacity,
            margin: styles.margin,
            padding: styles.padding,
            transform: styles.transform,
            src: el.tagName === 'IMG' ? el.src : '',
            innerHTML: el.innerHTML,
            boxShadow: styles.boxShadow || 'none',
            textShadow: styles.textShadow || 'none',
            backgroundImage: styles.backgroundImage || 'none',
            backgroundClip: styles.backgroundClip || 'border-box',
            webkitBackgroundClip: styles.webkitBackgroundClip || '',
            webkitTextFillColor: styles.webkitTextFillColor || '',
            backgroundSize: styles.backgroundSize || 'auto',
            backgroundPosition: styles.backgroundPosition || '0% 0%'
        };
    }

    _bufferEdit(property, value) {
        if (!this.editSession.active) return;

        // VIDEO SOURCE: Embed video in element via innerHTML
        if (property === 'videoSrc') {
            const el = this.editSession.element;
            const url = value;
            const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]+)/);
            const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);

            let embedHTML;
            if (ytMatch) {
                embedHTML = `<iframe src="https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}" style="width:100%;height:100%;min-height:200px;border:none;" allowfullscreen></iframe>`;
            } else if (vimeoMatch) {
                embedHTML = `<iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=1&loop=1" style="width:100%;height:100%;min-height:200px;border:none;" allowfullscreen></iframe>`;
            } else {
                embedHTML = `<video src="${url}" autoplay loop muted playsinline style="width:100%;height:100%;min-height:200px;object-fit:cover;"></video>`;
            }

            this.editSession.pendingChanges['innerHTML'] = embedHTML;
            el.innerHTML = embedHTML;
            this.palette.setDirty(true);
            return;
        }

        // IMAGE SOURCE: Change src (for <img>) or backgroundImage (for others)
        if (property === 'imageSrc') {
            const el = this.editSession.element;
            if (el.tagName === 'IMG') {
                this.editSession.pendingChanges['src'] = value;
                el.src = value;
            } else {
                this.editSession.pendingChanges['backgroundImage'] = `url('${value}')`;
                el.style.backgroundImage = `url('${value}')`;
                this.editSession.pendingChanges['backgroundSize'] = 'cover';
                el.style.backgroundSize = 'cover';
                this.editSession.pendingChanges['backgroundPosition'] = 'center';
                el.style.backgroundPosition = 'center';
                this.editSession.pendingChanges['opacity'] = '1';
                el.style.setProperty('opacity', '1', 'important');
            }
            this.palette.setDirty(true);
            return;
        }

        // COMPOUND: Text clip mask sets multiple CSS properties at once
        if (property === 'textClipMask') {
            const { url, fade, maskColor } = value;
            const el = this.editSession.element;
            const alpha = fade / 100;
            const textAlpha = 1 - alpha;

            // Parse mask overlay color
            const mr = parseInt(maskColor.slice(1, 3), 16);
            const mg = parseInt(maskColor.slice(3, 5), 16);
            const mb = parseInt(maskColor.slice(5, 7), 16);

            // Get original text color for smooth fade
            const origColor = this.editSession.originalState?.color || 'rgb(255,255,255)';
            const cm = origColor.match(/\d+/g);
            const [cr, cg, cb] = cm ? cm.map(Number) : [255, 255, 255];

            // Three-layer background: overlay + text-clipped image + full image
            const bgImage = `linear-gradient(rgba(${mr},${mg},${mb},${alpha}), rgba(${mr},${mg},${mb},${alpha})), url('${url}'), url('${url}')`;
            const bgClip = 'border-box, text, border-box';
            const textColor = `rgba(${cr},${cg},${cb},${textAlpha})`;

            // Store individual CSS properties for save/cancel
            this.editSession.pendingChanges['backgroundImage'] = bgImage;
            this.editSession.pendingChanges['backgroundClip'] = bgClip;
            this.editSession.pendingChanges['webkitBackgroundClip'] = bgClip;
            this.editSession.pendingChanges['backgroundSize'] = 'cover';
            this.editSession.pendingChanges['backgroundPosition'] = 'center';
            this.editSession.pendingChanges['color'] = textColor;

            // Apply preview
            el.style.backgroundImage = bgImage;
            el.style.backgroundClip = bgClip;
            el.style.webkitBackgroundClip = bgClip;
            el.style.backgroundSize = 'cover';
            el.style.backgroundPosition = 'center';
            el.style.color = textColor;

            this.palette.setDirty(true);
            return;
        }

        // Store in pending changes
        this.editSession.pendingChanges[property] = value;

        // Mark palette as dirty
        this.palette.setDirty(true);

        // Apply PREVIEW to element (visual only, not saved)
        const el = this.editSession.element;
        if (property === 'textContent') {
            this.detector._setTextNodes(el, value);
        } else if (property === 'innerHTML') {
            el.innerHTML = value;
        } else if (property === 'zIndex') {
            const currentPos = window.getComputedStyle(el).position;
            const newPos = currentPos === 'static' ? 'relative' : currentPos;
            el.style.position = newPos;
            el.style.zIndex = value;
        } else {
            el.style[property] = value;
        }
    }

    _saveEditSession() {
        if (!this.editSession.active) return;

        const el = this.editSession.element;
        const selector = this.detector.getUniqueSelector(el);

        // Apply all buffered changes to localStorage at once
        for (const [property, value] of Object.entries(this.editSession.pendingChanges)) {
            if (!this.edits[selector]) this.edits[selector] = {};

            // Handle special cases
            if (property === 'zIndex') {
                const currentPos = window.getComputedStyle(el).position;
                const newPos = currentPos === 'static' ? 'relative' : currentPos;
                this.edits[selector]['position'] = newPos;
                this.edits[selector]['zIndex'] = value;
            } else {
                this.edits[selector][property] = value;
            }
        }

        // Persist to localStorage
        this.saveEdits();

        // Visual feedback
        this.triggerSpark(el);

        // Clean up session
        this._endEditSession();
    }

    _cancelEditSession() {
        if (!this.editSession.active) return;

        const el = this.editSession.element;
        const original = this.editSession.originalState;

        // Revert ALL changes to original state
        if (original) {
            if (original.textContent !== undefined) {
                this.detector._setTextNodes(el, original.textContent);
            }

            // Revert innerHTML if it was changed (e.g., video embed)
            if (this.editSession.pendingChanges['innerHTML'] !== undefined && original.innerHTML !== undefined) {
                el.innerHTML = original.innerHTML;
            }

            // Revert image src if it was changed
            if (original.src && el.tagName === 'IMG') {
                el.src = original.src;
            }

            // Revert styles
            const styleProps = ['color', 'backgroundColor', 'zIndex', 'fontFamily',
                               'fontSize', 'opacity', 'margin', 'padding', 'transform',
                               'boxShadow', 'textShadow', 'backgroundImage', 'backgroundClip',
                               'webkitBackgroundClip', 'webkitTextFillColor', 'backgroundSize', 'backgroundPosition'];
            styleProps.forEach(prop => {
                if (original[prop] !== undefined) {
                    el.style[prop] = original[prop];
                }
            });
        }

        // Clean up session
        this._endEditSession();
    }

    _endEditSession() {
        if (!this.editSession.active) return;

        const el = this.editSession.element;

        // Remove edit lock visual
        if (el) el.classList.remove('apex-edit-locked');

        // Remove content field glow
        const quillContainer = document.getElementById('quill-editor');
        if (quillContainer) {
            quillContainer.classList.remove('apex-editor-active');
        }

        // Remove connection line
        const connectionLine = document.getElementById('apex-connection-line');
        if (connectionLine) connectionLine.remove();

        // Unlock lens
        this.lens.setSearching(false);

        // Auto-reset peek toggle (restore reticle visibility) and hide button
        if (this._peekActive) {
            this._peekActive = false;
            if (this.lens && this.lens.lensContainer) {
                this.lens.lensContainer.style.opacity = '1';
            }
            const iconOpen = document.getElementById('peek-icon-open');
            const iconClosed = document.getElementById('peek-icon-closed');
            if (iconOpen) iconOpen.classList.remove('hidden');
            if (iconClosed) iconClosed.classList.add('hidden');
        }
        const peekBtn = document.getElementById('btn-peek');
        if (peekBtn) peekBtn.classList.add('hidden');

        this.palette.setDirty(false);

        // RESTORE button handlers that were disabled during edit
        try {
            if (this.editSession.disabledButtons && this.editSession.disabledButtons.length > 0) {
                this.editSession.disabledButtons.forEach(({ button, originalOnclick, originalProperty }) => {
                    if (button) {
                        if (originalOnclick) {
                            button.setAttribute('onclick', originalOnclick);
                        }
                        button.onclick = originalProperty;
                    }
                });
            }
        } catch (err) {
            console.error('[APEX] Button restore failed (cleanup continues):', err);
        }

        // Reset session state
        this.editSession.active = false;
        this.editSession.element = null;
        this.editSession.originalState = null;
        this.editSession.pendingChanges = {};
        this.editSession.disabledButtons = [];
        this.editSession.disabledNavElements = [];

        // Clear ALL lingering highlights (bulletproof DOM sweep, not reference-dependent)
        document.querySelectorAll('.apex-highlighted').forEach(el => {
            el.classList.remove('apex-highlighted', 'apex-danger-target');
        });
        this.highlightedElement = null;

        // DISABLE BUTTON DISABLE GUARD: Tell HandlerDispatcher to allow button clicks again
        window.inspectorEditMode = false;

        // UNLOCK PAGE - Remove the lockdown overlay and restore pointer-events
        this.lockdownOverlay.style.display = 'none';
        const scene = document.getElementById('apex-3d-scene');
        if (scene) {
            scene.style.pointerEvents = 'auto';
            // Restore all descendants
            scene.querySelectorAll('*').forEach(el => {
                el.style.pointerEvents = '';
            });
        }

        // Restore nav
        const nav = document.querySelector('nav');
        if (nav) nav.style.pointerEvents = 'auto';

        // RESTORE button handlers in nav
        try {
            this._restoreNavButtons();
        } catch (err) {
            console.error('[APEX] Failed to restore nav buttons:', err);
        }
    }

    _togglePeek() {
        if (!this.lens || !this.lens.lensContainer) return;

        this._peekActive = !this._peekActive;
        this.lens.lensContainer.style.opacity = this._peekActive ? '0' : '1';

        const iconOpen = document.getElementById('peek-icon-open');
        const iconClosed = document.getElementById('peek-icon-closed');
        if (iconOpen) iconOpen.classList.toggle('hidden', this._peekActive);
        if (iconClosed) iconClosed.classList.toggle('hidden', !this._peekActive);
    }

    _showResetPreview(scope) {
        this._clearResetPreview();
        if (scope === 'element') {
            const el = this.palette.currentElement;
            if (el) {
                el.style.outline = '3px dashed #f59e0b';
                el.style.outlineOffset = '2px';
            }
        } else if (scope === 'page') {
            for (const selector in this.edits) {
                try {
                    const el = document.querySelector(selector);
                    if (el) {
                        el.style.outline = '3px dashed #f59e0b';
                        el.style.outlineOffset = '2px';
                        el.dataset.axResetPreview = 'true';
                    }
                } catch (e) { /* invalid selector */ }
            }
        }
    }

    _clearResetPreview() {
        if (this.palette.currentElement) {
            this.palette.currentElement.style.outline = '';
            this.palette.currentElement.style.outlineOffset = '';
        }
        document.querySelectorAll('[data-ax-reset-preview]').forEach(el => {
            el.style.outline = '';
            el.style.outlineOffset = '';
            delete el.dataset.axResetPreview;
        });
    }


    _resetElementAll() {
        const el = this.palette.currentElement;
        if (!el) return;

        const selector = this.detector.getUniqueSelector(el);
        if (!selector || !this.edits[selector]) return;

        if (!confirm('Reset EVERYTHING on this element including text?')) return;

        // Cancel current session to revert unsaved inline changes
        if (this.editSession.active) this._cancelEditSession();

        // Nuclear: strip ALL inline styles
        el.removeAttribute('style');

        // Restore original content from captured state
        const original = this.originals[selector];
        if (original) {
            el.innerHTML = original.innerHTML;
            if (original.src !== undefined) el.src = original.src;
        }

        // Wipe stored edits for this element only
        delete this.edits[selector];
        this.saveEdits();
        this._clearResetPreview();
        this.triggerSpark(el);
    }

    _resetPage() {
        // Cancel current session first to revert unsaved inline changes
        if (this.editSession.active) this._cancelEditSession();

        const editCount = Object.keys(this.edits).length;
        if (editCount === 0) return;

        if (!confirm(`Reset ALL edits on ${editCount} element(s)? Page will reload.`)) return;

        // Wipe all stored edits and reload to restore original DOM
        this.edits = {};
        this.saveEdits();
        location.reload();
    }

    _drawConnectionLine(el, contentBox) {
        // Remove any existing connection line
        const existing = document.getElementById('apex-connection-line');
        if (existing) existing.remove();

        if (!el || !contentBox) return;

        // Create SVG for the line
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'apex-connection-line';
        svg.setAttribute('data-anothen-internal', '');
        svg.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 19997;
            pointer-events: none;
        `;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('stroke', '#00ff00');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('opacity', '0.7');
        line.setAttribute('stroke-dasharray', '5,5');

        // Get positions
        const elRect = el.getBoundingClientRect();
        const contentRect = contentBox.getBoundingClientRect();

        const x1 = elRect.left + elRect.width / 2;
        const y1 = elRect.top + elRect.height / 2;
        const x2 = contentRect.left + contentRect.width / 2;
        const y2 = contentRect.top;

        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);

        svg.appendChild(line);
        document.body.appendChild(svg);
    }

    applyEdit(el, property, value) {
        // 4. EXECUTION SHIELD: Final check before touching DOM
        if (value === undefined || value === null || String(value) === 'undefined' || String(value) === 'null') return;
        
        const selector = this.detector.getUniqueSelector(el);
        if (!selector) return;

        // Trigger the visual "Witness" spark for feedback
        this.triggerSpark(el);

        if (property === 'clone') {
            const clone = el.cloneNode(true);
            delete clone.dataset.axId; // Reset ID so it gets a new one
            el.parentNode.insertBefore(clone, el.nextSibling);
            this.detector.initLattice();
            return;
        }

        if (property === 'moveUp') {
            const prev = el.previousElementSibling;
            if (prev) {
                el.parentNode.insertBefore(el, prev);
            }
            return;
        }

        if (property === 'moveDown') {
            const next = el.nextElementSibling;
            if (next) {
                el.parentNode.insertBefore(next, el);
            }
            return;
        }

        if (property === 'delete') {
            el.remove();
            if (!this.edits[selector]) this.edits[selector] = {};
            this.edits[selector]['deleted'] = true;
            this.saveEdits();
            return;
        }

        if (property === 'textContent') {
            this.detector._setTextNodes(el, value);
        } else if (property === 'innerHTML') {
            el.innerHTML = value;
        } else if (property === 'zIndex') {
            const currentPos = window.getComputedStyle(el).position;
            const newPos = currentPos === 'static' ? 'relative' : currentPos;
            el.style.position = newPos;
            el.style.zIndex = value;

            // 5. STORAGE SHIELD: Save both zIndex AND position so it persists on reload
            if (!this.edits[selector]) this.edits[selector] = {};
            this.edits[selector]['zIndex'] = value;
            this.edits[selector]['position'] = newPos;
            this.saveEdits();
            return;
        } else {
            el.style[property] = value;
        }

        // 5. STORAGE SHIELD: Only save valid data
        if (!this.edits[selector]) this.edits[selector] = {};
        this.edits[selector][property] = value;
        this.saveEdits();
    }

    visualizeDepth(targetEl, probeZ = 0) {
        this.clearDepthMap();
        if (!this.isActive) return;
        
        // Show the yellow probe on the lens
        this.lens.setProbe(true, probeZ);

        const targetZ = targetEl ? (parseInt(window.getComputedStyle(targetEl).zIndex) || 0) : 0;
        const siblings = Array.from(document.querySelectorAll('body > *:not(script):not(.depth-map-overlay):not(.lens-container):not(#palette-container):not(#apex-context-bar):not([data-anothen-internal])'));
        
        // Add Map Legend
        const legend = document.createElement('div');
        legend.className = 'depth-map-overlay';
        legend.style.cssText = `
            position: fixed; bottom: 80px; left: 24px; padding: 12px;
            background: rgba(0,0,0,0.8); border: 1px solid #fbbf24;
            color: #fbbf24; font-family: monospace; font-size: 9px;
            z-index: 19997; border-radius: 2px;
            box-shadow: 0 0 20px rgba(0,0,0,0.5);
        `;
        legend.innerHTML = `
            <div class="font-bold mb-2 uppercase tracking-widest text-[10px]">Topographic Map</div>
            <div class="flex items-center justify-between gap-4 mb-2 pb-2 border-b border-[#fbbf24]/20">
                <span class="opacity-70">Probe Depth</span>
                <span class="text-white font-bold text-[11px]">Z: ${probeZ}</span>
            </div>
            <div class="flex items-center gap-2 mb-1"><div class="w-2 h-2 bg-red-500/50 border border-red-500"></div> ABOVE PROBE</div>
            <div class="flex items-center gap-2 mb-1"><div class="w-2 h-2 bg-white/10 border border-white/30"></div> SAME AS PROBE</div>
            <div class="flex items-center gap-2 mb-3"><div class="w-2 h-2 bg-blue-500/50 border border-blue-500"></div> BELOW PROBE</div>
            <div class="text-[8px] opacity-40 uppercase italic mt-1">Scroll to raise/lower probe</div>
        `;
        document.body.appendChild(legend);

        siblings.forEach(el => {
            const z = parseInt(window.getComputedStyle(el).zIndex) || 0;
            const diff = z - probeZ;
            
            const overlay = document.createElement('div');
            overlay.className = 'depth-map-overlay';
            let color = 'rgba(255, 255, 255, 0.1)';
            let borderColor = 'rgba(255, 255, 255, 0.3)';
            if (z > probeZ) {
                color = 'rgba(239, 68, 68, 0.4)';
                borderColor = 'rgba(239, 68, 68, 0.8)';
            } else if (z < probeZ) {
                color = 'rgba(59, 130, 246, 0.4)';
                borderColor = 'rgba(59, 130, 246, 0.8)';
            }
            
            const rect = el.getBoundingClientRect();
            if (rect.width < 5 || rect.height < 5) return; // Skip tiny elements

            overlay.style.cssText = `position:fixed; top:${rect.top}px; left:${rect.left}px; width:${rect.width}px; height:${rect.height}px; background:${color}; pointer-events:none; z-index:19997; border:1px solid ${borderColor}; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:monospace; font-size:9px; color:white; font-weight:bold; text-shadow:0 1px 2px black;`;
            overlay.innerHTML = `
                <div>Z:${z}</div>
                <div class="text-[7px] opacity-70">${diff > 0 ? '+' : ''}${diff}</div>
            `;
            document.body.appendChild(overlay);
        });
    }

    activate3DView() {
        const scene = document.getElementById('apex-3d-scene');
        if (!scene) return;

        // Cancel any active edit session (3D is view-only mode)
        if (this.editSession.active) {
            this._endEditSession();
        }

        // Ensure all editable elements have lattice IDs before building the stack
        this.detector.initLattice();

        scene.style.transition = 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)';
        scene.style.transformStyle = 'preserve-3d';
        // Pivot from the center of what the user is currently viewing
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const viewportCenter = scrollTop + (window.innerHeight / 2);
        scene.style.transformOrigin = `50% ${viewportCenter}px`;
        // Initial rotation at 100% intensity (35deg, -25deg)
        const initialIntensity = 1.0;
        const initialRotX = 35 * initialIntensity;
        const initialRotY = -25 * initialIntensity;
        const initialScale = 0.8 + (0.2 * (1 - initialIntensity));
        scene.style.transform = `rotateX(${initialRotX}deg) rotateY(${initialRotY}deg) scale(${initialScale})`;

        // Mark 3D mode active (disables hover scaling in transition zones)
        document.body.classList.add('apex-3d-active');

        // Show 3D control toolbar
        this._show3DToolbar();

        // UI stays outside the scene, so no extra translation needed

        // DISABLE lens interactions in 3D mode (view-only visualization)
        // Keep visual but prevent all communication with elements
        this.lens.lensContainer.style.pointerEvents = 'none !important';
        this.lens.lensContainer.classList.add('apex-3d-lens-locked');
        this.controlToolbar.style.cursor = 'auto';

        // Track mouse over toolbar to hide/show reticle
        this.controlToolbar.addEventListener('mouseenter', () => {
            if (this.lens && this.lens.lensContainer) {
                this.lens.lensContainer.style.opacity = '0';
            }
        });

        this.controlToolbar.addEventListener('mouseleave', () => {
            if (this.lens && this.lens.lensContainer) {
                this.lens.lensContainer.style.opacity = '1';
            }
        });

        // Show evenly-spaced layers (not scaled by z-index value)
        this._refreshLayerView();
    }

    deactivate3DView() {
        const scene = document.getElementById('apex-3d-scene');
        if (scene) {
            scene.style.transform = '';
            scene.style.transformStyle = '';
            scene.style.transition = '';
            scene.style.transformOrigin = '';
            scene.style.pointerEvents = 'auto'; // RESTORE pointer-events
            scene.querySelectorAll('[data-ax-id]').forEach(el => {
                el.style.transform = '';
                el.style.boxShadow = '';
            });
            // Restore all descendants' pointer-events
            scene.querySelectorAll('*').forEach(el => {
                el.style.pointerEvents = '';
            });
        }

        // Remove 3D mode marker (re-enables hover scaling)
        document.body.classList.remove('apex-3d-active');

        // RESTORE nav pointer-events
        const nav = document.querySelector('nav');
        if (nav) nav.style.pointerEvents = 'auto';

        // Hide 3D control toolbar
        if (this.controlToolbar) {
            this.controlToolbar.style.display = 'none';
        }

        // Restore reticle (fully reset from 3D mode)
        if (this.lens && this.lens.lensContainer) {
            this.lens.lensContainer.style.opacity = '1';
            this.lens.lensContainer.style.pointerEvents = 'none'; // Restore pass-through
            this.lens.lensContainer.style.transform = 'translate(-50%, -50%)'; // Restore centering
            this.lens.lensContainer.classList.remove('apex-3d-lens-locked');
        }

        // Reset palette position to Tailwind defaults (clear any drag/3D inline styles)
        this.palette.container.style.left = '';
        this.palette.container.style.top = '';
        this.palette.container.style.right = '';
        this.palette.container.style.bottom = '';

        // Ensure 3D flag is off (safe to call from any code path)
        this.palette.view3DActive = false;

        // Force fresh detection cycle (clear stale references so stability lock doesn't block)
        this._clearHighlight();
        this.palette.currentElement = null;
        this.palette.lastData = null;

        // (UI elements are outside the 3D scene — no layering transforms to clear)
    }

    // Z-INDEX LAYER MANAGEMENT
    _getElementStack() {
        const scene = document.getElementById('apex-3d-scene');
        if (!scene) return [];

        const elements = Array.from(scene.querySelectorAll('[data-ax-id]'));
        return elements
            .map(el => ({
                element: el,
                zIndex: parseInt(window.getComputedStyle(el).zIndex) || 0,
                axId: el.dataset.axId
            }))
            .sort((a, b) => a.zIndex - b.zIndex);
    }

    _getLayerPosition(element) {
        const stack = this._getElementStack();
        return stack.findIndex(item => item.element === element);
    }

    _swapZIndex(element, direction) {
        const stack = this._getElementStack();
        const currentPos = this._getLayerPosition(element);

        if (currentPos === -1) return;

        // direction: 'left' means increase z-index (win), 'right' means decrease z-index (lose)
        const targetPos = direction === 'left' ? currentPos + 1 : currentPos - 1;

        if (targetPos < 0 || targetPos >= stack.length) return; // At boundary

        const targetElement = stack[targetPos].element;

        // Swap z-index values
        const currentZ = parseInt(window.getComputedStyle(element).zIndex) || 0;
        const targetZ = parseInt(window.getComputedStyle(targetElement).zIndex) || 0;

        element.style.zIndex = targetZ;
        targetElement.style.zIndex = currentZ;

        // Update both in localStorage
        const currentSelector = this.detector.getUniqueSelector(element);
        const targetSelector = this.detector.getUniqueSelector(targetElement);

        if (!this.edits[currentSelector]) this.edits[currentSelector] = {};
        if (!this.edits[targetSelector]) this.edits[targetSelector] = {};

        this.edits[currentSelector]['zIndex'] = targetZ;
        this.edits[targetSelector]['zIndex'] = currentZ;

        this.saveEdits();

        // Refresh 3D view if active
        if (this.palette.view3DActive) {
            this._refreshLayerView();
        }

        // Update palette to show new z-index
        if (this.palette.currentElement === element) {
            const currentZ = document.getElementById('input-zindex');
            if (currentZ) currentZ.value = targetZ;
        }
    }


    _refreshLayerView() {
        if (!this.palette.view3DActive) return;

        const stack = this._getElementStack();
        const fixedSpacing = Math.max(10, this.view3DLayerSpacing); // pixels between layers (min 10)

        try {
            // Group elements by z-index — same z-index = same visual plane
            const groups = new Map();
            stack.forEach(item => {
                if (!groups.has(item.zIndex)) {
                    groups.set(item.zIndex, []);
                }
                groups.get(item.zIndex).push(item);
            });

            const sortedLayers = Array.from(groups.keys()).sort((a, b) => a - b);
            const center = (sortedLayers.length - 1) / 2;

            sortedLayers.forEach((zIdx, layerIndex) => {
                // Spread planes bidirectionally from center — middle stays put
                const offset = layerIndex - center;
                const translateZ = offset * fixedSpacing;

                groups.get(zIdx).forEach(item => {
                    item.element.style.transform = `translateZ(${translateZ}px)`;
                    if (layerIndex !== Math.round(center)) {
                        item.element.style.boxShadow = `0 15px 40px rgba(0,0,0,0.6)`;
                    }
                });
            });
        } catch (e) {
            console.warn('[APEX] Layer view refresh failed:', e);
        }
    }

    _show3DToolbar() {
        if (!this.controlToolbar) return;

        this.controlToolbar.innerHTML = `
            <div style="display: flex; align-items: center; gap: 18px; flex-wrap: wrap; justify-content: center; padding: 20px 24px;">
                <!-- Save/Cancel Buttons -->
                <button id="toolbar-btn-save" title="Save changes" style="
                    padding: 12px 20px;
                    background: #22c55e;
                    color: #000;
                    border: none;
                    border-radius: 4px;
                    font-weight: bold;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.2s;
                ">✓ SAVE</button>

                <button id="toolbar-btn-cancel" title="Discard changes" style="
                    padding: 12px 20px;
                    background: #333;
                    color: #ef4444;
                    border: 2px solid #ef4444;
                    border-radius: 4px;
                    font-weight: bold;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.2s;
                ">✕ CANCEL</button>

                <!-- Rotation Intensity Slider -->
                <div style="display: flex; align-items: center; gap: 8px;">
                    <label style="font-size: 10px; white-space: nowrap;">Angle:</label>
                    <input type="range" id="toolbar-rotation" min="0" max="100" step="5" value="100" style="
                        width: 60px;
                        cursor: pointer;
                    ">
                    <span id="toolbar-rotation-value" style="font-size: 9px; min-width: 20px;">100%</span>
                </div>

                <!-- Layer Spacing Slider -->
                <div style="display: flex; align-items: center; gap: 8px;">
                    <label style="font-size: 10px; white-space: nowrap;">Spacing:</label>
                    <input type="range" id="toolbar-spacing" min="5" max="80" step="2" value="30" style="
                        width: 60px;
                        cursor: pointer;
                    ">
                    <span id="toolbar-spacing-value" style="font-size: 9px; min-width: 25px;">30px</span>
                </div>

                <!-- Exit Button -->
                <button id="toolbar-exit" title="Exit 3D mode" style="
                    padding: 8px 12px;
                    background: #ff0000;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    font-weight: bold;
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                ">✕ EXIT 3D</button>
            </div>
        `;

        // Wire up button handlers
        const btnSave = this.controlToolbar.querySelector('#toolbar-btn-save');
        const btnCancel = this.controlToolbar.querySelector('#toolbar-btn-cancel');
        const rotationSlider = this.controlToolbar.querySelector('#toolbar-rotation');
        const rotationValue = this.controlToolbar.querySelector('#toolbar-rotation-value');
        const spacingSlider = this.controlToolbar.querySelector('#toolbar-spacing');
        const spacingValue = this.controlToolbar.querySelector('#toolbar-spacing-value');
        const exitBtn = this.controlToolbar.querySelector('#toolbar-exit');

        if (btnSave) {
            btnSave.onclick = (e) => {
                e.stopPropagation();
                if (this.palette && this.palette.onEdit) {
                    this.palette.onEdit('save-session', true);
                }
            };
        }

        if (btnCancel) {
            btnCancel.onclick = (e) => {
                e.stopPropagation();
                if (this.palette && this.palette.onEdit) {
                    this.palette.onEdit('cancel-session', true);
                }
            };
        }

        if (rotationSlider) {
            rotationSlider.oninput = (e) => {
                const intensity = parseInt(e.target.value) / 100;
                rotationValue.textContent = e.target.value + '%';

                // Scale rotation: 0% = flat, 100% = 35deg/-25deg
                const rotX = 35 * intensity;
                const rotY = -25 * intensity;
                const scale = 0.8 + (0.2 * (1 - intensity)); // Scale from 1.0 (flat) to 0.8 (full 3D)

                const scene = document.getElementById('apex-3d-scene');
                if (scene) {
                    scene.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${scale})`;
                }
            };
        }

        if (spacingSlider) {
            spacingSlider.oninput = (e) => {
                this.view3DLayerSpacing = parseInt(e.target.value);
                spacingValue.textContent = e.target.value + 'px';
                this._refreshLayerView();
            };
        }

        if (exitBtn) {
            exitBtn.onclick = (e) => {
                e.stopPropagation();
                this.palette.view3DActive = false;
                this.deactivate3DView();
                if (this.palette.lastData) this.palette.update(this.palette.lastData);
            };
        }

        this.controlToolbar.style.display = 'block';
    }

    clearDepthMap() {
        document.querySelectorAll('.depth-map-overlay').forEach(el => el.remove());
        if (this.lens) this.lens.setProbe(false);
    }

    _isColorDark(color) {
        if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return true; // Assume dark background
        const rgb = color.match(/\d+/g);
        if (!rgb) return true;
        const [r, g, b] = rgb.map(Number);
        // HSP Color Model brightness formula
        const hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
        return hsp < 127.5;
    }

    showLatticeLabels() {
        this.clearLatticeLabels();
        
        // Scan for all potential elements, not just those already tagged
        const elements = document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,div,button,a,img,section,header,footer');
        elements.forEach((el, index) => {
            if (el.dataset.anothenInternal !== undefined || el.closest('[data-anothen-internal]')) return;
            
            const rect = el.getBoundingClientRect();
            if (rect.width < 10 || rect.height < 10) return;
            if (rect.top < 0 || rect.top > window.innerHeight) return;

            const tag = el.tagName.toLowerCase();
            const className = el.className && typeof el.className === 'string' ? el.className.split(' ')[0] : '';
            const labelText = `${tag}${className ? '.' + className.substring(0, 8) : ''}`;

            const label = document.createElement('div');
            label.className = 'lattice-label-overlay';
            label.setAttribute('data-anothen-internal', '');
            label.style.cssText = `
                position: absolute; top: ${rect.top + window.scrollY}px; left: ${rect.left + window.scrollX}px;
                background: #00ff00; color: #000; font-family: monospace;
                font-size: 7px; font-weight: bold; padding: 1px 2px;
                border-radius: 1px; z-index: 19996; pointer-events: none;
                box-shadow: 0 0 5px rgba(0,255,0,0.4); transform: translateY(-100%);
                white-space: nowrap; opacity: 0.9; border-bottom: 1px solid rgba(0,0,0,0.2);
            `;
            label.innerText = labelText;
            document.body.appendChild(label);
        });
    }

    clearLatticeLabels() {
        document.querySelectorAll('.lattice-label-overlay').forEach(el => el.remove());
    }

    saveEdits() { localStorage.setItem(this.editsKey, JSON.stringify(this.edits)); }
    loadEdits() { const saved = localStorage.getItem(this.editsKey); return saved ? JSON.parse(saved) : {}; }

    _setupThemeObserver() {
        this._themeObserver = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.attributeName === 'data-theme') {
                    this._onThemeChange();
                }
            }
        });
        this._themeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
    }

    _onThemeChange() {
        // Cancel any active edit session before swapping
        if (this.editSession.active) {
            this._cancelEditSession();
        }

        // Revert all currently applied edits (restore original state)
        this._revertAllEdits();

        // Switch to new theme's storage
        const theme = document.body.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        this.editsKey = `${this._weblingName}-edits-state-${theme}`;

        // Load and apply new theme's edits
        this._purgePoisonedEdits();
        this.edits = this.loadEdits();
        this.applyAllSavedEdits();
    }

    _revertAllEdits() {
        for (const selector in this.edits) {
            try {
                const el = document.querySelector(selector);
                if (!el) continue;

                const original = this.originals[selector];

                // Strip all inline styles (theme edits will re-apply them as needed)
                el.removeAttribute('style');

                // Restore src for images if original exists
                if (original && original.src !== undefined && el.tagName === 'IMG') {
                    el.src = original.src;
                }

                // NOTE: Do NOT restore innerHTML or textContent during theme switch.
                // This preserves the DOM structure. Text edits will be re-applied
                // explicitly by the new theme's edits via applyAllSavedEdits().
            } catch (e) {
                console.error('[APEX] Revert failed for selector:', selector, e);
            }
        }
    }

    applyAllSavedEdits() {
        const data = this.loadEdits();
        for (const selector in data) {
            const el = document.querySelector(selector);
            if (el) {
                // Capture original state BEFORE applying any edits
                if (!this.originals[selector]) {
                    this.originals[selector] = {
                        innerHTML: el.innerHTML,
                        src: el.tagName === 'IMG' ? el.src : undefined,
                        style: el.getAttribute('style') || ''
                    };
                }
                const props = data[selector];
                if (props.deleted) { el.remove(); continue; }
                for (const prop in props) {
                    const val = props[prop];
                    if (val === undefined || val === null || String(val) === 'undefined' || String(val) === 'null') continue;
                    
                    if (prop === 'textContent') this.detector._setTextNodes(el, val);
                    else if (prop === 'innerHTML') el.innerHTML = val;
                    else if (prop === 'src') el.src = val;
                    else el.style[prop] = val;
                }
            }
        }
    }
}