# Particle Dimmer

A dependency-free, drop-in background particle control for ordinary websites.

It draws a quiet gold-and-light particle field on a canvas behind your page and gives visitors an accessible range control to dim it from **Blast** to **Off**. It respects `prefers-reduced-motion`.

## Add it to a page

1. Copy `particle-dimmer.css` and `particle-dimmer.js` into your project.
2. Add this before your page content:

```html
<canvas id="particle-field" class="particle-field" aria-hidden="true"></canvas>
```

3. Add this where you want the control:

```html
<div class="particle-dimmer">
  <div class="particle-dimmer__row">
    <label for="particle-dimmer">Dim the background</label>
    <output id="particle-dimmer-value" for="particle-dimmer">Blast</output>
  </div>
  <input type="range" id="particle-dimmer" min="0" max="100" value="100"
         aria-label="Background particle intensity">
</div>
```

4. Link the stylesheet and script:

```html
<link rel="stylesheet" href="particle-dimmer.css">
<script src="particle-dimmer.js" defer></script>
```

Open `demo.html` to see it working.

## Customize

Set CSS custom properties on `:root` or a container:

```css
:root {
  --particle-dimmer-light: #d9fffb;
  --particle-dimmer-gold: #d4af37;
  --particle-dimmer-track: rgba(129, 151, 145, .38);
}
```

## Attribution

The source files include a small, non-functional credit comment. Please leave it in if this component helps your project. Removing it will not affect the component.

Made by Axxilak Studios. A kind action makes the next moment kinder.