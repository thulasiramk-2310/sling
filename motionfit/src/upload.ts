import { SLEEVE, TORSO } from './garmentArt'

export interface Pt2 {
  x: number
  y: number
}

// Six points marked on a front-facing product photo (image pixels).
// "Left"/"right" mean the left/right of the photo, not of the wearer.
export interface Markers {
  shoulderL: Pt2
  shoulderR: Pt2
  hemL: Pt2
  hemR: Pt2
  cuffL: Pt2
  cuffR: Pt2
}

export interface UploadSpec {
  image: HTMLCanvasElement
  markers: Markers
  sleeves: 'short' | 'long'
}

const SHORT_SLEEVE_PX = 168
const HEM_Y = 570

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

// Clears the plain studio backdrop around a product photo. The fill grows inward from the edges, so
// white prints, buttons and white garments inside the outline are kept.
export function removePlainBackground(src: HTMLCanvasElement, tolerance = 38) {
  const c = canvas(src.width, src.height)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(src, 0, 0)
  const { width: w, height: h } = c
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  const corners = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + w - 1) * 4]
  const bg = [0, 1, 2].map((k) => corners.reduce((s, i) => s + d[i + k], 0) / 4)
  const dist = (p: number) => Math.hypot(d[p * 4] - bg[0], d[p * 4 + 1] - bg[1], d[p * 4 + 2] - bg[2])
  const seen = new Uint8Array(w * h)
  const stack = new Int32Array(w * h)
  let top = 0
  const seed = (p: number) => {
    if (!seen[p] && dist(p) < tolerance * 1.8) {
      seen[p] = 1
      stack[top++] = p
    }
  }
  for (let x = 0; x < w; x++) {
    seed(x)
    seed((h - 1) * w + x)
  }
  for (let y = 0; y < h; y++) {
    seed(y * w)
    seed(y * w + w - 1)
  }
  while (top) {
    const p = stack[--top]
    const e = dist(p)
    // Pixels near the backdrop colour vanish; the band just above it fades, which softens the edge.
    if (e < tolerance) d[p * 4 + 3] = 0
    else d[p * 4 + 3] = Math.min(d[p * 4 + 3], Math.round(((e - tolerance) / (tolerance * 0.8)) * 255))
    // Only spread through true backdrop, so the fade band stays one step wide.
    if (e >= tolerance) continue
    const x = p % w
    if (x > 0) seed(p - 1)
    if (x < w - 1) seed(p + 1)
    if (p >= w) seed(p - w)
    if (p < w * (h - 1)) seed(p + w)
  }
  ctx.putImageData(img, 0, 0)
  return c
}

// Guesses marker positions from the garment's silhouette so the editor starts close.
export function guessMarkers(src: HTMLCanvasElement, sleeves: 'short' | 'long'): Markers {
  const ctx = src.getContext('2d', { willReadFrequently: true })!
  const { width: w, height: h } = src
  const d = ctx.getImageData(0, 0, w, h).data
  let x0 = w
  let x1 = 0
  let y0 = h
  let y1 = 0
  for (let y = 0; y < h; y += 2)
    for (let x = 0; x < w; x += 2)
      if (d[(y * w + x) * 4 + 3] > 40) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
  if (x1 <= x0 || y1 <= y0) {
    x0 = 0
    x1 = w
    y0 = 0
    y1 = h
  }
  const bw = x1 - x0
  const bh = y1 - y0
  const sy = y0 + bh * 0.1
  const cuffY = y0 + bh * (sleeves === 'long' ? 0.75 : 0.32)
  return {
    shoulderL: { x: x0 + bw * 0.3, y: sy },
    shoulderR: { x: x0 + bw * 0.7, y: sy },
    hemL: { x: x0 + bw * 0.31, y: y1 - bh * 0.02 },
    hemR: { x: x0 + bw * 0.69, y: y1 - bh * 0.02 },
    cuffL: { x: x0 + bw * 0.04, y: cuffY },
    cuffR: { x: x0 + bw * 0.96, y: cuffY },
  }
}

