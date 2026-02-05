export class ElementDetector {
    constructor(options = {}) {
        this.throttleTime = options.throttle || 250;
        this.ignoreClasses = options.ignoreClasses || ['lens-container', 'tool-palette', 'resize-handle'];
        this.lastEmit = 0;
        this.onDetect = null;
        this.shiftHeld = false;

        // Track Shift key for editor visibility
        document.addEventListener('keydown', (e) => {
            if (e.shiftKey) this.shiftHeld = true;
        });
        document.addEventListener('keyup', () => {
            this.shiftHeld = false;
        });
    }

    detect(x, y) {
        const now = Date.now();
        if (now - this.lastEmit < this.throttleTime) return;

        // Ensure UI visibility matches shift state
        this._enforceUIVisibility();

        // BLINK: Hide UI to see through it (only if shift not held)
        if (!this.shiftHeld) {
            this._toggleUI('none');
        }
        const element = document.elementFromPoint(x, y);
        if (!this.shiftHeld) {
            this._toggleUI(''); // Restore UI
        }

        if (element && element !== document.body && element !== document.documentElement) {
            const selector = this._generateSelector(element);
            const computedStyle = window.getComputedStyle(element);
            this.lastEmit = now;

            if (this.onDetect) {
                this.onDetect({
                    element: element,
                    selector: selector,
                    styles: {
                        color: computedStyle.color,
                        backgroundColor: computedStyle.backgroundColor,
                        fontSize: computedStyle.fontSize,
                        fontFamily: computedStyle.fontFamily,
                        padding: computedStyle.padding,
                        margin: computedStyle.margin,
                        textContent: element.innerText.substring(0, 50)
                    }
                });
            }
        }
    }

    _enforceUIVisibility() {
        // Keep UI permanently hidden unless Shift is held
        const displayState = this.shiftHeld ? '' : 'none';
        this.ignoreClasses.forEach(cls => {
            const els = document.querySelectorAll(`.${cls}`);
            els.forEach(el => {
                el.style.display = displayState;
                el.style.pointerEvents = this.shiftHeld ? 'auto' : 'none';
            });
        });
    }

    _toggleUI(displayState) {
        // Temporary hide/show during detection (respects shift state)
        this.ignoreClasses.forEach(cls => {
            const els = document.querySelectorAll(`.${cls}`);
            els.forEach(el => {
                el.style.display = displayState;
            });
        });
    }

    // THE LIQUID SELECTOR LOGIC
    _generateSelector(el) {
        if (!el || !el.tagName) return '';
        if (el.id) return `#${el.id}`; // Gold Standard

        const tagName = el.tagName.toLowerCase();

        // Silver Standard: Unique Class
        if (el.className && typeof el.className === 'string') {
            const classes = el.className.split(/\s+/).filter(c => c.trim().length > 0 && !this.ignoreClasses.includes(c));
            if (classes.length > 0) {
                const classSelector = '.' + classes.join('.');
                if (document.querySelectorAll(classSelector).length === 1) return classSelector;
                if (document.querySelectorAll(tagName + classSelector).length === 1) return tagName + classSelector;
            }
        }

        // Bronze Standard: Parent ID
        if (el.parentElement && el.parentElement.id) {
            return `#${el.parentElement.id} > ${tagName}:nth-child(${this._getChildIndex(el) + 1})`;
        }

        // Iron Standard: Fallback
        return `${tagName}:nth-of-type(${this._getTypeIndex(el)})`;
    }

    _getChildIndex(el) { return Array.from(el.parentElement.children).indexOf(el); }
    _getTypeIndex(el) {
        let index = 1;
        let sibling = el;
        while ((sibling = sibling.previousElementSibling)) {
            if (sibling.tagName === el.tagName) index++;
        }
        return index;
    }
}
