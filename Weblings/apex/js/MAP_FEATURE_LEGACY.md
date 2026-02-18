# Topographic Map (Visualizer) - Legacy Documentation

The "Map" feature (internally `visualizeDepth`) provided a topographic visualization of the page's Z-index structure. It was retired in v2.0 to focus on 3D and Labels as primary visualizers.

## Core Logic

The feature used a "Probe Depth" (Z-index) that the user could adjust using the mouse wheel. Elements were highlighted based on whether their Z-index was above, below, or equal to the probe.

### Mouse Wheel Integration
```javascript
document.addEventListener('wheel', (e) => {
    if (!this.isActive || !this.palette.depthMapActive) return;
    
    const isOverPalette = this.palette.container.contains(e.target);
    if (isOverPalette) return;

    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    this.reticleZ += delta;
    
    this.lens.setProbe(true, this.reticleZ);
    this.visualizeDepth(this.highlightedElement, this.reticleZ);
}, { passive: false });
```

### Visualization Overlay (`visualizeDepth`)
The visualization worked by iterating through siblings and creating fixed-position overlays with colors indicating depth relative to the probe:
- **Red:** Above probe (`z > probeZ`)
- **Blue:** Below probe (`z < probeZ`)
- **White/Transparent:** Equal to probe (`z == probeZ`)

```javascript
visualizeDepth(targetEl, probeZ = 0) {
    this.clearDepthMap();
    // ...
    siblings.forEach(el => {
        const z = parseInt(window.getComputedStyle(el).zIndex) || 0;
        const diff = z - probeZ;
        
        const overlay = document.createElement('div');
        overlay.className = 'depth-map-overlay';
        let color = 'rgba(255, 255, 255, 0.1)';
        // ... (color logic)
        
        const rect = el.getBoundingClientRect();
        overlay.style.cssText = `position:fixed; top:${rect.top}px; ...`;
        overlay.innerHTML = `<div>Z:${z}</div><div>${diff}</div>`;
        document.body.appendChild(overlay);
    });
}
```

## Potential for v3
If restored, it should use a Canvas overlay for better performance and support non-z-index depth (e.g., DOM depth or physical layer depth).
