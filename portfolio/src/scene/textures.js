// Every texture in the world is painted here on a canvas, so the site ships no image files.
// Sizes are small (and halved on phones) to keep memory and download low.
import * as THREE from 'three'
import { quality } from './quality.js'
import { rng } from './util.js'
import { bakeCloud } from './cloud-density.js'

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
    const { c, ctx, w, h } = canvas(1024, 1024)
    const r = rng(3)
    ctx.fillStyle = '#383b3b'
    ctx.fillRect(0, 0, w, h)
    // Fine aggregate and subtle wheel wear; no oversized white gravel pixels.
    for(let i=0;i<48000;i++) {
      ctx.fillStyle=`rgba(${r()>.5?'0,0,0':'185,184,175'},${.03+r()*.09})`
      ctx.fillRect(r()*w,r()*h,.5+r(),.5+r())
    }
    for(const lane of [.25,.75]) {
      const wear=ctx.createLinearGradient((lane-.10)*w,0,(lane+.10)*w,0)
      wear.addColorStop(0,'rgba(10,12,12,0)');wear.addColorStop(.5,'rgba(10,12,12,.13)');wear.addColorStop(1,'rgba(10,12,12,0)')
      ctx.fillStyle=wear;ctx.fillRect((lane-.1)*w,0,w*.2,h)
    }
    ctx.fillStyle = '#d6d4c7'
    const line=w*.014
    ctx.fillRect(w*.055,0,line,h);ctx.fillRect(w*.945-line,0,line,h)
    ctx.fillRect(w/2-line/2,0,line,h*.25)
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
    const n = quality.low ? 128 : 256
    const height = new Float32Array(n * n)
    const waves = [
      [2, 1, 0.3, 1],
      [1, 3, 1.7, 0.7],
      [4, 2, 2.9, 0.5],
      [3, 5, 4.1, 0.35],
      [7, 3, 1.2, 0.22], [5, 11, 3.8, 0.16], [13, 7, 2.1, 0.09], [19, 17, 4.7, 0.05],
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
        const len = Math.hypot(dx*.25, dy*.25, 1)
        const i = (y * n + x) * 4
        data[i] = ((-dx*.25 / len) * 0.5 + 0.5) * 255
        data[i + 1] = ((-dy*.25 / len) * 0.5 + 0.5) * 255
        data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255
        data[i + 3] = 255
      }
    const t = new THREE.DataTexture(data, n, n)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.magFilter = THREE.LinearFilter
    t.minFilter = THREE.LinearMipmapLinearFilter
    t.generateMipmaps = true
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
    const { c, ctx } = canvas(512, 256)
    const data=bakeCloud(c.width,c.height,quality.low?16:24)
    ctx.putImageData(new ImageData(data,c.width,c.height),0,0)
    return toTexture(c, { repeat: false })
  })

// Turns a texture's light and dark into surface bumps (a normal map): dark mortar and niches read as recessed.
export function normalFromTexture(tex, strength = 2.5) {
  const src = tex.image
  const w = src.width
  const h = src.height
  const data = src.getContext('2d').getImageData(0, 0, w, h).data
  const lum = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) lum[i] = (data[i * 4] * 0.3 + data[i * 4 + 1] * 0.59 + data[i * 4 + 2] * 0.11) / 255
  const out = new Uint8Array(w * h * 4)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const l = lum[y * w + ((x + w - 1) % w)]
      const r = lum[y * w + ((x + 1) % w)]
      const u = lum[((y + h - 1) % h) * w + x]
      const d = lum[((y + 1) % h) * w + x]
      const nx = (l - r) * strength
      const ny = (d - u) * strength
      const len = Math.hypot(nx, ny, 1)
      const k = (y * w + x) * 4
      out[k] = (nx / len) * 127.5 + 127.5
      out[k + 1] = (ny / len) * 127.5 + 127.5
      out[k + 2] = (1 / len) * 127.5 + 127.5
      out[k + 3] = 255
    }
  const t = new THREE.DataTexture(out, w, h)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.magFilter = THREE.LinearFilter
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.generateMipmaps = true
  t.needsUpdate = true
  return t
}

// A colour map plus its matching normal map, cached together.
export function withRelief(name, makeTexture, strength) {
  return once('relief:' + name, () => {
    const map = makeTexture()
    return { map, normalMap: normalFromTexture(map, strength) }
  })
}

