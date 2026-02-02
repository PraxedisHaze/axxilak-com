(function() {
    console.log("Checking Coherence... (Type 'lux' to activate)");

    // --- STATE ---
    let isActive = false;
    let keystrokes = [];
    const SECRET_CODE = "lux";

    // --- ACTIVATION LISTENER ---
    document.addEventListener('keydown', (e) => {
        if (isActive) return; 

        keystrokes.push(e.key.toLowerCase());
        if (keystrokes.length > SECRET_CODE.length) {
            keystrokes.shift();
        }
        
        if (keystrokes.join("") === SECRET_CODE) {
            initCoherenceEngine();
        }
    });

    // --- ENGINE INITIALIZATION ---
    function initCoherenceEngine() {
        if (isActive) return;
        isActive = true;
        console.log("✧ COHERENCE ENGINE ENGAGED: PHASE 2 ✧");

        // 1. Inject Styles
        const css = 
            // Main UI Bar
            ".coherence-ui-glass {" +
            "    position: fixed;" +
            "    bottom: 30px;" +
            "    left: 50%;" +
            "    transform: translateX(-50%);" +
            "    background: rgba(10, 10, 10, 0.9);" +
            "    backdrop-filter: blur(12px);" +
            "    border: 1px solid rgba(212, 175, 55, 0.3);" +
            "    padding: 12px 24px;" +
            "    border-radius: 50px;" +
            "    display: flex;" +
            "    align-items: center;" +
            "    gap: 20px;" +
            "    z-index: 99999;" +
            "    box-shadow: 0 10px 40px rgba(0,0,0,0.6);" +
            "    font-family: 'Outfit', sans-serif;" +
            "    animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);" +
            "}" +
            "@keyframes slideUp {" +
            "    from { bottom: -100px; opacity: 0; }" +
            "    to { bottom: 30px; opacity: 1; }" +
            "}" +
            ".coherence-label {" +
            "    color: #d4af37;" +
            "    font-size: 11px;" +
            "    letter-spacing: 0.15em;" +
            "    text-transform: uppercase;" +
            "    font-weight: 600;" +
            "    display: flex;" +
            "    align-items: center;" +
            "    gap: 8px;" +
            "}" +
            ".coherence-label::before {" +
            "    content: '';" +
            "    display: block;" +
            "    width: 6px;" +
            "    height: 6px;" +
            "    background: #d4af37;" +
            "    border-radius: 50%;" +
            "    box-shadow: 0 0 10px #d4af37;" +
            "}" +
            ".coherence-btn {" +
            "    background: linear-gradient(135deg, #d4af37 0%, #aa771c 100%);" +
            "    color: #000;" +
            "    border: none;" +
            "    padding: 8px 20px;" +
            "    border-radius: 20px;" +
            "    font-size: 11px;" +
            "    font-weight: 700;" +
            "    text-transform: uppercase;" +
            "    letter-spacing: 0.1em;" +
            "    cursor: pointer;" +
            "    transition: all 0.3s ease;" +
            "}" +
            ".coherence-btn:hover {" +
            "    transform: translateY(-2px);" +
            "    box-shadow: 0 5px 15px rgba(212, 175, 55, 0.3);" +
            "}" +
            ".coherence-close {" +
            "    background: transparent;" +
            "    border: none;" +
            "    color: rgba(255,255,255,0.4);" +
            "    cursor: pointer;" +
            "    font-size: 16px;" +
            "    transition: color 0.3s;" +
            "    margin-left: 10px;" +
            "}" +
            ".coherence-close:hover { color: #fff; }" +
            
            // Editable Elements (Persistent Outline)
            ".coherence-editable {" +
            "    outline: 1px dashed rgba(255, 255, 255, 0.1);" +
            "    transition: all 0.2s;" +
            "}" +
            ".coherence-editable:hover {" +
            "    outline: 1px solid rgba(212, 175, 55, 0.8);" +
            "    cursor: text;" +
            "    background: rgba(212, 175, 55, 0.05);" +
            "    position: relative;" +
            "}" +
            "[contenteditable='true'] {" +
            "    outline: 2px solid #d4af37 !important;" +
            "    background: rgba(0,0,0,0.8) !important;" +
            "    color: white !important;" +
            "    z-index: 1000;" +
            "    position: relative;" +
            "    min-width: 20px;" +
            "}" +
            
            // Image Controls
            ".coherence-image {" +
            "    outline: 1px dashed rgba(255, 255, 255, 0.1);" +
            "}" +
            ".coherence-image:hover {" +
            "    outline: 2px solid #d4af37;" +
            "    cursor: pointer;" +
            "}" +
            
            // Section Toolbar
            ".coherence-section-toolbar {" +
            "    position: absolute;" +
            "    top: 0;" +
            "    right: 0;" +
            "    background: #000;" +
            "    border: 1px solid #333;" +
            "    display: flex;" +
            "    gap: 1px;" +
            "    z-index: 10000;" +
            "    opacity: 0;" +
            "    transition: opacity 0.2s;" +
            "    pointer-events: none;" +
            "}" +
            ".coherence-section:hover .coherence-section-toolbar {" +
            "    opacity: 1;" +
            "    pointer-events: auto;" +
            "}" +
            ".coherence-section-btn {" +
            "    background: #111;" +
            "    border: none;" +
            "    color: #888;" +
            "    padding: 6px 10px;" +
            "    cursor: pointer;" +
            "    font-size: 12px;" +
            "}" +
            ".coherence-section-btn:hover {" +
            "    background: #222;" +
            "    color: #fff;" +
            "}" +
            ".btn-danger:hover { background: #ef4444; color: white; }" +
            ".coherence-section { position: relative; border: 1px dashed transparent; }" +
            ".coherence-section:hover { border-color: rgba(255,255,255,0.1); }";

        const style = document.createElement('style');
        style.innerHTML = css;
        document.head.appendChild(style);

        // 2. Inject UI
        const ui = document.createElement('div');
        ui.className = 'coherence-ui-glass';
        ui.innerHTML = 
            '<div class="coherence-label">Coherence Engaged</div>' +
            '<button id="coherence-save" class="coherence-btn">Commit to Reality</button>' +
            '<button id="coherence-close" class="coherence-close">✕</button>';
        document.body.appendChild(ui);

        // 3. Awaken Elements
        activateTextEditing();
        activateImageSwapping();
        activateSectionControls();
        interceptLinks();

        // 4. Bind Actions
        document.getElementById('coherence-save').onclick = commitToReality;
        document.getElementById('coherence-close').onclick = shutdownEngine;
    }

    function activateTextEditing() {
        // Broad selector, but filtering carefully
        const textNodes = document.querySelectorAll('h1, h2, h3, h4, p, span, li, a, button, div');
        
        textNodes.forEach(el => {
            if (el.closest('.coherence-ui-glass')) return;
            if (el.closest('.coherence-section-toolbar')) return;
            
            // Logic: Only edit if it has direct text content and NO element children (leaf node)
            const hasText = el.textContent.trim().length > 0;
            const isLeaf = el.children.length === 0;
            
            if (hasText && isLeaf) {
                el.classList.add('coherence-editable');
                
                // Override clicks
                el.addEventListener('click', (e) => {
                    if (!isActive) return;
                    e.preventDefault();
                    e.stopPropagation();
                    
                    el.contentEditable = "true";
                    el.focus();
                }, true); // Capture phase to beat default handlers

                el.onblur = () => {
                    el.contentEditable = "false";
                };
                
                el.onkeydown = (e) => {
                     // Allow Enter for paragraphs, prevent for headers/buttons
                     if (e.key === 'Enter' && !['P', 'LI'].includes(el.tagName)) {
                        e.preventDefault();
                        el.blur();
                     }
                };
            }
        });
    }

    function activateImageSwapping() {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            if (img.closest('.coherence-ui-glass')) return;
            img.classList.add('coherence-image');

            img.addEventListener('click', (e) => {
                if (!isActive) return;
                e.preventDefault();
                e.stopPropagation();

                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (ev) => {
                    const file = ev.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (readerEvent) => {
                            img.src = readerEvent.target.result;
                        };
                        reader.readAsDataURL(file);
                    }
                };
                input.click();
            }, true);
        });
    }

    function activateSectionControls() {
        const sections = document.querySelectorAll('section, header, footer');
        sections.forEach(sec => {
            if (sec.closest('.coherence-ui-glass')) return;
            
            sec.classList.add('coherence-section');
            
            // Create Toolbar
            const toolbar = document.createElement('div');
            toolbar.className = 'coherence-section-toolbar';
            toolbar.contentEditable = "false"; // Protect toolbar
            
            // Move Up
            const btnUp = document.createElement('button');
            btnUp.innerHTML = '↑';
            btnUp.className = 'coherence-section-btn';
            btnUp.onclick = (e) => {
                e.preventDefault(); e.stopPropagation();
                if (sec.previousElementSibling) {
                    sec.parentNode.insertBefore(sec, sec.previousElementSibling);
                    sec.scrollIntoView({behavior: 'smooth', block: 'center'});
                }
            };
            
            // Move Down
            const btnDown = document.createElement('button');
            btnDown.innerHTML = '↓';
            btnDown.className = 'coherence-section-btn';
            btnDown.onclick = (e) => {
                e.preventDefault(); e.stopPropagation();
                if (sec.nextElementSibling) {
                    sec.parentNode.insertBefore(sec.nextElementSibling, sec);
                    sec.scrollIntoView({behavior: 'smooth', block: 'center'});
                }
            };
            
            // Duplicate
            const btnDup = document.createElement('button');
            btnDup.innerHTML = 'Clone';
            btnDup.className = 'coherence-section-btn';
            btnDup.onclick = (e) => {
                e.preventDefault(); e.stopPropagation();
                const clone = sec.cloneNode(true);
                // Remove existing toolbars from clone to avoid nesting/duplication
                const existingBars = clone.querySelectorAll('.coherence-section-toolbar');
                existingBars.forEach(b => b.remove());
                
                sec.parentNode.insertBefore(clone, sec.nextSibling);
                // Re-init controls on the new clone (recursive) 
                // For MVP: We just reload engine or basic re-init. 
                // Better: Just manually add controls to clone.
                // clone.classList.add('coherence-section');
                // activateSectionControls(); // Re-run to catch new elements
                alert("Section cloned. (Re-engage Lux to edit the clone fully)");
            };
            
            // Delete
            const btnDel = document.createElement('button');
            btnDel.innerHTML = '✕';
            btnDel.className = 'coherence-section-btn btn-danger';
            btnDel.onclick = (e) => {
                e.preventDefault(); e.stopPropagation();
                if(confirm("Delete this section?")) {
                    sec.remove();
                }
            };
            
            toolbar.append(btnUp, btnDown, btnDup, btnDel);
            sec.prepend(toolbar);
        });
    }
    
    function interceptLinks() {
        const links = document.querySelectorAll('a');
        links.forEach(a => {
            a.addEventListener('click', (e) => {
                if (isActive) {
                    // Always prevent default navigation if we are in Coherence Mode
                    // This allows clicking "Start a Project" to edit the text without moving.
                    e.preventDefault();
                    // Let the event bubble to the text editor handler
                }
            }, false);
        });
    }

    function commitToReality() {
        const clone = document.documentElement.cloneNode(true);
        const engineUI = clone.querySelector('.coherence-ui-glass');
        if (engineUI) engineUI.remove();

        const dirtyEls = clone.querySelectorAll('.coherence-editable, .coherence-image, .coherence-section');
        const toolbars = clone.querySelectorAll('.coherence-section-toolbar');
        
        dirtyEls.forEach(el => {
            el.classList.remove('coherence-editable', 'coherence-image', 'coherence-section');
            el.removeAttribute('contenteditable');
        });
        
        toolbars.forEach(t => t.remove()); // Remove toolbars

        const htmlContent = "<!DOCTYPE html>\n" + clone.outerHTML;
        
        const blob = new Blob([htmlContent], { type: "text/html" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "my_webling.html";
        a.click();

        const btn = document.getElementById('coherence-save');
        const originalText = btn.innerText;
        btn.innerText = "Reality Anchored";
        setTimeout(() => {
            btn.innerText = originalText;
        }, 2000);
    }

    function shutdownEngine() {
        if(confirm("Disengage Coherence Mode? Unsaved changes will be lost.")) {
            location.reload(); 
        }
    }

})();
