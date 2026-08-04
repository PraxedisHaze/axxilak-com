// ARCHIVED 2026-08-02 - dead code, removed from js/tool-palette.js's
// ToolPalette constructor.
//
// WHY ARCHIVED (not just deleted): this `if (!this.container)` branch only
// ran when no static `<div id="palette-container">` existed in the page.
// index.html always ships that static div, so on the real, shipped Apex
// page this branch never executed - confirmed live during today's mobile-
// responsive palette fix, where editing this copy first had zero visible
// effect. Kept here in case a *future* Webling template reuses this same
// JS without shipping the static container markup, in which case this
// fallback-creation logic (not necessarily these exact classes, which had
// already drifted out of sync with the real static element - 600px vs
// 900px max-height, differing background/border/shadow) would need to be
// restored or rebuilt intentionally, not resurrected by accident.
//
// Original location: js/tool-palette.js, ToolPalette constructor, the
// `if (!this.container) { ... }` block (lines ~4-35 at time of removal).

this.container = document.createElement('div');
this.container.id = 'palette-container';
this.container.setAttribute('data-anothen-internal', '');
this.container.className = 'fixed inset-x-3 bottom-3 w-auto max-h-[75vh] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96 sm:max-h-[600px] bg-zinc-900 border-2 border-[var(--accent)] rounded-sm shadow-2xl z-[20000] hidden overflow-y-auto text-white p-6';

this.contentArea = document.createElement('div');
this.contentArea.id = 'palette-content';

const closeBtn = document.createElement('button');
closeBtn.id = 'btn-close-palette';
closeBtn.className = 'absolute top-3 right-3 z-40 w-8 h-8 flex items-center justify-center border border-zinc-500 bg-zinc-900 text-zinc-200 hover:border-white hover:text-white transition-colors';
closeBtn.type = 'button';
closeBtn.setAttribute('aria-label', 'Discard current changes and close editor');
closeBtn.title = 'Discard current changes and close editor';
closeBtn.innerHTML = '&times;';
closeBtn.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (this.onCancel) {
        this.onCancel();
    } else if (typeof window.exitEditMode === 'function') {
        window.exitEditMode();
    }
};

this.container.appendChild(closeBtn);
this.container.appendChild(this.contentArea);
document.body.appendChild(this.container);
