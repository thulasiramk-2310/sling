// Builds a gopuram: the tall tiered gateway tower of a South Indian temple.
// Used for Kanchipuram, Madurai and the far temple at Rameswaram.
import * as THREE from 'three'
import { quality } from '../quality.js'
import { stoneTexture, tierTextures } from '../textures.js'
import { block, glow, lambert, surface, uvScale } from '../util.js'
import { kutaGeometry, salaGeometry } from './shrines.js'

export const PALETTES = {
  madurai: { wall: '#efd29a', figures: ['#d94a3a', '#2f8f6a', '#2f6fb0', '#e6a82a', '#8a3a8a', '#f2f0e0'], gold: '#c9961a' },
  kanchi: { wall: '#d9b488', figures: ['#b5543a', '#4a7a5a', '#3f6a9a', '#d3a03a', '#f0e8d8'], gold: '#b88a22' },
  // Thanjavur's gateways are bare granite, not painted.
  thanjavur: { wall: '#b49a76', figures: ['#9c8466', '#a8906f', '#8e765a', '#c2ab88'], gold: '#a08462' },
}

// Gilded copper finials: real metal on desktop (it reflects the sky), a warm glossy colour on phones.
export const goldMaterial = () =>
  quality.low
    ? new THREE.MeshPhongMaterial({ color: 0xd9a21b, specular: 0xffe9a0, shininess: 70, emissive: 0x2a1c02 })
    : new THREE.MeshStandardMaterial({ color: 0xe0ac2c, metalness: 1, roughness: 0.28 })

export function makeGopuram({ tiers, baseW, baseD, tierH, palette = 'madurai', seed = 1, podiumH = 6 }) {
  const group = new THREE.Group()
  const pal = PALETTES[palette]
  const tex = tierTextures(palette, pal, seed)
  const tierMat = glow(surface({ map: tex.map, emissiveMap: tex.glow, emissive: 0xffffff, emissiveIntensity: 0 }), 1.5)
  const stone = lambert(0xb6a58c, { map: stoneTexture('#b3a28a') })
  const trim = lambert(0x8a6a3a)
  const gold = goldMaterial()

  // Plain stone podium with a dark doorway.
  const podium = block(baseW * 1.06, podiumH, baseD * 1.06, stone)
  uvScale(podium.geometry, baseW / 12, 1)
  group.add(podium)
  group.add(block(baseW * 0.22, podiumH * 0.62, 0.6, lambert(0x1c1410), 0, 0, baseD * 0.53 + 0.1))

  // Tiers: each a little narrower and shorter, with a projecting cornice crowned by a row of
  // miniature shrines (a domed one at each corner, barrel-roofed ones between).
  let y = podiumH
  let w = baseW
  let d = baseD
  const kutas = new THREE.InstancedMesh(kutaGeometry(), trim, tiers * 4)
  const salas = new THREE.InstancedMesh(salaGeometry(), trim, tiers * 24)
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  let k = 0
  let n = 0
  for (let i = 0; i < tiers; i++) {
    const h = tierH * (1 - 0.05 * i)
    const tier = block(w, h, d, tierMat, 0, y)
    uvScale(tier.geometry, w / 9, 1)
    group.add(tier)
    group.add(block(w * 1.08, 0.5, d * 1.1, trim, 0, y + h))
    const top = y + h + 0.5
    const s = Math.min(1.4, Math.max(0.7, h * 0.22))
    for (const [cx, cz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      m.compose(new THREE.Vector3((cx * (w * 1.04 - s)) / 2, top, (cz * (d * 1.06 - s)) / 2), q.identity(), new THREE.Vector3(s, s, s))
      kutas.setMatrixAt(k++, m)
    }
    const count = Math.min(12, Math.floor((w - 2 * s) / (2.3 * s)))
    for (let j = 0; j < count && n < tiers * 24 - 1; j++) {
      const x = -((count - 1) * 2.3 * s) / 2 + j * 2.3 * s
      for (const z of [-1, 1]) {
        m.compose(new THREE.Vector3(x, top, (z * (d * 1.06 - s)) / 2), q.identity(), new THREE.Vector3(s, s, s))
        salas.setMatrixAt(n++, m)
      }
    }
    y += h + 0.5 + s * 0.6
    w *= 1 - 0.095
    d *= 1 - 0.075
  }
  kutas.count = k
  salas.count = n
  group.add(kutas, salas)

  // Barrel-vault crown with golden finials.
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(d * 0.55, d * 0.55, w * 1.15, 14, 1, false, 0, Math.PI), stone)
  crown.rotation.z = Math.PI / 2
  crown.position.y = y
  group.add(crown)
  const count = 3
  for (let i = 0; i < count; i++) {
    const k = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.6, 10), gold)
    k.position.set((i - (count - 1) / 2) * w * 0.4, y + d * 0.55 + 1.2, 0)
    group.add(k)
  }
  group.userData.height = y + d * 0.55 + 2.5
  return group
}
