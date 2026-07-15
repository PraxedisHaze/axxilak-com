/**
 * WEBLING EDITOR ENGINE (v1.0)
 * The "Coherence Editor" - Client-side, No-Code customization.
 */

function initWeblingEditor() {
    console.log("WEBLING EDITOR: BOOTING...");

    // 1. Inject Editor UI
    const editorUI = document.createElement('div');
    editorUI.id = 'webling-editor-ui';
    editorUI.innerHTML = `
        <div style="position: fixed; bottom: 20px; right: 20px; background: #111; color: white; padding: 15px; border-radius: 8px; font-family: sans-serif; z-index: 9999; box-shadow: 0 10px 30px rgba(0,0,0,0.5); display: flex; gap: 10px; align-items: center;">
            <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Editor Active</div>
            <button id="btn-save" style="background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">Download Site</button>
            <button id="btn-close" style="background: transparent; color: #666; border: none; cursor: pointer;">✕</button>
        </div>
        <style>
            .editable-hover { outline: 2px dashed #2563eb; cursor: text; }
            .editable-image-hover { outline: 2px dashed #ec4899; cursor: pointer; }
            .section-edit-highlight { outline: 3px solid #ec4899 !important; border-radius: 4px; }
        </style>
    `;
    document.body.appendChild(editorUI);

    // 2. Make Text Editable
    const textElements = document.querySelectorAll('h1, h2, h3, h4, p, a, span, li, div');

    textElements.forEach(el => {
        // Only leaf nodes with text
        if (el.children.length === 0 && el.textContent.trim().length > 0 && !el.closest('#webling-editor-ui')) {
            el.addEventListener('mouseover', () => el.classList.add('editable-hover'));
            el.addEventListener('mouseout', () => el.classList.remove('editable-hover'));
            el.addEventListener('click', (e) => {
                e.preventDefault();
                el.contentEditable = "true";
                el.focus();
            });
            el.addEventListener('blur', () => {
                el.contentEditable = "false";
            });
        }
    });

    // 3. Make Images Swappable
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.addEventListener('mouseover', () => img.classList.add('editable-image-hover'));
        img.addEventListener('mouseout', () => img.classList.remove('editable-image-hover'));
        img.addEventListener('click', (e) => {
            e.preventDefault();

            const choice = confirm("Press OK to Upload from computer, or Cancel to use a URL.");

            if (choice) {
                // Upload from computer
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = e => {
                    const file = e.target.files[0];
                    const reader = new FileReader();
                    reader.onload = event => {
                        img.src = event.target.result; // Base64 string
                    };
                    reader.readAsDataURL(file);
                };
                input.click();
            } else {
                // Use URL
                const newUrl = prompt("Enter new Image URL:", img.src);
                if (newUrl) img.src = newUrl;
            }
        });
    });

    // 3.5 Section Duplicator
    const sections = document.querySelectorAll('section, header, footer');
    sections.forEach(sec => {
        sec.style.position = 'relative'; // Ensure positioning context

        sec.addEventListener('mouseenter', () => {
            if (sec.querySelector('.webling-dupe-btn')) return;

            const btn = document.createElement('div');
            btn.className = 'webling-dupe-btn';
            btn.style.cssText = `
                position: absolute; top: 10px; right: 10px;
                display: flex; gap: 5px; z-index: 1000;
                opacity: 0.8; transition: opacity 0.2s;
            `;

            // Helper to create button
            const makeBtn = (text, color, onClick) => {
                const b = document.createElement('button');
                b.innerText = text;
                b.style.cssText = `
                    background: ${color}; color: white; border: none;
                    padding: 5px 8px; font-size: 10px; font-weight: bold;
                    border-radius: 4px; cursor: pointer;
                `;
                b.onclick = (e) => { e.stopPropagation(); onClick(); };
                return b;
            };

            // Clone
            btn.appendChild(makeBtn('+ Clone', '#ec4899', () => {
                const clone = sec.cloneNode(true);
                const existingBtn = clone.querySelector('.webling-dupe-btn');
                if (existingBtn) existingBtn.remove();
                sec.parentNode.insertBefore(clone, sec.nextSibling);
                // Re-bind edits (simplistic re-init)
                // In v1.3 we'd make this robust. For now, text editing works on click.
            }));

            // Move Up
            btn.appendChild(makeBtn('↑', '#2563eb', () => {
                if (sec.previousElementSibling) {
                    sec.parentNode.insertBefore(sec, sec.previousElementSibling);
                    sec.scrollIntoView({ behavior: 'smooth' });
                }
            }));

            // Move Down
            btn.appendChild(makeBtn('↓', '#2563eb', () => {
                if (sec.nextElementSibling) {
                    sec.parentNode.insertBefore(sec.nextElementSibling, sec);
                    sec.scrollIntoView({ behavior: 'smooth' });
                }
            }));

            // Delete
            btn.appendChild(makeBtn('✕', '#ef4444', () => {
                if (confirm('Delete this section?')) sec.remove();
            }));

            btn.onmouseenter = () => btn.style.opacity = '1';

            sec.appendChild(btn);
        });

        sec.addEventListener('mouseleave', () => {
            const btn = sec.querySelector('.webling-dupe-btn');
            if (btn) btn.remove();
        });
    });

    // 4. Template Injector Logic (Ghost Button)
    const PRICING_TEMPLATE = `
        <section class="py-24 px-6 max-w-7xl mx-auto border-t border-zinc-200">
            <div class="text-center mb-16">
                <h2 class="text-3xl md:text-5xl font-extrabold tracking-tight mb-6">Investment Protocols.</h2>
                <p class="text-zinc-500 max-w-2xl mx-auto">Transparent architecture. No hidden dependencies.</p>
            </div>
            <div class="grid md:grid-cols-3 gap-8 items-center">
                <div class="p-8 border border-zinc-200 rounded-sm">
                    <div class="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Starter</div>
                    <div class="text-4xl font-extrabold mb-6">$500</div>
                    <ul class="space-y-4 text-sm text-zinc-600 mb-8">
                        <li class="flex gap-3"><span class="text-[var(--accent)]">✓</span> Single Architecture</li>
                        <li class="flex gap-3"><span class="text-[var(--accent)]">✓</span> 48h Turnaround</li>
                        <li class="flex gap-3"><span class="text-[var(--accent)]">✓</span> Standard Support</li>
                    </ul>
                    <a href="#" class="block w-full py-3 text-center border border-zinc-200 hover:bg-zinc-50 font-bold rounded-sm text-sm">Select Protocol</a>
                </div>
                <div class="p-10 bg-zinc-900 text-white rounded-sm shadow-xl transform md:scale-105">
                    <div class="text-sm font-bold text-[var(--accent)] uppercase tracking-widest mb-4">Sovereign</div>
                    <div class="text-5xl font-extrabold mb-6">$1,500</div>
                    <ul class="space-y-4 text-sm text-zinc-300 mb-8">
                        <li class="flex gap-3"><span class="text-[var(--accent)]">✓</span> Custom Architecture</li>
                        <li class="flex gap-3"><span class="text-[var(--accent)]">✓</span> Priority Deployment</li>
                        <li class="flex gap-3"><span class="text-[var(--accent)]">✓</span> 24/7 Command Line</li>
                        <li class="flex gap-3"><span class="text-[var(--accent)]">✓</span> Lifetime Updates</li>
                    </ul>
                    <a href="#" class="block w-full py-4 text-center btn-apex rounded-sm font-bold text-sm">Initialize</a>
                </div>
                <div class="p-8 border border-zinc-200 rounded-sm">
                    <div class="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Enterprise</div>
                    <div class="text-4xl font-extrabold mb-6">Custom</div>
                    <ul class="space-y-4 text-sm text-zinc-600 mb-8">
                        <li class="flex gap-3"><span class="text-[var(--accent)]">✓</span> Multi-Node Systems</li>
                        <li class="flex gap-3"><span class="text-[var(--accent)]">✓</span> Dedicated Engineer</li>
                        <li class="flex gap-3"><span class="text-[var(--accent)]">✓</span> SLA Guarantee</li>
                    </ul>
                    <a href="#" class="block w-full py-3 text-center border border-zinc-200 hover:bg-zinc-50 font-bold rounded-sm text-sm">Contact Command</a>
                </div>
            </div>
        </section>
    `;

    // Ghost Button Creation
    const addBtn = document.createElement('button');
    addBtn.id = 'webling-add-section-btn';
    addBtn.innerText = '+ Add Section';
    addBtn.style.cssText = `
        background: #22c55e;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        margin-right: 10px;
        font-size: 12px;
        z-index: 10001;
    `;

    // Dropdown menu for templates
    const menu = document.createElement('div');
    menu.id = 'webling-template-menu';
    menu.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 20px;
        background: white;
        color: black;
        border-radius: 4px;
        display: none;
        flex-direction: column;
        width: 180px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        overflow: hidden;
        z-index: 10002;
        border: 1px solid #ddd;
    `;

    // Add Pricing Item
    const pricingItem = document.createElement('button');
    pricingItem.innerText = 'Pricing Table';
    pricingItem.style.cssText = `
        padding: 12px;
        text-align: left;
        background: white;
        border: none;
        border-bottom: 1px solid #eee;
        cursor: pointer;
        width: 100%;
        color: #333;
        font-weight: bold;
        font-size: 12px;
        transition: background 0.2s;
    `;
    pricingItem.onmouseover = () => pricingItem.style.background = '#f4f4f5';
    pricingItem.onmouseout = () => pricingItem.style.background = 'white';

    pricingItem.onclick = (e) => {
        e.stopPropagation();
        console.log('Adding pricing template...');
        const footer = document.querySelector('footer');
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = PRICING_TEMPLATE;
        const newSection = tempDiv.firstElementChild;

        if (footer) {
            footer.parentNode.insertBefore(newSection, footer);
        } else {
            document.body.appendChild(newSection);
        }

        console.log('Pricing template added.');
        menu.style.display = 'none';
    };
    menu.appendChild(pricingItem);

    addBtn.onclick = (e) => {
        e.stopPropagation();
        menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
    };

    // Inject into the editor bar
    // Robust local reference: editorUI is the outer div, editorUI.firstElementChild is the inner bar
    const editorBar = editorUI.firstElementChild;
    if (editorBar) {
        editorBar.insertBefore(addBtn, editorBar.children[1]);
        document.body.appendChild(menu);
        console.log('Ghost Button injected successfully.');
    } else {
        console.error('ERROR: Editor bar container not found. Cannot inject Ghost Button.');
    }

    // 5. Export Function
    document.getElementById('btn-save').addEventListener('click', () => {
        // Clone the document to clean it up
        const clone = document.documentElement.cloneNode(true);

        // Remove the editor UI and script from the clone
        const ui = clone.querySelector('#webling-editor-ui');
        if (ui) ui.remove();

        // Remove contenteditable attributes
        const editables = clone.querySelectorAll('[contenteditable]');
        editables.forEach(el => el.removeAttribute('contenteditable'));

        // Serialize
        const htmlContent = "<!DOCTYPE html>\n" + clone.outerHTML;

        // Download
        const blob = new Blob([htmlContent], { type: "text/html" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "index.html";
        a.click();
    });

    const closeBtn = document.getElementById('btn-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            editorUI.style.display = 'none';
        });
    }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWeblingEditor);
} else {
    initWeblingEditor();
}
