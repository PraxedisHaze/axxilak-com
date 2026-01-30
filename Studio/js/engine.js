/**
 * AXXILAK STUDIO ENGINE (v1.0)
 * Visual Builder for Weblings.
 */

const frame = document.getElementById('webling-frame');
const propPanel = document.getElementById('properties-panel');
let selectedEl = null;
let currentTool = 'select';

// --- 1. LOADER ---
document.getElementById('file-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        frame.srcdoc = content;
        
        // Wait for load to inject editor scripts
        frame.onload = () => {
            initFrame(frame.contentDocument);
            document.getElementById('canvas-label').innerText = file.name;
        };
    };
    reader.readAsText(file);
});

// --- 2. FRAME INITIALIZATION ---
function initFrame(doc) {
    // Inject Styles for Hover/Select
    const style = doc.createElement('style');
    style.innerHTML = `
        .studio-hover { outline: 2px dashed #2563eb !important; cursor: pointer !important; }
        .studio-selected { outline: 2px solid #ec4899 !important; }
    `;
    doc.head.appendChild(style);

    // Event Listeners
    doc.body.addEventListener('mouseover', (e) => {
        if (currentTool === 'select' || currentTool === 'text' || currentTool === 'image' || currentTool === 'move') {
            e.target.classList.add('studio-hover');
        }
    });

    doc.body.addEventListener('mouseout', (e) => {
        e.target.classList.remove('studio-hover');
    });

    // Drag Logic
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    doc.body.addEventListener('mousedown', (e) => {
        if (currentTool !== 'move') return;
        
        isDragging = true;
        selectedEl = e.target;
        selectedEl.style.position = 'relative'; // Ensure it can move
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = parseInt(selectedEl.style.left) || 0;
        initialTop = parseInt(selectedEl.style.top) || 0;
        
        doc.body.style.cursor = 'grabbing';
    });

    doc.body.addEventListener('mousemove', (e) => {
        if (!isDragging || currentTool !== 'move') return;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        selectedEl.style.left = `${initialLeft + dx}px`;
        selectedEl.style.top = `${initialTop + dy}px`;
    });

    doc.body.addEventListener('mouseup', () => {
        isDragging = false;
        doc.body.style.cursor = 'default';
    });

    doc.body.addEventListener('click', (e) => {
        if (currentTool === 'move') return; // Don't trigger click while moving
        e.preventDefault();
        e.stopPropagation();
        selectElement(e.target);
    });
}

// --- 3. SELECTION LOGIC ---
function selectElement(el) {
    if (selectedEl) selectedEl.classList.remove('studio-selected');
    selectedEl = el;
    selectedEl.classList.add('studio-selected');
    
    renderProperties(el);
}

