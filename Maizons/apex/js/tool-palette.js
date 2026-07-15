class ToolPalette {
    constructor() {
        this.container = document.getElementById('palette-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'palette-container';
            this.container.setAttribute('data-anothen-internal', '');
            this.container.className = 'fixed bottom-6 right-6 w-96 bg-zinc-900 border-2 border-[var(--accent)] rounded-sm shadow-2xl z-[20000] hidden max-h-[600px] overflow-y-auto text-white p-6';
            
            this.contentArea = document.createElement('div');
            this.contentArea.id = 'palette-content';
            
            const closeBtn = document.createElement('button');
            closeBtn.className = 'absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors';
            closeBtn.innerHTML = '✕';
            closeBtn.onclick = () => window.toggleEditMode();
            
            this.container.appendChild(closeBtn);
            this.container.appendChild(this.contentArea);
            document.body.appendChild(this.container);
        } else {
            this.contentArea = document.getElementById('palette-content');
        }
        this.onEdit = null; 
        this.quill = null;
        this.currentElement = null;
        this.depthMapActive = false;
        this.view3DActive = false;
        this.labelsActive = false;
        this.debug = false;
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
            // SYNC ONLY: If it's the same element, just update the text content in Quill
            if (this.quill && textContent !== this.quill.getText().trim()) {
                this.quill.root.innerText = textContent || '';
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
        const fontSizeValue = parseInt(styles.fontSize, 10) || 16;
        const fontSizeMax = Math.max(200, fontSizeValue);

        this.contentArea.innerHTML = `
            <div class="tool-palette">
                <!-- STICKY HEADER -->
                <div class="palette-header palette-drag-handle">
                    <div class="palette-header-left">
                        <div class="palette-selected-label">Selected</div>
                        <div class="palette-selected-meta">${tagName} <span class="palette-selected-role">[${role.toUpperCase()}]</span></div>
                        <div class="palette-selected-id">ID: ${element.dataset.axId}</div>
                    </div>
                    <button id="btn-close-palette" aria-label="Close editor" class="text-[14px] font-bold text-zinc-500 hover:text-[var(--accent)] transition-colors">×</button>
                </div>

                <!-- PRIMARY CONTROLS (NEVER SCROLL) -->
                <div class="palette-primary">
                    <!-- Content Editor -->
                    <div class="palette-control">
                        <label class="palette-label">Content ${isStructural ? '(Container)' : (isMedia ? '(Media)' : '')}</label>
                        <div id="quill-editor" class="bg-zinc-900 text-white" style="min-height: 120px;"></div>
                    </div>

                    <!-- Text Color Control -->

                <div class="palette-control mt-4 ${!isLink ? 'hidden' : ''}">
                    <label class="palette-label">Link URL</label>
                    <input type="text" id="input-link-url" class="palette-input text-[10px]" value="${linkHref || ''}" placeholder="https://your-social-link">
                    <div class="text-[8px] text-zinc-500 mt-1">Leave empty to keep placeholder '#'</div>
                </div>

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
                                <div class="flex gap-2 mt-3">
                                    <input type="number" id="input-font-size" min="8" max="${fontSizeMax}" step="1" class="palette-input w-20 text-center" value="${fontSizeValue}" aria-label="Font size input">
                                    <div class="font-preset-buttons flex-1">
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
                                <label class="palette-label">Text Gradient</label>
                                <div class="flex items-center gap-2 mb-2">
                                    <input type="color" id="input-text-grad-color1" class="palette-input--color" value="${this.rgbToHex(styles.color)}" aria-label="Gradient start color">
                                    <span class="text-[9px] text-zinc-500">→</span>
                                    <input type="color" id="input-text-grad-color2" class="palette-input--color" value="#8b5cf6" aria-label="Gradient end color">
                                    <button id="btn-text-grad-clear" class="text-[8px] text-zinc-500 hover:text-amber-400 transition-colors ml-auto" title="Clear text gradient">✕ clear</button>
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
                                    <input type="color" id="input-glow-color" class="palette-input--color" value="${this.rgbToHex(styles.color)}" aria-label="Container glow color">
                                    <input type="range" id="input-glow-blur" min="0" max="50" step="1" value="0" class="flex-1 accent-[var(--accent)]" aria-label="Container glow blur">
                                    <span id="glow-blur-value" class="text-[9px] font-mono text-zinc-400 min-w-[30px]">0px</span>
                                </div>
                            </div>

                            <!-- Container Gradient -->
                            <div class="palette-control mt-4">
                                <label class="palette-label">Container Gradient</label>
                                <div class="flex items-center gap-2 mb-2">
                                    <input type="color" id="input-grad-color1" class="palette-input--color" value="${this.rgbToHex(styles.backgroundColor)}" aria-label="Container gradient start">
                                    <span class="text-[9px] text-zinc-500">→</span>
                                    <input type="color" id="input-grad-color2" class="palette-input--color" value="${this.rgbToHex(styles.color)}" aria-label="Container gradient end">
                                </div>
                                <div class="flex items-center gap-3">
                                    <input type="range" id="input-grad-angle" min="0" max="360" step="1" value="180" class="flex-1 accent-[var(--accent)]" aria-label="Container gradient angle">
                                    <span id="grad-angle-value" class="text-[9px] font-mono text-zinc-400 min-w-[30px]">180°</span>
                                </div>
                            </div>

                            <!-- Text Mask -->
                            <div class="palette-control mt-4 ${isMedia ? 'opacity-30 pointer-events-none' : ''}">
                                <label class="palette-label">Text Mask</label>
                                <input type="text" id="input-mask-url" class="palette-input text-[10px] mb-2" placeholder="Image URL..." aria-label="Mask image URL">
                                <div class="flex items-center gap-2 mb-2">
                                    <span class="text-[9px] text-zinc-500 whitespace-nowrap">Mask:</span>
                                    <input type="color" id="input-mask-color" class="palette-input--color" value="#0a0a0a" aria-label="Mask color">
                                </div>
                                <div class="flex items-center gap-3">
                                    <input type="range" id="input-mask-fade" min="0" max="100" step="1" value="0" class="flex-1 accent-[var(--accent)]" aria-label="Mask fade">
                                    <span id="mask-fade-value" class="text-[9px] font-mono text-zinc-400 min-w-[30px]">0%</span>
                                </div>
                            </div>
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
                                <input type="text" id="input-media-url" class="palette-input text-[10px] mb-2" placeholder="Paste image or video URL..." aria-label="Media URL">
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
                                <label class="palette-label text-[9px] mb-3">Structure & Hierarchy</label>
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

                        <!-- Peek Button (Glasses) -->
                        <button id="btn-peek" class="px-3 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded hover:bg-zinc-700 transition" aria-label="Toggle preview" title="Toggle preview glasses">
                            GLASSES
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

                    <div class="palette-control mb-4 border-b border-zinc-800 pb-3">
                        <button id="toggle-3d" class="w-full py-1.5 ${this.view3DActive ? 'bg-green-600' : 'bg-zinc-800'} text-white text-[9px] font-bold rounded-sm transition-all uppercase border border-white/5 hover:border-white/20">
                            TOGGLE 3D VIEW
                        </button>
                    </div>

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

        this.initQuill(textContent);
        this.matchElementStyles(element, styles);
        this.attachListeners();
    }

    initQuill(content) {
        if (this.debug && typeof Quill === 'undefined') {
            console.warn('[APEX][palette] Quill is undefined - editor cannot initialize.');
        }
        this.quill = new Quill('#quill-editor', {
            theme: 'snow',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    ['clean']
                ]
            }
        });

        // Prevent Quill from triggering an 'onEdit' during initialization
        this.quill.root.innerText = content || '';

        this.quill.on('text-change', (delta, oldDelta, source) => {
            if (source === 'user') {
                // Strip Quill's <p> wrapper — block elements inside inline elements = invalid HTML
                let html = this.quill.root.innerHTML;
                // Unwrap single <p>...</p> to just the inner content
                html = html.replace(/^<p>(.*)<\/p>$/s, '$1');
                // Convert remaining <p> breaks to <br> for multi-line
                html = html.replace(/<\/p><p>/g, '<br>');
                html = html.replace(/^<p>|<\/p>$/g, '');
                if (this.onEdit) this.onEdit('innerHTML', html);
            }
        });
    }

    matchElementStyles(element, styles) {
        if (!this.quill || !element) return;

        // Apply element's text color to Quill
        if (styles.color) {
            this.quill.root.style.color = styles.color;
        }

        // Apply element's background color to Quill
        if (styles.backgroundColor && styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
            this.quill.root.style.backgroundColor = styles.backgroundColor;
        }

        // Apply font size
        if (styles.fontSize) {
            this.quill.root.style.fontSize = styles.fontSize;
        }

        // Apply font family
        if (styles.fontFamily) {
            this.quill.root.style.fontFamily = styles.fontFamily;
        }

        // Apply font weight
        if (styles.fontWeight) {
            this.quill.root.style.fontWeight = styles.fontWeight;
        }

        // Apply line height
        if (styles.lineHeight) {
            this.quill.root.style.lineHeight = styles.lineHeight;
        }
    }

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
        const saveBtn = document.getElementById('btn-save') || document.getElementById('btn-save-changes');
        const cancelBtn = document.getElementById('btn-cancel') || document.getElementById('btn-cancel-changes');
        const closeBtn = document.getElementById('btn-close-palette');
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
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                if (this.onSave) this.onSave();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                if (this.onCancel) this.onCancel();
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (this.onCancel) this.onCancel();
            });
        }

        // ADVANCED PANEL TOGGLE
        if (advancedToggle && advancedPanel) {
            advancedToggle.addEventListener('click', () => {
                const isHidden = advancedPanel.classList.toggle('hidden');
                advancedToggle.textContent = isHidden ? 'Advanced +' : 'Advanced -';
            });
        }

        // RESET DROPDOWN TOGGLE
        if (resetToggle && resetDropdown) {
            resetToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                resetDropdown.classList.toggle('hidden');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                resetDropdown.classList.add('hidden');
            });
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

        if (moveUpBtn && !moveUpBtn.disabled) {
            moveUpBtn.onclick = () => { if (this.onEdit) this.onEdit('moveUp', this.currentElement); };
        }

        if (moveDownBtn && !moveDownBtn.disabled) {
            moveDownBtn.onclick = () => { if (this.onEdit) this.onEdit('moveDown', this.currentElement); };
        }

        if (colorInput) {
            colorInput.oninput = (e) => {
                if (hexInput) hexInput.value = e.target.value;
                if (this.onEdit) this.onEdit('color', e.target.value);
                if (this.quill) this.quill.root.style.color = e.target.value;
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
                if (this.quill) this.quill.root.style.color = hex;
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
            if (this.quill) this.quill.root.style.fontSize = sizeValue;
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
                        } catch (err) { /* storage access error — proceed anyway */ }

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
                if (this.onEdit) this.onEdit('boxShadow', 'none');
                return;
            }
            const layers = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
            const shadow = layers.map(m => `0 0 ${Math.round(blur * m)}px ${color}`).join(', ');
            if (this.onEdit) this.onEdit('boxShadow', shadow);
        };
        if (glowColor) glowColor.oninput = updateGlow;
        if (glowBlur) glowBlur.oninput = updateGlow;

        // TEXT GLOW controls (always uses current text color — no separate color picker)
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
            // Gray out Text Color — gradient overrides it
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
            if (this.onEdit) this.onEdit('backgroundImage', `linear-gradient(${angle}deg, ${c1}, ${c2})`);
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
        const indicator = document.getElementById('dirty-indicator');
        if (indicator) {
            indicator.classList.toggle('hidden', !isDirty);
        }
    }

    focusEditor(role) {
        setTimeout(() => {
            if (role === 'text') {
                const quillEditor = document.querySelector('.ql-editor');
                if (quillEditor) quillEditor.focus();
            } else {
                const colorInput = document.getElementById('input-color');
                if (colorInput) colorInput.focus();
            }
        }, 100);
    }
}

export { ToolPalette };
export default ToolPalette;
