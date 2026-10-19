// Mamallapuram: a stepped granite Shore Temple, a carved rock wall, a balanced boulder and five small rathas.
import * as THREE from 'three'
import { faceRoad } from '../route.js'
import { quality } from '../quality.js'
import { carveTexture, stoneTexture, vimanaWallTexture, withRelief } from '../textures.js'
import { block, lambert, rng, surface, uvScale } from '../util.js'
import { goldMaterial } from './gopuram.js'
import { dravidaTower } from './shrines.js'

// Weathered sea-worn granite, with relief so the blocks and carvings catch the light.
function graniteSet() {
  const relief = (name, make) => {
    const t = withRelief(name, make, 2.6)
    return surface({ map: t.map, normalMap: quality.low ? null : t.normalMap, roughness: 0.95 })
  }
  return { stone: relief('shore-stone', () => stoneTexture('#8b8782', 6)), wall: relief('shore-wall', () => vimanaWallTexture('#918c84')) }
}

function shoreTemple() {
  const g = new THREE.Group()
  const { stone, wall } = graniteSet()
  // a deep foundation, because the temple stands where the beach slopes into the sea
  const base = block(36, 4.2, 24, stone, 0, -3)
  uvScale(base.geometry, 6, 1.6)
  g.add(base)
  // the taller shrine faces the sea, the smaller one faces the land
  const big = dravidaTower({ base: 10, tiers: 4, wallH: 4.2, tierH: 2.4, mat: stone, wallMat: wall, finialMat: goldMaterial() })
  big.position.set(-6, 1.2, -1)
  const small = dravidaTower({ base: 6.5, tiers: 3, wallH: 3.2, tierH: 1.9, mat: stone, wallMat: wall, finialMat: goldMaterial() })
  small.position.set(9, 1.2, 1.5)
  g.add(big, small)
  const hall = block(9, 3.6, 7, wall, 1.8, 1.2, 4)
  uvScale(hall.geometry, 1.4, 0.6)
  g.add(hall)
  // low enclosure wall topped with a row of seated bulls (nandis)
  g.add(block(36, 1.6, 0.9, stone, 0, 1.2, 11.2))
  const bull = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.42, 0.7, 4, 8), stone, 11)
  const m = new THREE.Matrix4()
  for (let i = 0; i < 11; i++) {
    m.makeRotationZ(Math.PI / 2).setPosition(-16 + i * 3.2, 3.3, 11.2)
    bull.setMatrixAt(i, m)
  }
  g.add(bull)
  return g
}

// Giant relief wall, boulders, and a huge round rock balanced on a slope.
function carvings() {
  const g = new THREE.Group()
  const relief = lambert(0xffffff, { map: carveTexture() })
  const wall = block(40, 15, 4.5, relief)
  g.add(wall)
  const rock = lambert(0x8d7d68)
  const r = rng(12)
  for (let i = 0; i < 9; i++) {
    const geo = new THREE.IcosahedronGeometry(2 + r() * 3.2, 1)
    const p = geo.attributes.position
    for (let k = 0; k < p.count; k++) p.setXYZ(k, p.getX(k) * (0.85 + r() * 0.3), p.getY(k) * (0.7 + r() * 0.3), p.getZ(k) * (0.85 + r() * 0.3))
    geo.computeVertexNormals()
    const b = new THREE.Mesh(geo, rock)
    b.position.set(-24 + i * 6 + r() * 3, 1.4, 5 + r() * 7)
    g.add(b)
  }
  // the balanced boulder
  const slope = new THREE.Mesh(new THREE.ConeGeometry(7, 5, 7), rock)
  slope.position.set(30, 2.5, 4)
  slope.rotation.z = 0.2
  g.add(slope)
  const ball = new THREE.Mesh(new THREE.SphereGeometry(3.6, 20, 16), lambert(0x9a8870))
  ball.position.set(30, 7.4, 4)
  g.add(ball)
  return g
}

// Five single-stone temples (the Pancha Rathas), each a different size.
function rathas() {
  const g = new THREE.Group()
  const { stone, wall } = graniteSet()
  const sizes = [
    [5, 1, 3.2],
    [6.5, 2, 3.4],
    [4.5, 1, 2.8],
    [8, 3, 3.8],
    [5.5, 2, 3],
  ]
  sizes.forEach(([b, t, h], i) => {
    const tower = dravidaTower({ base: b, tiers: t, wallH: h, tierH: 1.6, mat: stone, wallMat: wall })
    tower.position.set(-30 + i * 15, 0, 0)
    g.add(tower)
  })
  return g
}

export function buildMamallapuram({ scene, route, u }) {
  const world = new THREE.Group()
  scene.add(world)
  const add = (obj, du, lateral) => {
    obj.position.copy(route.side(u + du, lateral))
    faceRoad(obj, route, u + du)
    world.add(obj)
  }
  const temple = shoreTemple()
  add(temple, 0, 84)
  add(carvings(), -0.05, 58)
  add(rathas(), 0.042, 52)
  return { focus: route.side(u, 76, 8), slots: [{ name: 'shore-temple', group: temple, height: 18 }], update() {} }
}
