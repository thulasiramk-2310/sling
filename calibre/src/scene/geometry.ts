import * as THREE from 'three'

type Pt = [number, number]
const at = (r: number, a: number): Pt => [Math.cos(a) * r, Math.sin(a) * r]

// Wheel and pinion outline with watch-style ogival tooth tips (cycloidal teeth are rounded, not pointed).
export function gearShape(
  teeth: number,
  module: number,
  opts: { spokes?: number; pinion?: boolean; bore?: number } = {},
) {
  const r = (module * teeth) / 2
  const ra = r + module * (opts.pinion ? 0.75 : 1.15)
  const rf = r - module * 1.35
  const pitch = (Math.PI * 2) / teeth
  const halfRoot = pitch * (opts.pinion ? 0.2 : 0.27)
  const halfPitch = pitch * (opts.pinion ? 0.17 : 0.23)
  const pts: Pt[] = []
  for (let i = 0; i < teeth; i++) {
    const c = i * pitch
    pts.push(at(rf, c - pitch / 2))
    pts.push(at(rf, c - halfRoot))
    pts.push(at(r, c - halfPitch))
    for (let k = 1; k < 8; k++) {
      const s = -1 + (2 * k) / 8
      pts.push(at(r + (ra - r) * Math.sqrt(1 - s * s), c + s * halfPitch))
    }
    pts.push(at(r, c + halfPitch))
    pts.push(at(rf, c + halfRoot))
  }
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)))

  if (opts.spokes) addSpokes(shape, rf, opts.spokes)
  const bore = opts.bore ?? 0.07
  const hole = new THREE.Path()
  hole.absarc(0, 0, bore, 0, Math.PI * 2, true)
  shape.holes.push(hole)
  return shape
}

function addSpokes(shape: THREE.Shape, rf: number, n: number) {
  const rim = rf - Math.max(rf * 0.1, 0.12)
  const hub = Math.max(rf * 0.2, 0.22)
  const spoke = Math.max(rf * 0.075, 0.07)
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2
    const a1 = ((i + 1) / n) * Math.PI * 2
    const wo = spoke / 2 / rim
    const wi = spoke / 2 / hub
    const hole = new THREE.Path()
    const steps = 24
    for (let k = 0; k <= steps; k++) {
      const a = a0 + wo + ((a1 - wo - (a0 + wo)) * k) / steps
      const [x, y] = at(rim, a)
      if (k === 0) hole.moveTo(x, y)
      else hole.lineTo(x, y)
    }
    for (let k = steps; k >= 0; k--) {
      const a = a0 + wi + ((a1 - wi - (a0 + wi)) * k) / steps
      const [x, y] = at(hub, a)
      hole.lineTo(x, y)
    }
    shape.holes.push(hole)
  }
}

// Swiss lever escape wheel: 15 club-footed teeth leaning in the direction of travel.
export function escapeShape(teeth = 15, tip = 1.5) {
  const root = tip * 0.74
  const pitch = (Math.PI * 2) / teeth
  const pts: Pt[] = []
  for (let i = 0; i < teeth; i++) {
    const c = i * pitch
    pts.push(at(root, c - pitch * 0.5))
    pts.push(at(root * 1.02, c - pitch * 0.12))
    pts.push(at(tip * 0.96, c + pitch * 0.02))
    pts.push(at(tip, c + pitch * 0.1))
    pts.push(at(tip * 0.985, c + pitch * 0.24))
    pts.push(at(tip * 0.9, c + pitch * 0.2))
    pts.push(at(root * 1.03, c + pitch * 0.12))
  }
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)))
  addSpokes(shape, root, 5)
  const hole = new THREE.Path()
  hole.absarc(0, 0, 0.05, 0, Math.PI * 2, true)
  shape.holes.push(hole)
  return shape
}

export function forkShape() {
  const p: Pt[] = [
    [-0.8, -0.85],
    [-0.6, -0.85],
    [-0.6, -0.07],
    [1.7, -0.07],
    [1.7, -0.2],
    [2.0, -0.2],
    [2.0, -0.06],
    [1.82, -0.06],
    [1.82, 0.06],
    [2.0, 0.06],
    [2.0, 0.2],
    [1.7, 0.2],
    [1.7, 0.07],
    [-0.6, 0.07],
    [-0.6, 0.85],
    [-0.8, 0.85],
  ]
  return new THREE.Shape(p.map(([x, y]) => new THREE.Vector2(x, y)))
}

