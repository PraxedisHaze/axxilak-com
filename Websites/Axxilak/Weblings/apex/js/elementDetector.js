/**
 * ELEMENT DETECTOR
 * Authoritative detector for the Apex inspector.
 * Produces a stable payload for the palette and maintains data-ax-id lattice.
 */
export class ElementDetector {
  constructor(options = {}) {
    this.ignoredSelectors = options.ignoredSelectors || [];
    this.onDetect = options.onDetect || (() => {});
    this.throttleMs = Number.isFinite(options.throttle) ? options.throttle : 0;
    this.lastDetectAt = 0;
    this.axIdCounter = 0;
    this.debugBadge = null;
  }

  initLattice() {
    const editable = document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,div,button,a,img,section,header,footer,main,article');
    editable.forEach(el => {
      if (this._isInternal(el)) return;
      if (!el.dataset.axId) {
        this.axIdCounter += 1;
        el.dataset.axId = `ax-${this.axIdCounter}`;
      }
    });
  }

  getUniqueSelector(el) {
    if (!el) return null;
    if (el.dataset && el.dataset.axId) {
      return `[data-ax-id="${el.dataset.axId}"]`;
    }
    if (el.id) return `#${el.id}`;

    let selector = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.split(' ').filter(Boolean).join('.');
      if (classes) selector += `.${classes}`;
    }

