// Builds a gopuram: the tall tiered gateway tower of a South Indian temple.
// Used for Kanchipuram, Madurai and the far temple at Rameswaram.
import * as THREE from 'three'
import { stoneTexture, tierTextures } from '../textures.js'
import { block, glow, lambert, uvScale } from '../util.js'

export const PALETTES = {
  madurai: { wall: '#efd29a', figures: ['#d94a3a', '#2f8f6a', '#2f6fb0', '#e6a82a', '#8a3a8a', '#f2f0e0'], gold: '#c9961a' },
  kanchi: { wall: '#d9b488', figures: ['#b5543a', '#4a7a5a', '#3f6a9a', '#d3a03a', '#f0e8d8'], gold: '#b88a22' },
}

export const goldMaterial = () => new THREE.MeshPhongMaterial({ color: 0xd9a21b, specular: 0xffe9a0, shininess: 70, emissive: 0x2a1c02 })

export function makeGopuram({ tiers, baseW, baseD, tierH, palette = 'madurai', seed = 1, podiumH = 6 }) {
  const group = new THREE.Group()
  const pal = PALETTES[palette]
  const tex = tierTextures(palette, pal, seed)
  const tierMat = glow(new THREE.MeshLambertMaterial({ map: tex.map, emissiveMap: tex.glow, emissive: 0xffffff, emissiveIntensity: 0 }), 1.5)
  const stone = lambert(0xb6a58c, { map: stoneTexture('#b3a28a') })
  const trim = lambert(0x8a6a3a)
  const gold = goldMaterial()

  // Plain stone podium with a dark doorway.
  const podium = block(baseW * 1.06, podiumH, baseD * 1.06, stone)
  uvScale(podium.geometry, baseW / 12, 1)
  group.add(podium)
  group.add(block(baseW * 0.22, podiumH * 0.62, 0.6, lambert(0x1c1410), 0, 0, baseD * 0.53 + 0.1))

  // Tiers: each a little narrower and shorter, with a projecting cornice.
  let y = podiumH
  let w = baseW
  let d = baseD
  for (let i = 0; i < tiers; i++) {
    const h = tierH * (1 - 0.05 * i)
    const tier = block(w, h, d, tierMat, 0, y)
    uvScale(tier.geometry, w / 9, 1)
    group.add(tier)
    group.add(block(w * 1.08, 0.5, d * 1.1, trim, 0, y + h))
    y += h + 0.5
    w *= 1 - 0.095
    d *= 1 - 0.075
  }

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
