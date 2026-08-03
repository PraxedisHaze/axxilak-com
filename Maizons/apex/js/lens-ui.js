export class MagnifyingGlass {
    constructor() {
        this.lensContainer = document.createElement('div');
        this.lensContainer.className = 'lens-container';
        this.lensContainer.setAttribute('data-anothen-internal', '');
        
        // Small fixed-size targeting crosshair, centered on the mouse. No circle,
        // no border, no glow — a compact plus sign with a true empty gap at the
        // center so it never covers the exact pixel you're aiming at.
        const SIZE = 10;   // total span, edge to edge
        const GAP = 3;     // empty hole in the middle — never obscures the target
        const ARM = (SIZE - GAP) / 2; // length of each of the 4 line segments

        this.lensContainer.style.cssText = `
            position: fixed; width: ${SIZE}px; height: ${SIZE}px;
            z-index: 19999;
            display: none; background: transparent;
            transform: translate(-50%, -50%);
            left: -1000px; top: -1000px;
            pointer-events: none;
        `;

        // Crosshairs span the full 10px like before, but a CSS mask punches an
        // empty GAP-px hole out of the exact center — so setSearching() and the
        // theme-update code in magnifying-glass-inspector.js can go on setting
        // `.style.background` on these two elements exactly as they always have
        // (mask-image is a separate property; those writes never touch it).
        const gapMaskV = `linear-gradient(to bottom, #000 0, #000 ${ARM}px, transparent ${ARM}px, transparent ${ARM + GAP}px, #000 ${ARM + GAP}px, #000 100%)`;
        const gapMaskH = `linear-gradient(to right, #000 0, #000 ${ARM}px, transparent ${ARM}px, transparent ${ARM + GAP}px, #000 ${ARM + GAP}px, #000 100%)`;

        this.vHair = document.createElement('div');
        this.vHair.style.cssText = `position:absolute; top:0; bottom:0; left:50%; width:1px; background:#00ff00; transform:translateX(-50%);
            mask-image:${gapMaskV}; -webkit-mask-image:${gapMaskV};`;

        this.hHair = document.createElement('div');
        this.hHair.style.cssText = `position:absolute; left:0; right:0; top:50%; height:1px; background:#00ff00; transform:translateY(-50%);
            mask-image:${gapMaskH}; -webkit-mask-image:${gapMaskH};`;

        // No center dot — the whole point is the middle stays empty.
        this.centerDot = document.createElement('div');
        this.centerDot.id = 'lens-center-dot';
        this.centerDot.style.cssText = 'display:none;';

        // Depth Probe UI (Yellow Circle & Z-Label)
        this.probeDot = document.createElement('div');
        this.probeDot.style.cssText = 'position:absolute; top:50%; left:50%; width:12px; height:12px; border:2px solid #fbbf24; border-radius:50%; transform:translate(-50%,-50%); opacity:0; box-shadow:0 0 10px #fbbf24; transition:opacity 0.2s, width 0.1s, height 0.1s; pointer-events:none;';

        this.zLabel = document.createElement('div');
        this.zLabel.style.cssText = 'position:absolute; top:50%; left:50%; transform:translate(10px, -20px); font-family:monospace; font-size:10px; font-weight:bold; color:#fbbf24; text-shadow:0 1px 2px black; opacity:0; transition:opacity 0.2s; white-space:nowrap; pointer-events:none;';
        this.zLabel.innerText = 'Z:0';

        this.lensContainer.append(this.vHair, this.hHair, this.centerDot, this.probeDot, this.zLabel);
        document.body.appendChild(this.lensContainer);

        this.isVisible = false;
    }

    setCenterDot() {
        // Red center dot is always visible — no-op (kept for API compatibility)
    }

    setProbe(visible, z = 0) {
        if (this.probeDot) this.probeDot.style.opacity = visible ? '1' : '0';
        if (this.zLabel) {
            this.zLabel.style.opacity = visible ? '1' : '0';
            this.zLabel.innerText = `Z:${z}`;
        }
        // Visual feedback when changing Z
        if (visible) {
            this.probeDot.style.width = '16px';
            this.probeDot.style.height = '16px';
            setTimeout(() => {
                this.probeDot.style.width = '12px';
                this.probeDot.style.height = '12px';
            }, 50);
        }
    }

    moveTo(x, y) {
        this.lensContainer.style.left = `${x}px`;
        this.lensContainer.style.top = `${y}px`;
    }

    show() {
        this.lensContainer.style.display = 'block';
        this.isVisible = true;
        document.body.style.cursor = 'none'; // Hide default cursor
        // Plain inline cursor:none loses to native browser cursors on links/
        // buttons and to the palette's own `cursor: pointer !important` rules.
        // This class forces every element except the palette to hide its
        // cursor, so the crosshair is the only thing visible while targeting.
        document.body.classList.add('ax-lens-active');
    }

    hide() {
        this.lensContainer.style.display = 'none';
        this.isVisible = false;
        document.body.style.cursor = 'default';
        document.body.classList.remove('ax-lens-active');
    }

    setSearching(isSearching) {
        const isLight = document.body.getAttribute('data-theme') === 'light';

        if (isSearching) {
            // Locked: maroon→pink gradient crosshairs
            this.vHair.style.background = 'linear-gradient(to bottom, #f472b6, #800000 50%, #f472b6)';
            this.hHair.style.background = 'linear-gradient(to right, #f472b6, #800000 50%, #f472b6)';
        } else {
            // Unlocked: themed gradient crosshairs
            const neon = isLight ? '#d4af37' : '#00ff00';
            const dark = isLight ? '#5c4a00' : '#004d00';
            this.vHair.style.background = `linear-gradient(to bottom, ${neon}, ${dark} 50%, ${neon})`;
            this.hHair.style.background = `linear-gradient(to right, ${neon}, ${dark} 50%, ${neon})`;
        }
    }

    pulse() {
        // Brief brightness flash on the crosshair itself — there is no longer a
        // ring/border to glow, so the pulse now scales the crosshair briefly.
        this.lensContainer.style.transform = 'translate(-50%, -50%) scale(1.6)';
        setTimeout(() => {
            this.lensContainer.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 150);
    }
}