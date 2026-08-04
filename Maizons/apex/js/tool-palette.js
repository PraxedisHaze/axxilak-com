class ToolPalette {
    constructor() {
        // The real palette-container/-content elements always ship as
        // static markup in index.html; the dead fallback that used to
        // create them here (for a page that didn't ship that markup) is
        // archived at _archive/tool-palette_dead-container-fallback_20260802.js
        // rather than kept live and drifting out of sync with the real one.
        this.container = document.getElementById('palette-container');
        this.contentArea = document.getElementById('palette-content');
        // The lockdown overlay is inline-styled. Give the editor an explicit
        // inline layer too so it remains interactive even when Tailwind's
        // runtime scanner has not generated z-[20000].
        this.container.style.zIndex = '20001';
        this.container.style.pointerEvents = 'auto';
        // Keep the palette below the top navigation on short viewports.
        this.container.style.top = '5rem';
        this.container.style.bottom = '1.5rem';
        this.container.style.maxHeight = 'calc(100vh - 6.5rem)';
        // Make the editor advertise its real affordances: normal pointer in
        // the palette, text cursor plus a visible caret where typing happens.
        if (!document.getElementById('apex-palette-input-affordances')) {
            const inputStyles = document.createElement('style');
            inputStyles.id = 'apex-palette-input-affordances';
            inputStyles.setAttribute('data-anothen-internal', '');
            inputStyles.textContent = `
                #palette-container { cursor: default !important; }
                #palette-container input[type="text"],
                #palette-container input[type="number"],
                #palette-container textarea {
                    background: #18181b !important;
                    color: #f8fafc !important;
                    border-color: #3f3f46 !important;
                }
                #palette-container input[type="text"],
                #palette-container input[type="number"],
                #palette-container textarea {
                    cursor: text !important;
                    caret-color: #fbbf24 !important;
                }
                [data-theme="light"] #palette-container input[type="text"],
                [data-theme="light"] #palette-container input[type="number"],
                [data-theme="light"] #palette-container textarea {
                    caret-color: #1d4ed8 !important;
                }
                #palette-container button,
                #palette-container select,
                #palette-container input[type="color"],
                #palette-container input[type="range"] { cursor: pointer !important; }
            `;
            document.head.appendChild(inputStyles);
        }
        this.onEdit = null; 
        this.quill = null;
        this.currentElement = null;
        this.depthMapActive = false;
        this.view3DActive = false;
        this.labelsActive = false;
        this.debug = false;
        this.isDirty = false;
        this._boundCloseResetDropdown = () => {
            const resetDropdown = document.getElementById('reset-dropdown');
            if (resetDropdown) {
                resetDropdown.classList.add('hidden');
            }
        };
    }

    update(data) {
        if (!this.container || !this.contentArea) return; // Defensive check
        this.lastData = data;
        const { selector, styles, textContent, element, role, linkHref, linkTarget, linkRel } = data;
        const isStructural = role === 'structure';
        const isMedia = role === 'media';

        if (this.debug) {
            console.log('[APEX][palette.update]', role, selector || '(no-selector)', textContent || '(no-text)');
        }
        
        if (this.currentElement && this.currentElement.dataset.axId === element.dataset.axId) {
            // SYNC ONLY: If it's the same element, update whichever content editor is active.
            const plainContentInput = document.getElementById('input-content');
            if (plainContentInput && document.activeElement !== plainContentInput) {
                plainContentInput.value = textContent || '';
            }
            return;
        }

        this.currentElement = element;
        this.container.classList.remove('hidden');

        // LATTICE FLOW DETECTION (Horizontal vs Vertical intuition)
        const parent = element.parentElement;
        const parentStyle = window.getComputedStyle(parent);
        const isHorizontal = parentStyle.display === 'flex' && parentStyle.flexDirection === 'row' || 
                             parentStyle.display === 'inline-flex' ||
                             styles.display === 'inline' || styles.display === 'inline-block';

        const isLocked = element.dataset.axLocked === 'true' || element.closest('[data-ax-locked="true"]');
        const tagName = element.tagName.toUpperCase();
        const isImage = tagName === 'IMG';
        const hasBgImage = styles.backgroundImage && styles.backgroundImage !== 'none' && !styles.backgroundImage.includes('linear-gradient');
        const isLink = tagName === 'A';

        const childCount = element.children.length;
        const currentOpacity = styles.opacity || '1';
        const targetPath = (() => {
            const parts = [];
            let node = element;
            let depth = 0;
            while (node && node !== document.body && depth < 5) {
                const tag = node.tagName.toLowerCase();
                const identity = node.id ? '#' + node.id : (node.dataset.axId ? '[' + node.dataset.axId + ']' : '');
                parts.unshift(tag + identity);
                node = node.parentElement;
                depth += 1;
            }
            return parts.join(' › ');
        })();
        const fontSizeValue = parseInt(styles.fontSize, 10) || 16;
        const fontSizeMax = Math.max(200, fontSizeValue);
        const containerGlowState = this.parseBoxShadowControlState(data.containerBoxShadow || 'none', this.rgbToHex(styles.color));
        const containerGradientState = this.parseGradientControlState(data.containerBackgroundImage || 'none', this.rgbToHex(styles.backgroundColor), this.rgbToHex(styles.color));
        // Video/media embeds only ever save the fully-built <iframe>/<video> tag
        // (as innerHTML), never the original URL the user typed. On reopen the
        // URL field always started blank even though a real embed was present.
        // Recover a real, working URL straight from the live embed so the field
        // isn't empty just because we don't have the original input back.
        const existingMediaEl = element.querySelector ? element.querySelector('iframe, video') : null;
        const existingMediaSrc = existingMediaEl ? (existingMediaEl.src || '') : '';

        this.contentArea.innerHTML = `
            <div class="tool-palette">

                <!-- STICKY HEADER -->
                <div class="palette-header palette-drag-handle relative pr-10">
                    <div class="palette-header-left">
                        <div class="palette-selected-label">Selected</div>
                        <div class="palette-selected-meta">${tagName} <span class="palette-selected-role">[${role.toUpperCase()}]</span></div>
                        <div class="palette-selected-id">ID: ${element.dataset.axId}</div><div class="palette-selected-id palette-selected-path" title="DOM path">${targetPath}</div>
                    </div>
                    <button id="btn-close-palette" type="button" aria-label="Discard current changes and close editor" title="Discard current changes and close editor" class="absolute top-0 right-0 z-40 w-8 h-8 flex items-center justify-center border border-zinc-500 bg-zinc-900 text-zinc-200 hover:border-white hover:text-white transition-colors">&times;</button>
                </div>

                <!-- PRIMARY CONTROLS (NEVER SCROLL) -->
                <div class="palette-primary">
                    <!-- Plain Text Editor (temporary safe mode) -->
                    <div class="palette-control ${isMedia ? 'hidden' : ''}">
                        <label class="palette-label">Content ${isStructural ? '(Container)' : ''}</label>
                        <textarea id="input-content" class="palette-input text-xs leading-relaxed resize-y" style="min-height: 120px; font-weight: 500;" placeholder="Edit text here...">${textContent || ''}</textarea>
                        <div class="text-[8px] text-zinc-500 mt-2">Plain text editing is active. Rich text styling is temporarily unavailable while we stabilize the editor.</div>
                    </div>

                    <!-- Text Color Control -->

                ${isLink ? `
                <div class="palette-control mt-4">
                    <label class="palette-label">Link URL</label>
                    <input type="text" id="input-link-url" class="palette-input text-[10px]" value="${linkHref || ''}" placeholder="https://your-social-link">
                    <div class="text-[8px] text-zinc-500 mt-1">Leave empty to keep placeholder '#'</div>
                </div>
                ` : ''}

                <div id="text-color-control" class="palette-control mt-4 ${isMedia ? 'opacity-30 pointer-events-none' : ''}" style="transition: opacity 0.3s;">
                        <label class="palette-label" id="text-color-label">Text Color</label>
                        <div class="palette-color-group">
                            <input type="color" id="input-color" class="palette-input--color" value="${this.rgbToHex(styles.color)}" aria-label="Text color picker">
                            <input type="text" id="hex-color" class="palette-input palette-input--hex font-mono text-[11px]" value="${this.rgbToHex(styles.color)}" aria-label="Hex color value" pattern="^#[0-9A-Fa-f]{6}$">
                        </div>
                    </div>
                </div>

                <!-- SCROLLABLE CONTENT -->
                <div class="palette-content">

                    <!-- SECTION 1: TYPOGRAPHY -->
                    <div class="palette-section expanded">
                        <button class="palette-section-header" aria-expanded="true" aria-controls="typography-panel" id="typography-toggle">
                            Typography
                        </button>
                        <div id="typography-panel" class="palette-section-content" role="region" aria-labelledby="typography-toggle">
                            <!-- Font Size Control -->
                            <div id="text-size-control" class="palette-control ${(isStructural || isMedia) ? 'opacity-30 pointer-events-none' : ''}">
                                <label class="palette-label">Font Size (px)</label>
                                <input type="range" id="input-font-size-slider" min="8" max="${fontSizeMax}" step="1" value="${fontSizeValue}" class="w-full accent-[var(--accent)] cursor-pointer" aria-label="Font size slider">
                                <div class="flex flex-wrap gap-2 mt-3">
                                    <input type="number" id="input-font-size" min="8" max="${fontSizeMax}" step="1" class="palette-input w-20 text-center" value="${fontSizeValue}" aria-label="Font size input">
                                    <div class="font-preset-buttons" style="flex-basis:100%;">
                                        <button class="font-preset-btn" data-font-size-preset="16" title="Body (16px)">Body</button>
                                        <button class="font-preset-btn" data-font-size-preset="32" title="Heading (32px)">Heading</button>
                                        <button class="font-preset-btn" data-font-size-preset="48" title="Display (48px)">Display</button>
                                    </div>
                                </div>
                            </div>

                            <!-- Font Family -->
                            <div class="palette-control mt-4">
                                <label class="palette-label">Font Family</label>
                                <select id="input-font" class="palette-input palette-input--select" aria-label="Font family">
                                    <option value="Inter" ${styles.fontFamily.includes('Inter') ? 'selected' : ''}>Inter</option>
                                    <option value="JetBrains Mono" ${styles.fontFamily.includes('Mono') ? 'selected' : ''}>JetBrains Mono</option>
                                    <option value="serif" ${styles.fontFamily.includes('serif') ? 'selected' : ''}>Serif</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- SECTION 2: VISUAL EFFECTS -->
                    <div class="palette-section">
                        <button class="palette-section-header" aria-expanded="false" aria-controls="effects-panel" id="effects-toggle">
                            Visual Effects
                        </button>
                        <div id="effects-panel" class="palette-section-content" role="region" aria-labelledby="effects-toggle">
                            <!-- Text Gradient -->
                            <div id="text-gradient-control" class="palette-control ${(isStructural || isMedia) ? 'opacity-30 pointer-events-none' : ''}">
                                <label class="palette-label">Text Gradient (letters)</label>
                                <div class="flex items-center gap-2 mb-2">
                                    <input type="color" id="input-text-grad-color1" class="palette-input--color" value="${this.rgbToHex(styles.color)}" aria-label="Gradient start color">
                                    <span class="text-[9px] text-zinc-500">→</span>
                                    <input type="color" id="input-text-grad-color2" class="palette-input--color" value="#8b5cf6" aria-label="Gradient end color">
                                    <button id="btn-text-grad-clear" class="text-[8px] text-zinc-500 hover:text-amber-400 transition-colors ml-auto" title="Clear text gradient">× clear</button>
                                </div>
                                <div class="flex items-center gap-3">
                                    <input type="range" id="input-text-grad-angle" min="0" max="360" step="1" value="90" class="flex-1 accent-[var(--accent)]" aria-label="Gradient angle">
                                    <span id="text-grad-angle-value" class="text-[9px] font-mono text-zinc-400 min-w-[30px]">90°</span>
                                </div>
                            </div>

                            <!-- Text Glow -->
                            <div class="palette-control mt-4 ${(isStructural || isMedia) ? 'opacity-30 pointer-events-none' : ''}">
                                <label class="palette-label">Text Glow</label>
                                <div class="flex items-center gap-3">
                                    <input type="color" id="input-text-glow-color" class="palette-input--color" value="${this.rgbToHex(styles.color)}" aria-label="Glow color">
                                    <input type="range" id="input-text-glow-blur" min="0" max="50" step="1" value="0" class="flex-1 accent-[var(--accent)]" aria-label="Glow blur">
                                    <span id="text-glow-blur-value" class="text-[9px] font-mono text-zinc-400 min-w-[30px]">0px</span>
                                </div>
                            </div>

                            <!-- Container Glow -->
                            <div class="palette-control mt-4">
                                <label class="palette-label">Container Glow</label>
                                <div class="flex items-center gap-3">
                                    <input type="color" id="input-glow-color" class="palette-input--color" value="${containerGlowState.color}" aria-label="Container glow color">
                                    <input type="range" id="input-glow-blur" min="0" max="50" step="1" value="${containerGlowState.blur}" class="flex-1 accent-[var(--accent)]" aria-label="Container glow blur">
                                    <span id="glow-blur-value" class="text-[9px] font-mono text-zinc-400 min-w-[30px]">${containerGlowState.blur}px</span>
                                </div>
                            </div>

                            <!-- Container Gradient -->
                            <div class="palette-control mt-4">
                                <label class="palette-label">Container Gradient (box/background)</label>
                                <div class="flex items-center gap-2 mb-2">
                                    <input type="color" id="input-grad-color1" class="palette-input--color" value="${containerGradientState.color1}" aria-label="Container gradient start">
                                    <span class="text-[9px] text-zinc-500">→</span>
                                    <input type="color" id="input-grad-color2" class="palette-input--color" value="${containerGradientState.color2}" aria-label="Container gradient end">
                                </div>
                                <div class="flex items-center gap-3">
                                    <input type="range" id="input-grad-angle" min="0" max="360" step="1" value="${containerGradientState.angle}" class="flex-1 accent-[var(--accent)]" aria-label="Container gradient angle">
                                    <span id="grad-angle-value" class="text-[9px] font-mono text-zinc-400 min-w-[30px]">${containerGradientState.angle}°</span>
                                </div>
                            </div>

                            <!-- Text Mask removed from the base editor until the effect is trustworthy -->
                        </div>
                    </div>

                    <!-- SECTION 3: MEDIA -->
                    <div class="palette-section">
                        <button class="palette-section-header" aria-expanded="false" aria-controls="media-panel" id="media-toggle">
                            Media
                        </button>
                        <div id="media-panel" class="palette-section-content" role="region" aria-labelledby="media-toggle">
                            <!-- Image Upload -->
                            <div class="palette-control ${!(isImage || hasBgImage) ? 'hidden' : ''}">
                                <label class="palette-label">Image Upload</label>
                                <button id="btn-image-upload" class="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold rounded-sm transition-all border border-zinc-700 uppercase tracking-widest">
                                    Upload File
                                </button>
                                <input type="file" id="input-image-file" class="hidden" accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml">
                                <div id="image-status" class="text-[8px] font-mono text-zinc-500 hidden"></div>
                            </div>

                            <!-- Media URL -->
                            <div class="palette-control mt-4">
                                <label class="palette-label">Media URL</label>
                                <input type="text" id="input-media-url" class="palette-input text-[10px] mb-2" value="${existingMediaSrc}" placeholder="Paste image or video URL..." aria-label="Media URL">
                                <button id="btn-apply-url" class="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold rounded-sm transition-all border border-zinc-700 uppercase tracking-widest">
                                    Apply URL
                                </button>
                                <div id="media-status" class="text-[8px] font-mono text-zinc-500 hidden"></div>
                            </div>
                        </div>
                    </div>

                    <!-- SECTION 4: LAYOUT -->
                    <div class="palette-section">
                        <button class="palette-section-header" aria-expanded="false" aria-controls="layout-panel" id="layout-toggle">
                            Layout
                        </button>
                        <div id="layout-panel" class="palette-section-content" role="region" aria-labelledby="layout-toggle">
                            <!-- Z-Index -->
                            <div class="palette-control ${isMedia ? 'opacity-30 pointer-events-none' : ''}">
                                <label class="palette-label">Layer Depth (Z)</label>
                                <input type="number" id="input-zindex" class="palette-input" value="${(styles.zIndex && styles.zIndex !== 'auto') ? styles.zIndex : 0}" aria-label="Z-index / layer depth">
                            </div>

                            <!-- Structure & Hierarchy -->
                            <div class="palette-control mt-6 pt-4 border-t border-zinc-800">
                                <label class="palette-label text-[9px] mb-3">Structure & Hierarchy</label><button id="btn-select-parent" type="button" class="w-full mb-3 px-2 py-2 bg-zinc-800 text-zinc-300 text-[9px] font-bold uppercase tracking-widest rounded hover:bg-zinc-700 transition">Select parent container</button>
                                <div class="grid grid-cols-4 gap-2">
                                    <button id="btn-move-up" title="${isHorizontal ? 'Move Left' : 'Move Up'}" class="flex items-center justify-center p-2 bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-700 transition ${isLocked ? 'opacity-30' : ''}" ${isLocked ? 'disabled' : ''} aria-label="${isHorizontal ? 'Move element left' : 'Move element up'}">
                                        ${isHorizontal ?
                                            `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>` :
                                            `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg>`
                                        }
                                    </button>
                                    <button id="btn-move-down" title="${isHorizontal ? 'Move Right' : 'Move Down'}" class="flex items-center justify-center p-2 bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-700 transition ${isLocked ? 'opacity-30' : ''}" ${isLocked ? 'disabled' : ''} aria-label="${isHorizontal ? 'Move element right' : 'Move element down'}">
                                        ${isHorizontal ?
                                            `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>` :
                                            `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>`
                                        }
                                    </button>
                                    <button id="btn-clone" title="Clone Element" class="flex items-center justify-center p-2 bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-700 transition ${isLocked ? 'opacity-30' : ''}" ${isLocked ? 'disabled' : ''} aria-label="Clone element">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>
                                    </button>
                                    <button id="btn-delete" title="Delete Element" class="flex items-center justify-center p-2 bg-red-900/20 text-red-500/70 rounded hover:bg-red-900/40 transition ${isLocked ? 'opacity-30' : ''}" ${isLocked ? 'disabled' : ''} aria-label="Delete element">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div> <!-- end palette-content -->

                <!-- STICKY FOOTER (SAVE/CANCEL) -->
                <div class="palette-actions">
                    <div class="flex gap-2 mb-2">
                        <!-- Save Button -->
                        <button id="btn-save" class="flex-1 btn-save" aria-label="Save changes" title="Save changes (Ctrl+S)">
                            SAVE
                        </button>


                        <!-- Cancel Button -->
                        <button id="btn-cancel" class="flex-1 btn-cancel" aria-label="Discard changes" title="Discard changes (Esc)">
                            CANCEL
                        </button>
                    </div>

                    <!-- Advanced & Reset dropdowns -->
                    <div class="flex gap-2">
                        <button id="btn-advanced-toggle" class="flex-1 text-[9px] font-bold text-zinc-500 hover:text-[var(--accent)] uppercase tracking-widest transition-colors py-2 px-2 border border-zinc-700 rounded hover:border-zinc-600">
                            Advanced +
                        </button>
                        <button id="btn-reset-toggle" class="flex-1 text-[9px] font-bold text-amber-400 hover:text-amber-300 uppercase tracking-widest transition-colors py-2 px-2 border border-amber-400/30 rounded hover:border-amber-400/60">
                            ↺ Reset
                        </button>
                    </div>

                    <!-- Reset Dropdown (hidden by default) -->
                    <div id="reset-dropdown" class="hidden bg-zinc-900 border border-amber-400/40 rounded-sm overflow-hidden shadow-lg">
                        <button id="btn-reset-element-all" class="w-full px-3 py-2 text-left text-[10px] text-zinc-300 hover:bg-amber-400/10 hover:text-amber-400 transition-colors">
                            Reset Selected Element
                        </button>
                        <button id="btn-reset-page" class="w-full px-3 py-2 text-left text-[10px] text-red-400 hover:bg-red-400/10 transition-colors border-t border-zinc-800">
                            Reset Page
                        </button>
                    </div>
                </div>

                <!-- Advanced Panel (initially hidden) -->
                <div id="advanced-panel" class="hidden mb-4 p-3 bg-black/40 border border-zinc-800 rounded-sm">
                    <div class="palette-control mb-4 border-b border-zinc-800 pb-3">
                        <label class="palette-label text-[9px] mb-2 flex justify-between">
                            <span>Dev Visualizers</span>
                            <span class="text-[7px] opacity-40 italic">Helicopter View</span>
                        </label>
                        <button id="toggle-labels" class="w-full py-1.5 ${this.labelsActive ? 'bg-green-600' : 'bg-zinc-800'} text-white text-[9px] font-bold rounded-sm transition-all uppercase border border-white/5 hover:border-white/20">
                            TOGGLE LATTICE LABELS
                        </button>
                    </div>

                    <!-- 3D View removed from the base editor: needs a full overhaul, coming back as an advanced-editor upsell -->

                    <div class="grid grid-cols-2 gap-3 mb-4">
                        <div class="palette-control">
                            <label class="palette-label text-[9px]">Lattice ID</label>
                            <div class="font-mono text-[9px] text-[var(--accent)] lattice-id-value">${element.dataset.axId}</div>
                        </div>
                        <div class="palette-control">
                            <label class="palette-label text-[9px]">Children</label>
                            <div class="font-mono text-[9px] text-zinc-400">${childCount} nodes</div>
                        </div>
                    </div>

                    <div class="palette-control mb-4">
                        <label class="palette-label text-[9px]">Selector</label>
                        <div class="font-mono text-[10px] text-zinc-400 break-all bg-black/20 p-2 mt-1 border border-zinc-800/50">${selector}</div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div class="palette-control">
                            <label class="palette-label text-[9px]">Opacity</label>
                            <input type="range" id="input-opacity" min="0" max="1" step="0.1" value="${currentOpacity}" class="w-full accent-[var(--accent)]" aria-label="Opacity">
                        </div>
                        <div class="palette-control">
                            <label class="palette-label text-[9px]">Scale</label>
                            <input type="range" id="input-scale" min="0.5" max="2" step="0.1" value="1" class="w-full accent-[var(--accent)]" aria-label="Scale">
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3 mt-3">
                        <div class="palette-control">
                            <label class="palette-label text-[9px]">Margin</label>
                            <input type="text" id="input-margin" class="palette-input text-[10px]" value="${styles.margin}" placeholder="e.g. 20px" aria-label="Margin">
                        </div>
                        <div class="palette-control">
                            <label class="palette-label text-[9px]">Padding</label>
                            <input type="text" id="input-padding" class="palette-input text-[10px]" value="${styles.padding}" placeholder="e.g. 10px" aria-label="Padding">
                        </div>
                    </div>
                </div>

                <!-- Dirty indicator (shown when changes are pending) -->
                <div id="dirty-indicator" class="hidden text-center text-[9px] text-yellow-400 font-mono animate-pulse py-2">
                    • Unsaved changes •
                </div>
            </div> <!-- end tool-palette -->
        `;

        this.quill = null;
        this.attachListeners();
    }

    // Mirrors the active editor caret position onto the live on-page element as an
    // empty, zero-width marker span. It MUST stay empty (no text content) so
    // it never changes the element's textContent.

    attachListeners() {
        // COLLAPSIBLE SECTIONS (Phase 1 - Progressive Disclosure)
        const sectionToggles = document.querySelectorAll('.palette-section-header');
        sectionToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const section = toggle.closest('.palette-section');
                const isExpanded = section.classList.contains('expanded');

                // Close all other sections (one open at a time)
                document.querySelectorAll('.palette-section').forEach(s => {
                    if (s !== section) {
                        s.classList.remove('expanded');
                        s.querySelector('.palette-section-header').setAttribute('aria-expanded', 'false');
                    }
                });

                // Toggle this section
                section.classList.toggle('expanded');
                toggle.setAttribute('aria-expanded', !isExpanded);

                // Smooth scroll to keep header visible
                toggle.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
        });
        // BUTTON REFERENCES
        // Wire the current palette save/cancel controls so every visible exit path behaves the same way.
        const saveBtns = [document.getElementById('btn-save')].filter(Boolean);
        const cancelBtns = [document.getElementById('btn-cancel')].filter(Boolean);
        const closeBtn = document.getElementById('btn-close-palette');
        const contentInput = document.getElementById('input-content');
        const colorInput = document.getElementById('input-color');
        const hexInput = document.getElementById('hex-color');
        const zInput = document.getElementById('input-zindex');
        const fontSelect = document.getElementById('input-font');
        const fontSizeInput = document.getElementById('input-font-size');
        const fontSizeSlider = document.getElementById('input-font-size-slider');
        const fontSizePresets = document.querySelectorAll('[data-font-size-preset]');
        const labelsToggle = document.getElementById('toggle-labels');
        const view3DToggle = document.getElementById('toggle-3d'); // Declaration added
        const advancedToggle = document.getElementById('btn-advanced-toggle');
        const advancedPanel = document.getElementById('advanced-panel');
        const resetToggle = document.getElementById('btn-reset-toggle');
        const resetDropdown = document.getElementById('reset-dropdown');
        const parentBtn = document.getElementById('btn-select-parent');
        const moveUpBtn = document.getElementById('btn-move-up');
        const moveDownBtn = document.getElementById('btn-move-down');
        const cloneBtn = document.getElementById('btn-clone');
        const deleteBtn = document.getElementById('btn-delete');
        
        // Advanced Controls
        const opacityInput = document.getElementById('input-opacity');
        const scaleInput = document.getElementById('input-scale');
        const marginInput = document.getElementById('input-margin');
        const paddingInput = document.getElementById('input-padding');

        // SAVE / CANCEL BUTTONS
        saveBtns.forEach((btn) => {
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.onSave) {
                    this.onSave();
                } else if (this.onEdit) {
                    this.onEdit('save-session', true);
                }
            };
        });

        cancelBtns.forEach((btn) => {
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.onCancel) {
                    this.onCancel();
                } else if (this.onEdit) {
                    this.onEdit('cancel-session', true);
                }
            };
        });

        if (closeBtn) {
            closeBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.onCancel) {
                    this.onCancel();
                } else if (typeof window.exitEditMode === 'function') {
                    window.exitEditMode();
                }
            };
        }

        // RESET DROPDOWN TOGGLE
        if (resetToggle && resetDropdown) {
            resetToggle.onclick = (e) => {
                e.stopPropagation();
                resetDropdown.classList.toggle('hidden');
            };
        }

        if (opacityInput) {
            opacityInput.oninput = (e) => { if (this.onEdit) this.onEdit('opacity', e.target.value); };
        }
        if (scaleInput) {
            scaleInput.oninput = (e) => { if (this.onEdit) this.onEdit('transform', `scale(${e.target.value})`); };
        }
        if (marginInput) {
            marginInput.oninput = (e) => { 
                let val = e.target.value;
                if (val && !isNaN(val)) val += 'px';
                if (this.onEdit) this.onEdit('margin', val); 
            };
        }
        if (paddingInput) {
            paddingInput.oninput = (e) => { 
                let val = e.target.value;
                if (val && !isNaN(val)) val += 'px';
                if (this.onEdit) this.onEdit('padding', val); 
            };
        }

        if (advancedToggle && advancedPanel) {
            advancedToggle.onclick = () => {
                const isHidden = advancedPanel.classList.toggle('hidden');
                advancedToggle.innerText = isHidden ? 'Advanced +' : 'Advanced -';
            };
        }

        document.removeEventListener('click', this._boundCloseResetDropdown);
        document.addEventListener('click', this._boundCloseResetDropdown);

        if (parentBtn) {
            parentBtn.onclick = () => {
                if (this.onEdit) this.onEdit('select-parent', this.currentElement);
            };
        }
        if (moveUpBtn && !moveUpBtn.disabled) {
            moveUpBtn.onclick = () => { if (this.onEdit) this.onEdit('moveUp', this.currentElement); };
        }

        if (moveDownBtn && !moveDownBtn.disabled) {
            moveDownBtn.onclick = () => { if (this.onEdit) this.onEdit('moveDown', this.currentElement); };
        }

        if (contentInput) {
            let textSyncTimer = null;
            const syncTextContent = (value, delay = 60) => {
                if (textSyncTimer) clearTimeout(textSyncTimer);
                textSyncTimer = setTimeout(() => {
                    if (this.onEdit) this.onEdit('textContent', value);
                }, delay);
            };

            contentInput.addEventListener('input', (e) => {
                syncTextContent(e.target.value, 60);
                this._renderLiveCaret(contentInput.selectionStart);
            });

            contentInput.addEventListener('paste', (e) => {
                const pastedText = e.clipboardData ? e.clipboardData.getData('text') : '';
                const nextValue = pastedText
                    ? contentInput.value.slice(0, contentInput.selectionStart) + pastedText + contentInput.value.slice(contentInput.selectionEnd)
                    : null;
                syncTextContent(nextValue ?? contentInput.value, 120);
                this._renderLiveCaret(contentInput.selectionStart);
            });

            // _renderLiveCaret was originally only wired to Quill's own
            // events. In the current shipped plain-textarea mode Quill is
            // never initialized, so those events never fire and the live
            // caret never appeared on the page at all. Mirror the same
            // events here so cursor movement (not just typing) is reflected.
            ['click', 'keyup', 'select'].forEach(evt => {
                contentInput.addEventListener(evt, () => {
                    this._renderLiveCaret(contentInput.selectionStart);
                });
            });
        }

        if (colorInput) {
            colorInput.oninput = (e) => {
                if (hexInput) hexInput.value = e.target.value;
                if (this.onEdit) this.onEdit('color', e.target.value);
                // Re-fire text glow if active (glow always follows text color)
                const glowBlur = document.getElementById('input-text-glow-blur');
                if (glowBlur && parseInt(glowBlur.value) > 0 && typeof updateTextGlow === 'function') updateTextGlow();
            };
        }
        if (hexInput) {
            hexInput.onchange = (e) => {
                let hex = e.target.value.trim();
                if (!hex.startsWith('#')) hex = '#' + hex;
                if (colorInput) colorInput.value = hex;
                if (this.onEdit) this.onEdit('color', hex);
                // Re-fire text glow if active (glow always follows text color)
                const glowBlur = document.getElementById('input-text-glow-blur');
                if (glowBlur && parseInt(glowBlur.value) > 0 && typeof updateTextGlow === 'function') updateTextGlow();
            };
        }

        if (zInput) {
            zInput.oninput = (e) => {
                if (this.onEdit) this.onEdit('zIndex', e.target.value);
            };
        }

        if (fontSelect) {
            fontSelect.onchange = (e) => {
                if (this.onEdit) this.onEdit('fontFamily', e.target.value);
            };
        }

        // FONT SIZE HANDLING (Slider + Input + 3 Presets)
        const applyFontSize = (rawValue) => {
            const sizeNum = parseInt(rawValue, 10);
            if (!sizeNum || isNaN(sizeNum)) return;
            const sizeValue = sizeNum + 'px';

            // Sync all controls
            if (fontSizeInput) fontSizeInput.value = sizeNum;
            if (fontSizeSlider) fontSizeSlider.value = sizeNum;

            // Apply edit
            if (this.onEdit) this.onEdit('fontSize', sizeValue);
        };

        if (fontSizeInput) {
            fontSizeInput.addEventListener('input', (e) => applyFontSize(e.target.value));
            fontSizeInput.addEventListener('change', (e) => applyFontSize(e.target.value));
        }

        if (fontSizeSlider) {
            fontSizeSlider.addEventListener('input', (e) => {
                applyFontSize(e.target.value);
                // Show realtime feedback (optional)
                if (fontSizeInput) fontSizeInput.value = e.target.value;
            });
        }

        if (fontSizePresets && fontSizePresets.length > 0) {
            fontSizePresets.forEach(btn => {
                btn.addEventListener('click', () => applyFontSize(btn.dataset.fontSizePreset));
            });
        }

        // IMAGE controls
        const imageUploadBtn = document.getElementById('btn-image-upload');
        const imageFileInput = document.getElementById('input-image-file');
        const imageStatus = document.getElementById('image-status');

        const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];
        const MAX_ENCODED_KB = 500;

        const showImageStatus = (msg, isError) => {
            if (!imageStatus) return;
            imageStatus.textContent = msg;
            imageStatus.className = `text-[8px] font-mono ${isError ? 'text-red-400' : 'text-green-400'}`;
            imageStatus.classList.remove('hidden');
        };

        if (imageUploadBtn && imageFileInput) {
            imageUploadBtn.onclick = () => imageFileInput.click();
            imageFileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;

                if (!ALLOWED_TYPES.includes(file.type)) {
                    showImageStatus('Invalid type. Use PNG, JPEG, GIF, WebP, or SVG.', true);
                    return;
                }

                const reader = new FileReader();
                reader.onerror = () => showImageStatus('Failed to read file.', true);
                reader.onload = (ev) => {
                    const img = new Image();
                    img.onload = () => {
                        const MAX_DIM = 800;
                        let w = img.width, h = img.height;
                        if (w > MAX_DIM || h > MAX_DIM) {
                            const ratio = Math.min(MAX_DIM / w, MAX_DIM / h);
                            w = Math.round(w * ratio);
                            h = Math.round(h * ratio);
                        }
                        const canvas = document.createElement('canvas');
                        canvas.width = w;
                        canvas.height = h;
                        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                        const sizeKB = Math.round(dataUrl.length / 1024);

                        // localStorage budget check
                        try {
                            const used = JSON.stringify(localStorage).length;
                            const limit = 5 * 1024 * 1024;
                            if (used + dataUrl.length > limit * 0.9) {
                                showImageStatus(`Storage nearly full (${Math.round(used / 1024)}KB used). Rejected.`, true);
                                return;
                            }
                        } catch (err) { /* storage access error â€” proceed anyway */ }

                        if (sizeKB > MAX_ENCODED_KB) {
                            showImageStatus(`${sizeKB}KB — large, may fill storage`, false);
                        } else {
                            showImageStatus(`${sizeKB}KB — OK`, false);
                        }

                        if (this.onEdit) this.onEdit('imageSrc', dataUrl);
                    };
                    img.src = ev.target.result;
                };
                reader.readAsDataURL(file);
            };
        }

        // UNIFIED MEDIA URL (auto-detects image vs video)
        const mediaUrlInput = document.getElementById('input-media-url');
        const applyUrlBtn = document.getElementById('btn-apply-url');
        const mediaStatus = document.getElementById('media-status');

        const showMediaStatus = (msg, isError) => {
            if (!mediaStatus) return;
            mediaStatus.textContent = msg;
            mediaStatus.className = `text-[8px] font-mono ${isError ? 'text-red-400' : 'text-green-400'}`;
            mediaStatus.classList.remove('hidden');
        };

        const applyMediaUrl = () => {
            if (!mediaUrlInput) return;
            const url = mediaUrlInput.value.trim();
            if (!url) {
                showMediaStatus('Paste a URL first', true);
                return;
            }
            if (!url.startsWith('http') && !url.startsWith('data:')) {
                showMediaStatus('Enter a valid URL starting with http', true);
                return;
            }

            // Detect video URLs
            const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]+)/);
            const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
            const isDirectVideo = /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);

            if (ytMatch || vimeoMatch || isDirectVideo) {
                if (this.onEdit) this.onEdit('videoSrc', url);
                showMediaStatus(ytMatch ? 'YouTube video applied' : vimeoMatch ? 'Vimeo video applied' : 'Video applied', false);
            } else {
                // Default to image for all other URLs
                if (this.onEdit) this.onEdit('imageSrc', url);
                showMediaStatus('Image applied', false);
            }
        };

        if (applyUrlBtn) {
            applyUrlBtn.onclick = applyMediaUrl;
        }
        if (mediaUrlInput) {
            mediaUrlInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') applyMediaUrl();
            });
        }

        // GLOW controls
        const glowColor = document.getElementById('input-glow-color');
        const glowBlur = document.getElementById('input-glow-blur');
        const updateGlow = () => {
            const color = glowColor ? glowColor.value : '#00ff00';
            const blur = glowBlur ? parseInt(glowBlur.value) : 0;
            const label = document.getElementById('glow-blur-value');
            if (label) label.textContent = blur + 'px';
            if (blur === 0) {
                if (this.onEdit) this.onEdit('containerBoxShadow', 'none');
                return;
            }
            const layers = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
            const shadow = layers.map(m => `0 0 ${Math.round(blur * m)}px ${color}`).join(', ');
            if (this.onEdit) this.onEdit('containerBoxShadow', shadow);
        };
        if (glowColor) glowColor.oninput = updateGlow;
        if (glowBlur) glowBlur.oninput = updateGlow;

        // TEXT GLOW controls (always uses current text color â€” no separate color picker)
        const textGlowBlur = document.getElementById('input-text-glow-blur');
        const textGlowColor = document.getElementById('input-text-glow-color');
        const updateTextGlow = () => {
            const color = textGlowColor ? textGlowColor.value : '#ffffff';
            const blur = textGlowBlur ? parseInt(textGlowBlur.value) : 0;
            const label = document.getElementById('text-glow-blur-value');
            if (label) label.textContent = blur + 'px';
            if (blur === 0) {
                if (this.onEdit) this.onEdit('textShadow', 'none');
                return;
            }
            const layers = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
            const shadow = layers.map(m => `0 0 ${Math.round(blur * m)}px ${color}`).join(', ');
            if (this.onEdit) this.onEdit('textShadow', shadow);
        };
        if (textGlowColor) textGlowColor.oninput = updateTextGlow;
        if (textGlowBlur) textGlowBlur.oninput = updateTextGlow;

        // TEXT GRADIENT controls
        const textGradColor1 = document.getElementById('input-text-grad-color1');
        const textGradColor2 = document.getElementById('input-text-grad-color2');
        const textGradAngle = document.getElementById('input-text-grad-angle');
        const textGradClear = document.getElementById('btn-text-grad-clear');
        const applyTextGradient = () => {
            const c1 = textGradColor1 ? textGradColor1.value : '#ffffff';
            const c2 = textGradColor2 ? textGradColor2.value : '#8b5cf6';
            const angle = textGradAngle ? parseInt(textGradAngle.value) : 90;
            const label = document.getElementById('text-grad-angle-value');
            if (label) label.textContent = angle + '\u00b0';
            if (this.onEdit) {
                this.onEdit('backgroundImage', `linear-gradient(${angle}deg, ${c1}, ${c2})`);
                this.onEdit('webkitBackgroundClip', 'text');
                this.onEdit('backgroundClip', 'text');
                this.onEdit('webkitTextFillColor', 'transparent');
            }
            // Gray out Text Color â€” gradient overrides it
            const colorControl = document.getElementById('text-color-control');
            const colorLabel = document.getElementById('text-color-label');
            if (colorControl) { colorControl.style.opacity = '0.3'; colorControl.style.pointerEvents = 'none'; }
            if (colorLabel) colorLabel.textContent = 'Text Color (gradient active)';
        };
        if (textGradColor1) textGradColor1.oninput = applyTextGradient;
        if (textGradColor2) textGradColor2.oninput = applyTextGradient;
        if (textGradAngle) textGradAngle.oninput = applyTextGradient;
        if (textGradClear) {
            textGradClear.onclick = () => {
                if (this.onEdit) {
                    this.onEdit('backgroundImage', '');
                    this.onEdit('webkitBackgroundClip', '');
                    this.onEdit('backgroundClip', '');
                    this.onEdit('webkitTextFillColor', '');
                }
                // Restore Text Color control
                const colorControl = document.getElementById('text-color-control');
                const colorLabel = document.getElementById('text-color-label');
                if (colorControl) { colorControl.style.opacity = '1'; colorControl.style.pointerEvents = ''; }
                if (colorLabel) colorLabel.textContent = 'Text Color';
            };
        }

        // GRADIENT controls
        const gradColor1 = document.getElementById('input-grad-color1');
        const gradColor2 = document.getElementById('input-grad-color2');
        const gradAngle = document.getElementById('input-grad-angle');
        const updateGradient = () => {
            const c1 = gradColor1 ? gradColor1.value : '#000000';
            const c2 = gradColor2 ? gradColor2.value : '#ffffff';
            const angle = gradAngle ? parseInt(gradAngle.value) : 180;
            const label = document.getElementById('grad-angle-value');
            if (label) label.textContent = angle + '°';
            if (this.onEdit) {
                // Container Gradient and Text Gradient are mutually exclusive
                // visually. If Text Gradient was left on (text-fill-color still
                // transparent), the container's real gradient shows through the
                // see-through letters and looks like "text coloring" instead of
                // a container background, even though this call is correct.
                this.onEdit('webkitBackgroundClip', '');
                this.onEdit('backgroundClip', '');
                this.onEdit('webkitTextFillColor', '');
                this.onEdit('containerBackgroundImage', `linear-gradient(${angle}deg, ${c1}, ${c2})`);
            }
        };
        if (gradColor1) gradColor1.oninput = updateGradient;
        if (gradColor2) gradColor2.oninput = updateGradient;
        if (gradAngle) gradAngle.oninput = updateGradient;

        // TEXT MASK controls
        const maskUrl = document.getElementById('input-mask-url');
        const maskColor = document.getElementById('input-mask-color');
        const maskFade = document.getElementById('input-mask-fade');
        const updateTextMask = () => {
            const url = maskUrl ? maskUrl.value.trim() : '';
            const fade = maskFade ? parseInt(maskFade.value) : 0;
            const mColor = maskColor ? maskColor.value : '#0a0a0a';
            const label = document.getElementById('mask-fade-value');
            if (label) label.textContent = fade + '%';
            if (!url) return;
            if (this.onEdit) this.onEdit('textClipMask', { url, fade, maskColor: mColor });
        };
        if (maskUrl) maskUrl.oninput = updateTextMask;
        if (maskColor) maskColor.oninput = updateTextMask;
        if (maskFade) maskFade.oninput = updateTextMask;

        if (labelsToggle) {
            labelsToggle.onclick = () => {
                this.labelsActive = !this.labelsActive;
                if (this.onEdit) this.onEdit('toggleLabels', this.labelsActive);
                if (this.lastData) this.update(this.lastData);
            };
        }

        if (view3DToggle) {
            view3DToggle.onclick = () => {
                this.view3DActive = !this.view3DActive;
                if (this.onEdit) this.onEdit('view3D', this.view3DActive);
                if (this.lastData) this.update(this.lastData);
            };
        }

        if (cloneBtn && !cloneBtn.disabled) {
            cloneBtn.onclick = () => { if (this.onEdit) this.onEdit('clone', this.currentElement); };
        }
        if (deleteBtn && !deleteBtn.disabled) {
            deleteBtn.onclick = () => {
                if (confirm('Delete this element?')) {
                    if (this.onEdit) this.onEdit('delete', this.currentElement);
                    this.hide();
                }
            };
        }
