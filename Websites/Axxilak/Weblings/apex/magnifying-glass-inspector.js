import { MagnifyingGlass } from './lens-ui.js';
import { ElementDetector } from './apex-detector.js';
import { ToolPalette } from './tool-palette.js';

class MagnifyingGlassInspector {
    constructor() {
        this.isActive = false;
        this.isLocked = false;

        this.lens = new MagnifyingGlass();
        this.detector = new ElementDetector({ throttle: 80 }); // Fast response
        this.palette = new ToolPalette();

        this.detector.onDetect = (data) => {
            if (data.selector) this.palette.update(data);
            this.lens.setSignal(data.isChangeable);
        };

        // --- GLOBAL MOUSE TRACKING ---
        document.addEventListener('mousemove', (e) => {
            if (this.isActive && !this.isLocked) {
                this.lens.updatePosition(e.clientX, e.clientY);
                this.detector.detect(e.clientX, e.clientY);
            }
        });

        // --- SHIFT/CTRL LOCK LOGIC ---
        document.addEventListener('keydown', (e) => {
            // Toggle Inspector (Ctrl+M)
            if (e.ctrlKey && (e.key === 'm' || e.key === 'M')) {
                this.toggle();
                return;
            }

            // Lock Target (Hold Shift or Ctrl)
            if (this.isActive && (e.key === 'Shift' || e.key === 'Control')) {
                this.lock();
            }
        });

        document.addEventListener('keyup', (e) => {
            // Release Lock
            if (this.isActive && (e.key === 'Shift' || e.key === 'Control')) {
                // If we are currently typing in an element, don't unlock
                if (document.activeElement && document.activeElement.contentEditable === "true") {
                    return; 
                }
                this.unlock();
            }
        });

        // Watch for clicks into the Palette to prevent premature unlocking
        this.palette.palette.addEventListener('mouseenter', () => {
            if (this.isActive) this.lock();
        });

        this.disable();
    }

    lock() {
        this.isLocked = true;
        document.body.style.cursor = 'default'; // Bring back the mouse
        this.lens.lensContainer.style.opacity = '0.5'; // Visual cue: Locked
    }

    unlock() {
        this.isLocked = false;
        document.body.style.cursor = 'none'; // Hide mouse
        this.lens.lensContainer.style.opacity = '1';
    }

    enable() {
        this.isActive = true;
        this.lens.show();
        this.palette.show();
        document.body.style.cursor = 'none';
        console.log("Inspector: Portal Open.");
    }

    disable() {
        this.isActive = false;
        this.isLocked = false;
        this.lens.hide();
        this.palette.hide();
        document.body.style.cursor = 'default';
        console.log("Inspector: Portal Closed.");
    }

    toggle() {
        this.isActive ? this.disable() : this.enable();
    }
}

window.inspector = new MagnifyingGlassInspector();