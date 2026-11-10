// Saturn scene ported from Keystone Constellation (js/flower_of_life_3d.js setupPlanet + post-swoop camera).
// Flower-of-Life geometry, polar cap, and cyan pole light are omitted in this deploy (cap follows separately).
import * as THREE from '../vendor/three.module.min.js';

(function () {
    'use strict';

    var STAGE_ID = 'saturn-stage';
    var FALLBACK_ID = 'saturn-fallback';
    var MAP_URL = 'assets/saturn/saturn_map2.jpg';

    function prefersStatic() {
        if (!window.matchMedia) return false;
        return window.matchMedia('(max-width: 768px)').matches
            || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function hasWebGL() {
        try {
            var canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (err) {
            return false;
        }
    }

    function showFallback() {
        var fallback = document.getElementById(FALLBACK_ID);
        var stage = document.getElementById(STAGE_ID);
        if (fallback) fallback.classList.add('is-visible');
        if (stage) stage.classList.remove('is-ready');
    }

    function headerHeight() {
        var header = document.querySelector('.site-nav-header') || document.querySelector('header');
        return header ? Math.ceil(header.getBoundingClientRect().height) : 0;
    }

    function startInteractive() {
        var stage = document.getElementById(STAGE_ID);
        var fallback = document.getElementById(FALLBACK_ID);
        if (!stage) {
            showFallback();
            return;
        }

        var planetRadius = 40;

        var scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x030303, 0.005);

        var camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
        // Keystone post-swoop framing: camera (35, 15, 85), lookAt (0, planetRadius * 0.4, 0)
        camera.position.set(35, 15, 85);
        camera.lookAt(0, planetRadius * 0.4, 0);

        var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: false });
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        // Slightly lower than Keystone's 0.9 so ACES doesn't over-cook the yellows.
        renderer.toneMappingExposure = 0.82;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        stage.innerHTML = '';
        stage.appendChild(renderer.domElement);

        function applyHeaderFraming() {
            var w = window.innerWidth;
            var h = window.innerHeight;
            var headerH = headerHeight();
            if (headerH > 0 && h - headerH > 80) {
                // Map Keystone's composition into the visible area below the opaque nav,
                // so the globe is not cropped flat under the header.
                camera.setViewOffset(w, h - headerH, 0, -headerH, w, h);
            } else if (camera.clearViewOffset) {
                camera.clearViewOffset();
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
            }
            renderer.setSize(w, h);
        }

        var textureLoader = new THREE.TextureLoader();

        function colorSpace(tex) {
            if (!tex) return tex;
            if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
            else if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
            return tex;
        }

        // 1. The True Saturn Globe — Keystone material, no added emissive or fill lights
        var geometry = new THREE.SphereGeometry(planetRadius, 64, 64);
        var mapTex = colorSpace(textureLoader.load(MAP_URL));
        var material = new THREE.MeshStandardMaterial({
            map: mapTex,
            bumpMap: mapTex,
            bumpScale: 0.15,
            roughness: 0.8,
            metalness: 0.0,
            emissive: new THREE.Color(0x000000),
            // Pale cream multiply: knocks the globe back from saturated yellow
            // toward Cassini-like butterscotch without changing the map itself.
            color: new THREE.Color(0xf0eadc)
        });
        material.onBeforeCompile = function (shader) {
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <color_fragment>',
                '#include <color_fragment>\n' +
                '                float _satLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));\n' +
                '                diffuseColor.rgb = mix(vec3(_satLuma), diffuseColor.rgb, 0.58);\n' +
                '                diffuseColor.rgb *= vec3(1.02, 0.96, 0.90);\n' +
                '                diffuseColor.rgb += vec3(0.03, 0.025, 0.02);\n'
            );
        };
        var planet = new THREE.Mesh(geometry, material);
        planet.receiveShadow = true;
        planet.castShadow = true;
        // Keystone settled tilt after the cinematic swoop (~31°)
        planet.rotation.z = 0.55;

        // 2. The Magnificent Rings
        var innerRad = planetRadius * 1.2;
        var outerRad = planetRadius * 2.3;
        var ringGeo = new THREE.RingGeometry(innerRad, outerRad, 128);
        var pos = ringGeo.attributes.position;
        var v3 = new THREE.Vector3();
        for (var i = 0; i < pos.count; i++) {
            v3.fromBufferAttribute(pos, i);
            var len = v3.length();
            var v = (len - innerRad) / (outerRad - innerRad);
            ringGeo.attributes.uv.setXY(i, v, 1);
        }

        var ringColorTex = colorSpace(textureLoader.load(window.SATURN_RING_COLOR));
        var ringAlphaTex = textureLoader.load(window.SATURN_RING_ALPHA);

        var ringUniforms = {
            planetRadius: { value: planetRadius },
            sunDirection: { value: new THREE.Vector3(1, 0, 0) }
        };

        var altheaCompile = function (shader) {
            shader.uniforms.planetRadius = ringUniforms.planetRadius;
            shader.uniforms.sunDirection = ringUniforms.sunDirection;
            shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                '#include <common>\n                 varying vec3 vWorldPosition;'
            );
            shader.vertexShader = shader.vertexShader.replace(
                '#include <worldpos_vertex>',
                '#include <worldpos_vertex>\n                 vWorldPosition = worldPosition.xyz;'
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                '#include <common>\n                 varying vec3 vWorldPosition;\n                 uniform float planetRadius;\n                 uniform vec3 sunDirection;'
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <emissivemap_fragment>',
                '#include <emissivemap_fragment>\n                 vec3 dirToSun = normalize(sunDirection);\n                 vec3 toPlanetCenter = -vWorldPosition;\n                 float t = dot(toPlanetCenter, dirToSun);\n                 float shadowFactor = 1.0;\n                 if (t > 0.0) {\n                   vec3 closest = toPlanetCenter - dirToSun * t;\n                   if (dot(closest, closest) < planetRadius * planetRadius) {\n                     shadowFactor = 0.0;\n                   }\n                 }\n                 vec3 fragOrbitDir = normalize(-toPlanetCenter);\n                 float dayNightDot = dot(fragOrbitDir, dirToSun);\n                 if (dayNightDot < 0.0) {\n                     float nightFade = smoothstep(-0.25, 0.0, dayNightDot);\n                     shadowFactor *= nightFade;\n                 }\n                 totalEmissiveRadiance *= shadowFactor;'
            );
        };

        var ringMat = new THREE.MeshStandardMaterial({
            map: ringColorTex,
            alphaMap: ringAlphaTex,
            alphaTest: 0.1,
            transparent: true,
            depthWrite: true,
            side: THREE.DoubleSide,
            color: 0xffffff,
            roughness: 0.8,
            emissive: new THREE.Color(0xffcc88),
            emissiveIntensity: 0.35,
            emissiveMap: ringAlphaTex
        });
        ringMat.onBeforeCompile = altheaCompile;

        var rings = new THREE.Mesh(ringGeo, ringMat);
        rings.rotation.x = -Math.PI / 2;
        rings.castShadow = true;
        rings.receiveShadow = true;
        rings.frustumCulled = false;
        rings.customDepthMaterial = new THREE.MeshDepthMaterial({
            depthPacking: THREE.RGBADepthPacking,
            alphaMap: ringAlphaTex,
            alphaTest: 0.1,
            side: THREE.DoubleSide
        });
        planet.add(rings);
        scene.add(planet);

        // Keystone lighting — no added fill/rim/ambient boosts
        var ambient = new THREE.AmbientLight(0xffffff, 0.01);
        scene.add(ambient);

        var dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
        dirLight.position.set(100, 10, -20);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 4096;
        dirLight.shadow.mapSize.height = 4096;
        dirLight.shadow.camera.near = 1;
        dirLight.shadow.camera.far = 600;
        dirLight.shadow.camera.left = -planetRadius * 2.5;
        dirLight.shadow.camera.right = planetRadius * 2.5;
        dirLight.shadow.camera.top = planetRadius * 2.5;
        dirLight.shadow.camera.bottom = -planetRadius * 2.5;
        dirLight.shadow.camera.updateProjectionMatrix();
        dirLight.shadow.bias = -0.0005;
        dirLight.shadow.normalBias = 0;
        scene.add(dirLight);

        applyHeaderFraming();

        var spinning = true;
        var raf = 0;
        var last = performance.now();
        function tick(now) {
            if (!spinning) return;
            var dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            planet.rotation.y -= 0.05 * dt;
            window.__saturnRotationY = planet.rotation.y;
            window.__saturnSpinRate = -0.05;
            if (ringUniforms && dirLight) {
                ringUniforms.sunDirection.value.copy(dirLight.position).normalize();
            }
            renderer.render(scene, camera);
            raf = window.requestAnimationFrame(tick);
        }

        window.addEventListener('resize', applyHeaderFraming);

        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    spinning = entry.isIntersecting;
                    if (spinning && !raf) {
                        last = performance.now();
                        raf = window.requestAnimationFrame(tick);
                    }
                    if (!spinning && raf) {
                        window.cancelAnimationFrame(raf);
                        raf = 0;
                    }
                });
            }, { threshold: 0.01 });
            io.observe(stage);
        }

        window.addEventListener('pagehide', function () {
            spinning = false;
            if (raf) window.cancelAnimationFrame(raf);
            raf = 0;
        });

        stage.classList.add('is-ready');
        if (fallback) fallback.classList.add('is-behind');
        last = performance.now();
        raf = window.requestAnimationFrame(tick);
    }

    function init() {
        if (prefersStatic() || !hasWebGL()) {
            showFallback();
            return;
        }
        if (!window.SATURN_RING_COLOR || !window.SATURN_RING_ALPHA) {
            // ring data URLs are loaded by saturn-ring-textures.js immediately before this module
            showFallback();
            return;
        }
        startInteractive();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
