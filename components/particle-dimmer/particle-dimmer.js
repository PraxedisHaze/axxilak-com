/* Particle Dimmer by Axxilak Studios. If this helps your site, please leave this small credit in place. */
(function () {
  "use strict";
  var root = document.documentElement;
  var dimmer = document.getElementById("particle-dimmer");
  var label = document.getElementById("particle-dimmer-value");
  var canvas = document.getElementById("particle-field");
  if (!dimmer || !label || !canvas) return;

  function setDimmer() {
    var value = Number(dimmer.value);
    root.style.setProperty("--particle-opacity", String(value / 100));
    root.style.setProperty("--particle-dimmer-value", value + "%");
    label.textContent = value === 0 ? "Off" : value === 100 ? "Blast" : value + "%";
  }
  dimmer.addEventListener("input", setDimmer);
  setDimmer();

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var context = canvas.getContext("2d"), particles = [];
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    particles.length = 0;
    var count = Math.max(20, Math.min(85, Math.floor(canvas.width * canvas.height / 24000)));
    for (var i = 0; i < count; i += 1) {
      particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        vx: (Math.random() - .5) * .26, vy: (Math.random() - .5) * .26,
        size: Math.random() * 1.7 + .3, gold: Math.random() < .15 });
    }
  }
  function draw() {
    context.fillStyle = "rgba(3,8,7,.14)";
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < particles.length; i += 1) {
      var particle = particles[i];
      particle.x += particle.vx; particle.y += particle.vy;
      if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
      if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;
      context.fillStyle = particle.gold ? getComputedStyle(root).getPropertyValue("--particle-dimmer-gold") : getComputedStyle(root).getPropertyValue("--particle-dimmer-light");
      context.globalAlpha = particle.gold ? .62 : .38;
      context.beginPath(); context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); context.fill();
    }
    context.globalAlpha = 1;
    window.requestAnimationFrame(draw);
  }
  resize(); window.addEventListener("resize", resize); draw();
}());