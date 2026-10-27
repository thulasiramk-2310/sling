// Builds a gopuram: the tall tiered gateway tower of a South Indian temple.
// Used for Kanchipuram, Madurai and the far temple at Rameswaram.
import * as THREE from 'three'
import { quality } from '../quality.js'
import { grainTexture, stoneTexture, withRelief } from '../textures.js'
import { block, lambert, surface, uvScale } from '../util.js'
import { kutaGeometry, salaGeometry } from './shrines.js'
import { createSculptureInstances } from './sculptures.js'
import { createTierReliefs } from './temple-relief.js'
import { barrelVaultGeometry, carvedPillarGeometry, gatewayGeometry, kuduGeometry, taperedStoneCourse } from './stonework.js'

export const PALETTES = {
  madurai: { wall: '#657d77', figures: ['#d94a3a', '#2f8f6a', '#2f6fb0', '#e6a82a', '#8a3a8a', '#f2f0e0'], gold: '#c9961a' },
  rameswaram: { wall: '#d4cdb5', figures: ['#c1b9a2', '#d1c8b0', '#9d9b8d'], gold: '#ba995b' },
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
  group.userData.staticBatchRoot = true
  const pal = PALETTES[palette]
  const painted=palette==='madurai'
  const relief = withRelief('gopuram-' + palette, painted ? grainTexture : () => stoneTexture(pal.wall, seed), painted?.16:1.4)
  const tierMat = surface({ color:painted?pal.wall:0xffffff, map: relief.map, normalMap: quality.low ? null : relief.normalMap, roughness: .93 })
  const stone = lambert(0xb6a58c, { map: stoneTexture('#b3a28a') })
  const trim = lambert(palette === 'madurai' ? 0x769893 : palette === 'rameswaram' ? 0xb4ae99 : 0x8a785f)
  const gold = goldMaterial()

  // Stone gateway with an actual passage through the base, framed by pilasters.
  const width=baseW*1.06, depth=baseD*1.06
  const podiumGeometry=gatewayGeometry(width,depth,podiumH)
  const doorW=baseW*.26
  const podium=new THREE.Mesh(podiumGeometry,stone)
  podium.name='Gateway with open passage'
  group.add(podium)
  for(const x of [-doorW*.7,doorW*.7]) for(const z of [-depth*.51,depth*.51]) {
    const pillar=new THREE.Mesh(carvedPillarGeometry(podiumH,.95),stone)
    pillar.position.set(x,0,z)
    group.add(pillar)
  }

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
  const sculptures = createSculptureInstances(quality.low,{polychrome:painted})
  const nichePlacements=[]
  const smallReliefs=painted?createTierReliefs(quality.low):null
  const bands=painted?[surface({color:0xb27165,roughness:.95}),surface({color:0xc4b493,roughness:.95}),surface({color:0x547f80,roughness:.95})]:null
  for (let i = 0; i < tiers; i++) {
    const h = tierH * (1 - 0.05 * i)
    const tier = new THREE.Mesh(taperedStoneCourse(w,d,h,.94),tierMat)
    tier.position.y=y
    uvScale(tier.geometry, w / 9, 1)
    group.add(tier)
    group.add(block(w * 1.08, painted?.24:.5, d * 1.1, trim, 0, y + h))
    if(painted)for(let band=0;band<3;band++)group.add(block(w*(1.04+band*.012),.09,d*(1.06+band*.012),bands[band],0,y+h+.24+band*.09))
    // Space real three-dimensional figures along each facade, rather than
    // repeating painted human symbols across the flat tier texture.
    for (let face = 0; face < 4; face++) {
      const angle = face * Math.PI / 2
      const span = face % 2 ? d : w
      const depth = (face % 2 ? w : d) / 2
      const count = Math.max(2,Math.floor(span / (painted?(quality.low?2:1.7):(quality.low ? 5 : 2.6))))
      for (let j = 0; j < count; j++) {
        const along = (j - (count - 1) / 2) * (span - 2) / count
        const position = new THREE.Vector3(along,y + .08,depth + .3).applyAxisAngle(new THREE.Vector3(0,1,0),angle)
        const color = new THREE.Color(pal.figures[(j + i + seed) % pal.figures.length]).lerp(new THREE.Color(pal.wall), palette === 'madurai' ? .18 : .45)
        sculptures.place(position.x,position.y+.08,position.z+.02,angle, h*(painted?.67:.82),color)
        if(!painted || j%5===2) nichePlacements.push({position,angle,height:h*(painted?.72:1)})
        if(painted){
          const upper=new THREE.Vector3(along+(span-2)/count*.25,y+h*.69,depth*.96+.25).applyAxisAngle(new THREE.Vector3(0,1,0),angle)
          smallReliefs.place(upper,angle,h*.29,color)
        }
      }
    }
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
  group.add(kutas, salas, sculptures.build())
  if(painted)group.add(smallReliefs.build())

  const niches=new THREE.InstancedMesh(kuduGeometry(),trim,nichePlacements.length)
  for(const [i,p] of nichePlacements.entries()) {
    q.setFromAxisAngle(new THREE.Vector3(0,1,0),p.angle)
    m.compose(p.position,q,new THREE.Vector3(p.height*.62,p.height*.82,p.height*.7))
    niches.setMatrixAt(i,m)
  }
  group.add(niches)

  // Hollow barrel-vault crown with golden finials.
  const crown = new THREE.Mesh(barrelVaultGeometry(w*1.15,d*1.1,d*.55),painted?trim:stone)
  crown.rotation.y=Math.PI/2
  crown.position.y = y
  group.add(crown)
  const count = painted?7:3
  for (let i = 0; i < count; i++) {
    const k = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.6, 10), gold)
    k.position.set((i - (count - 1) / 2) * w * (painted?.14:.4), y + d * 0.55 + 1.2, 0)
    group.add(k)
  }
  group.userData.height = y + d * 0.55 + 2.5
  return group
}
