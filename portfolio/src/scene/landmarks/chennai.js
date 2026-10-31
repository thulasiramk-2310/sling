// Chennai: Marina Beach, the lighthouse and Chennai Central (red-brick station with a clock tower).
import * as THREE from 'three'
import { faceRoad } from '../route.js'
import { glowTexture, grainTexture, withRelief } from '../textures.js'
import { block, glow, lambert, rng, surface } from '../util.js'
import { quality } from '../quality.js'
import { createLighthouse } from './lighthouse.js'
import { createArrivalPlaza } from './arrival-plaza.js'
import { createPromenade } from './promenade.js'
import { createCentralStation } from './central-station.js'

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
  const central = createCentralStation()
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