// Draws the source triangle s onto the destination triangle d with an affine warp.
function warpTriangle(ctx: CanvasRenderingContext2D, img: CanvasImageSource, s: [Pt2, Pt2, Pt2], d: [Pt2, Pt2, Pt2]) {
  const [s0, s1, s2] = s
  const [d0, d1, d2] = d
  const den = (s1.x - s0.x) * (s2.y - s0.y) - (s2.x - s0.x) * (s1.y - s0.y)
  if (Math.abs(den) < 1e-6) return
  const a = ((d1.x - d0.x) * (s2.y - s0.y) - (d2.x - d0.x) * (s1.y - s0.y)) / den
  const b = ((d1.y - d0.y) * (s2.y - s0.y) - (d2.y - d0.y) * (s1.y - s0.y)) / den
  const c = ((d2.x - d0.x) * (s1.x - s0.x) - (d1.x - d0.x) * (s2.x - s0.x)) / den
  const dd = ((d2.y - d0.y) * (s1.x - s0.x) - (d1.y - d0.y) * (s2.x - s0.x)) / den
  const e = d0.x - a * s0.x - c * s0.y
  const f = d0.y - b * s0.x - dd * s0.y
  ctx.save()
  ctx.beginPath()
  // Grow the clip a hair so neighbouring triangles don't leave a seam.
  const cx = (d0.x + d1.x + d2.x) / 3
  const cy = (d0.y + d1.y + d2.y) / 3
  const grow = (p: Pt2) => ({ x: p.x + (p.x - cx) * 0.01, y: p.y + (p.y - cy) * 0.01 })
  const [g0, g1, g2] = [grow(d0), grow(d1), grow(d2)]
  ctx.moveTo(g0.x, g0.y)
  ctx.lineTo(g1.x, g1.y)
  ctx.lineTo(g2.x, g2.y)
  ctx.closePath()
  ctx.clip()
  ctx.setTransform(a, b, c, dd, e, f)
  ctx.drawImage(img, 0, 0)
  ctx.restore()
}

// A flat photo reads as a sticker. Darkening toward the sides, where fabric turns away from the light,
// gives it the roundness of cloth over a body. Only painted pixels are touched.
function shadeRound(ctx: CanvasRenderingContext2D, w: number, h: number, edge: number) {
  const g = ctx.createLinearGradient(0, 0, w, 0)
  const e = Math.round(edge * 255)
  const mid = Math.round((1 - (1 - edge) * 0.25) * 255)
  g.addColorStop(0, `rgb(${e},${e},${e})`)
  g.addColorStop(0.22, `rgb(${mid},${mid},${mid})`)
  g.addColorStop(0.5, '#fff')
  g.addColorStop(0.78, `rgb(${mid},${mid},${mid})`)
  g.addColorStop(1, `rgb(${e},${e},${e})`)
  // Shape the gradient to the garment first, so multiplying it can't paint the transparent surround.
  const shade = canvas(w, h)
  const sh = shade.getContext('2d')!
  sh.drawImage(ctx.canvas, 0, 0)
  sh.globalCompositeOperation = 'source-in'
  sh.fillStyle = g
  sh.fillRect(0, 0, w, h)
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalCompositeOperation = 'multiply'
  ctx.drawImage(shade, 0, 0)
  ctx.restore()
}

const lerp = (p: Pt2, q: Pt2, k: number): Pt2 => ({ x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k })

