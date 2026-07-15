export class MagnifyingGlass {
    constructor() {
        this.lensContainer = document.createElement('div');
        this.lensContainer.className = 'lens-container';
        this.lensContainer.setAttribute('data-anothen-internal', '');
        
        // Lens is now centered on mouse, draggable by the border
        this.lensContainer.style.cssText = `
            position: fixed; width: 300px; height: 300px;
            border: 2px solid rgba(0, 0, 0, 0.85); border-radius: 50%; z-index: 19999;
            box-shadow: 0 0 0 2px #00ff00, 0 0 20px rgba(0, 255, 0, 0.4), inset 0 0 15px rgba(0, 255, 0, 0.1);
            display: none; background: transparent;
            transform: translate(-50%, -50%);
            left: -1000px; top: -1000px;
            pointer-events: none;
        `;

        // Crosshairs (full span, gradient: dark center → neon edge)
        this.vHair = document.createElement('div');
        this.vHair.style.cssText = 'position:absolute; top:0; bottom:0; left:50%; width:1px; background:linear-gradient(to bottom, #00ff00, #004d00 50%, #00ff00); transform:translateX(-50%);';
        this.hHair = document.createElement('div');
        this.hHair.style.cssText = 'position:absolute; left:0; right:0; top:50%; height:1px; background:linear-gradient(to right, #00ff00, #004d00 50%, #00ff00); transform:translateY(-50%);';

        // Center Dot (always-on bright red)
        this.centerDot = document.createElement('div');
        this.centerDot.id = 'lens-center-dot';
        this.centerDot.style.cssText = 'position:absolute; top:50%; left:50%; width:4px; height:4px; background:#ef4444; border-radius:50%; transform:translate(-50%,-50%); opacity:1; box-shadow:0 0 6px #ef4444, 0 0 12px #ef4444;';

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
    }

    hide() { 
        this.lensContainer.style.display = 'none'; 
        this.isVisible = false; 
        document.body.style.cursor = 'default';
    }

    setSearching(isSearching) {
        const isLight = document.body.getAttribute('data-theme') === 'light';

        if (isSearching) {
            // Locked: dark core + pink aura, maroon→pink gradient crosshairs
            this.lensContainer.style.borderColor = 'rgba(0, 0, 0, 0.85)';
            this.lensContainer.style.boxShadow = '0 0 0 2px #f472b6, 0 0 25px rgba(244,114,182,0.5), inset 0 0 15px rgba(244,114,182,0.15)';
            this.lensContainer.style.background = 'rgba(244,114,182,0.05)';
            this.vHair.style.background = 'linear-gradient(to bottom, #f472b6, #800000 50%, #f472b6)';
            this.hHair.style.background = 'linear-gradient(to right, #f472b6, #800000 50%, #f472b6)';
        } else {
            // Unlocked: dark core + themed aura, gradient crosshairs
            const neon = isLight ? '#d4af37' : '#00ff00';
            const dark = isLight ? '#5c4a00' : '#004d00';
            this.lensContainer.style.borderColor = 'rgba(0, 0, 0, 0.85)';
            this.lensContainer.style.boxShadow = `0 0 0 2px ${neon}, 0 0 20px ${neon}66, inset 0 0 15px ${neon}22`;
            this.lensContainer.style.background = isLight ? 'rgba(212,175,55,0.05)' : 'rgba(0,255,0,0.05)';
            this.vHair.style.background = `linear-gradient(to bottom, ${neon}, ${dark} 50%, ${neon})`;
            this.hHair.style.background = `linear-gradient(to right, ${neon}, ${dark} 50%, ${neon})`;
        }
    }

    pulse() {
        this.lensContainer.style.boxShadow = '0 0 0 3px #00ff00, 0 0 40px rgba(0, 255, 0, 0.7), inset 0 0 20px rgba(0, 255, 0, 0.3)';
        setTimeout(() => {
            this.lensContainer.style.boxShadow = '0 0 0 2px #00ff00, 0 0 20px rgba(0, 255, 0, 0.4), inset 0 0 15px rgba(0, 255, 0, 0.1)';
        }, 150);
    }
}