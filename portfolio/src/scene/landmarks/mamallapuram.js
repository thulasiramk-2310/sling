// Mamallapuram: a stepped granite Shore Temple, a carved rock wall, a balanced boulder and five small rathas.
import * as THREE from 'three'
import { faceRoad } from '../route.js'
import { carveTexture, stoneTexture } from '../textures.js'
import { block, lambert, rng, uvScale } from '../util.js'
import { goldMaterial } from './gopuram.js'

const granite = () => lambert(0xffffff, { map: stoneTexture('#9c8f7a', 6) })

// A stack of ever-smaller layers topped with a gold finial: the shape of a South Indian temple tower.
function steppedTower(layers, w, h, mat) {
  const g = new THREE.Group()
  let y = 0
  let s = w
  for (let i = 0; i < layers; i++) {
    const b = block(s, h, s * 0.9, mat, 0, y)
    uvScale(b.geometry, s / 6, 0.6)
    g.add(b)
    g.add(block(s * 1.1, 0.35, s * 0.98, mat, 0, y + h))
    y += h + 0.35
    s *= 0.78
  }
  const cap = new THREE.Mesh(new THREE.SphereGeometry(s * 0.7, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat)
  cap.position.y = y
  g.add(cap)
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.4, 2.2, 8), goldMaterial())
  fin.position.y = y + s * 0.7 + 0.9
  g.add(fin)
  return g
}

function shoreTemple() {
  const g = new THREE.Group()
  const mat = granite()
  // a deep foundation, because the temple stands where the beach slopes into the sea
  const base = block(36, 4.2, 24, mat, 0, -3)
  uvScale(base.geometry, 6, 1.6)
  g.add(base)
  const big = steppedTower(6, 13, 3.3, mat)
  big.position.set(-5, 1.2, 0)
  const small = steppedTower(4, 8, 2.8, mat)
  small.position.set(9, 1.2, 1)
  g.add(big, small)
  const hall = block(11, 4.4, 9, mat, 1.5, 1.2, 4)
  uvScale(hall.geometry, 2, 0.8)
  g.add(hall)
  // low wall topped with a row of seated bulls (nandis)
  const wall = block(36, 1.6, 0.9, mat, 0, 1.2, 11.2)
  g.add(wall)
  const bull = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 0.9, 0.8), mat, 11)
  const m = new THREE.Matrix4()
  for (let i = 0; i < 11; i++) {
    m.setPosition(-16 + i * 3.2, 3.35, 11.2)
    bull.setMatrixAt(i, m)
  }
  g.add(bull)
  g.userData.focus = new THREE.Vector3(0, 8, 0)
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

// Five single-stone temples in a row, each a different height.
function rathas() {
  const g = new THREE.Group()
  const mat = granite()
  const sizes = [6, 7.5, 5.5, 9, 6.5]
  sizes.forEach((s, i) => {
    const t = steppedTower(3, s, s * 0.34, mat)
    t.position.set(-30 + i * 15, 0, 0)
    g.add(t)
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
  return { focus: route.side(u, 76, 8), update() {} }
}
