// Madurai: Meenakshi-style gopurams at dusk, with colourful tiers, lit windows and strings of lamps.
import * as THREE from 'three'
import { faceRoad } from '../route.js'
import { stoneTexture } from '../textures.js'
import { block, glow, lambert, rng, uvScale } from '../util.js'
import { goldMaterial, makeGopuram } from './gopuram.js'

// Rings of small lamps around the base of a tower.
function lamps(radiusX, radiusZ, y, count) {
  const mat = glow(new THREE.MeshBasicMaterial({ color: 0xffc866 }), 1)
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.3, 6, 5), mat, count)
  const m = new THREE.Matrix4()
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2
    m.setPosition(Math.cos(a) * radiusX, y, Math.sin(a) * radiusZ)
    mesh.setMatrixAt(i, m)
  }
  // Basic materials ignore emissive, so brighten by colour instead.
  mat.userData.glow = 0
  return mesh
}

export function buildMadurai({ scene, route, u }) {
  const world = new THREE.Group()
  scene.add(world)
  const place = (obj, du, lateral) => {
    obj.position.copy(route.side(u + du, lateral))
    faceRoad(obj, route, u + du)
    world.add(obj)
    return obj
  }
  // the tall main gopuram and three companions
  const main = place(makeGopuram({ tiers: 9, baseW: 30, baseD: 18, tierH: 5.4, palette: 'madurai', seed: 2, podiumH: 7 }), 0, 54)
  place(makeGopuram({ tiers: 6, baseW: 22, baseD: 14, tierH: 4.8, palette: 'madurai', seed: 8, podiumH: 6 }), -0.03, 62)
  place(makeGopuram({ tiers: 7, baseW: 24, baseD: 15, tierH: 5, palette: 'madurai', seed: 5, podiumH: 6 }), 0.03, 70)
  place(makeGopuram({ tiers: 5, baseW: 18, baseD: 12, tierH: 4.4, palette: 'madurai', seed: 3, podiumH: 5 }), 0.012, 104)

  // compound wall with a golden-roofed shrine inside
  const stone = lambert(0xffffff, { map: stoneTexture('#c9b190', 7) })
  const wall = block(110, 6, 1.6, stone)
  uvScale(wall.geometry, 14, 0.8)
  place(wall, 0, 48)
  const shrine = new THREE.Group()
  shrine.add(block(14, 6, 12, stone))
  const dome = new THREE.Mesh(new THREE.SphereGeometry(5.2, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), goldMaterial())
  dome.position.y = 6
  shrine.add(dome)
  place(shrine, 0.002, 82)

  // strings of lamps round the main gate, lit as dusk falls
  const ring = lamps(17, 10, 8, 56)
  ring.position.copy(main.position)
  ring.rotation.y = main.rotation.y
  world.add(ring)
  const tanks = lamps(24, 14, 1.2, 40)
  tanks.position.copy(main.position)
  tanks.rotation.y = main.rotation.y
  world.add(tanks)

  // little houses along the road in front
  const r = rng(40)
  void r
  return {
    focus: route.side(u, 54, 30),
    update(time, night) {
      ring.material.color.setRGB(0.25 + night * 0.75, 0.2 + night * 0.62, 0.1 + night * 0.25)
      tanks.material.color.copy(ring.material.color)
    },
  }
}
