// Chennai: Marina Beach, the lighthouse and Chennai Central (red-brick station with a clock tower).
import * as THREE from 'three'
import { faceRoad } from '../route.js'
import { bandTexture, brickTexture, clockTexture, glowTexture, windowTextures } from '../textures.js'
import { block, column, glow, lambert, rng, uvScale } from '../util.js'

function lighthouse() {
  const g = new THREE.Group()
  const bands = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 3.5, 34, 24), lambert(0xffffff, { map: bandTexture('#e6e0d2', '#b3281f', 6) }))
  bands.position.y = 17
  g.add(bands)
  g.add(column(3.2, 3.2, 0.6, lambert(0x333338), 0, 33.8))
  const lamp = glow(new THREE.MeshLambertMaterial({ color: 0xfff1c0, emissive: 0xffe08a, emissiveIntensity: 0.4, transparent: true, opacity: 0.85 }), 2.4)
  g.add(column(1.9, 1.9, 3.2, lamp, 0, 34.4))
  g.add(column(0.1, 2.5, 2.2, lambert(0xb3281f), 0, 37.6))
  // A slow turning beam, visible mostly at dusk and dawn.
  const beam = new THREE.Group()
  const beamMat = new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0xfff0c0, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })
  const ray = new THREE.Mesh(new THREE.PlaneGeometry(60, 5), beamMat)
  ray.position.x = 30
  ray.userData.noShadow = true
  beam.add(ray)
  beam.position.y = 36
  g.add(beam)
  g.userData.beam = beam
  return g
}

function station() {
  const g = new THREE.Group()
  const brick = lambert(0xffffff, { map: brickTexture() })
  const trim = lambert(0xe9e1cf)
  const W = 52
  const wall = block(W, 13, 11, brick)
  uvScale(wall.geometry, W / 8, 1.6)
  g.add(wall)
  g.add(block(W + 1, 0.8, 12, trim, 0, 13))
  g.add(block(W + 0.6, 0.6, 11.6, trim, 0, 6.2))
  // rows of lit windows
  const win = windowTextures()
  const wm = glow(new THREE.MeshLambertMaterial({ map: win.map, emissiveMap: win.glow, emissive: 0xffffff, emissiveIntensity: 0 }), 1.4)
  for (const y of [1.6, 7.2]) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(W - 8, 4), wm)
    uvScale(strip.geometry, 9, 0.2)
    strip.position.set(0, y + 2, 5.55)
    g.add(strip)
  }
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
  const house = lighthouse()
  house.position.copy(route.side(u - 0.012, 40))
  faceRoad(house, route, u)
  world.add(house)
  const central = station()
  central.position.copy(route.side(u + 0.018, 62))
  faceRoad(central, route, u + 0.018)
  world.add(central)
  boats(route, world)
  return {
    focus: route.side(u + 0.004, 52, 14),
    update(time) {
      house.userData.beam.rotation.y = time * 1.1
    },
  }
}
