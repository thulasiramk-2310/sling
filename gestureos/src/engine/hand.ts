import type { Point } from './types'

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

export interface HandInfo {
  scale: number
  pinchRatio: number
  // How far the index tip reaches from its knuckle; a closed fist keeps it tucked in.
  indexReach: number
  index: boolean
  middle: boolean
  ring: boolean
  pinky: boolean
  thumbOut: boolean
  thumbUp: boolean
  // Gap between index and middle tips: small for the scroll pose, large for a peace sign.
  spread: number
  // Mirrored camera coordinates (x grows to the user's right).
  // The cursor anchors on the knuckles because they barely move while the fingers pinch.
  anchor: Point
  pinchPoint: Point
  palm: Point
  twoFinger: Point
}

// Classifies finger states from 21 MediaPipe hand landmarks, in camera-normalized coordinates.
export function analyzeHand(lm: Point[]): HandInfo {
  const scale = dist(lm[0], lm[9]) || 1e-3
  const extended = (tip: number, pip: number, mcp: number) =>
    dist(lm[0], lm[tip]) > dist(lm[0], lm[pip]) * 1.12 && dist(lm[tip], lm[mcp]) / scale > 0.45
  const thumbOut = dist(lm[4], lm[5]) / scale > 0.55 && dist(lm[4], lm[9]) > dist(lm[3], lm[9])
  const mirror = (p: Point): Point => ({ x: 1 - p.x, y: p.y })
  const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
  return {
    scale,
    pinchRatio: dist(lm[4], lm[8]) / scale,
    indexReach: dist(lm[8], lm[5]) / scale,
    index: extended(8, 6, 5),
    middle: extended(12, 10, 9),
    ring: extended(16, 14, 13),
    pinky: extended(20, 18, 17),
    thumbOut,
    thumbUp: thumbOut && lm[4].y < lm[3].y && lm[3].y < lm[2].y && (lm[2].y - lm[4].y) / scale > 0.35,
    spread: dist(lm[8], lm[12]) / scale,
    anchor: mirror(mid(lm[5], lm[9])),
    pinchPoint: mirror(mid(lm[4], lm[8])),
    palm: mirror(mid(lm[0], lm[9])),
    twoFinger: mirror(mid(lm[8], lm[12])),
  }
}
