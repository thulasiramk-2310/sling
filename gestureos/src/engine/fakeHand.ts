import type { Point } from './types'

export type FakePose = 'open' | 'point' | 'pinch' | 'fist' | 'scroll' | 'victory' | 'rock' | 'thumbsUp'

// Builds 21 plausible MediaPipe landmarks for a right hand facing the camera, in camera coordinates.
// cx/cy is the middle-finger knuckle; s is roughly the palm length.
export function fakeHand(pose: FakePose, cx = 0.5, cy = 0.5, s = 0.16): Point[] {
  const p = (dx: number, dy: number): Point => ({ x: cx + dx * s, y: cy + dy * s, z: 0 })
  const lm: Point[] = new Array(21)
  lm[0] = p(0, 1.0)
  const mcp: Record<string, [number, number]> = {
    index: [-0.35, 0],
    middle: [-0.1, -0.05],
    ring: [0.15, -0.02],
    pinky: [0.38, 0.05],
  }
  const base = { index: 5, middle: 9, ring: 13, pinky: 17 } as const
  const extended = new Set<string>()
  if (pose === 'open') ['index', 'middle', 'ring', 'pinky'].forEach((f) => extended.add(f))
  if (pose === 'point' || pose === 'pinch') extended.add('index')
  if (pose === 'scroll' || pose === 'victory') ['index', 'middle'].forEach((f) => extended.add(f))
  if (pose === 'rock') ['index', 'pinky'].forEach((f) => extended.add(f))

  for (const f of ['index', 'middle', 'ring', 'pinky'] as const) {
    const [mx, my] = mcp[f]
    const i = base[f]
    lm[i] = p(mx, my)
    if (extended.has(f)) {
      let spreadX = 0
      if (pose === 'victory') spreadX = f === 'index' ? -0.35 : 0.25
      lm[i + 1] = p(mx + spreadX * 0.45, my - 0.45)
      lm[i + 2] = p(mx + spreadX * 0.75, my - 0.75)
      lm[i + 3] = p(mx + spreadX, my - 1.0)
    } else {
      lm[i + 1] = p(mx, my - 0.3)
      lm[i + 2] = p(mx, my - 0.15)
      lm[i + 3] = p(mx, my + 0.1)
    }
  }

  lm[1] = p(-0.3, 0.75)
  if (pose === 'open' || pose === 'rock') {
    lm[2] = p(-0.6, 0.55)
    lm[3] = p(-0.85, 0.35)
    lm[4] = p(-1.05, 0.15)
  } else if (pose === 'thumbsUp') {
    lm[2] = p(-0.5, 0.3)
    lm[3] = p(-0.55, -0.1)
    lm[4] = p(-0.62, -0.6)
  } else {
    lm[2] = p(-0.45, 0.6)
    lm[3] = p(-0.35, 0.35)
    lm[4] = p(-0.15, 0.25)
  }

  if (pose === 'pinch') {
    // Index bends toward the thumb and the tips touch.
    lm[6] = p(-0.45, -0.35)
    lm[7] = p(-0.55, -0.45)
    lm[8] = p(-0.6, -0.35)
    lm[2] = p(-0.6, 0.45)
    lm[3] = p(-0.7, 0.1)
    lm[4] = p(-0.62, -0.33)
  }
  return lm
}