// Peek (reticle visibility toggle)
        const peekBtn = document.getElementById('btn-peek');
        if (peekBtn) {
            peekBtn.onclick = () => {
                if (this.onEdit) this.onEdit('peek-toggle', true);
            };
        }

        const resetElementAllBtn = document.getElementById('btn-reset-element-all');
        if (resetElementAllBtn) {
            resetElementAllBtn.onmouseenter = () => { if (this.onEdit) this.onEdit('reset-preview', 'element'); };
            resetElementAllBtn.onmouseleave = () => { if (this.onEdit) this.onEdit('reset-preview-clear', true); };
            resetElementAllBtn.onclick = () => {
                if (this.onEdit) this.onEdit('reset-element-all', true);
                if (resetDropdown) resetDropdown.classList.add('hidden');
            };
        }

        const resetPageBtn = document.getElementById('btn-reset-page');
        if (resetPageBtn) {
            resetPageBtn.onmouseenter = () => { if (this.onEdit) this.onEdit('reset-preview', 'page'); };
            resetPageBtn.onmouseleave = () => { if (this.onEdit) this.onEdit('reset-preview-clear', true); };
            resetPageBtn.onclick = () => {
                if (this.onEdit) this.onEdit('reset-page', true);
                if (resetDropdown) resetDropdown.classList.add('hidden');
            };
        }

        // 3D View Control Sliders
        const rotationSlider = document.getElementById('slider-rotation');
        const spacingSlider = document.getElementById('slider-spacing');

        if (rotationSlider) {
            rotationSlider.oninput = (e) => {
                const value = parseInt(e.target.value);
                document.getElementById('rotation-value').textContent = value + '%';
                if (this.onEdit) this.onEdit('3d-rotation-intensity', value);
            };
        }

        if (spacingSlider) {
            spacingSlider.oninput = (e) => {
                const value = parseInt(e.target.value);
                document.getElementById('spacing-value').textContent = value + 'px';
                if (this.onEdit) this.onEdit('3d-layer-spacing', value);
            };
        }
    }

    rgbToHex(rgb) {
        if (!rgb || rgb === 'rgba(0, 0, 0, 0)') return '#000000';
        if (rgb.startsWith('#')) return rgb;
        const match = rgb.match(/\d+/g);
        if (!match) return '#000000';
        const [r, g, b] = match;
        return "#" + ((1 << 24) + (+r << 16) + (+g << 8) + +b).toString(16).slice(1);
    }

    parseBoxShadowControlState(boxShadow, fallbackColor = '#00ff00') {
        if (!boxShadow || boxShadow === 'none') {
            return { color: fallbackColor, blur: 0 };
        }
        const colors = boxShadow.match(/#[0-9a-fA-F]{6}|rgba?\([^\)]+\)/g) || [];
        const color = colors.length ? this.rgbToHex(colors[colors.length - 1]) : fallbackColor;

        // Split into per-layer shadows on top-level commas (not commas inside
        // an rgb()/rgba() color). Each layer has its own [offsetX, offsetY,
        // blur, (spread)] numbers - the browser's computed-style form always
        // adds a trailing 0px spread the authored string didn't have, which
        // previously threw off a flat "Nth number overall" index and made
        // reopen show 0 instead of the real value.
        const layers = boxShadow.split(/,(?![^(]*\))/).map(s => s.trim());
        let blur = 0;
        if (layers.length >= 4) {
            // Generated container glow shadows use the fixed multiplier series
            // [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4]. Layer index 3 (multiplier 1)
            // is the user's actual base slider value.
            const layerNumbers = (layers[3].match(/[\d.]+px/g) || []).map(n => parseFloat(n));
            // [offsetX, offsetY, blur, (spread)] - blur is always the 3rd number.
            blur = layerNumbers.length >= 3 ? layerNumbers[2] : 0;
        } else if (layers.length) {
            const allBlurs = layers.map(layer => {
                const nums = (layer.match(/[\d.]+px/g) || []).map(n => parseFloat(n));
                return nums.length >= 3 ? nums[2] : (nums[0] || 0);
            });
            blur = Math.round(Math.max(...allBlurs));
        }

        blur = Math.max(0, Math.min(50, Math.round(blur)));
        return { color, blur };
    }

    parseGradientControlState(backgroundImage, fallbackColor1 = '#000000', fallbackColor2 = '#ffffff') {
        if (!backgroundImage || backgroundImage === 'none' || !backgroundImage.includes('linear-gradient')) {
            return { color1: fallbackColor1, color2: fallbackColor2, angle: 180 };
        }
        const angleMatch = backgroundImage.match(/linear-gradient\(([-\d.]+)deg/i);
        const angle = angleMatch ? Math.max(0, Math.min(360, Math.round(parseFloat(angleMatch[1])))) : 180;
        const colors = backgroundImage.match(/#[0-9a-fA-F]{6}|rgba?\([^\)]+\)/g) || [];
        const color1 = colors[0] ? this.rgbToHex(colors[0]) : fallbackColor1;
        const color2 = colors[1] ? this.rgbToHex(colors[1]) : fallbackColor2;
        return { color1, color2, angle };
    }

    showStandby() {
        this.container.classList.remove('hidden');
        this.contentArea.innerHTML = `
            <div class="p-12 text-center">
                <div class="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4 opacity-40"></div>
                <h4 class="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2">Lattice Standby</h4>
                <p class="text-[10px] text-zinc-600 leading-relaxed">Move the lens over any element<br>to begin synchronization.</p>
            </div>
        `;
    }

    show() {
        if (!this.container) return; // Defensive check
        const wasHidden = this.container.classList.contains('hidden');
        this.container.classList.remove('hidden');
        if (wasHidden) {
            this.container.classList.remove('palette-morph-in');
            void this.container.offsetWidth;
            this.container.classList.add('palette-morph-in');
        }
    }
    hide() {
        if (!this.container) return; // Defensive check
        this.container.classList.add('hidden');
    }

    showEditControls(visible) {
        const controls = document.getElementById('edit-controls');
        if (controls) {
            controls.classList.toggle('hidden', !visible);
        }
    }

    setDirty(isDirty) {
        this.isDirty = !!isDirty;
        const indicator = document.getElementById('dirty-indicator');
        if (indicator) {
            indicator.classList.toggle('hidden', !isDirty);
        }
    }

    focusEditor(role) {
        setTimeout(() => {
            if (role === 'text') {
            } else {
                const colorInput = document.getElementById('input-color');
                if (colorInput) colorInput.focus();
            }
        }, 100);
    }

    syncCaretFromPagePoint(clientX, clientY) {
        const el = this.currentElement;
        if (!el) return false;

        const index = this._getTextOffsetFromPoint(el, clientX, clientY);
        if (typeof index !== 'number') return false;

        const plainContentInput = document.getElementById('input-content');
        if (plainContentInput) {
            try {
                try {
                    plainContentInput.focus({ preventScroll: true });
                } catch (err) {
                    plainContentInput.focus();
                }
                plainContentInput.setSelectionRange(index, index);
                this._renderLiveCaret(index);
                return true;
            } catch (e) {
                return false;
            }
        }

        return false;
    }

    _getTextOffsetFromPoint(el, clientX, clientY) {
        if (!el) return null;

        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                return node.nodeValue && node.nodeValue.length
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_REJECT;
            }
        });

        let total = 0;
        let bestIndex = null;
        let bestScore = Number.POSITIVE_INFINITY;
        let node;

        const scoreRect = (rect) => {
            const x = rect.left;
            const top = rect.top;
            const bottom = rect.bottom || rect.top;
            const y = clientY < top ? top : (clientY > bottom ? bottom : clientY);
            const dx = x - clientX;
            const dy = y - clientY;
            return (dx * dx) + (dy * dy);
        };

        while ((node = walker.nextNode())) {
            const len = node.nodeValue.length;
            for (let offset = 0; offset <= len; offset++) {
                const range = document.createRange();
                range.setStart(node, offset);
                range.collapse(true);

                let rect = range.getBoundingClientRect();
                if ((!rect || (!rect.width && !rect.height)) && offset > 0) {
                    const probe = document.createRange();
                    probe.setStart(node, offset - 1);
                    probe.setEnd(node, offset);
                    const probeRect = probe.getBoundingClientRect();
                    if (probeRect) {
                        rect = {
                            left: probeRect.right,
                            top: probeRect.top,
                            bottom: probeRect.bottom,
                            width: 0,
                            height: probeRect.height
                        };
                    }
                }

                if (!rect || (rect.left === 0 && rect.top === 0 && !rect.width && !rect.height)) {
                    continue;
                }

                const score = scoreRect(rect);
                if (score < bestScore) {
                    bestScore = score;
                    bestIndex = total + offset;
                }
            }
            total += len;
        }

        if (typeof bestIndex === 'number') {
            return bestIndex;
        }

        return total;
    }

    // Mirrors the textarea caret onto the live page element by inserting a
    // zero-text-content <span class="ax-live-caret"> at the matching text
    // offset. Zero content deliberately, so it can never trip the
    // textContent-resync mismatch check in update(). Restores behavior
    // documented in potch.md as originally wired to Quill-only events; the
    // event wiring was already migrated to plain-textarea mode, but this
    // method itself was never carried over, leaving every call site
    // (input/paste/click/keyup/select, plus syncCaretFromPagePoint) calling
    // an undefined method.
    _renderLiveCaret(index) {
        const el = this.currentElement;
        if (!el || typeof index !== 'number') return;

        // Clear any previous marker on this element before inserting the new
        // one so carets never accumulate as the user types or moves around.
        el.querySelectorAll('.ax-live-caret').forEach(node => node.remove());

        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                return node.nodeValue && node.nodeValue.length
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_REJECT;
            }
        });

        let total = 0;
        let target = null;
        let targetOffset = 0;
        let node;
        let lastNode = null;

        while ((node = walker.nextNode())) {
            lastNode = node;
            const len = node.nodeValue.length;
            if (index <= total + len) {
                target = node;
                targetOffset = index - total;
                break;
            }
            total += len;
        }

        // Index past the last text node (caret at the very end of the
        // content) lands on the end of the last text node instead of
        // silently doing nothing.
        if (!target && lastNode) {
            target = lastNode;
            targetOffset = lastNode.nodeValue.length;
        }

        if (!target) return;

        try {
            const marker = document.createElement('span');
            marker.className = 'ax-live-caret';
            const after = target.splitText(targetOffset);
            target.parentNode.insertBefore(marker, after);
        } catch (err) {
            // A caret marker is a visual nice-to-have; it should never break
            // editing if the DOM shifted under us mid-keystroke.
        }
    }
}

export { ToolPalette };
export default ToolPalette;














