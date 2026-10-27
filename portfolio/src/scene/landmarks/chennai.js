// Chennai: Marina Beach, the lighthouse and Chennai Central (red-brick station with a clock tower).
import * as THREE from 'three'
import { faceRoad } from '../route.js'
import { brickTexture, clockTexture, glowTexture, grainTexture, withRelief } from '../textures.js'
import { block, column, glow, lambert, rng, surface, uvScale } from '../util.js'
import { quality } from '../quality.js'
import { createLighthouse } from './lighthouse.js'
import { createArrivalPlaza } from './arrival-plaza.js'
import { createPromenade } from './promenade.js'

function lighthouse() {
  const paint = withRelief('lighthouse-render', grainTexture, 0.45)
  const finish = { map: paint.map, normalMap: quality.low ? null : paint.normalMap, roughness: 0.87 }
  const lamp = glow(surface({ color: 0xfff1c0, emissive: 0xffe08a, emissiveIntensity: 0 }), 2.4)
  const g = createLighthouse({
    white: lambert(0xf4eee2, finish), red: lambert(0xa9392e, finish),
    metal: surface({ color: 0x4a4b46, roughness: 0.4, metalness: 0.7 }),
    glass: surface({ color: 0x799394, roughness: 0.18, metalness: 0.25, transparent: true, opacity: 0.5, depthWrite: false }),
    dark: lambert(0x293432), lamp,
  })
  // A slow turning beam, visible mostly at dusk and dawn.
  const beam = new THREE.Group()
  const beamMat = new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0xfff0c0, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })
  const ray = new THREE.Mesh(new THREE.PlaneGeometry(60, 5), beamMat)
  ray.position.x = 30
  ray.userData.noShadow = true
  beam.add(ray)
  beam.position.y = 43.3
  g.add(beam)
  g.userData.beam = beam
  return g
}

function station() {
  const g = new THREE.Group()
  g.userData.staticBatchRoot = true
  const relief = withRelief('central-brick', brickTexture, 1.2)
  const brick = lambert(0xffffff, { map: relief.map, normalMap: quality.low ? null : relief.normalMap, roughness: 0.91 })
  const trim = lambert(0xe9e1cf)
  const W = 52
  const wall = block(W, 13, 11, brick)
  uvScale(wall.geometry, W / 8, 1.6)
  g.add(wall)
  g.add(block(W + 1, 0.8, 12, trim, 0, 13))
  g.add(block(W + 0.6, 0.6, 11.6, trim, 0, 6.2))
  // Projecting arch surrounds and inset glazing give the station real facade depth.
  const arch = (radius, spring) => {
    const shape = new THREE.Shape()
    shape.moveTo(-radius, 0)
    shape.lineTo(-radius, spring)
    shape.absarc(0, spring, radius, Math.PI, 0, true)
    shape.lineTo(radius, 0)
    shape.closePath()
    return shape
  }
  const opening = arch(0.8, 2.2)
  const border = arch(1.08, 2.2)
  const hole = new THREE.Path(opening.getPoints(16))
  border.holes.push(hole)
  const archGeo = new THREE.ExtrudeGeometry(border, { depth: 0.3, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.035, bevelThickness: 0.035, curveSegments: 12 })
  const glassGeo = new THREE.ShapeGeometry(opening, 12)
  const glazing = glow(surface({ color: 0x233835, emissive: 0xffbd70, emissiveIntensity: 0, roughness: 0.25, metalness: 0.15 }), 0.6)
  const arches = new THREE.InstancedMesh(archGeo, trim, 24)
  const panes = new THREE.InstancedMesh(glassGeo, glazing, 24)
  const matrix = new THREE.Matrix4()
  let n = 0
  for (const y of [1.1, 7.3]) for (let x = -23; x <= 23; x += 4) {
    arches.setMatrixAt(n, matrix.makeTranslation(x, y, 5.51))
    panes.setMatrixAt(n++, matrix.makeTranslation(x, y, 5.52))
    g.add(block(0.12, 3, 0.15, trim, x, y, 5.64))
    g.add(block(2.5, 0.24, 0.65, trim, x, y - 0.24, 5.65))
  }
  arches.count = panes.count = n
  g.add(arches, panes)
  // clock tower with four clock faces and a dark pyramid roof
  const tower = block(9, 24, 9, brick, 0, 13)
  uvScale(tower.geometry, 1.4, 3)
  g.add(tower)
  g.add(block(10, 0.8, 10, trim, 0, 37))
  const roof = new THREE.Mesh(new THREE.ConeGeometry(7.6, 9, 4), lambert(0x3a3a40))
  roof.rotation.y = Math.PI / 4
  roof.position.y = 42
  g.add(roof)
  const face = new THREE.MeshBasicMaterial({ map: clockTexture() })
  for (const [x, z, ry] of [
    [0, 4.6, 0],
    [0, -4.6, Math.PI],
    [4.6, 0, Math.PI / 2],
    [-4.6, 0, -Math.PI / 2],
  ]) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), face)
    c.position.set(x, 31, z)
    c.rotation.y = ry
    g.add(c)
  }
  // wing turrets
  for (const x of [-W / 2 + 3, W / 2 - 3]) {
    g.add(column(2.6, 2.8, 18, brick, x, 0, 0, 12))
    g.add(column(0.1, 3.2, 4.4, lambert(0x3a3a40), x, 18, 0, 12))
  }
  return g
}

// Catamarans pulled up on the sand.
function boats(route, group) {
  const r = rng(4)
  const wood = lambert(0x8a5a32)
  const sail = lambert(0xe9e1cf, { side: THREE.DoubleSide })
  for (let i = 0; i < 7; i++) {
    const u = 0.025 + i * 0.016 + r() * 0.01
    const boat = new THREE.Group()
    boat.add(block(7, 0.5, 1, wood, 0, 0.1))
    boat.add(block(6, 0.4, 0.9, wood, 0, 0.5, 1.1))
    if (i % 2) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(3, 4), sail)
      s.position.set(0, 2.6, 0)
      boat.add(s)
    }
    boat.position.copy(route.side(u, 62 + r() * 6, 0.1))
    boat.rotation.y = r() * 0.5 - 0.25
    group.add(boat)
  }
}

export function buildChennai({ scene, route, u }) {
  const world = new THREE.Group()
  scene.add(world)
  world.add(createPromenade(route),createArrivalPlaza(route,u))
  const house = lighthouse()
  house.position.copy(route.side(u - 0.012, 50))
  faceRoad(house, route, u)
  world.add(house)
  const central = station()
  central.position.copy(route.side(u + 0.027, -105))
  faceRoad(central, route, u + 0.027)
  central.rotation.y+=Math.PI
  world.add(central)
  boats(route, world)
  return {
    focus: route.side(u + 0.004, 52, 14),
    slots: [
      { name: 'chennai-lighthouse', group: house, height: 46 },
      { name: 'chennai-central', group: central, height: 46 },
    ],
    update(time) {
      house.userData.beam.rotation.y = time * 1.1
    },
  }
}
