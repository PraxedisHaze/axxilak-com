(function () {
    'use strict';

    var STAGE_ID = 'cftr-stage';
    var VIEWER_ID = 'cftr-viewer';
    var FALLBACK_ID = 'cftr-fallback';
    var PDB_URL = 'structures/6MSM.pdb';
    var MOL_SRC = 'vendor/3Dmol-min.js';

    function prefersStatic() {
        if (!window.matchMedia) return false;
        // Keep a still only when the visitor asks for reduced motion.
        // Mobile should still show the protein slowly rotating in front of Saturn.
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function hasWebGL() {
        try {
            var canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (err) {
            return false;
        }
    }

    function isMobile() {
        return window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
    }

    function applyStyle(viewer) {
        var thickness = isMobile() ? 0.3 : 0.35;
        viewer.setStyle({}, { cartoon: { color: '#d4af37', style: 'oval', thickness: thickness, arrows: true } });
        viewer.setStyle({ hetflag: true }, { cartoon: { hidden: true } });
        viewer.setStyle({ resn: 'ATP' }, { stick: { color: '#e8d48b', radius: 0.16 } });
        viewer.setStyle({ resn: 'MG' }, { sphere: { color: '#fbf5b7', radius: 0.4 } });
        viewer.setBackgroundColor(0x000000, 0);
        viewer.zoomTo();
        viewer.rotate(90, 'x');
        viewer.rotate(-25, 'y');
        viewer.zoom(isMobile() ? 0.88 : 0.82);
        viewer.render();
    }

    function loadScript(src) {
        return new Promise(function (resolve, reject) {
            if (window.$3Dmol) {
                resolve();
                return;
            }
            var script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = function () { resolve(); };
            script.onerror = function () { reject(new Error('Failed to load 3Dmol.js')); };
            document.head.appendChild(script);
        });
    }

    function startInteractive() {
        var stage = document.getElementById(STAGE_ID);
        var viewerEl = document.getElementById(VIEWER_ID);
        var fallback = document.getElementById(FALLBACK_ID);
        if (!stage || !viewerEl || !window.$3Dmol) return;

        var viewer = window.$3Dmol.createViewer(viewerEl, {
            backgroundColor: 0x000000,
            backgroundAlpha: 0,
            alpha: true,
            antialias: !isMobile(),
            disableFog: true
        });
        viewer.setBackgroundColor(0x000000, 0);

        var spinning = false;
        var raf = 0;
        var spinStep = isMobile() ? 0.1 : 0.12;

        function spin() {
            if (!spinning) return;
            viewer.rotate(spinStep, 'y');
            viewer.render();
            raf = window.requestAnimationFrame(spin);
        }

        function startSpin() {
            if (spinning) return;
            spinning = true;
            raf = window.requestAnimationFrame(spin);
        }

        function stopSpin() {
            spinning = false;
            if (raf) window.cancelAnimationFrame(raf);
            raf = 0;
        }

        fetch(PDB_URL)
            .then(function (res) {
                if (!res.ok) throw new Error('Could not load 6MSM coordinates');
                return res.text();
            })
            .then(function (data) {
                viewer.addModel(data, 'pdb');
                applyStyle(viewer);
                viewerEl.classList.add('is-ready');
                if (fallback) fallback.classList.add('is-behind');
                startSpin();
            })
            .catch(function (err) {
                console.warn('CFTR viewer falling back to still image:', err);
                stopSpin();
                if (fallback) fallback.classList.remove('is-behind');
                viewerEl.classList.remove('is-ready');
            });

        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) startSpin();
                    else stopSpin();
                });
            }, { threshold: 0.15 });
            io.observe(stage);
        }

        window.addEventListener('pagehide', stopSpin);
    }

    function init() {
        var stage = document.getElementById(STAGE_ID);
        if (!stage) return;
        if (prefersStatic() || !hasWebGL()) return;

        var start = function () {
            loadScript(MOL_SRC).then(startInteractive).catch(function (err) {
                console.warn('CFTR viewer unavailable:', err);
            });
        };

        if ('IntersectionObserver' in window) {
            var boot = new IntersectionObserver(function (entries, observer) {
                if (entries.some(function (e) { return e.isIntersecting; })) {
                    observer.disconnect();
                    start();
                }
            }, { rootMargin: '200px 0px', threshold: 0.05 });
            boot.observe(stage);
        } else {
            start();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
