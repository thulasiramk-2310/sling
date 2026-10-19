// Kanchipuram: a tiered gopuram, and behind it a tall stepped vimana in the style of Thanjavur's Brihadeeswarar temple.
import * as THREE from 'three'
import { faceRoad } from '../route.js'
import { stoneTexture } from '../textures.js'
import { block, lambert, uvScale } from '../util.js'
import { goldMaterial, makeGopuram } from './gopuram.js'

// A huge stepped pyramid of stone with a round cap, a gold finial and a bull (nandi) in front.
function vimana() {
  const g = new THREE.Group()
  const mat = lambert(0xffffff, { map: stoneTexture('#a8977c', 14) })
  const dark = lambert(0x2a2018)
  const base = block(34, 3, 30, mat)
  uvScale(base.geometry, 6, 0.6)
  g.add(base)
  g.add(block(10, 6, 14, mat, 0, 0, 20)) // entrance hall
  g.add(block(4, 4, 0.5, dark, 0, 0, 27.1))
  const tiers = 12
  let y = 3
  let w = 24
  const shrine = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, tiers * 8)
  const m = new THREE.Matrix4()
  let n = 0
  for (let i = 0; i < tiers; i++) {
    const h = 2.7
    const t = block(w, h, w * 0.9, mat, 0, y)
    uvScale(t.geometry, w / 8, 0.5)
    g.add(t)
    g.add(block(w * 1.07, 0.4, w * 0.97, mat, 0, y + h))
    // small shrines along the ledge
    const sz = Math.max(0.9, w * 0.07)
    for (const [x, z] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
      [0, 1],
      [0, -1],
      [-1, 0],
      [1, 0],
    ]) {
      m.compose(new THREE.Vector3(x * w * 0.48, y + h + 0.4 + sz / 2, z * w * 0.43), new THREE.Quaternion(), new THREE.Vector3(sz, sz, sz))
      shrine.setMatrixAt(n++, m)
    }
    y += h + 0.4
    w *= 0.885
  }
  g.add(shrine)
  const cap = new THREE.Mesh(new THREE.SphereGeometry(w * 0.62, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat)
  cap.position.y = y
  g.add(cap)
  const pot = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3.4, 10), goldMaterial())
  pot.position.y = y + w * 0.62 + 1.4
  g.add(pot)
  // nandi
  const nandi = new THREE.Group()
  nandi.add(block(4.6, 1.8, 2.2, mat, 0, 0.6))
  nandi.add(block(1.5, 1.6, 1.4, mat, 2.6, 1.6))
  nandi.add(block(0.4, 1.0, 0.3, mat, 3.2, 3.1, 0.4))
  nandi.add(block(0.4, 1.0, 0.3, mat, 3.2, 3.1, -0.4))
  nandi.add(block(6, 0.6, 3.6, mat))
  nandi.position.set(0, 0, 33)
  nandi.rotation.y = -Math.PI / 2
  g.add(nandi)
  return g
}

export function buildKanchipuram({ scene, route, u }) {
  const world = new THREE.Group()
  scene.add(world)
  const gate = makeGopuram({ tiers: 7, baseW: 26, baseD: 15, tierH: 5.2, palette: 'kanchi', seed: 4 })
  gate.position.copy(route.side(u - 0.004, 58))
  faceRoad(gate, route, u)
  world.add(gate)
  const wall = block(60, 5, 1.4, lambert(0xcbb48e, { map: stoneTexture('#c4ad86', 3) }))
  wall.position.copy(route.side(u - 0.004, 58))
  wall.rotation.y = gate.rotation.y
  wall.translateX(-43)
  world.add(wall)
  const wall2 = wall.clone()
  wall2.translateX(86)
  world.add(wall2)
  const v = vimana()
  v.position.copy(route.side(u + 0.03, 96))
  faceRoad(v, route, u)
  world.add(v)
  return { focus: route.side(u, 60, 22), update() {} }
}
