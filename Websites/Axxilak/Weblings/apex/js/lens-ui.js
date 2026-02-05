export class MagnifyingGlass {
    constructor() {
        this.lensContainer = document.createElement('div');
        this.lensContainer.className = 'lens-container';
        // Added 'transition: box-shadow' for the pulse effect
        this.lensContainer.style.cssText = `
            position: fixed; top: 100px; left: 100px; width: 300px; height: 300px;
            border: 2px solid #00ff00; border-radius: 50%; pointer-events: none; z-index: 19999;
            box-shadow: 0 0 20px rgba(0, 255, 0, 0.3), inset 0 0 20px rgba(0, 255, 0, 0.1);
            display: none; background: rgba(0, 20, 0, 0.1); backdrop-filter: contrast(1.1) brightness(1.1);
            transition: box-shadow 0.2s ease;
        `;

        // Crosshairs
        const v = document.createElement('div'); v.style.cssText = 'position:absolute; top:0; bottom:0; left:50%; width:1px; background:rgba(0,255,0,0.5);';
        const h = document.createElement('div'); h.style.cssText = 'position:absolute; left:0; right:0; top:50%; height:1px; background:rgba(0,255,0,0.5);';
        this.lensContainer.append(v, h);
        document.body.appendChild(this.lensContainer);

        // Handle
        this.handle = document.createElement('div');
        this.handle.className = 'resize-handle';
        this.handle.style.cssText = 'position: absolute; top: 15px; right: 15px; width: 20px; height: 20px; background: #00ff00; border-radius: 50%; cursor: move; pointer-events: auto; box-shadow: 0 0 5px #00ff00;';
        this.lensContainer.appendChild(this.handle);

        this.onMove = null;
        this.isDragging = false;

        // Handle Dragging
        this.handle.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.offsetX = e.clientX - this.lensContainer.offsetLeft;
            this.offsetY = e.clientY - this.lensContainer.offsetTop;
            e.preventDefault();
        });

        document.addEventListener('mouseup', () => this.isDragging = false);

        document.addEventListener('mousemove', (e) => {
            if(this.isDragging && this.isVisible) {
                 let x = e.clientX - this.offsetX;
                 let y = e.clientY - this.offsetY;

                 // --- THE WALLS (Bounds Checking) ---
                 const maxX = window.innerWidth - 300; // 300 is width
                 const maxY = window.innerHeight - 300; // 300 is height

                 // Don't let it go past the left/top edges (0) or right/bottom edges (max)
                 if (x < 0) x = 0;
                 if (y < 0) y = 0;
                 if (x > maxX) x = maxX;
                 if (y > maxY) y = maxY;
                 // -----------------------------------

                 this.lensContainer.style.left = x + 'px';
                 this.lensContainer.style.top = y + 'px';
                 if(this.onMove) this.onMove({x: x + 150, y: y + 150});
            }
        });

        this.isVisible = false;
    }

    show() { this.lensContainer.style.display = 'block'; this.isVisible = true; }
    hide() { this.lensContainer.style.display = 'none'; this.isVisible = false; }

    // Visual feedback when we detect something
    pulse() {
        this.lensContainer.style.boxShadow = '0 0 60px rgba(0, 255, 0, 0.8), inset 0 0 30px rgba(0, 255, 0, 0.4)';
        setTimeout(() => {
            this.lensContainer.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.3), inset 0 0 20px rgba(0, 255, 0, 0.1)';
        }, 150);
    }
}