// Maps the marked photo into the same torso/sleeve texture layout the procedural garments use.
export function buildTextures(spec: UploadSpec) {
  const { image, markers: m } = spec
  const torso = canvas(TORSO.w, TORSO.h)
  const tctx = torso.getContext('2d')!
  // Extend above the shoulder line so collars and necklines survive.
  const k = (TORSO.shoulderY - 30) / (HEM_Y - TORSO.shoulderY)
  const topL = lerp(m.shoulderL, m.hemL, -k)
  const topR = lerp(m.shoulderR, m.hemR, -k)
  const T = { tl: { x: TORSO.shoulderL, y: 30 }, tr: { x: TORSO.shoulderR, y: 30 }, bl: { x: 104, y: HEM_Y }, br: { x: 408, y: HEM_Y } }
  warpTriangle(tctx, image, [topL, topR, m.hemL], [T.tl, T.tr, T.bl])
  warpTriangle(tctx, image, [topR, m.hemR, m.hemL], [T.tr, T.br, T.bl])
  shadeRound(tctx, TORSO.w, TORSO.h, 0.8)
  // The fitting room shows a mirror image; pre-flip printed garments so logos and text read correctly.
  const flipped = canvas(TORSO.w, TORSO.h)
  const fctx = flipped.getContext('2d')!
  fctx.translate(TORSO.w, 0)
  fctx.scale(-1, 1)
  fctx.drawImage(torso, 0, 0)

  const sleeve = canvas(SLEEVE.w, SLEEVE.h)
  const sctx = sleeve.getContext('2d')!
  // Both sleeves share one texture in the renderer; the photo's left sleeve is used and mirrored for the right.
  const s = m.shoulderL
  const c = m.cuffL
  const len = Math.hypot(c.x - s.x, c.y - s.y) || 1
  const across = Math.hypot(m.shoulderR.x - m.shoulderL.x, m.shoulderR.y - m.shoulderL.y)
  const target = spec.sleeves === 'short' ? SHORT_SLEEVE_PX : SLEEVE.h - 8
  const scale = target / len
  const width = across * 0.4 * scale
  sctx.save()
  sctx.beginPath()
  sctx.rect(SLEEVE.w / 2 - width / 2, 0, width, target)
  sctx.clip()
  sctx.translate(SLEEVE.w / 2, 0)
  sctx.scale(scale, scale)
  sctx.rotate(Math.atan2(c.x - s.x, c.y - s.y))
  sctx.translate(-s.x, -s.y)
  sctx.drawImage(image, 0, 0)
  sctx.restore()
  shadeRound(sctx, SLEEVE.w, SLEEVE.h, 0.72)
  return { torso: flipped, sleeve }
}

// Front flat-lay for the catalog rail.
export function uploadThumb(spec: UploadSpec, size = 220) {
  const c = canvas(size, size)
  const ctx = c.getContext('2d')!
  const { image } = spec
  const k = Math.min(size / image.width, size / image.height)
  ctx.drawImage(image, (size - image.width * k) / 2, (size - image.height * k) / 2, image.width * k, image.height * k)
  return c
}

interface PoseLm {
  x: number
  y: number
  visibility?: number
}

// Marker positions from a model wearing the garment in the product photo. The photo is not mirrored,
// so the model's right shoulder (pose index 12) is on the photo's left.
export function markersFromPose(lm: PoseLm[], w: number, h: number, sleeves: 'short' | 'long'): Markers | null {
  if (lm.length < 25) return null
  const vis = (i: number) => lm[i].visibility ?? 1
  if (vis(11) < 0.5 || vis(12) < 0.5) return null
  const P = (i: number): Pt2 => ({ x: lm[i].x * w, y: lm[i].y * h })
  const [sl, sr] = [P(12), P(11)]
  const sw = Math.hypot(sr.x - sl.x, sr.y - sl.y)
  if (sw < 8) return null
  // Pose shoulders sit on the joint; the sleeve seam is a little further out.
  const out = (s: Pt2, other: Pt2): Pt2 => lerp(other, s, 1.08)
  const hipsSeen = vis(23) > 0.5 && vis(24) > 0.5
  const hl = hipsSeen ? P(24) : { x: sl.x + sw * 0.05, y: sl.y + sw * 1.35 }
  const hr = hipsSeen ? P(23) : { x: sr.x - sw * 0.05, y: sr.y + sw * 1.35 }
  // Most tops end a little below the hip joint.
  const hem = (s: Pt2, hp: Pt2) => lerp(s, hp, 1.08)
  const cuff = (s: Pt2, e: number, wr: number) => {
    const elbow = vis(e) > 0.4 ? P(e) : { x: s.x, y: s.y + sw * 0.62 }
    if (sleeves === 'short') return lerp(s, elbow, 0.55)
    return vis(wr) > 0.4 ? lerp(elbow, P(wr), 0.92) : lerp(s, elbow, 1.9)
  }
  return {
    shoulderL: out(sl, sr),
    shoulderR: out(sr, sl),
    hemL: hem(sl, hl),
    hemR: hem(sr, hr),
    cuffL: cuff(sl, 14, 16),
    cuffR: cuff(sr, 13, 15),
  }
}