// --- 4. PROPERTIES PANEL ---
function renderProperties(el) {
    propPanel.innerHTML = '';
    const computed = window.getComputedStyle(el);
    const tag = el.tagName.toLowerCase();

    // Header
    const header = document.createElement('div');
    header.className = 'text-xs font-bold mb-4 text-white uppercase';
    header.innerText = `${tag.toUpperCase()} PROPERTIES`;
    propPanel.appendChild(header);

    // -- CONTENT (Text/Image) --
    if (tag === 'img') {
        addInput('Source URL', el.src, (val) => el.src = val);
        addButton('Upload Image', () => triggerImageUpload(el));
    } else {
        // Safe Text Editing via Input (updates textContent to avoid nuking HTML structure if mixed)
        // Better yet: Toggle ContentEditable
        const editBtn = document.createElement('button');
        editBtn.className = 'w-full bg-blue-600 text-white p-2 rounded text-xs font-bold hover:bg-blue-500 mb-4';
        editBtn.innerText = el.isContentEditable ? 'Finish Editing Text' : 'Edit Text on Canvas';
        editBtn.onclick = () => {
            el.contentEditable = !el.isContentEditable;
            el.focus();
            editBtn.innerText = el.isContentEditable ? 'Finish Editing Text' : 'Edit Text on Canvas';
            if (!el.isContentEditable) renderProperties(el); // Refresh
        };
        propPanel.appendChild(editBtn);
        
        // Fallback raw input
        addInput('Raw Text Content', el.innerText, (val) => el.innerText = val);
    }

    // -- TYPOGRAPHY --
    if (tag !== 'img') {
        addSection('Typography');
        addColorInput('Color', rgbToHex(computed.color), (val) => el.style.color = val);
        addInput('Font Size', computed.fontSize, (val) => el.style.fontSize = val);
        addInput('Font Weight', computed.fontWeight, (val) => el.style.fontWeight = val);
        addInput('Letter Spacing', computed.letterSpacing, (val) => el.style.letterSpacing = val);
        
        // Alignment
        const alignDiv = document.createElement('div');
        alignDiv.className = 'flex gap-2 mb-4';
        ['left', 'center', 'right'].forEach(align => {
            const btn = document.createElement('button');
            btn.className = 'flex-1 bg-zinc-800 p-2 rounded text-xs hover:bg-zinc-700';
            btn.innerHTML = `<i class="fas fa-align-${align}"></i>`;
            btn.onclick = () => el.style.textAlign = align;
            alignDiv.appendChild(btn);
        });
        propPanel.appendChild(alignDiv);
    }

    // -- LAYOUT & BACKGROUND --
    addSection('Layout & Background');
    addInput('Margin', computed.margin, (val) => el.style.margin = val);
    addInput('Padding', computed.padding, (val) => el.style.padding = val);
    
    // Background Image
    addInput('BG Image URL', computed.backgroundImage.replace(/url\(['"]?(.*?)['"]?\)/, '$1'), (val) => {
        el.style.backgroundImage = `url("${val}")`;
    });
    addSelect('BG Size', computed.backgroundSize, ['cover', 'contain', 'auto', 'initial'], (val) => el.style.backgroundSize = val);
    addSelect('BG Repeat', computed.backgroundRepeat, ['no-repeat', 'repeat', 'repeat-x', 'repeat-y'], (val) => el.style.backgroundRepeat = val);

    // Gradient Forge
    addSection('Gradient Forge');
    const gradDiv = document.createElement('div');
    gradDiv.className = 'space-y-2';
    
    const color1 = document.createElement('input');
    color1.type = 'color'; color1.className = 'w-full h-8 cursor-pointer'; color1.value = '#2563eb';
    
    const color2 = document.createElement('input');
    color2.type = 'color'; color2.className = 'w-full h-8 cursor-pointer'; color2.value = '#ec4899';
    
    const angle = document.createElement('input');
    angle.type = 'range'; angle.min = 0; angle.max = 360; angle.value = 90; angle.className = 'w-full';

    const applyGrad = () => {
        el.style.backgroundImage = `linear-gradient(${angle.value}deg, ${color1.value}, ${color2.value})`;
    };

    color1.oninput = applyGrad;
    color2.oninput = applyGrad;
    angle.oninput = applyGrad;

    gradDiv.appendChild(addLabel('Start Color'));
    gradDiv.appendChild(color1);
    gradDiv.appendChild(addLabel('End Color'));
    gradDiv.appendChild(color2);
    gradDiv.appendChild(addLabel('Angle'));
    gradDiv.appendChild(angle);
    
    propPanel.appendChild(gradDiv);
    
    // Classes
    addSection('Classes (Tailwind)');
    addInput('Class List', el.className, (val) => el.className = val);
}

// Helper: Add Select
function addSelect(label, current, options, onChange) {
    const group = document.createElement('div');
    group.className = 'prop-group mb-4';
    group.appendChild(addLabel(label));
    
    const sel = document.createElement('select');
    sel.className = 'prop-input w-full';
    options.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt;
        o.innerText = opt.toUpperCase();
        if (current.includes(opt)) o.selected = true;
        sel.appendChild(o);
    });
    sel.onchange = (e) => onChange(e.target.value);
    group.appendChild(sel);
    propPanel.appendChild(group);
}

