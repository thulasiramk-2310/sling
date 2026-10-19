// Small helpers shared by the 3D scene.
import * as THREE from 'three'

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
export const lerp = (a, b, t) => a + (b - a) * t
export const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

// Seeded random numbers, so the world looks the same on every visit.
export function rng(seed) {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Materials that light up at night (windows, lamps) register here; the sky turns them on.
const glowing = []
export function glow(material, base = 1) {
  material.userData.glow = base
  glowing.push(material)
  return material
}
export function setNight(n) {
  // lights come on gradually from dusk, not during the day
  const k = smooth(0.18, 0.8, n)
  for (const m of glowing) m.emissiveIntensity = m.userData.glow * k
}

export const lambert = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra })

// Repeats a texture across a box face by scaling its UVs (so one texture can fit any size).
export function uvScale(geometry, sx, sy) {
  const uv = geometry.attributes.uv
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy)
  return geometry
}

// A box whose base sits on y = 0, which makes stacking and placing easier.
export function block(w, h, d, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
  mesh.position.set(x, y + h / 2, z)
  return mesh
}

// Cylinder or cone sitting on y = 0.
export function column(rTop, rBottom, h, material, x = 0, y = 0, z = 0, segments = 16) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, segments), material)
  mesh.position.set(x, y + h / 2, z)
  return mesh
}