export function ringShape(outer: number, inner: number) {
  const s = new THREE.Shape()
  s.absarc(0, 0, outer, 0, Math.PI * 2, false)
  const h = new THREE.Path()
  h.absarc(0, 0, inner, 0, Math.PI * 2, true)
  s.holes.push(h)
  return s
}

// Convex hull of circles: gives organic bridge outlines from a few arbor positions.
export function hullShape(circles: { x: number; y: number; r: number }[]) {
  const pts: Pt[] = []
  for (const c of circles) {
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2
      pts.push([c.x + Math.cos(a) * c.r, c.y + Math.sin(a) * c.r])
    }
  }
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: Pt[] = []
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: Pt[] = []
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1))
  return new THREE.Shape(hull.map(([x, y]) => new THREE.Vector2(x, y)))
}

// Flat parts are modelled in the XY plane and laid into the movement's XZ plane, bottom at y = 0.
export function extrudeFlat(shape: THREE.Shape, depth: number, bevel = 0.012) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 12,
  })
  g.rotateX(Math.PI / 2)
  g.translate(0, depth, 0)
  return g
}

// Côtes de Genève: soft diagonal bands of brushed metal.
export function cotesTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#d9dde2'
  ctx.fillRect(0, 0, 512, 512)
  ctx.translate(256, 256)
  ctx.rotate(-Math.PI / 5)
  for (let x = -512; x < 512; x += 64) {
    const g = ctx.createLinearGradient(x, 0, x + 64, 0)
    g.addColorStop(0, '#aab0b8')
    g.addColorStop(0.45, '#f4f6f8')
    g.addColorStop(0.55, '#e9ecef')
    g.addColorStop(1, '#a3a9b1')
    ctx.fillStyle = g
    ctx.fillRect(x, -512, 64, 1024)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 8
  return t
}

// Perlage: overlapping circular graining, the classic mainplate finish.
export function perlageTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#c3c8ce'
  ctx.fillRect(0, 0, 512, 512)
  const step = 46
  for (let row = -1; row < 13; row++) {
    for (let col = -1; col < 13; col++) {
      const x = col * step + (row % 2) * (step / 2)
      const y = row * step * 0.86
      const g = ctx.createConicGradient(row + col, x, y)
      for (let k = 0; k <= 6; k++) g.addColorStop(k / 6, k % 2 ? '#eef1f4' : '#a9afb7')
      ctx.beginPath()
      ctx.arc(x, y, step * 0.62, 0, Math.PI * 2)
      ctx.fillStyle = g
      ctx.fill()
      ctx.strokeStyle = 'rgba(80,88,98,0.25)'
      ctx.lineWidth = 1.2
      ctx.stroke()
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 8
  return t
}

// Spiral band (mainspring, hairspring) as a flat triangle strip so it reads as metal, not a 1px line.
export function spiralGeometry(r0: number, r1: number, turns: number, width: number, segments = 900) {
  const g = new THREE.BufferGeometry()
  const pos = new Float32Array((segments + 1) * 2 * 3)
  const idx: number[] = []
  for (let i = 0; i < segments; i++) {
    const a = i * 2
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setIndex(idx)
  writeSpiral(g, r0, r1, turns, width, 0)
  return g
}

export function writeSpiral(g: THREE.BufferGeometry, r0: number, r1: number, turns: number, width: number, twist: number) {
  const attr = g.getAttribute('position') as THREE.BufferAttribute
  const segments = attr.count / 2 - 1
  for (let i = 0; i <= segments; i++) {
    const u = i / segments
    // The inner end follows the balance fully, the outer end is pinned to the stud.
    const a = u * turns * Math.PI * 2 + twist * (1 - u)
    const r = r0 + (r1 - r0) * u
    const cx = Math.cos(a)
    const cz = Math.sin(a)
    attr.setXYZ(i * 2, cx * (r - width / 2), 0, cz * (r - width / 2))
    attr.setXYZ(i * 2 + 1, cx * (r + width / 2), 0, cz * (r + width / 2))
  }
  attr.needsUpdate = true
  g.computeVertexNormals()
}