// Helper: Add Label
function addLabel(text) {
    const lbl = document.createElement('div');
    lbl.className = 'prop-label mb-1';
    lbl.innerText = text;
    return lbl;
}

// Helper: Add Input
function addInput(label, value, onChange) {
    const group = document.createElement('div');
    group.className = 'prop-group mb-4';
    
    const lbl = document.createElement('div');
    lbl.className = 'prop-label';
    lbl.innerText = label;
    
    const inp = document.createElement('input');
    inp.className = 'prop-input';
    inp.value = value;
    inp.oninput = (e) => onChange(e.target.value);
    
    group.appendChild(lbl);
    group.appendChild(inp);
    propPanel.appendChild(group);
}

// Helper: Add Color Input
function addColorInput(label, value, onChange) {
    const group = document.createElement('div');
    group.className = 'prop-group mb-4';
    
    const lbl = document.createElement('div');
    lbl.className = 'prop-label';
    lbl.innerText = label;
    
    const row = document.createElement('div');
    row.className = 'flex gap-2';
    
    const colorInp = document.createElement('input');
    colorInp.type = 'color';
    colorInp.className = 'w-8 h-8 rounded cursor-pointer border-0 p-0';
    colorInp.value = value;
    colorInp.oninput = (e) => {
        textInp.value = e.target.value;
        onChange(e.target.value);
    };
    
    const textInp = document.createElement('input');
    textInp.className = 'prop-input flex-grow';
    textInp.value = value;
    textInp.oninput = (e) => {
        colorInp.value = e.target.value;
        onChange(e.target.value);
    };
    
    row.appendChild(colorInp);
    row.appendChild(textInp);
    group.appendChild(lbl);
    group.appendChild(row);
    propPanel.appendChild(group);
}

// Helper: Add Button
function addButton(label, onClick) {
    const btn = document.createElement('button');
    btn.className = 'w-full bg-zinc-700 text-white p-2 rounded text-xs font-bold hover:bg-zinc-600 mb-4';
    btn.innerText = label;
    btn.onclick = onClick;
    propPanel.appendChild(btn);
}

// Helper: Section Header
function addSection(title) {
    const div = document.createElement('div');
    div.className = 'border-t border-zinc-800 pt-4 mt-4 mb-2 font-bold text-[10px] uppercase text-zinc-500';
    div.innerText = title;
    propPanel.appendChild(div);
}

// Helper: RGB to Hex
function rgbToHex(rgb) {
    if (!rgb || rgb === 'rgba(0, 0, 0, 0)') return '#000000';
    if (rgb.startsWith('#')) return rgb;
    const [r, g, b] = rgb.match(/\d+/g);
    return "#" + ((1 << 24) + (+r << 16) + (+g << 8) + +b).toString(16).slice(1);
}

// --- 5. IMAGE UPLOAD ---
function triggerImageUpload(imgEl) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = event => {
            imgEl.src = event.target.result; // Base64
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

// --- 6. EXPORT ---
document.getElementById('btn-export').addEventListener('click', () => {
    if (!frame.contentDocument) return;
    
    // Clean up
    const doc = frame.contentDocument.cloneNode(true);
    const style = doc.querySelector('style'); 
    if (style && style.innerHTML.includes('studio-hover')) style.remove();
    
    doc.querySelectorAll('.studio-selected').forEach(el => el.classList.remove('studio-selected'));
    doc.querySelectorAll('.studio-hover').forEach(el => el.classList.remove('studio-hover'));

    const htmlContent = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
    
    const blob = new Blob([htmlContent], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "index.html";
    a.click();
});

// --- 7. TOOL SWITCHER ---
document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.id === 'btn-export') return;
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTool = btn.dataset.tool;
    });
});

// --- 8. DEVICE RESIZE ---
document.querySelectorAll('.device-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.device-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const width = btn.dataset.width;
        frame.style.width = width;
    });
});