// Uses the person mask from the pose model as the cut-out, which beats corner-colour keying on busy backdrops.
export function applyMask(src: HTMLCanvasElement, mask: { data: Float32Array; width: number; height: number }) {
  const c = canvas(src.width, src.height)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  const m = canvas(mask.width, mask.height)
  const mctx = m.getContext('2d')!
  const md = mctx.createImageData(mask.width, mask.height)
  for (let i = 0; i < mask.data.length; i++) md.data[i * 4 + 3] = Math.max(0, Math.min(255, (mask.data[i] - 0.3) * 2.5 * 255))
  mctx.putImageData(md, 0, 0)
  ctx.drawImage(src, 0, 0)
  ctx.globalCompositeOperation = 'destination-in'
  ctx.filter = 'blur(1px)'
  ctx.drawImage(m, 0, 0, src.width, src.height)
  return c
}

// On a model photo the area above the shoulder line holds the model's neck, chin and hair. Keep only the
// collar there: pixels whose colour matches the garment, sampled from the chest.
export function keepCollarOnly(src: HTMLCanvasElement, m: Markers) {
  const c = canvas(src.width, src.height)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(src, 0, 0)
  const img = ctx.getImageData(0, 0, c.width, c.height)
  const d = img.data
  const at = (p: Pt2) => (Math.round(Math.min(c.height - 1, Math.max(0, p.y))) * c.width + Math.round(Math.min(c.width - 1, Math.max(0, p.x)))) * 4
  // Median colour of a patch of chest just below the shoulders.
  const samples: number[][] = []
  for (let i = 1; i <= 5; i++)
    for (let j = 1; j <= 4; j++) {
      const top = lerp(m.shoulderL, m.shoulderR, i / 6)
      const k = at({ x: top.x, y: top.y + (Math.max(m.hemL.y, m.hemR.y) - top.y) * (0.08 + j * 0.05) })
      if (d[k + 3] > 100) samples.push([d[k], d[k + 1], d[k + 2]])
    }
  if (!samples.length) return c
  const med = [0, 1, 2].map((ch) => samples.map((s) => s[ch]).sort((a, b) => a - b)[samples.length >> 1])
  const lineY = (x: number) => {
    const t = (x - m.shoulderL.x) / (m.shoulderR.x - m.shoulderL.x || 1)
    return m.shoulderL.y + (m.shoulderR.y - m.shoulderL.y) * t
  }
  const sw = Math.hypot(m.shoulderR.x - m.shoulderL.x, m.shoulderR.y - m.shoulderL.y)
  for (let y = 0; y < c.height; y++)
    for (let x = 0; x < c.width; x++) {
      const above = lineY(x) - y
      if (above <= 0) continue
      const i = (y * c.width + x) * 4
      // Fade out, then cut entirely well above the collar.
      if (above > sw * 0.28) {
        d[i + 3] = 0
        continue
      }
      const dist = Math.hypot(d[i] - med[0], d[i + 1] - med[1], d[i + 2] - med[2])
      if (dist > 70) d[i + 3] = 0
      else if (dist > 45) d[i + 3] = Math.min(d[i + 3], Math.round(((70 - dist) / 25) * 255))
    }
  ctx.putImageData(img, 0, 0)
  return c
}
