import { MagnifyingGlass } from './lens-ui.js';
import { ElementDetector } from '../elementDetector.js';
import { ToolPalette } from './tool-palette.js';

class MagnifyingGlassInspector {
    constructor() {
        this.isActive = false;
        this.edits = {}; // Track all edits for persistence
        console.log("Initializing Inspector...");

        this.lens = new MagnifyingGlass();
        this.detector = new ElementDetector({ throttle: 200 });
        this.palette = new ToolPalette();

        this.detector.onDetect = (data) => {
            // Add element reference for palette edits
            data.element = this._findElementBySelector(data.selector);
            this.palette.update(data);
        };

        this.lens.onMove = (centerCoords) => {
            if (this.isActive) this.detector.detect(centerCoords.x, centerCoords.y);
        };

        // Listen for palette edit events
        document.addEventListener('palette-edit', (e) => this._handlePaletteEdit(e));

        // Load saved edits
        this._loadEdits();
        this.disable();
    }

    _findElementBySelector(selector) {
        try {
            const elements = document.querySelectorAll(selector);
            return elements.length > 0 ? elements[0] : null;
        } catch {
            return null;
        }
    }

    _handlePaletteEdit(event) {
        const { element, type, value } = event.detail;

        if (!element) return;

        if (type === 'text') {
            // Update text content
            element.innerText = value;
            this._saveEdit(element, 'text', value);
        } else if (type === 'properties') {
            // Apply multiple style properties
            if (value.color && value.color !== '') {
                element.style.color = value.color;
                this._saveEdit(element, 'color', value.color);
            }
            if (value.fontFamily && value.fontFamily !== '') {
                element.style.fontFamily = value.fontFamily;
                this._saveEdit(element, 'fontFamily', value.fontFamily);
            }
            if (value.fontSize && value.fontSize !== '') {
                element.style.fontSize = value.fontSize;
                this._saveEdit(element, 'fontSize', value.fontSize);
            }
        } else if (type === 'reset') {
            // Reset element to original state
            this._resetElement(element);
        }
    }

    _saveEdit(element, property, value) {
        const selector = this._generateSelector(element);
        if (!this.edits[selector]) {
            this.edits[selector] = {};
        }
        this.edits[selector][property] = value;

        // Persist to localStorage
        localStorage.setItem('apex-edits-state', JSON.stringify(this.edits));
    }

    _resetElement(element) {
        const selector = this._generateSelector(element);

        // Remove inline styles
        element.style.cssText = '';

        // Remove text edit (reload from data attribute or original)
        if (element.dataset.originalText) {
            element.innerText = element.dataset.originalText;
        }

        // Remove from edits tracking
        delete this.edits[selector];
        localStorage.setItem('apex-edits-state', JSON.stringify(this.edits));
    }

    _generateSelector(el) {
        if (!el || !el.tagName) return '';
        if (el.id) return `#${el.id}`;

        const tagName = el.tagName.toLowerCase();

        if (el.className && typeof el.className === 'string') {
            const classes = el.className.split(/\s+/).filter(c => c.trim().length > 0);
            if (classes.length > 0) {
                const classSelector = '.' + classes.join('.');
                if (document.querySelectorAll(classSelector).length === 1) return classSelector;
                if (document.querySelectorAll(tagName + classSelector).length === 1) return tagName + classSelector;
            }
        }

        if (el.parentElement && el.parentElement.id) {
            return `#${el.parentElement.id} > ${tagName}:nth-child(${Array.from(el.parentElement.children).indexOf(el) + 1})`;
        }

        return `${tagName}:nth-of-type(${Array.from(el.parentElement?.children || []).filter(c => c.tagName === el.tagName).indexOf(el) + 1})`;
    }

    _loadEdits() {
        const saved = localStorage.getItem('apex-edits-state');
        if (saved) {
            try {
                this.edits = JSON.parse(saved);
                // Re-apply saved edits to DOM
                Object.entries(this.edits).forEach(([selector, properties]) => {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => {
                        Object.entries(properties).forEach(([prop, value]) => {
                            if (prop === 'text') {
                                el.innerText = value;
                            } else {
                                el.style[prop] = value;
                            }
                        });
                    });
                });
            } catch (e) {
                console.warn('Failed to load saved edits:', e);
            }
        }
    }

    enable() {
        this.isActive = true;
        this.lens.show();
        this.palette.show();
        // Initial detect at center
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        this.lens.lensContainer.style.left = (cx - 150) + 'px';
        this.lens.lensContainer.style.top = (cy - 150) + 'px';
        this.detector.detect(cx, cy);
        console.log("Inspector: ENABLED");
    }

    disable() {
        this.isActive = false;
        this.lens.hide();
        this.palette.hide();
        console.log("Inspector: DISABLED");
    }

    toggle() { this.isActive ? this.disable() : this.enable(); }
}

window.inspector = new MagnifyingGlassInspector();

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && (e.key === 'm' || e.key === 'M')) {
        window.inspector.toggle();
    }
});
