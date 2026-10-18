import type { Point } from './types'

// Pose features that ignore where the hand is, how big it looks and how it's tilted:
// landmarks relative to the wrist, scaled by palm length, rotated so the middle knuckle points up.
export function handFeatures(lm: Point[]): number[] {
  const o = lm[0]
  const ref = lm[9]
  const s = Math.hypot(ref.x - o.x, ref.y - o.y) || 1e-3
  const a = Math.atan2(ref.x - o.x, -(ref.y - o.y))
  const c = Math.cos(-a)
  const sn = Math.sin(-a)
  const out: number[] = []
  for (let i = 1; i < lm.length; i++) {
    const x = (lm[i].x - o.x) / s
    const y = (lm[i].y - o.y) / s
    out.push(x * c - y * sn, x * sn + y * c)
  }
  return out
}

const rms = (a: number[], b: number[], mirror: boolean) => {
  let sum = 0
  for (let i = 0; i < a.length; i += 2) {
    const dx = (mirror ? -a[i] : a[i]) - b[i]
    const dy = a[i + 1] - b[i + 1]
    sum += dx * dx + dy * dy
  }
  return Math.sqrt(sum / (a.length / 2))
}

// Distance to a template, accepting either hand (a left hand is a mirrored right hand).
export function featureDistance(f: number[], template: number[]) {
  return Math.min(rms(f, template, false), rms(f, template, true))
}

export function buildTemplate(samples: number[][]) {
  const n = samples.length
  const template = samples[0].map((_, i) => samples.reduce((s, v) => s + v[i], 0) / n)
  const spread = samples.reduce((s, v) => s + featureDistance(v, template), 0) / n
  // Loose enough for natural wobble, tight enough to stay apart from other poses.
  const radius = Math.min(0.32, Math.max(0.16, spread * 3))
  return { template, radius }
}
