import type { NormalizedLandmark as L } from '@mediapipe/tasks-vision'
import { input } from '../core/input'
import { OneEuro } from './oneEuro'

const PINCH_ON = 0.32
const PINCH_OFF = 0.48
const PALM_HOLD_MS = 700
const ZOOM_GAIN = 2.2

const dist = (a: L, b: L) => Math.hypot(a.x - b.x, a.y - b.y)
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
// Only the middle of the camera frame maps to the screen, so edges are reachable without leaving view.
const remap = (v: number) => clamp01((v - 0.15) / 0.7)

interface HandFrame {
  x: number
  y: number
  pinchRatio: number
  open: boolean
}

function analyze(h: L[]): HandFrame {
  const scale = dist(h[0], h[9]) || 1e-3
  const pinchRatio = dist(h[4], h[8]) / scale
  const extended = [
    [8, 6],
    [12, 10],
    [16, 14],
    [20, 18],
  ].every(([tip, pip]) => dist(h[0], h[tip]) > dist(h[0], h[pip]) * 1.15)
  const mx = (h[4].x + h[8].x) / 2
  const my = (h[4].y + h[8].y) / 2
  return {
    x: remap(1 - mx) * 2 - 1,
    y: -(remap(my) * 2 - 1),
    pinchRatio,
    open: extended && pinchRatio > 0.7,
  }
}

export class GestureEngine {
  private fx = new OneEuro()
  private fy = new OneEuro()
  private lastPinch: boolean[] = []
  private palmSince: number | null = null
  private palmFired = false
  private prevSpread: number | null = null

  update(hands: L[][], t: number): string {
    if (hands.length === 0) {
      input.visible = false
      input.down = false
      input.palmProgress = 0
      this.fx.reset()
      this.fy.reset()
      this.palmSince = null
      this.prevSpread = null
      this.lastPinch = []
      return 'Show your hand'
    }

    // Sorting by screen x keeps per-hand pinch hysteresis stable when two hands swap order.
    const frames = hands.map(analyze).sort((a, b) => a.x - b.x)
    const pinch = frames.map((f, i) => {
      const was = this.lastPinch[i] ?? false
      return was ? f.pinchRatio < PINCH_OFF : f.pinchRatio < PINCH_ON
    })
    this.lastPinch = pinch

    if (frames.length >= 2 && pinch[0] && pinch[1]) {
      const spread = Math.hypot(frames[1].x - frames[0].x, frames[1].y - frames[0].y)
      if (this.prevSpread !== null) input.zoom += (this.prevSpread - spread) * ZOOM_GAIN
      this.prevSpread = spread
      input.x = this.fx.filter((frames[0].x + frames[1].x) / 2, t)
      input.y = this.fy.filter((frames[0].y + frames[1].y) / 2, t)
      input.visible = true
      input.down = false
      this.palmSince = null
      input.palmProgress = 0
      return 'Zoom'
    }
    this.prevSpread = null

    let idx = 0
    if (frames.length > 1) {
      const d = frames.map((f) => Math.hypot(f.x - input.x, f.y - input.y))
      idx = d[0] <= d[1] ? 0 : 1
    }
    const f = frames[idx]
    input.x = this.fx.filter(f.x, t)
    input.y = this.fy.filter(f.y, t)
    input.visible = true
    input.down = pinch[idx]

    if (f.open && !pinch[idx]) {
      this.palmSince ??= t
      input.palmProgress = clamp01((t - this.palmSince) / PALM_HOLD_MS)
      if (input.palmProgress >= 1 && !this.palmFired) {
        input.back = true
        this.palmFired = true
      }
      return 'Open palm'
    }
    this.palmSince = null
    this.palmFired = false
    input.palmProgress = 0
    return pinch[idx] ? 'Pinch' : 'Point'
  }
}
