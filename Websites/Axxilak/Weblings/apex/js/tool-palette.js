export class ToolPalette {
    constructor() {
        this.currentElement = null;
        this.quillEditor = null;

        // Create palette container
        this.palette = document.createElement('div');
        this.palette.className = 'tool-palette';
        this.palette.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            width: 320px;
            background: rgba(0, 0, 0, 0.95);
            border: 2px solid #00ff00;
            color: #00ff00;
            font-family: 'JetBrains Mono', monospace;
            padding: 12px;
            z-index: 19998;
            display: none;
            max-height: 80vh;
            overflow-y: auto;
            border-radius: 4px;
        `;

        this.palette.innerHTML = `
            <div style="margin-bottom: 12px;">
                <h3 style="margin: 0 0 8px 0; border-bottom: 1px solid #333; color: #00ff00; font-size: 12px;">INSPECTOR PALETTE</h3>
                <div id="inspector-content"></div>
            </div>
        `;

        document.body.appendChild(this.palette);
        this.contentArea = this.palette.querySelector('#inspector-content');
    }

    update(data) {
        const { element, selector, styles, textContent } = data;
        this.currentElement = element;

        let html = `
            <div style="margin-bottom: 10px; padding: 8px; background: #1a1a1a; border-left: 2px solid #00ff00;">
                <label style="color: #888; font-size: 10px; display: block; margin-bottom: 4px;">SELECTOR</label>
                <div style="font-weight: bold; word-break: break-all; font-size: 11px;">${selector}</div>
            </div>
        `;

        // TEXT EDITOR (for text elements)
        if (textContent && textContent.length > 0) {
            html += `
                <div style="margin-bottom: 10px;">
                    <label style="color: #888; font-size: 10px; display: block; margin-bottom: 4px;">TEXT</label>
                    <div id="quill-editor-container" style="background: white; border: 1px solid #ddd; border-radius: 3px; min-height: 100px; margin-bottom: 8px;"></div>
                    <button id="apply-text" style="width: 100%; padding: 6px; background: #00ff00; color: #000; border: none; font-weight: bold; cursor: pointer; font-family: 'JetBrains Mono'; border-radius: 3px;">APPLY TEXT</button>
                </div>
            `;
        }

        // COLOR PICKER
        html += `
            <div style="margin-bottom: 10px;">
                <label style="color: #888; font-size: 10px; display: block; margin-bottom: 4px;">COLOR</label>
                <div style="display: flex; gap: 6px;">
                    <input type="color" id="color-picker" value="${styles.color || '#000000'}" style="width: 40px; height: 32px; cursor: pointer; border: 1px solid #444;">
                    <input type="text" id="color-text" value="${styles.color || '#000000'}" style="flex: 1; padding: 4px; background: #222; border: 1px solid #444; color: #00ff00; font-family: monospace; font-size: 11px;">
                </div>
            </div>
        `;

        // FONT FAMILY
        html += `
            <div style="margin-bottom: 10px;">
                <label style="color: #888; font-size: 10px; display: block; margin-bottom: 4px;">FONT FAMILY</label>
                <select id="font-family" style="width: 100%; padding: 6px; background: #222; color: #00ff00; border: 1px solid #444; font-family: monospace; font-size: 11px;">
                    <option value="Inter" ${styles.fontFamily?.includes('Inter') ? 'selected' : ''}>Inter</option>
                    <option value="serif" ${styles.fontFamily?.includes('serif') ? 'selected' : ''}>Serif</option>
                    <option value="monospace" ${styles.fontFamily?.includes('monospace') ? 'selected' : ''}>Monospace</option>
                    <option value="Arial" ${styles.fontFamily?.includes('Arial') ? 'selected' : ''}>Arial</option>
                    <option value="Georgia" ${styles.fontFamily?.includes('Georgia') ? 'selected' : ''}>Georgia</option>
                </select>
            </div>
        `;

        // FONT SIZE
        html += `
            <div style="margin-bottom: 10px;">
                <label style="color: #888; font-size: 10px; display: block; margin-bottom: 4px;">FONT SIZE</label>
                <input type="text" id="font-size" value="${styles.fontSize || '16px'}" style="width: 100%; padding: 6px; background: #222; border: 1px solid #444; color: #00ff00; font-family: monospace; font-size: 11px;">
            </div>
        `;

        // ACTION BUTTONS
        html += `
            <div style="display: flex; gap: 6px;">
                <button id="apply-all" style="flex: 1; padding: 8px; background: #00ff00; color: #000; border: none; font-weight: bold; cursor: pointer; font-family: 'JetBrains Mono'; border-radius: 3px;">APPLY</button>
                <button id="reset-element" style="flex: 1; padding: 8px; background: #666; color: #fff; border: none; font-weight: bold; cursor: pointer; font-family: 'JetBrains Mono'; border-radius: 3px;">RESET</button>
            </div>
        `;

        this.contentArea.innerHTML = html;

        // Initialize Quill editor if text content exists
        if (textContent && textContent.length > 0) {
            setTimeout(() => this._initQuillEditor(textContent), 100);
        }

        // Attach event listeners
        this._attachListeners();
    }

    _initQuillEditor(initialText) {
        const container = document.getElementById('quill-editor-container');
        if (!container) return;

        // Destroy previous editor if exists
        if (this.quillEditor) {
            this.quillEditor = null;
        }

        // Create new Quill editor
        this.quillEditor = new Quill(container, {
            theme: 'snow',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    ['link', 'code']
                ]
            }
        });

        // Set initial content
        this.quillEditor.setContents([{ insert: initialText }]);
    }

    _attachListeners() {
        // Color picker
        const colorPicker = document.getElementById('color-picker');
        const colorText = document.getElementById('color-text');

        if (colorPicker) {
            colorPicker.addEventListener('change', (e) => {
                colorText.value = e.target.value;
            });
        }

        if (colorText) {
            colorText.addEventListener('change', (e) => {
                colorPicker.value = e.target.value;
            });
        }

        // Apply text button
        const applyTextBtn = document.getElementById('apply-text');
        if (applyTextBtn && this.quillEditor) {
            applyTextBtn.addEventListener('click', () => {
                const text = this.quillEditor.getText().trim();
                this._emitEdit('text', text);
            });
        }

        // Apply all button
        const applyAllBtn = document.getElementById('apply-all');
        if (applyAllBtn) {
            applyAllBtn.addEventListener('click', () => {
                const changes = {
                    color: document.getElementById('color-picker')?.value,
                    fontFamily: document.getElementById('font-family')?.value,
                    fontSize: document.getElementById('font-size')?.value
                };

                this._emitEdit('properties', changes);
            });
        }

        // Reset button
        const resetBtn = document.getElementById('reset-element');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this._emitEdit('reset', null);
            });
        }
    }

    _emitEdit(type, value) {
        const event = new CustomEvent('palette-edit', {
            detail: {
                element: this.currentElement,
                type: type,
                value: value,
                timestamp: Date.now()
            }
        });
        document.dispatchEvent(event);
    }

    show() {
        this.palette.style.display = 'block';
    }

    hide() {
        this.palette.style.display = 'none';
    }
}
