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
    // FIX 1+6: Support persisted counter (continue incrementing, don't reset)
    this.axIdCounter = Number.isFinite(options.startingCounter) ? options.startingCounter : 0;
    this.debugBadge = null;
  }

  // options.reset: used once, on fresh page load, before saved edits replay.
  // data-ax-id is a runtime-only attribute (never shipped in the HTML), so on
  // every reload every element starts untagged. The normal (non-reset) path
  // below only tags untagged elements using an ever-growing, cross-session
  // counter - reactive per-click order, not DOM order - so the same physical
  // element gets a different ID every session and saved edits (keyed to the
  // old ID) never find their element again. A full deterministic pass, reset
  // to 0 and walking every eligible element in DOM order, gives every element
  // the same ID on every load (document structure is static between saves),
  // so saved edits actually replay. Left the counter at N afterward so
  // same-session clones still continue from N+1 with no collision risk.
  initLattice(options = {}) {
    const editable = document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,div,button,a,img,section,header,footer,main,article,label,td,th,blockquote,li');
    if (options.reset) {
      this.axIdCounter = 0;
      editable.forEach(el => {
        if (this._isInternal(el)) return;
        this.axIdCounter += 1;
        el.dataset.axId = `ax-${this.axIdCounter}`;
      });
      return;
    }
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
    if (el.id) return `#${CSS.escape(el.id)}`;

    let selector = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string') {
      const classes = el.className
        .split(/\s+/)
        .map(cls => cls.trim())
        .filter(Boolean)
        .map(cls => CSS.escape(cls));
      if (classes.length) selector += `.${classes.join('.')}`;
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
      if (this.debug) {
        console.log('[APEX][detect] no element');
      }
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
        if (this.debug) {
          console.log('[APEX][detect] internal stack');
        }
        this._setBadge('internal stack');
      } else {
        if (this.debug) {
          console.log('[APEX][detect] non-editable stack');
        }
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
    const isLocked = el.dataset.axLocked === 'true' || el.closest('[data-ax-locked="true"]');
    if (isLocked) return false;

    const tagName = el.tagName.toLowerCase();

    // Never treat live navigation / handler-driven controls as editable content.
    // They poison the editor lifecycle because the inspector starts trying to
    // edit the controls that are supposed to remain functional around it.
    if ((tagName === 'button' || tagName === 'a') && (el.hasAttribute('data-handler') || el.closest('nav'))) {
      return false;
    }

    // 1. MEDIA ROLE
    if (tagName === 'img') return true;

    // 2. TEXT ROLE (Leaf elements - check before structure to prioritize buttons/links)
    if (['h1','h2','h3','h4','h5','h6','p','span','button','a','label','td','th','blockquote','li'].includes(tagName)) {
      const childElements = Array.from(el.childNodes).filter(n => n.nodeType === 1);
      const hasOwnText = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim().length > 0);
      if (childElements.length > 0 && !hasOwnText) {
        // Composite labels belong to their leaf children. Do not let parent
        // wrappers act like direct text nodes; that risks rewriting layout
        // containers and shoving text into visually wrong positions.
        // But a paragraph with real text of its own PLUS a nested inline
        // element (a bold phrase, a link) is mixed content, not a bare
        // wrapper - excluding it made the entire paragraph permanently
        // unselectable outside the one nested span, for any copy with
        // ordinary inline formatting. That's the common case, not an edge
        // case, so only exclude true no-text wrappers here.
        return false;
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

      // Composite containers are structural context, not default content targets.
      // Their leaf descendants remain selectable and uniquely identifiable.
      return false;
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
        if (directText && !Array.from(el.childNodes).some(n => n.nodeType === 1)) {
            role = 'text';
        } else {
            role = 'structure';
        }

    }
    const hasChildElements = Array.from(el.childNodes).some(n => n.nodeType === 1);

    return {
      element: el,
      selector,
      role,
      isStructural: role === 'structure',
      hasChildElements,
      // Direct text nodes only â€” preserves child elements on write-back
      textContent: role === 'text' ? this._getTextNodes(el) : '',
      linkHref: tagName === 'a' ? (el.getAttribute('href') || '') : '',
      linkTarget: tagName === 'a' ? (el.getAttribute('target') || '') : '',
      linkRel: tagName === 'a' ? (el.getAttribute('rel') || '') : '',
      styles: {
        color: styles.color,
        zIndex: styles.zIndex,
        fontFamily: styles.fontFamily || '',
        fontSize: styles.fontSize || '',
        fontWeight: styles.fontWeight || '',
        lineHeight: styles.lineHeight || '',
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

  // Read text from any depth with recursion limit (fixes 15-20 nested text elements)
  // FIX 5: Increased from 10 to 20 to handle deeper nesting
  _getTextNodes(el, maxDepth = 20) {
    try {
      if (!el || maxDepth <= 0) return '';

      let text = '';

      // First pass: collect direct text nodes
      for (const node of el.childNodes) {
        if (node.nodeType === 3) { // TEXT_NODE
          text += node.textContent;
        }
      }
      const hasDirectText = text.trim().length > 0;

      // Mixed content: direct text AND a text-bearing inline child (e.g. a
      // bold phrase) both hold real words. Returning direct text alone here
      // silently dropped the child's words from the edit box. Flatten to
      // the full, readable sentence instead, with source whitespace/
      // newlines collapsed to single spaces.
      const childrenWithText = Array.from(el.children).some(c => (c.textContent || '').trim().length > 0);
      if (hasDirectText && childrenWithText) {
        return (el.textContent || '').replace(/\s+/g, ' ').trim();
      }
      if (hasDirectText) return text.trim();

      // Second pass: recurse into child elements to find nested text
      const structuralTags = ['DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'MAIN', 'NAV'];
      const textChildTags = ['SPAN', 'P', 'A', 'STRONG', 'EM', 'B', 'I', 'SMALL', 'LABEL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'];

      for (const child of el.children) {
        // Skip structural containers that shouldn't have editable text
        if (structuralTags.includes(child.tagName) && child.children.length > 3) {
          continue;
        }
        // Recurse into text-bearing elements
        if (textChildTags.includes(child.tagName) || structuralTags.includes(child.tagName)) {
          const nestedText = this._getTextNodes(child, maxDepth - 1);
          if (nestedText) {
            text += ' ' + nestedText;
          }
        }
      }

      return text.trim();
    } catch (e) {
      // Error in text extraction (e.g., detached element) - return empty string safely
      return '';
    }
  }

  // Write text preserving structure, with error recovery
  _setTextNodes(el, newText) {
    try {
      if (!el || !el.parentElement) return; // Element detached - abort safely

      const textNodes = [];
      for (const node of el.childNodes) {
        if (node.nodeType === 3) textNodes.push(node);
      }

      // Only use direct text nodes if at least one has real content (not just whitespace)
      const contentNode = textNodes.find(n => n.textContent.trim());

      // Mixed content: real direct text alongside a child element that also
      // carries its own words (e.g. a bold inline span). The old path below
      // dumped the whole edit into the first text node and blanked the
      // rest, silently stranding the child element's words in the wrong
      // place. Plain text editing can't preserve that inline styling
      // anyway (no rich text editor is active), so do an honest full
      // flatten instead of a silent, scrambled loss. Elements whose only
      // children are text-less (icons, dots) are untouched by this check.
      const childrenWithText = Array.from(el.children).some(c => (c.textContent || '').trim().length > 0);
      if (contentNode && childrenWithText) {
        el.textContent = newText;
        return;
      }

      if (contentNode) {
        contentNode.textContent = newText;
        for (const node of textNodes) {
          if (node !== contentNode) node.textContent = '';
        }
        return;
      }

      // No direct text nodes: only allow a single simple text-bearing child,
      // never inject new text into a structured wrapper/container.
      const textChildTags = ['SPAN', 'P', 'A', 'STRONG', 'EM', 'B', 'I', 'SMALL', 'LABEL'];
      const elementChildren = Array.from(el.children);
      if (elementChildren.length === 1) {
        const onlyChild = elementChildren[0];
        const childHasOwnElementChildren = Array.from(onlyChild.childNodes).some(n => n.nodeType === 1);
        const childHasText = ((onlyChild.innerText || '').trim().length > 0);
        if (!childHasOwnElementChildren && textChildTags.includes(onlyChild.tagName) && childHasText) {
          onlyChild.innerText = newText;
        }
      }
    } catch (e) {
      // Write failed (e.g., permission denied, element detached) - silently abort
      // Element state remains unchanged; user can try again or refresh
    }
  }
}

export default ElementDetector;






