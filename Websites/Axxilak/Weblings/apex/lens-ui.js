export class MagnifyingGlass {
    constructor() {
        this.lensContainer = document.createElement('div');
        this.lensContainer.className = 'lens-container';
        this.lensContainer.style.cssText = `
            position: fixed; top: -500px; left: -500px; width: 300px; height: 300px;
            border: 2px solid rgba(0, 255, 0, 0.5); border-radius: 50%; pointer-events: none; z-index: 19999;
            box-shadow: 0 0 20px rgba(0, 255, 0, 0.2);
            display: none; background: rgba(0, 20, 0, 0.03); backdrop-filter: contrast(1.1) brightness(1.1);
            transform: translate(-50%, -50%);
        `;

        // High-Contrast Crosshairs
        const createLine = (isVertical) => {
            const line = document.createElement('div');
            line.style.cssText = isVertical ? 
                `position:absolute; top:0; bottom:0; left:50%; width:1px; background:rgba(0,255,0,0.3); box-shadow: 0 0 2px #000;` :
                `position:absolute; left:0; right:0; top:50%; height:1px; background:rgba(0,255,0,0.3); box-shadow: 0 0 2px #000;`;
            return line;
        };

        // THE SIGNAL DOT
        this.dot = document.createElement('div');
        this.dot.style.cssText = `
            position: absolute; top: 50%; left: 50%; width: 8px; height: 8px;
            background: #ff0000; border-radius: 50%; transform: translate(-50%, -50%);
            box-shadow: 0 0 10px #ff0000; transition: background 0.2s, box-shadow 0.2s;
        `;

        this.lensContainer.append(createLine(true), createLine(false), this.dot);
        document.body.appendChild(this.lensContainer);
        
        this.isVisible = false;
    }

    updatePosition(x, y) {
        if (!this.isVisible) return;
        this.lensContainer.style.left = x + 'px';
        this.lensContainer.style.top = y + 'px';
    }

    setSignal(isChangeable) {
        if (isChangeable) {
            this.dot.style.background = '#00ff00';
            this.dot.style.boxShadow = '0 0 15px #00ff00';
            this.lensContainer.style.borderColor = 'rgba(0, 255, 0, 0.8)';
        } else {
            this.dot.style.background = '#ff0000';
            this.dot.style.boxShadow = '0 0 10px #ff0000';
            this.lensContainer.style.borderColor = 'rgba(255, 0, 0, 0.3)';
        }
    }

    show() { this.lensContainer.style.display = 'block'; this.isVisible = true; }
    hide() { this.lensContainer.style.display = 'none'; this.isVisible = false; }
    
    pulse() {
        this.dot.style.transform = 'translate(-50%, -50%) scale(2)';
        setTimeout(() => {
            this.dot.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 100);
    }
}