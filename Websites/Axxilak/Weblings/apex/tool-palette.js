export class ToolPalette {
    constructor() {
        this.currentElement = null;
        this.isAdvanced = false;
        this.accent = "#059669"; // Sophisticated Bottle Green
        
        this.palette = document.createElement('div');
        this.palette.className = 'tool-palette';
        this.palette.style.cssText = `
            position: fixed; top: 100px; right: 20px; width: 320px; 
            background: rgba(5, 20, 15, 0.98); border: 1px solid ${this.accent}; color: #fff;
            font-family: 'Courier New', monospace; padding: 20px; z-index: 19998; display: none;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8); backdrop-filter: blur(15px); border-radius: 12px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        `;
        
        this.palette.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(0,255,0,0.1); padding-bottom:15px; margin-bottom:20px;">
                <div>
                    <h3 style="margin:0; font-size:14px; letter-spacing:2px; color:${this.accent}; text-transform:uppercase; font-weight:700;">Portal Editor</h3>
                    <span style="font-size:9px; color:rgba(255,255,255,0.3); letter-spacing:1px;">SOVEREIGN v2.3</span>
                </div>
                <button id="adv-toggle" style="background:transparent; border:1px solid #333; color:#666; font-size:9px; padding:4px 8px; border-radius:4px; cursor:pointer; text-transform:uppercase;">Advanced</button>
            </div>
            
            <div id="sovereign-controls"></div>
            
            <div id="advanced-blueprint" style="max-height:0; overflow:hidden; transition:all 0.4s ease; border-top:0px solid transparent; margin-top:0;">
                <div style="padding-top:20px;">
                    <label style="display:block; color:${this.accent}; opacity:0.5; font-size:9px; margin-bottom:8px; letter-spacing:1px; text-transform:uppercase;">Blueprint Address</label>
                    <div id="blueprint-selector" style="background:#000; padding:10px; border:1px solid #222; color:${this.accent}; font-family:monospace; font-size:11px; word-break:break-all; border-radius:4px; margin-bottom:15px;"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.palette);
        this.container = this.palette.querySelector('#sovereign-controls');
        this.blueprint = this.palette.querySelector('#advanced-blueprint');
        this.advBtn = this.palette.querySelector('#adv-toggle');
        this.advBtn.onclick = () => this.toggleAdvanced();
    }

    toggleAdvanced() {
        this.isAdvanced = !this.isAdvanced;
        this.blueprint.style.maxHeight = this.isAdvanced ? '300px' : '0';
        this.blueprint.style.marginTop = this.isAdvanced ? '20px' : '0';
        this.advBtn.style.color = this.isAdvanced ? this.accent : '#666';
        this.advBtn.style.borderColor = this.isAdvanced ? this.accent : '#333';
    }

    update(data) {
        const { element, selector, styles } = data;
        
        if (this.currentElement && this.currentElement !== element) {
            this.currentElement.contentEditable = "false";
        }
        
        this.currentElement = element;
        this.currentElement.contentEditable = "true";

        const rgbToHex = (rgb) => {
            const match = rgb.match(/\d+/g);
            if (!match) return '#000000';
            return '#' + match.slice(0, 3).map(x => {
                const hex = parseInt(x).toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            }).join('');
        };

        this.container.innerHTML = `
            <div style="background:rgba(0,255,0,0.03); border: 1px solid rgba(0,255,0,0.05); padding:10px; border-radius:6px; margin-bottom:20px; text-align:center;">
                <span style="font-size:11px; color:${this.accent}; letter-spacing:1px; font-weight:600;">PORTAL ACTIVE</span>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:20px;">
                <div>
                    <label style="display:block; color:${this.accent}; font-size:10px; margin-bottom:8px; letter-spacing:1px; text-transform:uppercase;">Text Color</label>
                    <input type="color" id="edit-color" value="${rgbToHex(styles.color)}" style="width:100%; height:40px; background:none; border:1px solid #333; cursor:pointer; border-radius:6px;">
                </div>
                <div>
                    <label style="display:block; color:${this.accent}; font-size:10px; margin-bottom:8px; letter-spacing:1px; text-transform:uppercase;">Background</label>
                    <input type="color" id="edit-bg" value="${rgbToHex(styles.backgroundColor)}" style="width:100%; height:40px; background:none; border:1px solid #333; cursor:pointer; border-radius:6px;">
                </div>
            </div>

            <div style="margin-bottom:25px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <label style="color:${this.accent}; font-size:10px; letter-spacing:1px; text-transform:uppercase;">Font Size</label>
                    <span style="font-size:10px; color:rgba(255,255,255,0.5); font-family:monospace;">${styles.fontSize}</span>
                </div>
                <input type="range" id="edit-size" min="8" max="120" value="${parseInt(styles.fontSize)}" style="width:100%; accent-color:${this.accent};">
            </div>

            <button id="commit-reality" style="width:100%; padding:12px; background:${this.accent}; color:#fff; border:none; border-radius:6px; font-weight:800; font-size:11px; letter-spacing:2px; text-transform:uppercase; cursor:pointer;">
                Commit to Reality
            </button>
        `;

        this.palette.querySelector('#blueprint-selector').innerText = selector;

        this.container.querySelector('#edit-color').oninput = (e) => { this.currentElement.style.color = e.target.value; };
        this.container.querySelector('#edit-bg').oninput = (e) => { this.currentElement.style.backgroundColor = e.target.value; };
        this.container.querySelector('#edit-size').oninput = (e) => { this.currentElement.style.fontSize = e.target.value + 'px'; };
    }

    show() { this.palette.style.display = 'block'; }
    hide() { 
        if (this.currentElement) this.currentElement.contentEditable = "false";
        this.palette.style.display = 'none'; 
    }
}