// Granite wall of the Thanjavur vimana: pilasters, niches with carved deities, and moulding bands.
export const vimanaWallTexture = (base = '#b89a76') =>
  once('vimanaWall' + base, () => {
    const { c, ctx, w, h } = canvas(512, 256)
    const r = rng(41)
    ctx.fillStyle = base
    ctx.fillRect(0, 0, w, h)
    // block courses
    for (let y = 0; y < h; y += 16)
      for (let x = (y / 16) % 2 ? -20 : 0; x < w; x += 40 + r() * 20) {
        ctx.fillStyle = `rgba(${r() > 0.5 ? '255,240,220' : '60,40,25'},${0.04 + r() * 0.06})`
        ctx.fillRect(x, y, 44, 16)
        ctx.fillStyle = 'rgba(70,50,32,.28)'
        ctx.fillRect(x, y, 1, 16)
      }
    for (let y = 0; y < h; y += 16) {
      ctx.fillStyle = 'rgba(70,50,32,.25)'
      ctx.fillRect(0, y, w, 1)
    }
    // pilasters and niches across the face
    for (let x = 0; x < w; x += 128) {
      ctx.fillStyle = 'rgba(255,238,212,.18)'
      ctx.fillRect(x + 4, 18, 14, h - 36)
      ctx.fillRect(x + 110, 18, 14, h - 36)
      // niche (devakoshta)
      ctx.fillStyle = 'rgba(40,26,16,.55)'
      ctx.fillRect(x + 38, 52, 52, 150)
      ctx.fillStyle = 'rgba(255,238,212,.2)'
      ctx.fillRect(x + 32, 44, 64, 8)
      ctx.fillRect(x + 32, 202, 64, 6)
      // Sculptures are geometry now; this texture only describes the stone niche.
    }
    // mouldings top and bottom
    ctx.fillStyle = 'rgba(255,238,212,.22)'
    ctx.fillRect(0, 0, w, 10)
    ctx.fillRect(0, h - 12, w, 12)
    ctx.fillStyle = 'rgba(50,34,20,.35)'
    ctx.fillRect(0, 10, w, 3)
    ctx.fillRect(0, h - 14, w, 2)
    speckle(ctx, w, h, 2600, r, '40,26,16', '255,240,220')
    return toTexture(c)
  })

// The cloister around the courtyard: a long colonnade seen from inside.
export const colonnadeTexture = () =>
  once('colonnade', () => {
    const { c, ctx, w, h } = canvas(256, 128)
    const r = rng(52)
    ctx.fillStyle = '#b89c7a'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#3a2a1e'
    for (let x = 0; x < w; x += 32) ctx.fillRect(x + 8, 26, 18, 82)
    ctx.fillStyle = 'rgba(255,238,212,.25)'
    ctx.fillRect(0, 14, w, 10)
    ctx.fillRect(0, 108, w, 8)
    speckle(ctx, w, h, 900, r, '40,26,16', '255,240,220')
    return toTexture(c)
  })

// A coconut frond: a midrib with many narrow leaflets, on a transparent background.
export const frondTexture = () =>
  once('frond', () => {
    const c = document.createElement('canvas')
    c.width = Math.round(128 * Math.max(quality.tex, 0.75))
    c.height = c.width * 4
    const ctx = c.getContext('2d')
    ctx.scale(c.width / 128, c.height / 512)
    const r = rng(23)
    for (let y = 8; y < 504; y += 6) {
      const t = y / 512
      const len = 58 * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (0.85 + r() * 0.3)
      const g = 90 + r() * 50
      ctx.strokeStyle = `rgb(${60 + r() * 30},${g},${30 + r() * 20})`
      ctx.lineWidth = 2.6
      ctx.lineCap = 'round'
      for (const s of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(64, y)
        ctx.quadraticCurveTo(64 + s * len * 0.5, y + len * 0.15, 64 + s * len, y + len * 0.55)
        ctx.stroke()
      }
    }
    ctx.strokeStyle = '#7d7a3a'
    ctx.lineWidth = 3.5
    ctx.beginPath()
    ctx.moveTo(64, 0)
    ctx.lineTo(64, 512)
    ctx.stroke()
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = quality.low ? 1 : 4
    return t
  })

// Palm trunk with its ring scars.
export const trunkTexture = () =>
  once('trunk', () => {
    const { c, ctx, w, h } = canvas(64, 256)
    const r = rng(29)
    ctx.fillStyle = '#7a6550'
    ctx.fillRect(0, 0, w, h)
    for (let y = 0; y < h; y += 7 + r() * 4) {
      ctx.fillStyle = `rgba(40,28,18,${0.35 + r() * 0.3})`
      ctx.fillRect(0, y, w, 2)
      ctx.fillStyle = 'rgba(200,180,150,.18)'
      ctx.fillRect(0, y + 2, w, 2)
    }
    speckle(ctx, w, h, 500, r)
    return toTexture(c)
  })
