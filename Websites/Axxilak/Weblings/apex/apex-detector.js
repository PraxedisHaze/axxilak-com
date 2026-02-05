export class ElementDetector {
    constructor(options = {}) {
        this.throttleTime = options.throttle || 100; // Faster for cursor response
        this.ignoreClasses = options.ignoreClasses || ['lens-container', 'tool-palette', 'resize-handle', 'coherence-ui-glass'];
        this.lastEmit = 0;
        this.onDetect = null; 
    }

    detect(x, y) {
        const now = Date.now();
        if (now - this.lastEmit < this.throttleTime) return;

        try {
            this._toggleUI('none');
            const element = document.elementFromPoint(x, y);
            this._toggleUI(''); 

            if (element && element !== document.body && element !== document.documentElement) {
                // Check if it's "The Void" or Grid
                if (element.id === 'global-grid' || element.id === 'boot-overlay') {
                    this._signal(false);
                    return;
                }

                const selector = this._generateSelector(element);
                const computedStyle = window.getComputedStyle(element);
                this.lastEmit = now;
                
                // Determine if changeable
                const isText = element.innerText && element.innerText.trim().length > 0;
                const isImg = element.tagName === 'IMG';
                const isChangeable = isText || isImg;

                if (this.onDetect) {
                    this.onDetect({
                        element: element,
                        selector: selector,
                        isChangeable: isChangeable,
                        styles: {
                            color: computedStyle.color,
                            backgroundColor: computedStyle.backgroundColor,
                            fontSize: computedStyle.fontSize,
                            fontFamily: computedStyle.fontFamily,
                            padding: computedStyle.padding,
                            margin: computedStyle.margin
                        }
                    });
                }
            } else {
                this._signal(false);
            }
        } catch (err) {
            this._toggleUI('');
        }
    }

    _signal(state) {
        if (this.onDetect) this.onDetect({ isChangeable: state });
    }

    _toggleUI(displayState) {
        this.ignoreClasses.forEach(cls => {
            const els = document.querySelectorAll(`.${cls}`);
            els.forEach(el => { if (el) el.style.display = displayState; });
        });
    }

    _generateSelector(el) {
        if (!el || !el.tagName) return '';
        if (el.id) return `#${el.id}`;
        const tagName = el.tagName.toLowerCase();
        
        try {
            if (el.className && typeof el.className === 'string') {
                const classes = el.className.split(/\s+/).filter(c => c.trim().length > 0 && !this.ignoreClasses.includes(c));
                if (classes.length > 0) {
                    const classSelector = '.' + classes.join('.');
                    if (document.querySelectorAll(classSelector).length === 1) return classSelector;
                }
            }
        } catch(e) {}

        let index = 1;
        let sibling = el;
        while ((sibling = sibling.previousElementSibling)) {
            if (sibling.tagName === el.tagName) index++;
        }
        return `${tagName}:nth-of-type(${index})`;
    }
}
