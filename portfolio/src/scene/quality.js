// Picks how much detail the scene gets. Phones get a lighter world.
export const quality = {
  low: false,
  tex: 1, // texture size multiplier
  pixelRatio: 2,
  palms: 260,
  lamps: 34,
  buildings: 40,
  houses: 70,
  particles: 90,
  clouds: 10,
  fogFar: 460,
  parallax: true,
  exhaust: true,
  seaMotion: true,
  adaptive: true, // lower effects automatically when the frame rate sags
}

export function detectQuality() {
  const small = window.matchMedia('(max-width: 820px)').matches
  const touch = window.matchMedia('(pointer: coarse)').matches
  // ?quality=low or ?quality=high overrides the automatic choice
  const params = new URLSearchParams(location.search)
  const forced = params.get('quality')
  quality.adaptive = !params.has('fixed')
  if (forced === 'low' || (forced !== 'high' && (small || touch))) {
    Object.assign(quality, {
      low: true,
      tex: 0.5,
      pixelRatio: 1.25,
      palms: 90,
      lamps: 14,
      buildings: 16,
      houses: 26,
      particles: 24,
      clouds: 5,
      fogFar: 300,
      parallax: false,
      exhaust: false,
      seaMotion: false,
    })
  }
  quality.pixelRatio = Math.min(quality.pixelRatio, window.devicePixelRatio || 1)
  return quality
}

// True when the browser can create a WebGL context at all.
export function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    // The installed Three.js renderer requires WebGL 2. A WebGL 1 context is
    // not sufficient and would otherwise produce a renderer startup error.
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'))
  } catch {
    return false
  }
}

// Offer an accessible reading path only after the available effect/resolution
// reductions have been exhausted and measured rendering is still unusable.
export function shouldOfferReadable(metrics,adaptive) {
  return !!(adaptive && metrics?.fps>0 && metrics.fps<12 && metrics.dpr<=.76
    && !metrics.ao && !metrics.reflections && !metrics.bloom && !metrics.shadows)
}
