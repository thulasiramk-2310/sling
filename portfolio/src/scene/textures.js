// Every texture in the world is painted here on a canvas, so the site ships no image files.
// Sizes are small (and halved on phones) to keep memory and download low.
import * as THREE from 'three'
import { quality } from './quality.js'
import { rng } from './util.js'

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = Math.max(16, Math.round(w * quality.tex))
  c.height = Math.max(16, Math.round(h * quality.tex))
  const ctx = c.getContext('2d')
  // Draw in design units; the canvas is scaled to the quality size.
  ctx.scale(c.width / w, c.height / h)
  return { c, ctx, w, h }
}

function toTexture(c, { repeat = true, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = quality.low ? 1 : 4
  return t
}

const cache = new Map()
const once = (key, make) => {
  if (!cache.has(key)) cache.set(key, make())
  return cache.get(key)
}

// Light speckle so flat colours look like real surfaces.
function speckle(ctx, w, h, amount, rand, dark = '0,0,0', light = '255,255,255') {
  for (let i = 0; i < amount; i++) {
    ctx.fillStyle = `rgba(${rand() > 0.5 ? dark : light},${0.03 + rand() * 0.07})`
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2.5, 1 + rand() * 2.5)
  }
}

export const roadTexture = () =>
  once('road', () => {
    const { c, ctx, w, h } = canvas(128, 512)
    const r = rng(3)
    ctx.fillStyle = '#5b5560'
    ctx.fillRect(0, 0, w, h)
    speckle(ctx, w, h, 1400, r)
    ctx.fillStyle = '#e9e4d4'
    ctx.fillRect(w * 0.05, 0, 3, h)
    ctx.fillRect(w * 0.95 - 3, 0, 3, h)
    ctx.fillStyle = '#f2ead0'
    ctx.fillRect(w / 2 - 2, 0, 4, h * 0.38)
    return toTexture(c)
  })

export const grainTexture = () =>
  once('grain', () => {
    const { c, ctx, w, h } = canvas(256, 256)
    const r = rng(11)
    ctx.fillStyle = '#d6d6d6'
    ctx.fillRect(0, 0, w, h)
    speckle(ctx, w, h, 5200, r, '0,0,0', '255,255,255')
    return toTexture(c)
  })

export const stoneTexture = (base = '#a39682', seed = 5) =>
  once('stone' + base, () => {
    const { c, ctx, w, h } = canvas(256, 256)
    const r = rng(seed)
    ctx.fillStyle = base
    ctx.fillRect(0, 0, w, h)
    const rows = 8
    for (let y = 0; y < rows; y++) {
      let x = -r() * 40
      while (x < w) {
        const bw = 40 + r() * 50
        ctx.fillStyle = `rgba(${r() > 0.5 ? '0,0,0' : '255,255,255'},${0.04 + r() * 0.07})`
        ctx.fillRect(x, (y * h) / rows, bw, h / rows)
        ctx.strokeStyle = 'rgba(40,30,20,.35)'
        ctx.lineWidth = 1.2
        ctx.strokeRect(x, (y * h) / rows, bw, h / rows)
        x += bw
      }
    }
    speckle(ctx, w, h, 900, r)
    return toTexture(c)
  })

export const brickTexture = () =>
  once('brick', () => {
    const { c, ctx, w, h } = canvas(256, 256)
    const r = rng(8)
    ctx.fillStyle = '#7d3a2c'
    ctx.fillRect(0, 0, w, h)
    const bh = 16
    for (let y = 0; y < h; y += bh) {
      for (let x = (y / bh) % 2 ? -16 : 0; x < w; x += 32) {
        ctx.fillStyle = `rgb(${150 + r() * 40},${62 + r() * 26},${44 + r() * 20})`
        ctx.fillRect(x + 1, y + 1, 30, bh - 2)
      }
    }
    return toTexture(c)
  })

