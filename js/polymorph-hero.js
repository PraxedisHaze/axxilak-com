(function () {
    'use strict';

    var STAGE_ID = 'cftr-stage';
    var VIEWER_ID = 'cftr-viewer';
    var VIEWS = ['mechanical', 'ribbon', 'buckyball', 'cutaway'];
    var VIEW_MORPH = { mechanical: 0, ribbon: 100, buckyball: 200, cutaway: 300 };
    var HOLD_MS = 5000;
    var FADE_MS = 1000;
    var RESUME_MS = 12000;

    function isMobile() {
        return window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
    }
    function prefersReducedMotion() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    function hasWebGL() {
        try {
            var canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (err) {
            return false;
        }
    }

    function startHero() {
        var stage = document.getElementById(STAGE_ID);
        var viewerEl = document.getElementById(VIEWER_ID);
        if (!stage || !viewerEl || !window.THREE) return;
        if (typeof window.PDB_AF !== 'string' || window.PDB_AF.length < 100) {
            console.warn('Polymorph hero: AlphaFold coordinates missing');
            return;
        }

        var THREE = window.THREE;
        var mobile = isMobile();
        var reduced = prefersReducedMotion();

        var renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: true, premultipliedAlpha: false });
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 2));
        renderer.setSize(stage.clientWidth || 800, stage.clientHeight || 500);
        viewerEl.innerHTML = '';
        viewerEl.appendChild(renderer.domElement);

        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(
            40,
            (stage.clientWidth || 800) / (stage.clientHeight || 500),
            0.1,
            1000
        );
        camera.position.set(0, 10, mobile ? 60 : 52);
        camera.lookAt(0, 4, 0);

        scene.add(new THREE.AmbientLight(0xfff0f5, 1.35));
        var dirLight1 = new THREE.DirectionalLight(0xfff5e6, 2.2);
        dirLight1.position.set(20, 40, 30);
        scene.add(dirLight1);
        var dirLight2 = new THREE.DirectionalLight(0x38bdf8, 1.6);
        dirLight2.position.set(-25, -20, -20);
        scene.add(dirLight2);

        var DOMAINS = [
            { name: "TMD1 (Membrane 1)", range: [1, 388], color: 0x38bdf8, hex: "#38bdf8" },
            { name: "NBD1 (Engine 1)", range: [389, 678], color: 0xfacc15, hex: "#facc15" },
            { name: "R-Domain (Regulatory)", range: [679, 836], color: 0xa855f7, hex: "#a855f7" },
            { name: "TMD2 (Membrane 2)", range: [837, 1172], color: 0x0ea5e9, hex: "#0ea5e9" },
            { name: "NBD2 (Engine 2)", range: [1173, 1480], color: 0xeab308, hex: "#eab308" }
        ];

        function getRainbowColor(r, total) {
            total = total || 1480;
            var t = Math.max(0, Math.min(1.0, (r - 1) / (total - 1)));
            var hue = 0.58 - t * 0.72;
            var color = new THREE.Color();
            color.setHSL(hue < 0 ? hue + 1.0 : hue, 0.95, 0.52);
            return color;
        }

        // Parse CA coordinates from the AlphaFold model (same parser as the Polymorph backup).
        var rawCoords = [];
        var lines = window.PDB_AF.split('\n');
        for (var li = 0; li < lines.length; li++) {
            var l = lines[li];
            if (l.slice(0, 4) === 'ATOM' && l.slice(12, 16).trim() === 'CA') {
                var resi = parseInt(l.slice(22, 26).trim(), 10);
                var x = parseFloat(l.slice(30, 38));
                var y = parseFloat(l.slice(38, 46));
                var z = parseFloat(l.slice(46, 54));
                if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                    rawCoords.push({ resi: resi, x: x, y: y, z: z });
                }
            }
        }

        var avgX = 0, avgY = 0, avgZ = 0;
        rawCoords.forEach(function (c) { avgX += c.x; avgY += c.y; avgZ += c.z; });
        avgX /= (rawCoords.length || 1);
        avgY /= (rawCoords.length || 1);
        avgZ /= (rawCoords.length || 1);

        var SCALE = 0.22;
        var normalizedPts = rawCoords.map(function (c) {
            return {
                resi: c.resi,
                pos: new THREE.Vector3((c.x - avgX) * SCALE, (c.y - avgY) * SCALE, (c.z - avgZ) * SCALE)
            };
        });

        var proteinGroup = new THREE.Group();
        proteinGroup.position.y = 3;
        scene.add(proteinGroup);
        // Membrane leaflets stay world-aligned so the cutaway doesn't tumble over the protein.
        var groupCutawayMembrane = new THREE.Group();
        scene.add(groupCutawayMembrane);
        groupCutawayMembrane.position.y = 3;

        var groupMechanical = new THREE.Group();
        var groupRibbon = new THREE.Group();
        var groupBuckyball = new THREE.Group();
        var groupCutaway = new THREE.Group();
        proteinGroup.add(groupMechanical);
        proteinGroup.add(groupRibbon);
        proteinGroup.add(groupBuckyball);
        proteinGroup.add(groupCutaway);

        // A) MOLECULAR RIBBON VIEW — same TubeGeometry + Cα beads as the Polymorph engine.
        var ribbonCurvePts = normalizedPts.map(function (p) { return p.pos; });
        var ribbonCurve = new THREE.CatmullRomCurve3(ribbonCurvePts);
        var TUBULAR_SEGS = Math.min(normalizedPts.length * (mobile ? 1 : 2), mobile ? 280 : 700);
        var RADIAL_SEGS = mobile ? 5 : 8;
        var ribbonGeo = new THREE.TubeGeometry(ribbonCurve, TUBULAR_SEGS, 0.26, RADIAL_SEGS, false);

        var vCount = ribbonGeo.attributes.position.count;
        var rainbowColors = new Float32Array(vCount * 3);
        var j, k, vIdx, tt, resiR, c;
        for (j = 0; j <= TUBULAR_SEGS; j++) {
            tt = j / TUBULAR_SEGS;
            resiR = Math.round(1 + tt * 1479);
            c = getRainbowColor(resiR);
            for (k = 0; k <= RADIAL_SEGS; k++) {
                vIdx = j * (RADIAL_SEGS + 1) + k;
                if (vIdx < vCount) {
                    rainbowColors[vIdx * 3] = c.r;
                    rainbowColors[vIdx * 3 + 1] = c.g;
                    rainbowColors[vIdx * 3 + 2] = c.b;
                }
            }
        }
        ribbonGeo.setAttribute('color', new THREE.BufferAttribute(rainbowColors, 3));
        var ribbonMat = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.32,
            metalness: 0.22,
            transparent: true,
            opacity: 1.0,
            depthWrite: true
        });
        var ribbonMesh = new THREE.Mesh(ribbonGeo, ribbonMat);
        groupRibbon.add(ribbonMesh);

        var beadSegs = mobile ? 6 : 10;
        var beadGeo = new THREE.SphereGeometry(0.38, beadSegs, beadSegs);
        var beadMat = new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.3, transparent: true, opacity: 0.95, depthWrite: false });
        var ribbonBeads = new THREE.InstancedMesh(beadGeo, beadMat, normalizedPts.length);
        var beadDummy = new THREE.Object3D();
        normalizedPts.forEach(function (p, idx) {
            beadDummy.position.copy(p.pos);
            beadDummy.updateMatrix();
            ribbonBeads.setMatrixAt(idx, beadDummy.matrix);
            var col = getRainbowColor(p.resi);
            if (p.resi === 508) col.setHex(0xff0055);
            ribbonBeads.setColorAt(idx, col);
        });
        ribbonBeads.instanceMatrix.needsUpdate = true;
        if (ribbonBeads.instanceColor) ribbonBeads.instanceColor.needsUpdate = true;
        ribbonBeads.frustumCulled = false;
        ribbonBeads.renderOrder = 1;
        groupRibbon.add(ribbonBeads);

        // B) MECHANICAL VIEW (domain tubes) — same construction as the Polymorph engine.
        var mechMaterials = {
            tmd1: new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3, metalness: 0.4, transparent: true, opacity: 1.0 }),
            nbd1: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, metalness: 0.5, emissive: 0x713f12, transparent: true, opacity: 1.0 }),
            rdom: new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.4, metalness: 0.2, transparent: true, opacity: 1.0 }),
            tmd2: new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.3, metalness: 0.4, transparent: true, opacity: 1.0 }),
            nbd2: new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.3, metalness: 0.5, transparent: true, opacity: 1.0 })
        };

        DOMAINS.forEach(function (d) {
            var domainPts = normalizedPts.filter(function (p) {
                return p.resi >= d.range[0] && p.resi <= d.range[1];
            }).map(function (p) { return p.pos; });
            if (domainPts.length > 2) {
                var curve = new THREE.CatmullRomCurve3(domainPts);
                var segs = Math.min(domainPts.length * (mobile ? 1 : 2), mobile ? 160 : 350);
                var g = new THREE.TubeGeometry(curve, segs, 0.38, mobile ? 5 : 8, false);
                var mat = mechMaterials.tmd1;
                if (d.name.indexOf("NBD1") !== -1) mat = mechMaterials.nbd1;
                else if (d.name.indexOf("NBD2") !== -1) mat = mechMaterials.nbd2;
                else if (d.name.indexOf("R-") !== -1) mat = mechMaterials.rdom;
                else if (d.name.indexOf("TMD2") !== -1) mat = mechMaterials.tmd2;
                groupMechanical.add(new THREE.Mesh(g, mat));
            }
        });

        // C) SPACE-FILLING SPHERES (vdW packing) — same instanced Cα spheres.
        var vdwSegs = mobile ? 8 : 12;
        var vdwSphereGeo = new THREE.SphereGeometry(0.85, vdwSegs, vdwSegs);
        var vdwSphereMat = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.2, transparent: true, opacity: 1.0, depthWrite: false });
        var vdwInstanced = new THREE.InstancedMesh(vdwSphereGeo, vdwSphereMat, normalizedPts.length);
        var vdwDummy = new THREE.Object3D();
        normalizedPts.forEach(function (p, idx) {
            vdwDummy.position.copy(p.pos);
            vdwDummy.updateMatrix();
            vdwInstanced.setMatrixAt(idx, vdwDummy.matrix);
            var col = getRainbowColor(p.resi);
            if (p.resi === 508) col.setHex(0xff0044);
            vdwInstanced.setColorAt(idx, col);
        });
        vdwInstanced.instanceMatrix.needsUpdate = true;
        if (vdwInstanced.instanceColor) vdwInstanced.instanceColor.needsUpdate = true;
        vdwInstanced.frustumCulled = false;
        vdwInstanced.renderOrder = 1;
        groupBuckyball.add(vdwInstanced);

        // D) THROUGH-THE-WALL MEMBRANE CUTAWAY — leaflets + cloned mechanical pore.
        var membraneMat = new THREE.MeshStandardMaterial({
            color: 0x334155,
            roughness: 0.6,
            metalness: 0.1,
            transparent: true,
            opacity: 0.4,
            depthWrite: false
        });
        var upperLeaflet = new THREE.Mesh(new THREE.BoxGeometry(44, 3.5, 32), membraneMat);
        upperLeaflet.position.set(2, 5.5, -4);
        groupCutawayMembrane.add(upperLeaflet);
        var lowerLeaflet = new THREE.Mesh(new THREE.BoxGeometry(44, 3.5, 32), membraneMat);
        lowerLeaflet.position.set(2, -5.5, -4);
        groupCutawayMembrane.add(lowerLeaflet);
        var cutawayPore = groupMechanical.clone(true);
        cutawayPore.traverse(function (obj) {
            if (obj.material) {
                obj.material = Array.isArray(obj.material)
                    ? obj.material.map(function (m) { return m.clone(); })
                    : obj.material.clone();
                var mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                mats.forEach(function (m) {
                    m.opacity = 1;
                    m.transparent = true;
                    m.depthWrite = true;
                });
            }
        });
        groupCutaway.add(cutawayPore);

        var State = { view: 'mechanical', morphT: 0 };

        function syncTabs(viewKey) {
            var tabs = document.querySelectorAll('.polymorph-tabs [data-view]');
            for (var i = 0; i < tabs.length; i++) {
                var on = tabs[i].getAttribute('data-view') === viewKey;
                tabs[i].classList.toggle('is-active', on);
                tabs[i].setAttribute('aria-selected', on ? 'true' : 'false');
            }
        }

        function applyMorphT(val) {
            State.morphT = val;
            var t = val / 100;
            var w0 = Math.max(0, 1 - Math.abs(t - 0));
            var w1 = Math.max(0, 1 - Math.abs(t - 1));
            var w2 = Math.max(0, 1 - Math.abs(t - 2));
            var w3 = Math.max(0, 1 - Math.abs(t - 3));

            groupMechanical.visible = w0 > 0.005;
            groupRibbon.visible = w1 > 0.005;
            groupBuckyball.visible = w2 > 0.005;
            groupCutaway.visible = w3 > 0.005;
            groupCutawayMembrane.visible = w3 > 0.005;
            membraneMat.opacity = 0.4 * w3;
            membraneMat.depthWrite = false;

            ribbonMat.opacity = w1;
            ribbonMat.depthWrite = (w1 > 0.7);
            beadMat.opacity = w1 * 0.95;
            // Same depthWrite gate as the ribbon tube / vdW spheres. Without it,
            // low-opacity InstancedMesh beads still write the depth buffer and
            // punch black holes through the connecting tubes mid-crossfade.
            beadMat.depthWrite = (w1 > 0.7);
            vdwSphereMat.opacity = w2;
            vdwSphereMat.depthWrite = (w2 > 0.7);

            Object.keys(mechMaterials).forEach(function (key) {
                var m = mechMaterials[key];
                m.opacity = w0;
                m.depthWrite = (w0 > 0.7);
            });

            var nearestView = 'mechanical';
            if (t > 2.5) nearestView = 'cutaway';
            else if (t > 1.5) nearestView = 'buckyball';
            else if (t > 0.5) nearestView = 'ribbon';
            State.view = nearestView;
            syncTabs(nearestView);
        }

        function setPolymorphView(viewKey, animateFade) {
            var targetVal = VIEW_MORPH[viewKey] !== undefined ? VIEW_MORPH[viewKey] : 0;
            if (!animateFade) {
                applyMorphT(targetVal);
                return;
            }
            fadeFrom = State.morphT;
            fadeTo = targetVal;
            fadeT0 = performance.now();
            fading = true;
        }

        var autoIndex = 0;
        var autoplay = !reduced;
        var holdUntil = performance.now() + HOLD_MS;
        var fading = false;
        var fadeFrom = 0, fadeTo = 0, fadeT0 = 0;
        var spinning = !reduced;
        var raf = 0;
        var autoYaw = 0;
        var userYaw = 0;
        var userPitch = 0;
        var dragging = false;
        var dragPointer = null;
        var gestureMode = 0; // 0 undecided (touch), 1 rotate, 2 let-page-scroll
        var lastPX = 0, lastPY = 0, startPX = 0, startPY = 0;
        var ROT_SLOP = 8;

        function goToView(viewKey, fromUser) {
            var idx = VIEWS.indexOf(viewKey);
            if (idx < 0) return;
            autoIndex = idx;
            setPolymorphView(viewKey, true);
            if (fromUser) {
                autoplay = !reduced;
                holdUntil = performance.now() + RESUME_MS;
            }
        }

        var tabsRoot = document.querySelector('.polymorph-tabs');
        if (tabsRoot) {
            tabsRoot.addEventListener('click', function (ev) {
                var btn = ev.target.closest('[data-view]');
                if (!btn) return;
                ev.preventDefault();
                goToView(btn.getAttribute('data-view'), true);
            });
        }

        function applyProteinPose() {
            proteinGroup.rotation.y = autoYaw + userYaw;
            proteinGroup.rotation.x = userPitch;
        }

        function endDrag(e) {
            if (dragPointer === null) return;
            if (e && e.pointerId !== undefined && e.pointerId !== dragPointer) return;
            if (dragging) {
                if (typeof window.__saturnRotationY === 'number') {
                    userYaw = proteinGroup.rotation.y - window.__saturnRotationY;
                    autoYaw = window.__saturnRotationY;
                } else {
                    userYaw = proteinGroup.rotation.y - autoYaw;
                }
            }
            dragging = false;
            dragPointer = null;
            gestureMode = 0;
            spinning = !reduced;
            renderer.domElement.style.cursor = 'grab';
        }

        var canvasEl = renderer.domElement;
        canvasEl.style.touchAction = 'pan-y';
        canvasEl.style.cursor = 'grab';
        canvasEl.addEventListener('dragstart', function (ev) { ev.preventDefault(); });
        canvasEl.addEventListener('pointerdown', function (ev) {
            if (ev.pointerType === 'mouse' && ev.button !== 0) return;
            dragPointer = ev.pointerId;
            startPX = lastPX = ev.clientX;
            startPY = lastPY = ev.clientY;
            gestureMode = (ev.pointerType === 'touch' || ev.pointerType === 'pen') ? 0 : 1;
            if (gestureMode === 1) {
                dragging = true;
                spinning = false;
                canvasEl.style.cursor = 'grabbing';
                try { canvasEl.setPointerCapture(ev.pointerId); } catch (err) {}
            }
        });
        canvasEl.addEventListener('pointermove', function (ev) {
            if (dragPointer === null || ev.pointerId !== dragPointer) return;
            var dx = ev.clientX - lastPX;
            var dy = ev.clientY - lastPY;
            if (gestureMode === 0) {
                var adx = Math.abs(ev.clientX - startPX);
                var ady = Math.abs(ev.clientY - startPY);
                if (adx < ROT_SLOP && ady < ROT_SLOP) return;
                if (ady > adx) {
                    gestureMode = 2;
                    dragPointer = null;
                    return;
                }
                gestureMode = 1;
                dragging = true;
                spinning = false;
                try { canvasEl.setPointerCapture(ev.pointerId); } catch (err) {}
            }
            if (gestureMode !== 1) return;
            if (ev.cancelable) ev.preventDefault();
            lastPX = ev.clientX;
            lastPY = ev.clientY;
            userYaw += dx * 0.008;
            userPitch += dy * 0.008;
            if (userPitch > 1.05) userPitch = 1.05;
            if (userPitch < -1.05) userPitch = -1.05;
            applyProteinPose();
        }, { passive: false });
        canvasEl.addEventListener('pointerup', endDrag);
        canvasEl.addEventListener('pointercancel', endDrag);

        function onResize() {
            var w = stage.clientWidth || 800;
            var h = stage.clientHeight || 500;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        }
        window.addEventListener('resize', onResize);

        var visible = true;
        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    visible = entry.isIntersecting;
                });
            }, { threshold: 0.05 });
            io.observe(stage);
        }

        function tick(now) {
            raf = window.requestAnimationFrame(tick);
            if (!visible) return;

            if (!dragging && spinning) {
                // Keep the protein turning at exactly the same rate as Saturn.
                // userYaw/userPitch hold any grab-and-spin offset after release.
                if (typeof window.__saturnRotationY === 'number') {
                    autoYaw = window.__saturnRotationY;
                } else {
                    var sdt = 1 / 60;
                    if (typeof now === 'number' && tick.lastNow) sdt = Math.min(0.05, (now - tick.lastNow) / 1000);
                    autoYaw -= 0.05 * sdt;
                }
            }
            applyProteinPose();
            tick.lastNow = now;

            if (!reduced && autoplay) {
                if (fading) {
                    var u = Math.min(1, (now - fadeT0) / FADE_MS);
                    var eased = u * u * (3 - 2 * u);
                    applyMorphT(fadeFrom + (fadeTo - fadeFrom) * eased);
                    if (u >= 1) {
                        fading = false;
                        holdUntil = now + HOLD_MS;
                    }
                } else if (now >= holdUntil) {
                    autoIndex = (autoIndex + 1) % VIEWS.length;
                    setPolymorphView(VIEWS[autoIndex], true);
                }
            } else if (fading) {
                var u2 = Math.min(1, (now - fadeT0) / FADE_MS);
                var eased2 = u2 * u2 * (3 - 2 * u2);
                applyMorphT(fadeFrom + (fadeTo - fadeFrom) * eased2);
                if (u2 >= 1) fading = false;
            }

            renderer.render(scene, camera);
        }

        applyMorphT(0);
        viewerEl.classList.add('is-ready');
        viewerEl.removeAttribute('aria-hidden');
        window.__polymorphHero = {
            setView: function (key) { goToView(key, true); },
            getView: function () { return State.view; },
            pauseCycle: function () { autoplay = false; },
            resumeCycle: function () { autoplay = !reduced; }
        };
        raf = window.requestAnimationFrame(tick);

        window.addEventListener('pagehide', function () {
            spinning = false;
            autoplay = false;
            if (raf) window.cancelAnimationFrame(raf);
            raf = 0;
        });
    }

    function init() {
        if (!hasWebGL()) return;
        if (window.THREE && typeof window.PDB_AF === 'string') {
            startHero();
            return;
        }
        var tries = 0;
        var wait = window.setInterval(function () {
            tries += 1;
            if (window.THREE && typeof window.PDB_AF === 'string') {
                window.clearInterval(wait);
                startHero();
            } else if (tries > 80) {
                window.clearInterval(wait);
                console.warn('Polymorph hero: Three.js or AlphaFold data did not load');
            }
        }, 50);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
