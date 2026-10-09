/**
 * AXXILAK MASTER INSIGNIA — WARP DRIVE ENGINE
 * 
 * Features:
 * - Dynamic Canvas sizing with devicePixelRatio crispness
 * - Barycenter anchor aligned directly behind the Axxilak rune mark
 * - Cruise speed (1.2) with delicate twinkling cosmic star specks
 * - Hover acceleration to Warp Speed (7.5) radiating light streaks
 * - Click trigger to Hyperspace Burst (16.0)
 * - Multi-hue cosmic star spectrum (Diamond White, Amber Gold, Cyan, Soft Violet)
 * - Zero performance impact when offscreen (ResizeObserver / lightweight loop)
 */
(function initAxxilakWarp() {
  function setupWarp(container) {
    if (container.dataset.warpInitialized === 'true') return;
    container.dataset.warpInitialized = 'true';

    let canvas = container.querySelector('.warp-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'warp-canvas';
      container.insertBefore(canvas, container.firstChild);
    }

    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let dpr = window.devicePixelRatio || 1;

    // Speeds: barely moving when sitting still (0.2), accelerating to initial cruise on hover (1.3)
    const REST_SPEED = 0.2;
    const HOVER_SPEED = 1.3;
    let currentSpeed = REST_SPEED;
    let targetSpeed = REST_SPEED;

    const starColors = [
      'rgba(255, 255, 255, ',    // Diamond White
      'rgba(255, 201, 60, ',     // Amber Gold
      'rgba(56, 189, 248, ',     // Cyan Starlight
      'rgba(192, 132, 252, '     // Soft Violet
    ];

    const STAR_COUNT = 75;
    const stars = [];

    function getBarycenter() {
      const mark = container.querySelector('.axxilak-mark-lens');
      if (mark) {
        const mRect = mark.getBoundingClientRect();
        const cRect = container.getBoundingClientRect();
        return {
          x: (mRect.left - cRect.left + mRect.width / 2),
          y: (mRect.top - cRect.top + mRect.height / 2)
        };
      }
      return { x: width * 0.15, y: height * 0.5 };
    }

    let barycenter = { x: 40, y: 24 };

    function resize() {
      const rect = container.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      if (width === 0 || height === 0) return;
      dpr = window.devicePixelRatio || 1;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      barycenter = getBarycenter();
    }

    function createStar(initialSpread = false) {
      const angle = Math.random() * Math.PI * 2;
      const maxDist = Math.hypot(width, height) || 300;
      const dist = initialSpread ? Math.random() * maxDist : Math.random() * 8 + 2;
      return {
        angle: angle,
        dist: dist,
        prevDist: dist,
        size: Math.random() * 1.4 + 0.6,
        colorPrefix: starColors[Math.floor(Math.random() * starColors.length)],
        alpha: Math.random() * 0.6 + 0.4,
        speedMult: Math.random() * 0.5 + 0.75
      };
    }

    function initStars() {
      stars.length = 0;
      for (let i = 0; i < STAR_COUNT; i++) {
        stars.push(createStar(true));
      }
    }

    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => resize());
      ro.observe(container);
    } else {
      window.addEventListener('resize', resize);
    }
    resize();
    initStars();

    container.addEventListener('mouseenter', () => { targetSpeed = HOVER_SPEED; });
    container.addEventListener('mouseleave', () => { targetSpeed = REST_SPEED; });

    let lastTime = performance.now();

    function animate(now) {
      requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 16.666, 2.5);
      lastTime = now;

      currentSpeed += (targetSpeed - currentSpeed) * (0.05 * dt);
      ctx.clearRect(0, 0, width, height);

      const maxDist = Math.hypot(width, height) || 300;
      const bx = barycenter.x;
      const by = barycenter.y;

      // Speed progress from resting drift (0.0) to hover cruise (1.0)
      const accelRatio = Math.max(0, Math.min((currentSpeed - REST_SPEED) / (HOVER_SPEED - REST_SPEED), 1.0));

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.prevDist = s.dist;

        // Radial displacement outward from barycenter
        const moveDelta = (currentSpeed * s.speedMult * 1.3) * (1 + (s.dist / maxDist) * 1.2) * dt;
        s.dist += moveDelta;

        if (s.dist > maxDist) {
          stars[i] = createStar(false);
          continue;
        }

        const cos = Math.cos(s.angle);
        const sin = Math.sin(s.angle);
        const x = bx + cos * s.dist;
        const y = by + sin * s.dist;
        const px = bx + cos * s.prevDist;
        const py = by + sin * s.prevDist;

        const opacity = Math.min(s.alpha * (0.55 + accelRatio * 0.45), 1.0);

        if (currentSpeed > 0.4) {
          // Graceful motion trail on hover acceleration
          const streakLen = Math.hypot(x - px, y - py);
          const tailScale = 1.0 + accelRatio * 1.6;
          const tx = x - cos * (streakLen * tailScale);
          const ty = y - sin * (streakLen * tailScale);

          const grad = ctx.createLinearGradient(tx, ty, x, y);
          grad.addColorStop(0, `${s.colorPrefix}0)`);
          grad.addColorStop(1, `${s.colorPrefix}${opacity.toFixed(2)})`);

          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(x, y);
          ctx.strokeStyle = grad;
          ctx.lineWidth = s.size * (0.8 + accelRatio * 0.4);
          ctx.lineCap = 'round';
          ctx.stroke();
        } else {
          // Sitting still: subtle, barely-moving cosmic starlight specks
          ctx.beginPath();
          ctx.arc(x, y, s.size * 0.75, 0, Math.PI * 2);
          ctx.fillStyle = `${s.colorPrefix}${opacity.toFixed(2)})`;
          ctx.fill();
        }
      }
    }
    requestAnimationFrame(animate);
  }

  function initAll() {
    document.querySelectorAll('.axxilak-master-insignia').forEach(setupWarp);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