// Facade of a gopuram tier: pilasters, niches, and small painted figures (stucco "sudhai" statues).
export function tierTextures(name, palette, seed) {
  return once('tier' + name, () => {
    const make = (lit) => {
      const { c, ctx, w, h } = canvas(512, 128)
      const r = rng(seed)
      ctx.fillStyle = lit ? '#000' : palette.wall
      ctx.fillRect(0, 0, w, h)
      if (!lit) speckle(ctx, w, h, 700, r)
      for (let x = 0; x < w; x += 64) {
        if (!lit) {
          ctx.fillStyle = 'rgba(0,0,0,.18)'
          ctx.fillRect(x, 0, 5, h)
        }
        // niche
        const nx = x + 14
        if (lit) {
          if (r() > 0.45) {
            ctx.fillStyle = '#ffb74a'
            ctx.fillRect(nx + 6, 40, 22, 56)
          }
          continue
        }
        ctx.fillStyle = 'rgba(0,0,0,.28)'
        ctx.beginPath()
        ctx.roundRect(nx, 34, 34, 66, 14)
        ctx.fill()
        // figure: head, body, and a small crown
        const col = palette.figures[Math.floor(r() * palette.figures.length)]
        ctx.fillStyle = col
        ctx.beginPath()
        ctx.arc(nx + 17, 56, 7, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(nx + 8, 96)
        ctx.lineTo(nx + 11, 64)
        ctx.lineTo(nx + 23, 64)
        ctx.lineTo(nx + 26, 96)
        ctx.fill()
        ctx.fillStyle = palette.gold
        ctx.fillRect(nx + 12, 46, 10, 4)
      }
      if (!lit) {
        ctx.fillStyle = palette.gold
        ctx.fillRect(0, 0, w, 8)
        ctx.fillRect(0, h - 6, w, 6)
      }
      return toTexture(c)
    }
    return { map: make(false), glow: make(true) }
  })
}

// Wall of carved rock: elephants and figures, drawn as shallow relief.
export const carveTexture = () =>
  once('carve', () => {
    const { c, ctx, w, h } = canvas(512, 256)
    const r = rng(21)
    ctx.fillStyle = '#9c8a72'
    ctx.fillRect(0, 0, w, h)
    speckle(ctx, w, h, 2500, r)
    const elephant = (x, y, s) => {
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(s, s)
      ctx.fillStyle = 'rgba(70,52,34,.38)'
      ctx.strokeStyle = 'rgba(40,28,18,.6)'
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.ellipse(0, 0, 34, 20, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.ellipse(36, -8, 14, 12, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(46, -2)
      ctx.quadraticCurveTo(58, 14, 48, 28)
      ctx.stroke()
      for (const lx of [-22, -8, 10, 24]) ctx.fillRect(lx - 4, 14, 8, 24)
      ctx.restore()
    }
    for (let i = 0; i < 5; i++) elephant(60 + i * 100, 150 + r() * 30, 0.8 + r() * 0.5)
    // standing figures along the top
    for (let i = 0; i < 12; i++) {
      const x = 20 + i * 42
      ctx.fillStyle = 'rgba(70,52,34,.33)'
      ctx.beginPath()
      ctx.arc(x, 40, 7, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(x - 6, 48, 12, 34 + r() * 14)
    }
    return toTexture(c)
  })

export const clockTexture = () =>
  once('clock', () => {
    const { c, ctx, w, h } = canvas(128, 128)
    ctx.fillStyle = '#f4efe0'
    ctx.beginPath()
    ctx.arc(w / 2, h / 2, 60, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#2a1a14'
    ctx.lineWidth = 5
    ctx.stroke()
    ctx.lineWidth = 3
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(w / 2 + Math.sin(a) * 48, h / 2 - Math.cos(a) * 48)
      ctx.lineTo(w / 2 + Math.sin(a) * 56, h / 2 - Math.cos(a) * 56)
      ctx.stroke()
    }
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(w / 2, h / 2)
    ctx.lineTo(w / 2 - 22, h / 2 - 14)
    ctx.stroke()
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(w / 2, h / 2)
    ctx.lineTo(w / 2 + 12, h / 2 - 38)
    ctx.stroke()
    return toTexture(c, { repeat: false })
  })

export const bandTexture = (a = '#d8d2c4', b = '#b3281f', bands = 6) =>
  once('band' + a + b, () => {
    const { c, ctx, w, h } = canvas(32, 256)
    for (let i = 0; i < bands; i++) {
      ctx.fillStyle = i % 2 ? b : a
      ctx.fillRect(0, (i * h) / bands, w, h / bands + 1)
    }
    return toTexture(c)
  })

// Building facade with rows of windows, plus a matching "lights on" version.
export function windowTextures() {
  return once('windows', () => {
    const make = (lit) => {
      const { c, ctx, w, h } = canvas(128, 256)
      const r = rng(31)
      ctx.fillStyle = lit ? '#000' : '#ece2d2'
      ctx.fillRect(0, 0, w, h)
      for (let y = 10; y < h - 10; y += 24)
        for (let x = 10; x < w - 10; x += 22) {
          if (lit) ctx.fillStyle = r() > 0.55 ? '#ffc766' : '#000'
          else ctx.fillStyle = '#8a929a'
          ctx.fillRect(x, y, 12, 14)
        }
      return toTexture(c)
    }
    return { map: make(false), glow: make(true) }
  })
}

// Tileable bumps for the sea surface (made from whole-number sine waves so it repeats cleanly).
export const seaNormalTexture = () =>
  once('sea', () => {
    const n = quality.low ? 64 : 128
    const height = new Float32Array(n * n)
    const waves = [
      [2, 1, 0.3, 1],
      [1, 3, 1.7, 0.7],
      [4, 2, 2.9, 0.5],
      [3, 5, 4.1, 0.35],
    ]
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        let v = 0
        for (const [kx, ky, ph, amp] of waves) v += Math.sin(((kx * x + ky * y) / n) * Math.PI * 2 + ph) * amp
        height[y * n + x] = v
      }
    const data = new Uint8Array(n * n * 4)
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const dx = height[y * n + ((x + 1) % n)] - height[y * n + ((x + n - 1) % n)]
        const dy = height[((y + 1) % n) * n + x] - height[((y + n - 1) % n) * n + x]
        const len = Math.hypot(dx, dy, 1)
        const i = (y * n + x) * 4
        data[i] = ((-dx / len) * 0.5 + 0.5) * 255
        data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255
        data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255
        data[i + 3] = 255
      }
    const t = new THREE.DataTexture(data, n, n)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.magFilter = t.minFilter = THREE.LinearFilter
    t.needsUpdate = true
    return t
  })

export const glowTexture = () =>
  once('glow', () => {
    const { c, ctx, w } = canvas(128, 128)
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.25, 'rgba(255,255,255,.55)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, w)
    return toTexture(c, { repeat: false })
  })

export const moonTexture = () =>
  once('moon', () => {
    const { c, ctx, w } = canvas(256, 256)
    const g = ctx.createRadialGradient(w / 2, w / 2, w * 0.18, w / 2, w / 2, w / 2)
    g.addColorStop(0, 'rgba(255,255,245,.5)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, w)
    ctx.fillStyle = '#f3efdc'
    ctx.beginPath()
    ctx.arc(w / 2, w / 2, w * 0.18, 0, Math.PI * 2)
    ctx.fill()
    const r = rng(9)
    ctx.fillStyle = 'rgba(150,140,120,.35)'
    for (let i = 0; i < 9; i++) {
      ctx.beginPath()
      ctx.arc(w / 2 + (r() - 0.5) * w * 0.24, w / 2 + (r() - 0.5) * w * 0.24, 3 + r() * 7, 0, Math.PI * 2)
      ctx.fill()
    }
    return toTexture(c, { repeat: false })
  })

export const cloudTexture = () =>
  once('cloud', () => {
    const { c, ctx, w, h } = canvas(256, 128)
    const r = rng(17)
    for (let i = 0; i < 16; i++) {
      const x = 50 + r() * (w - 100)
      const y = h / 2 + (r() - 0.5) * 24
      const rad = 22 + r() * 30
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
      g.addColorStop(0, 'rgba(255,255,255,.55)')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2)
    }
    return toTexture(c, { repeat: false })
  })
