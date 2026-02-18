/**
 * Axxilak Nine-Bar Photo Transition
 * Cinematic 9-bar vertical sweep revealing 3 photos sequentially
 * Designed for: Canvas webling theme toggle
 *
 * Animation sequence:
 *   Phase 1 (0-300ms): Bars 1-3 swipe down (Photo 1 revealed)
 *   Phase 2 (300-600ms): Bars 4-6 swipe up (Photo 2 revealed)
 *   Phase 3 (600-900ms): Bars 7-9 swipe down (Photo 3 revealed)
 *   Callback fires at 900ms
 *   Cleanup (900-1200ms): Fade out and reset
 */

class NineBarPhoto {
  constructor() {
    // CRITICAL: Preload images immediately to prevent blank flicker on first trigger
    this.photos = [
      'https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=2000',  // Photo 1: Light texture (left - abstract)
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=2000',  // Photo 2: Minimalist gallery (middle - flowers/balance)
      'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=2000'   // Photo 3: Architectural void (right - abstract)
    ]

    // Preload all images in memory before any animation
    this.photos.forEach(url => {
      const img = new Image()
      img.src = url
    })

    // Create overlay container
    this.overlay = document.createElement('div')
    this.overlay.id = 'nine-bar-transition'
    this.overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 999999;
      pointer-events: none;
      opacity: 0;
      display: grid;
      grid-template-columns: repeat(9, 11.2%);
      grid-gap: 0;
      gap: 0;
      transition: opacity 0.3s;
    `

    // Create 9 bars with background images
    // Each section (3 bars) uses one photo, stretched horizontally to 300% width
    // INITIAL STATE: Bars start OFF-SCREEN (gate is OPEN, revealing current theme)
    // Bars 1-3 (indices 0-2): off top (translateY -100vh)
    // Bars 4-6 (indices 3-5): off bottom (translateY 100vh)
    // Bars 7-9 (indices 6-8): off top (translateY -100vh)
    this.bars = []
    for (let i = 0; i < 9; i++) {
      const bar = document.createElement('div')
      const photoIndex = Math.floor(i / 3)  // 0, 0, 0, 1, 1, 1, 2, 2, 2
      const offsetX = (i % 3) * 50  // 0%, 50%, 100% for each section

      // Set initial position: bars 0-2 and 6-8 go up, bars 3-5 go down
      const initialY = (i < 3 || i >= 6) ? '-100vh' : '100vh'

      bar.style.cssText = `
        background-image: url('${this.photos[photoIndex]}');
        background-size: 300% 100%;
        background-position: ${offsetX}% 0;
        background-repeat: no-repeat;
        transform: translateY(${initialY});
        transition: transform 0.3s ease-in-out;
        will-change: transform;
      `

      this.bars.push(bar)
      this.overlay.appendChild(bar)
    }

    document.body.appendChild(this.overlay)
    this.active = false
  }

  trigger(callback) {
    // Prevent overlapping animations
    if (this.active) return

    this.active = true
    this.overlay.style.opacity = '1'
    this.overlay.style.pointerEvents = 'auto'

    // Track animation start time for pause-window detection (click-and-hold feature)
    const animationStartTime = Date.now()

    // Phase 1 (0-300ms): ALL bars slide IN to center (CLOSE the gate)
    // Bars slide from off-screen to translateY(0), covering screen with photos
    setTimeout(() => {
      // Bars 1-3: from -100vh to 0 (close downward)
      this.bars[0].style.transform = 'translateY(0)'
      this.bars[1].style.transform = 'translateY(0)'
      this.bars[2].style.transform = 'translateY(0)'

      // Bars 4-6: from 100vh to 0 (close upward)
      this.bars[3].style.transform = 'translateY(0)'
      this.bars[4].style.transform = 'translateY(0)'
      this.bars[5].style.transform = 'translateY(0)'

      // Bars 7-9: from -100vh to 0 (close downward)
      this.bars[6].style.transform = 'translateY(0)'
      this.bars[7].style.transform = 'translateY(0)'
      this.bars[8].style.transform = 'translateY(0)'
    }, 0)

    // Callback fires at 300ms: theme changes while bars are fully closed (hidden)
    // This ensures seamless transition - user sees NO visible theme change
    setTimeout(() => {
      if (callback) callback()
    }, 300)

    // Phase 2 (300-1300ms): Pause
    // Gate is closed, photos visible on new theme, user sees them for 1 full second
    // USER CAN CLICK AND HOLD DURING THIS PHASE TO ADMIRE THE PHOTOS

    // Define slide-out animation (bars return to off-screen)
    // Extracted as function so we can cancel/reschedule on click-and-hold
    const performSlideOut = () => {
      // Bars 1-3 & 7-9: back to -100vh (off top)
      this.bars[0].style.transform = 'translateY(-100vh)'
      this.bars[1].style.transform = 'translateY(-100vh)'
      this.bars[2].style.transform = 'translateY(-100vh)'

      // Bars 4-6: back to 100vh (off bottom)
      this.bars[3].style.transform = 'translateY(100vh)'
      this.bars[4].style.transform = 'translateY(100vh)'
      this.bars[5].style.transform = 'translateY(100vh)'

      // Bars 7-9: back to -100vh (off top)
      this.bars[6].style.transform = 'translateY(-100vh)'
      this.bars[7].style.transform = 'translateY(-100vh)'
      this.bars[8].style.transform = 'translateY(-100vh)'
    }

    // Phase 3 (1300-1600ms): ALL bars slide OUT (OPEN the gate)
    // Store timeout ID so we can cancel on mousedown during pause
    this.slideOutTimeoutId = setTimeout(performSlideOut, 1300)

    // Click-and-hold pause: If user clicks/holds during pause window (300-1300ms),
    // freeze bars. Release mouse to continue animation.
    const handleMouseDown = (e) => {
      const timeSinceStart = Date.now() - animationStartTime
      // Check if we're in the pause window (300-1300ms)
      if (timeSinceStart >= 300 && timeSinceStart < 1300) {
        // Cancel the scheduled slide-out to freeze bars
        clearTimeout(this.slideOutTimeoutId)
      }
    }

    const handleMouseUp = (e) => {
      const timeSinceStart = Date.now() - animationStartTime
      // If we're still in the pause window, reschedule slide-out
      if (timeSinceStart >= 300 && timeSinceStart < 1300) {
        // Calculate remaining time until slide-out should happen
        const remainingTime = 1300 - timeSinceStart
        this.slideOutTimeoutId = setTimeout(performSlideOut, remainingTime)
      }
    }

    this.overlay.addEventListener('mousedown', handleMouseDown)
    this.overlay.addEventListener('mouseup', handleMouseUp)

    // Cleanup (1900ms): Fade out overlay and reset state
    setTimeout(() => {
      this.active = false
      this.overlay.style.opacity = '0'

      // Remove event listeners
      this.overlay.removeEventListener('mousedown', handleMouseDown)
      this.overlay.removeEventListener('mouseup', handleMouseUp)

      // After fade completes, reset pointer-events
      setTimeout(() => {
        this.overlay.style.pointerEvents = 'none'
      }, 300)
    }, 1900)
  }
}

// Global registration: Drop-in replacement for brush-stroke.js
window.AxxilakTransition = new NineBarPhoto()
