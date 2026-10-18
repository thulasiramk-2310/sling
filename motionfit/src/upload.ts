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

// Clears pixels close to the colour found in the photo's corners, which handles plain studio backdrops.
export function removePlainBackground(src: HTMLCanvasElement, tolerance = 38) {
  const c = canvas(src.width, src.height)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(src, 0, 0)
  const img = ctx.getImageData(0, 0, c.width, c.height)
  const d = img.data
  const corners = [0, (c.width - 1) * 4, (c.height - 1) * c.width * 4, ((c.height - 1) * c.width + c.width - 1) * 4]
  const bg = [0, 1, 2].map((k) => corners.reduce((s, i) => s + d[i + k], 0) / 4)
  for (let i = 0; i < d.length; i += 4) {
    const dist = Math.hypot(d[i] - bg[0], d[i + 1] - bg[1], d[i + 2] - bg[2])
    if (dist < tolerance) d[i + 3] = 0
    else if (dist < tolerance * 1.8) d[i + 3] = Math.min(d[i + 3], Math.round(((dist - tolerance) / (tolerance * 0.8)) * 255))
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
