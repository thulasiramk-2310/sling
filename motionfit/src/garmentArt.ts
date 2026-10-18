import type { Item, Variant } from './catalog'

// Garment pieces are painted procedurally into textures with a fixed layout that the renderer
// maps onto the body: in the torso texture the shoulder line sits at y = 96 and the hip line at y = 520,
// with shoulder points at x = 96 and x = 416.
export const TORSO = { w: 512, h: 640, shoulderY: 96, hipY: 520, shoulderL: 96, shoulderR: 416 }
export const SLEEVE = { w: 256, h: 512 }

type Ctx = CanvasRenderingContext2D

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16)
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)))
  const r = f((n >> 16) & 255)
  const g = f((n >> 8) & 255)
  const b = f(n & 255)
  return `rgb(${r},${g},${b})`
}

let seed = 1
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

function fillPattern(ctx: Ctx, item: Item, v: Variant, w: number, h: number, scale = 1) {
  seed = 7
  ctx.fillStyle = v.base
  ctx.fillRect(0, 0, w, h)
  switch (item.pattern) {
    case 'stripes': {
      ctx.fillStyle = v.accent
      const step = 34 * scale
      for (let y = 18 * scale; y < h; y += step) ctx.fillRect(0, y, w, step * 0.42)
      break
    }
    case 'check': {
      const step = 64 * scale
      ctx.globalAlpha = 0.55
      ctx.fillStyle = v.accent
      for (let x = 0; x < w; x += step) ctx.fillRect(x, 0, step / 2, h)
      for (let y = 0; y < h; y += step) ctx.fillRect(0, y, w, step / 2)
      ctx.globalAlpha = 0.18
      ctx.fillStyle = '#ffffff'
      for (let x = step * 0.72; x < w; x += step) ctx.fillRect(x, 0, 3 * scale, h)
      for (let y = step * 0.72; y < h; y += step) ctx.fillRect(0, y, w, 3 * scale)
      ctx.globalAlpha = 1
      break
    }
    case 'denim': {
      for (let i = 0; i < w * h * 0.04; i++) {
        ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,30,0.08)'
        ctx.fillRect(rand() * w, rand() * h, 2, 1)
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 1
      for (let x = -h; x < w; x += 5) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x + h * 0.5, h)
        ctx.stroke()
      }
      break
    }
    case 'rib': {
      for (let x = 0; x < w; x += 7 * scale) {
        ctx.fillStyle = 'rgba(0,0,0,0.09)'
        ctx.fillRect(x, 0, 2.5 * scale, h)
        ctx.fillStyle = 'rgba(255,255,255,0.05)'
        ctx.fillRect(x + 3.5 * scale, 0, 1.5 * scale, h)
      }
      break
    }
    case 'oxford': {
      for (let y = 0; y < h; y += 3) {
        for (let x = (y / 3) % 2 ? 0 : 3; x < w; x += 6) {
          ctx.fillStyle = 'rgba(255,255,255,0.16)'
          ctx.fillRect(x, y, 3, 2)
        }
      }
      break
    }
    case 'solid': {
      for (let i = 0; i < w * h * 0.02; i++) {
        ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'
        ctx.fillRect(rand() * w, rand() * h, 1.5, 1.5)
      }
    }
  }
}