    if (el.parentElement) {
      const siblings = Array.from(el.parentElement.children).filter(child => child.tagName === el.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(el) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    return selector;
  }

  detect(x, y) {
    const now = Date.now();
    if (this.throttleMs && now - this.lastDetectAt < this.throttleMs) return null;
    this.lastDetectAt = now;

    const elements = document.elementsFromPoint
      ? document.elementsFromPoint(x, y)
      : [document.elementFromPoint(x, y)].filter(Boolean);

    if (!elements || elements.length === 0) {
      console.log('[APEX][detect] no element');
      this._setBadge('no element');
      return null;
    }

    let element = null;
    for (const el of elements) {
      if (!el) continue;
      if (this._isInternal(el)) continue;
      if (!this._isEditable(el)) continue;
      element = el;
      break;
    }

    if (!element) {
      const hasNonInternal = elements.some(el => el && !this._isInternal(el));
      if (!hasNonInternal) {
        console.log('[APEX][detect] internal stack');
        this._setBadge('internal stack');
      } else {
        console.log('[APEX][detect] non-editable stack');
        this._setBadge('non-editable stack');
      }
      return null;
    }

    element = this.resolveTextSibling(element);

    if (!element.dataset.axId) {
      this.axIdCounter += 1;
      element.dataset.axId = `ax-${this.axIdCounter}`;
    }

    const data = this._extractElementData(element);
    if (data) this.onDetect(data);
    this._setBadge(`hit ${element.tagName}`);
    return data;
  }

  _setBadge(text) {
    if (!this.debug) return; // Only show if debug is explicitly enabled
    if (!this.debugBadge) {
      const badge = document.createElement('div');
      badge.style.cssText = 'position:fixed; bottom:10px; left:10px; z-index:30000; background:#111; color:#0f0; font-family:JetBrains Mono, monospace; font-size:11px; padding:6px 8px; border:1px solid #0f0; border-radius:4px; opacity:0.9; pointer-events:none;';
      document.body.appendChild(badge);
      this.debugBadge = badge;
    }
    this.debugBadge.textContent = `[APEX DETECT] ${text}`;
  }

  _isInternal(el) {
    let current = el;
    while (current && current !== document.body) {
      const isInternal = this.ignoredSelectors.some(selector => {
        try {
          return current.matches(selector);
        } catch (e) {
          // Fallback for non-standard selectors or old browsers
          if (selector.startsWith('.')) return current.classList.contains(selector.slice(1));
          if (selector.startsWith('#')) return current.id === selector.slice(1);
          if (selector.startsWith('[')) {
            const attr = selector.replace(/[\[\]]/g, '');
            return current.hasAttribute(attr);
          }
          return current.tagName.toLowerCase() === selector.toLowerCase();
        }
      });
      if (isInternal) return true;
      current = current.parentElement;
    }
    return false;
  }

  _isEditable(el) {
    const tagName = el.tagName.toLowerCase();

    // 1. MEDIA ROLE
    if (tagName === 'img') return true;

    // 2. TEXT ROLE (Leaf elements - check before structure to prioritize buttons/links)
    if (['h1','h2','h3','h4','h5','h6','p','span','button','a'].includes(tagName)) {
      // If it has children, check if it's a 'leaf container' (e.g., a link containing a single span)
      const childElements = Array.from(el.childNodes).filter(n => n.nodeType === 1);
      if (childElements.length > 0) {
        // If it has only one or two small children, we allow it as a text-leaf for branding/links
        if (childElements.length <= 2) return true;
        // Otherwise, it's structural
        return true;
      }
      return (el.innerText || '').trim().length > 0;
    }

    // 3. STRUCTURE ROLE (Fallbacks for move/clone - only after text elements)
    if (['section', 'header', 'footer', 'main', 'article', 'div'].includes(tagName)) {
      // Only treat as structural if it has child elements (is a container)
      // BUT: Don't treat as structural if it only contains form controls (buttons, inputs, etc)
      // NOTE: 'nav' excluded because it's always structural UI, never editable content
      const children = Array.from(el.childNodes).filter(n => n.nodeType === 1);
      if (children.length === 0) return (el.innerText || '').trim().length > 0;

      // Check if all children are form controls (buttons, inputs, etc) - skip those containers
      const allFormControls = children.every(child => {
        const childTag = child.tagName.toLowerCase();
        return ['button', 'input', 'select', 'textarea'].includes(childTag);
      });

      if (allFormControls) return false; // Skip containers that only hold form controls

      return true; // Container with mixed/content children is editable
    }

    return false;
  }

  _extractElementData(el) {
    const styles = window.getComputedStyle(el);
    const selector = this.getUniqueSelector(el);
    if (!selector) return null;

    const tagName = el.tagName.toLowerCase();
    const textTags = ['h1','h2','h3','h4','h5','h6','p','span','button','a','label','td','th','blockquote','li','figcaption'];

    // CATEGORIZATION: text tags stay 'text' even with child elements
    let role = 'text';
    if (tagName === 'img') role = 'media';
    else if (textTags.includes(tagName)) role = 'text';
    else if (['section', 'header', 'footer', 'main', 'article', 'div', 'nav'].includes(tagName)) {
        const directText = this._getTextNodes(el);
        if (directText) {
            role = 'text';
        } else {
            // Small wrapper with only text-bearing children (e.g., overlay div wrapping a span)
            const children = Array.from(el.children);
            const textChildTags = ['SPAN', 'P', 'A', 'STRONG', 'EM', 'B', 'I', 'SMALL', 'LABEL'];
            if (children.length > 0 && children.length <= 3 && children.every(c => textChildTags.includes(c.tagName))) {
                role = 'text';
            } else {
                role = 'structure';
            }
        }
    }

    const hasChildElements = Array.from(el.childNodes).some(n => n.nodeType === 1);

    return {
      element: el,
      selector,
      role,
      isStructural: role === 'structure',
      hasChildElements,
      // Direct text nodes only — preserves child elements on write-back
      textContent: role === 'text' ? this._getTextNodes(el) : '',
      styles: {
        color: styles.color,
        zIndex: styles.zIndex,
        fontFamily: styles.fontFamily || '',
        backgroundColor: styles.backgroundColor
      }
    };
  }

  // When an image is detected, prefer a text-bearing sibling (overlay) in the same parent.
  // Returns the sibling if found, otherwise the original element.
  resolveTextSibling(el) {
    if (!el || el.tagName !== 'IMG' || !el.parentElement) return el;
    const textChildTags = ['SPAN', 'P', 'A', 'STRONG', 'EM', 'B', 'I', 'SMALL', 'LABEL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
    for (const sibling of el.parentElement.children) {
      if (sibling === el) continue;
      if (this._isInternal(sibling)) continue;
      const hasText = (sibling.innerText || '').trim().length > 0;
      const isTextContainer = textChildTags.includes(sibling.tagName) ||
        (sibling.children.length > 0 && sibling.children.length <= 3 &&
         Array.from(sibling.children).some(c => textChildTags.includes(c.tagName) && (c.innerText || '').trim()));
      if (hasText && isTextContainer) return sibling;
    }
    return el;
  }

  // Read DIRECT text nodes first, then check immediate text-bearing children as fallback
  _getTextNodes(el) {
    let text = '';
    for (const node of el.childNodes) {
      if (node.nodeType === 3) { // TEXT_NODE
        text += node.textContent;
      }
    }
    if (text.trim()) return text.trim();

    // Fallback: check immediate text-bearing children (e.g., div wrapping a span)
    const textChildTags = ['SPAN', 'P', 'A', 'STRONG', 'EM', 'B', 'I'];
    for (const child of el.children) {
      if (textChildTags.includes(child.tagName) && (child.innerText || '').trim()) {
        return child.innerText.trim();
      }
    }
    return '';
  }

  // Write to DIRECT text nodes, or to immediate text-bearing children as fallback
  _setTextNodes(el, newText) {
    const textNodes = [];
    for (const node of el.childNodes) {
      if (node.nodeType === 3) textNodes.push(node);
    }

    // Only use direct text nodes if at least one has real content (not just whitespace)
    const contentNode = textNodes.find(n => n.textContent.trim());
    if (contentNode) {
      contentNode.textContent = newText;
      for (const node of textNodes) {
        if (node !== contentNode) node.textContent = '';
      }
    } else {
      // No direct text nodes — check for text-bearing child elements
      const textChildTags = ['SPAN', 'P', 'A', 'STRONG', 'EM', 'B', 'I'];
      const textChild = Array.from(el.children).find(c => textChildTags.includes(c.tagName) && (c.innerText || '').trim());
      if (textChild) {
        textChild.innerText = newText;
      } else if (el.childNodes.length === 0) {
        // No children at all — safe to set directly
        el.textContent = newText;
      } else {
        // Has child elements but no text nodes — prepend a text node
        el.insertBefore(document.createTextNode(newText + ' '), el.firstChild);
      }
    }
  }
}

export default ElementDetector;
