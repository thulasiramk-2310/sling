import type { Pt } from './body'

export interface AirButton {
  id: string
  rect: { left: number; top: number; right: number; bottom: number }
}

export interface AirState {
  hover: string | null
  progress: number
  pressed: string | null
  swipe: 'left' | 'right' | null
}

const DWELL_MS = 900
const SWIPE_WINDOW_MS = 420
const SWIPE_COOLDOWN_MS = 1000

// Whole-arm controls for mirror distance: hover a hand over an on-screen button to press it,
// or sweep a hand across your body to change outfits. Fingers are too small to read reliably from 2 m away.
export class AirControls {
  private dwell: { id: string | null; since: number; locked: string | null } = { id: null, since: 0, locked: null }
  private trails: { t: number; x: number; y: number }[][] = [[], []]
  private lastSwipe = -Infinity

  update(hands: (Pt | null)[], buttons: AirButton[], width: number, t: number): AirState {
    const state: AirState = { hover: null, progress: 0, pressed: null, swipe: null }

    let hovered: string | null = null
    for (const h of hands) {
      if (!h) continue
      const b = buttons.find((b) => h.x > b.rect.left - 14 && h.x < b.rect.right + 14 && h.y > b.rect.top - 14 && h.y < b.rect.bottom + 14)
      if (b) hovered = b.id
    }
    if (this.dwell.locked && hovered !== this.dwell.locked) this.dwell.locked = null
    if (hovered && hovered !== this.dwell.locked) {
      if (this.dwell.id !== hovered) {
        this.dwell.id = hovered
        this.dwell.since = t
      }
      state.hover = hovered
      state.progress = Math.min(1, (t - this.dwell.since) / DWELL_MS)
      if (state.progress >= 1) {
        state.pressed = hovered
        this.dwell.locked = hovered
        this.dwell.id = null
      }
    } else {
      this.dwell.id = null
    }

    hands.forEach((h, i) => {
      const trail = this.trails[i]
      if (!h) {
        trail.length = 0
        return
      }
      trail.push({ t, x: h.x, y: h.y })
      while (trail.length && t - trail[0].t > SWIPE_WINDOW_MS) trail.shift()
      if (t - this.lastSwipe < SWIPE_COOLDOWN_MS || trail.length < 4 || hovered) return
      const dx = h.x - trail[0].x
      const dy = h.y - trail[0].y
      if (Math.abs(dx) > width * 0.26 && Math.abs(dy) < Math.abs(dx) * 0.5) {
        state.swipe = dx > 0 ? 'right' : 'left'
        this.lastSwipe = t
        this.trails = [[], []]
      }
    })
    return state
  }
}
