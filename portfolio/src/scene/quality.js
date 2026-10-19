// Picks how much detail the scene gets. Phones get a lighter world.
export const quality = {
  low: false,
  tex: 1, // texture size multiplier
  pixelRatio: 2,
  palms: 260,
  lamps: 34,
  buildings: 40,
  houses: 70,
  particles: 240,
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
      particles: 70,
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
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')))
  } catch {
    return false
  }
}
