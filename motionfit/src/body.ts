export interface Pt {
  x: number
  y: number
}

export interface Landmark {
  x: number
  y: number
  visibility?: number
}

// Upper-body key points in stage pixels (camera image space, not mirrored).
export interface Body {
  shoulderL: Pt
  shoulderR: Pt
  elbowL: Pt
  elbowR: Pt
  wristL: Pt
  wristR: Pt
  hipL: Pt
  hipR: Pt
  nose: Pt
  confidence: number
  hipsEstimated: boolean
  wristVis: { l: number; r: number }
}

// MediaPipe Pose indices.
const I = { nose: 0, shoulderL: 11, shoulderR: 12, elbowL: 13, elbowR: 14, wristL: 15, wristR: 16, hipL: 23, hipR: 24 }

class OneEuro {
  private prev: number | null = null
  private d = 0
  private t = 0
  private readonly minCutoff: number
  private readonly beta: number
  constructor(minCutoff: number, beta: number) {
    this.minCutoff = minCutoff
    this.beta = beta
  }
  filter(x: number, tMs: number) {
    if (this.prev === null) {
      this.prev = x
      this.t = tMs
      return x
    }
    const dt = Math.max((tMs - this.t) / 1000, 1e-3)
    this.t = tMs
    const a = (c: number) => 1 / (1 + 1 / (2 * Math.PI * c * dt))
    this.d = a(1) * ((x - this.prev) / dt) + (1 - a(1)) * this.d
    const k = a(this.minCutoff + this.beta * Math.abs(this.d))
    this.prev = k * x + (1 - k) * this.prev
    return this.prev
  }
}

export interface StageMap {
  // Maps normalized camera coordinates to stage pixels (object-fit: cover).
  toStage: (x: number, y: number) => Pt
  width: number
  height: number
}

export function coverMap(stageW: number, stageH: number, srcW: number, srcH: number): StageMap {
  const scale = Math.max(stageW / srcW, stageH / srcH)
  const dx = (stageW - srcW * scale) / 2
  const dy = (stageH - srcH * scale) / 2
  return { toStage: (x, y) => ({ x: x * srcW * scale + dx, y: y * srcH * scale + dy }), width: stageW, height: stageH }
}

const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y })
const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y })
const mul = (a: Pt, k: number): Pt => ({ x: a.x * k, y: a.y * k })
const len = (a: Pt) => Math.hypot(a.x, a.y)
const norm = (a: Pt): Pt => mul(a, 1 / (len(a) || 1))

// Smooths pose landmarks and fills in what a laptop camera usually can't see (hips, sometimes arms).
export class BodyTracker {
  private filters = new Map<string, OneEuro>()

  private smooth(key: string, p: Pt, t: number): Pt {
    let fx = this.filters.get(key + 'x')
    let fy = this.filters.get(key + 'y')
    if (!fx || !fy) {
      fx = new OneEuro(1.2, 0.02)
      fy = new OneEuro(1.2, 0.02)
      this.filters.set(key + 'x', fx)
      this.filters.set(key + 'y', fy)
    }
    return { x: fx.filter(p.x, t), y: fy.filter(p.y, t) }
  }

  reset() {
    this.filters.clear()
  }

  update(lm: Landmark[] | null, map: StageMap, t: number): Body | null {
    if (!lm || lm.length < 25) return null
    const vis = (i: number) => lm[i].visibility ?? 1
    const confidence = Math.min(vis(I.shoulderL), vis(I.shoulderR))
    if (confidence < 0.5) return null
    const P = (i: number) => map.toStage(lm[i].x, lm[i].y)

    const shoulderL = this.smooth('sl', P(I.shoulderL), t)
    const shoulderR = this.smooth('sr', P(I.shoulderR), t)
    const across = sub(shoulderL, shoulderR)
    const sw = len(across)
    // "Down" is perpendicular to the shoulder line, pointing away from the head.
    let down = norm({ x: -across.y, y: across.x })
    const nose = P(I.nose)
    if ((nose.x - shoulderR.x) * down.x + (nose.y - shoulderR.y) * down.y > 0) down = mul(down, -1)

    const hipsSeen = vis(I.hipL) > 0.5 && vis(I.hipR) > 0.5
    let hipL: Pt
    let hipR: Pt
    if (hipsSeen) {
      hipL = P(I.hipL)
      hipR = P(I.hipR)
    } else {
      const torso = mul(down, sw * 1.35)
      hipL = add(add(shoulderL, torso), mul(across, -0.06))
      hipR = add(add(shoulderR, torso), mul(across, 0.06))
    }
    hipL = this.smooth('hl', hipL, t)
    hipR = this.smooth('hr', hipR, t)

    const arm = (s: Pt, ei: number, wi: number, side: 1 | -1, key: string) => {
      const outward = mul(norm(across), side)
      let elbow = vis(ei) > 0.4 ? P(ei) : add(add(s, mul(down, sw * 0.62)), mul(outward, sw * 0.12))
      elbow = this.smooth(key + 'e', elbow, t)
      let wrist = vis(wi) > 0.4 ? P(wi) : add(elbow, mul(norm(sub(elbow, s)), sw * 0.58))
      wrist = this.smooth(key + 'w', wrist, t)
      return { elbow, wrist }
    }
    const left = arm(shoulderL, I.elbowL, I.wristL, 1, 'l')
    const right = arm(shoulderR, I.elbowR, I.wristR, -1, 'r')

    return {
      shoulderL,
      shoulderR,
      elbowL: left.elbow,
      elbowR: right.elbow,
      wristL: left.wrist,
      wristR: right.wrist,
      hipL,
      hipR,
      nose,
      confidence,
      hipsEstimated: !hipsSeen,
      wristVis: { l: vis(I.wristL), r: vis(I.wristR) },
    }
  }
}