// Soft cylinder shading plus a few fold shadows, so a flat texture reads as cloth on a body.
function shadeCloth(ctx: Ctx, w: number, h: number, folds: [number, number, number, number][]) {
  const g = ctx.createLinearGradient(0, 0, w, 0)
  g.addColorStop(0, 'rgba(0,0,0,0.38)')
  g.addColorStop(0.18, 'rgba(0,0,0,0.08)')
  g.addColorStop(0.45, 'rgba(255,255,255,0.08)')
  g.addColorStop(0.6, 'rgba(255,255,255,0.03)')
  g.addColorStop(0.85, 'rgba(0,0,0,0.12)')
  g.addColorStop(1, 'rgba(0,0,0,0.42)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.lineCap = 'round'
  for (const [x1, y1, x2, y2] of folds) {
    const fg = ctx.createLinearGradient(x1, y1, x2, y2)
    fg.addColorStop(0, 'rgba(0,0,0,0)')
    fg.addColorStop(0.5, 'rgba(0,0,0,0.16)')
    fg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.strokeStyle = fg
    ctx.lineWidth = 14
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.quadraticCurveTo((x1 + x2) / 2 + 12, (y1 + y2) / 2, x2, y2)
    ctx.stroke()
  }
}

function torsoPath(ctx: Ctx, item: Item) {
  const hemY = TORSO.hipY + (TORSO.h - TORSO.hipY) * (item.hem - 0.5) * 2
  const neckW = item.neck === 'hood' ? 70 : item.neck === 'stand' ? 54 : 62
  const neckD = item.neck === 'crew' ? 54 : item.neck === 'polo' || item.neck === 'stand' ? 40 : item.neck === 'hood' ? 46 : 70
  const flare = item.category === 'Jackets' ? 6 : 0
  ctx.beginPath()
  ctx.moveTo(256 - neckW, 70)
  ctx.lineTo(TORSO.shoulderL - 4, TORSO.shoulderY + 4)
  ctx.quadraticCurveTo(TORSO.shoulderL - 16, 150, 100 - flare, 210)
  ctx.quadraticCurveTo(106 - flare, 380, 104 - flare * 2, hemY)
  ctx.quadraticCurveTo(256, hemY + 10, 408 + flare * 2, hemY)
  ctx.quadraticCurveTo(406 + flare, 380, 412 + flare, 210)
  ctx.quadraticCurveTo(TORSO.shoulderR + 16, 150, TORSO.shoulderR + 4, TORSO.shoulderY + 4)
  ctx.lineTo(256 + neckW, 70)
  if (item.neck === 'collar' || item.neck === 'camp') ctx.lineTo(256, 70 + neckD)
  else ctx.quadraticCurveTo(256, 70 + neckD * 2, 256 - neckW, 70)
  ctx.closePath()
  return hemY
}

// open = worn unbuttoned over another top: the front centre is cut away so the inner layer shows.
export function paintTorso(item: Item, v: Variant, open = false) {
  const c = canvas(TORSO.w, TORSO.h)
  const ctx = c.getContext('2d')!
  ctx.save()
  const hemY = torsoPath(ctx, item)
  ctx.clip()
  fillPattern(ctx, item, v, TORSO.w, TORSO.h)
  shadeCloth(ctx, TORSO.w, TORSO.h, [
    [130, 200, 180, 330],
    [382, 200, 332, 330],
    [180, 420, 220, hemY - 10],
    [330, 430, 300, hemY - 10],
  ])

  const trim = shade(v.base, -0.12)
  if (item.pattern === 'rib' || item.neck === 'hood' || item.id === 'breton') {
    // Ribbed hem band.
    ctx.fillStyle = trim
    ctx.fillRect(0, hemY - 26, TORSO.w, 30)
    ctx.fillStyle = 'rgba(0,0,0,0.12)'
    for (let x = 0; x < TORSO.w; x += 6) ctx.fillRect(x, hemY - 26, 2, 30)
  }

  if (!open && (item.front === 'buttons' || item.front === 'placket')) {
    const end = item.front === 'placket' ? 210 : hemY - 6
    ctx.fillStyle = 'rgba(0,0,0,0.12)'
    ctx.fillRect(244, 110, 2, end - 110)
    ctx.fillRect(266, 110, 2, end - 110)
    const count = item.front === 'placket' ? 3 : 6
    for (let i = 0; i < count; i++) {
      const y = 130 + i * ((end - 140) / Math.max(1, count - 1))
      ctx.fillStyle = item.pattern === 'denim' ? '#b88a3b' : '#f4f1e8'
      ctx.beginPath()
      ctx.arc(256, y, item.pattern === 'denim' ? 8 : 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.beginPath()
      ctx.arc(256, y, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  if (!open && item.front === 'zip') {
    ctx.fillStyle = shade(v.base, -0.18)
    ctx.fillRect(250, 60, 12, hemY - 60)
    ctx.fillStyle = '#9ea2a8'
    for (let y = 64; y < hemY; y += 7) ctx.fillRect(252, y, 8, 3)
    ctx.fillStyle = '#c9ccd1'
    ctx.fillRect(247, 150, 18, 30)
    // Taped seams.
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(110, 260)
    ctx.lineTo(402, 260)
    ctx.stroke()
  }

  if (item.pockets === 'chest') {
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'
    ctx.lineWidth = 2
    ctx.strokeRect(300, 170, 64, 72)
  }
  if (item.pockets === 'flaps') {
    for (const x of [150, 300]) {
      ctx.fillStyle = shade(v.base, -0.06)
      ctx.fillRect(x, 168, 70, 26)
      ctx.strokeStyle = item.pattern === 'denim' ? v.accent : 'rgba(0,0,0,0.25)'
      ctx.lineWidth = 2
      ctx.setLineDash(item.pattern === 'denim' ? [6, 4] : [])
      ctx.strokeRect(x, 168, 70, 26)
      ctx.strokeRect(x + 3, 196, 64, 62)
      ctx.setLineDash([])
    }
  }
  if (item.pockets === 'kangaroo') {
    ctx.fillStyle = shade(v.base, -0.05)
    ctx.beginPath()
    ctx.moveTo(170, hemY - 150)
    ctx.lineTo(342, hemY - 150)
    ctx.lineTo(372, hemY - 40)
    ctx.lineTo(140, hemY - 40)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'
    ctx.lineWidth = 2
    ctx.stroke()
  }
  if (item.pattern === 'denim') {
    // Contrast stitching: yoke and seams.
    ctx.strokeStyle = v.accent
    ctx.lineWidth = 2
    ctx.setLineDash([7, 5])
    ctx.beginPath()
    ctx.moveTo(100, 150)
    ctx.lineTo(412, 150)
    ctx.moveTo(196, 270)
    ctx.lineTo(196, hemY - 20)
    ctx.moveTo(316, 270)
    ctx.lineTo(316, hemY - 20)
    ctx.stroke()
    ctx.setLineDash([])
  }
  ctx.restore()

  if (open) {
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.moveTo(240, 60)
    ctx.lineTo(272, 60)
    ctx.lineTo(296, hemY + 20)
    ctx.lineTo(216, hemY + 20)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    // A soft shadow along the open edges where the outer layer sits on the inner one.
    ctx.save()
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 6
    ctx.filter = 'blur(3px)'
    ctx.beginPath()
    ctx.moveTo(240, 64)
    ctx.lineTo(216, hemY)
    ctx.moveTo(272, 64)
    ctx.lineTo(296, hemY)
    ctx.stroke()
    ctx.restore()
  }

  // Necklines and collars sit on top of the body piece.
  ctx.save()
  if (item.neck === 'crew' || item.neck === 'hood') {
    ctx.strokeStyle = shade(v.base, -0.14)
    ctx.lineWidth = 12
    ctx.beginPath()
    ctx.moveTo(256 - (item.neck === 'hood' ? 70 : 62), 72)
    ctx.quadraticCurveTo(256, item.neck === 'hood' ? 160 : 176, 256 + (item.neck === 'hood' ? 70 : 62), 72)
    ctx.stroke()
  }
  if (item.neck === 'hood') {
    // Hood lying back around the neck, plus drawstrings.
    ctx.fillStyle = shade(v.base, -0.08)
    ctx.beginPath()
    ctx.moveTo(150, 92)
    ctx.quadraticCurveTo(256, -10, 362, 92)
    ctx.quadraticCurveTo(256, 30, 150, 92)
    ctx.fill()
    ctx.strokeStyle = '#f2efe8'
    ctx.lineWidth = 5
    for (const x of [236, 276]) {
      ctx.beginPath()
      ctx.moveTo(x, 130)
      ctx.quadraticCurveTo(x + (x < 256 ? -6 : 6), 190, x, 240)
      ctx.stroke()
    }
  }
  if (item.neck === 'collar' || item.neck === 'camp' || item.neck === 'polo') {
    const spread = item.neck === 'camp' ? 92 : item.neck === 'polo' ? 66 : 74
    ctx.fillStyle = item.id === 'oxford' ? shade(v.base, 0.04) : shade(v.base, -0.04)
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'
    ctx.lineWidth = 2
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(256, item.neck === 'polo' ? 104 : 120)
      ctx.lineTo(256 + s * 62, 64)
      ctx.lineTo(256 + s * spread, 80)
      ctx.lineTo(256 + s * (spread - 22), item.neck === 'camp' ? 168 : 140)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
  }
  if (item.neck === 'stand') {
    ctx.fillStyle = shade(v.base, -0.08)
    ctx.beginPath()
    ctx.moveTo(196, 50)
    ctx.quadraticCurveTo(256, 30, 316, 50)
    ctx.lineTo(312, 104)
    ctx.quadraticCurveTo(256, 124, 200, 104)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  return c
}

export function paintSleeve(item: Item, v: Variant) {
  const c = canvas(SLEEVE.w, SLEEVE.h)
  const ctx = c.getContext('2d')!
  const end = item.sleeves === 'short' ? 168 : SLEEVE.h - 8
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(14, 0)
  ctx.lineTo(242, 0)
  ctx.quadraticCurveTo(232, end * 0.5, item.sleeves === 'short' ? 224 : 196, end)
  ctx.lineTo(item.sleeves === 'short' ? 32 : 60, end)
  ctx.quadraticCurveTo(24, end * 0.5, 14, 0)
  ctx.closePath()
  ctx.clip()
  fillPattern(ctx, item, v, SLEEVE.w, SLEEVE.h, 0.85)
  shadeCloth(ctx, SLEEVE.w, SLEEVE.h, item.sleeves === 'long' ? [[90, 230, 150, 290], [100, 300, 160, 340]] : [])
  // Cuff.
  ctx.fillStyle = shade(v.base, -0.12)
  ctx.fillRect(0, end - (item.sleeves === 'short' ? 18 : 34), SLEEVE.w, 40)
  if (item.front === 'buttons' && item.sleeves === 'long') {
    ctx.fillStyle = '#f4f1e8'
    ctx.beginPath()
    ctx.arc(150, end - 16, 5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
  return c
}

// Flat-lay product shot for the catalog rail.
export function paintFlatLay(item: Item, v: Variant, size = 220) {
  const c = canvas(size, size)
  const ctx = c.getContext('2d')!
  const torso = paintTorso(item, v)
  const sleeve = paintSleeve(item, v)
  const k = size / 640
  const ox = (size - TORSO.w * k) / 2
  for (const s of [-1, 1]) {
    ctx.save()
    const sx = ox + (s < 0 ? TORSO.shoulderL : TORSO.shoulderR) * k
    ctx.translate(sx, TORSO.shoulderY * k + 4)
    ctx.rotate(s * (item.sleeves === 'short' ? 0.95 : 0.42))
    ctx.drawImage(sleeve, -SLEEVE.w * k * 0.5, 0, SLEEVE.w * k, SLEEVE.h * k)
    ctx.restore()
  }
  ctx.drawImage(torso, ox, 0, TORSO.w * k, TORSO.h * k)
  return c
}
