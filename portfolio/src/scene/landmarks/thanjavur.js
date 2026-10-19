// Thanjavur: the Brihadeeswarar temple (Periya Kovil), laid out as it really is.
// From the road inward: the Keralantakan gateway (5 tiers), the Rajarajan gateway (3 tiers) set in the
// cloister wall, the Nandi mandapam, the halls, and the 66 m granite vimana (13 tiers, octagonal cupola, gold kalasam).
// Local +Z faces the road; the vimana stands at the origin.
import * as THREE from 'three'
import { quality } from '../quality.js'
import { faceRoad } from '../route.js'
import { colonnadeTexture, stoneTexture, vimanaWallTexture, withRelief } from '../textures.js'
import { block, lambert, surface, uvScale } from '../util.js'
import { goldMaterial, makeGopuram } from './gopuram.js'
import { cupolaGeometry, kutaGeometry, salaGeometry } from './shrines.js'

const BASE = 30 // side of the vimana's square base

// Granite with relief. `repeat` sets how many texture tiles fit across one face.
function granite(name, make, strength) {
  const t = withRelief(name, make, strength)
  return surface({ map: t.map, normalMap: quality.low ? null : t.normalMap, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.9 })
}

// The gilded finial (kalasam).
function kalasamGeometry() {
  const pts = [
    [0.01, 0],
    [0.9, 0],
    [1.1, 0.5],
    [0.7, 1.0],
    [0.95, 1.5],
    [0.6, 2.2],
    [0.3, 2.9],
    [0.08, 3.6],
    [0.01, 3.7],
  ].map(([x, y]) => new THREE.Vector2(x, y))
  return new THREE.LatheGeometry(pts, 16)
}

// A seated bull. Big version for the mandapam, tiny versions along the walls.
function nandi(mat) {
  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.15, 2.4, 6, 12), mat)
  body.rotation.z = Math.PI / 2
  body.position.set(0, 1.25, 0)
  const hump = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 10), mat)
  hump.position.set(0.75, 2.2, 0)
  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.6, 0.6, 4, 10), mat)
  neck.position.set(1.75, 1.9, 0)
  neck.rotation.z = -0.6
  const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.9, 4, 10), mat)
  head.position.set(2.35, 2.05, 0)
  head.rotation.z = 0.35
  g.add(body, hump, neck, head)
  for (const s of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 8), mat)
    horn.position.set(2.15, 2.75, s * 0.32)
    horn.rotation.x = s * 0.4
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), mat)
    ear.scale.set(0.6, 0.4, 1.4)
    ear.position.set(2.1, 2.35, s * 0.55)
    const leg = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.45, 0.5), mat)
    leg.position.set(1.4, 0.3, s * 0.85)
    const hind = new THREE.Mesh(new THREE.SphereGeometry(0.75, 10, 8), mat)
    hind.scale.set(1.3, 0.8, 0.7)
    hind.position.set(-1.25, 0.75, s * 0.75)
    g.add(horn, ear, leg, hind)
  }
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.6, 3), mat)
  plinth.position.y = -0.2
  g.add(plinth)
  return g
}

function vimana(stone, wall) {
  const g = new THREE.Group()
  const add = (mesh) => (g.add(mesh), mesh)
  let y = 0
  // plinth mouldings
  for (const [w, h] of [
    [BASE + 4, 1.0],
    [BASE + 2.6, 0.7],
    [BASE + 3.2, 0.6],
    [BASE + 2.4, 0.4],
  ]) {
    add(block(w, h, w, stone, 0, y))
    y += h
  }
  // two storeys of wall, each with projecting central and corner bays and a deep cornice
  for (let storey = 0; storey < 2; storey++) {
    const h = 6.6
    const core = add(block(BASE, h, BASE, wall, 0, y))
    uvScale(core.geometry, BASE / 10, 1)
    for (let side = 0; side < 4; side++) {
      const a = (side * Math.PI) / 2
      const bay = block(BASE * 0.32, h, 1.2, wall, 0, y, BASE / 2 + 0.5)
      uvScale(bay.geometry, 1, 1)
      const pivot = new THREE.Group()
      pivot.rotation.y = a
      pivot.add(bay)
      for (const s of [-1, 1]) {
        const corner = block(BASE * 0.14, h, 0.8, wall, s * BASE * 0.43, y, BASE / 2 + 0.3)
        pivot.add(corner)
      }
      g.add(pivot)
    }
    y += h
    add(block(BASE + 3, 0.5, BASE + 3, stone, 0, y))
    add(block(BASE + 2, 0.5, BASE + 2, stone, 0, y + 0.5))
    y += 1.0
  }

  // 13 diminishing tiers, each ringed by miniature shrines
  const tiers = 13
  const kutas = new THREE.InstancedMesh(kutaGeometry(), stone, tiers * 4)
  const salas = new THREE.InstancedMesh(salaGeometry(), stone, tiers * 8)
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  let k = 0
  let n = 0
  let w = BASE * 0.92
  for (let i = 0; i < tiers; i++) {
    const h = 2.5
    const core = add(block(w, h, w, wall, 0, y))
    uvScale(core.geometry, w / 9, 0.55)
    add(block(w + 0.7, 0.35, w + 0.7, stone, 0, y + h))
    const top = y + h + 0.35
    const s = Math.max(0.85, w * 0.085)
    for (const [cx, cz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      m.compose(new THREE.Vector3((cx * (w - s)) / 2, top, (cz * (w - s)) / 2), q.identity(), new THREE.Vector3(s, s, s))
      kutas.setMatrixAt(k++, m)
    }
    for (let side = 0; side < 4; side++) {
      const a = (side * Math.PI) / 2
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), a)
      for (const along of [-0.24, 0.24]) {
        const local = new THREE.Vector3(along * w, top, (w - s) / 2).applyAxisAngle(new THREE.Vector3(0, 1, 0), a)
        m.compose(local, q, new THREE.Vector3(s, s, s))
        salas.setMatrixAt(n++, m)
      }
    }
    y += h + 0.35
    w *= 0.935
  }
  g.add(kutas, salas)

  // platform, four little bulls, octagonal neck, cupola and kalasam
  add(block(w + 2.4, 0.6, w + 2.4, stone, 0, y))
  y += 0.6
  for (const [cx, cz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    const b = nandi(stone)
    b.scale.setScalar(0.32)
    b.position.set((cx * (w + 1.4)) / 2, y + 0.1, (cz * (w + 1.4)) / 2)
    b.rotation.y = Math.atan2(-cx, -cz) + Math.PI / 2
    g.add(b)
  }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 4.5, 2.4, 8), wall)
  neck.position.y = y + 1.2
  neck.rotation.y = Math.PI / 8
  add(neck)
  y += 2.4
  const dome = new THREE.Mesh(cupolaGeometry(), stone)
  dome.position.y = y
  dome.rotation.y = Math.PI / 8
  add(dome)
  y += 6.0
  const kal = new THREE.Mesh(kalasamGeometry(), goldMaterial())
  kal.position.y = y - 0.1
  add(kal)
  g.userData.height = y + 3.6
  return g
}

// A flat-roofed hall with a parapet of tiny shrines, in front of the vimana.
function hall(w, h, d, wall, stone) {
  const g = new THREE.Group()
  g.add(block(w + 1.6, 1.4, d + 1.6, stone))
  const body = block(w, h, d, wall, 0, 1.4)
  uvScale(body.geometry, w / 10, h / 7)
  g.add(body)
  g.add(block(w + 1.4, 0.7, d + 1.4, stone, 0, 1.4 + h))
  const parapet = new THREE.InstancedMesh(salaGeometry(), stone, Math.floor(w / 2.6) * 2 + Math.floor(d / 2.6) * 2)
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  let i = 0
  const top = 2.1 + h
  for (let x = -w / 2 + 1.3; x < w / 2 - 1; x += 2.6)
    for (const z of [-d / 2, d / 2]) {
      m.compose(new THREE.Vector3(x, top, z), q.identity(), new THREE.Vector3(0.9, 0.9, 0.9))
      parapet.setMatrixAt(i++, m)
    }
  q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2)
  for (let z = -d / 2 + 1.3; z < d / 2 - 1; z += 2.6)
    for (const x of [-w / 2, w / 2]) {
      m.compose(new THREE.Vector3(x, top, z), q, new THREE.Vector3(0.9, 0.9, 0.9))
      parapet.setMatrixAt(i++, m)
    }
  parapet.count = i
  g.add(parapet)
  return g
}

// The Nandi mandapam: a pillared pavilion sheltering the great bull, facing the shrine.
function nandiMandapam(stone, polished) {
  const g = new THREE.Group()
  g.add(block(14, 1.6, 14, stone))
  const pillars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.85, 6.4, 0.85), stone, 16)
  const m = new THREE.Matrix4()
  let i = 0
  for (const x of [-5.4, -1.8, 1.8, 5.4])
    for (const z of [-5.4, -1.8, 1.8, 5.4]) {
      m.setPosition(x, 1.6 + 3.2, z)
      pillars.setMatrixAt(i++, m)
    }
  g.add(pillars)
  g.add(block(14.4, 0.9, 14.4, stone, 0, 8))
  g.add(block(12.4, 0.8, 12.4, stone, 0, 8.9))
  g.add(block(9, 0.7, 9, stone, 0, 9.7))
  const bull = nandi(polished)
  bull.scale.setScalar(1.15)
  bull.position.y = 2
  bull.rotation.y = Math.PI / 2 // faces the vimana (local -Z)
  g.add(bull)
  return g
}

// The cloister wall: a long roofed colonnade with little bulls along the top.
function cloister(stone, colonnade, x0, z0, x1, z1, bulls) {
  const len = Math.hypot(x1 - x0, z1 - z0)
  const g = new THREE.Group()
  const body = block(len, 6.5, 5, colonnade)
  uvScale(body.geometry, len / 8, 1)
  g.add(body)
  g.add(block(len + 0.4, 0.7, 5.6, stone, 0, 6.5))
  const step = 4
  const count = Math.floor(len / step)
  const m = new THREE.Matrix4()
  for (let i = 0; i < count; i++) {
    m.makeRotationY(Math.PI / 2)
    m.setPosition(-len / 2 + step / 2 + i * step, 7.2, 0)
    bulls.push(m.clone().premultiply(new THREE.Matrix4().makeRotationY(Math.atan2(-(z1 - z0), x1 - x0)).setPosition((x0 + x1) / 2, 0, (z0 + z1) / 2)))
  }
  g.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2)
  g.rotation.y = Math.atan2(-(z1 - z0), x1 - x0)
  return g
}

export function buildThanjavur({ scene, route, u }) {
  const stone = granite('thanjavur-stone', () => stoneTexture('#b59775', 19), 2.2)
  const wall = granite('vimana-wall', vimanaWallTexture, 3)
  const colonnade = granite('colonnade', colonnadeTexture, 2.5)
  const polished = surface({ color: 0x3d3733, roughness: 0.32, metalness: 0 })

  const temple = new THREE.Group()
  const v = vimana(stone, wall)
  temple.add(v)
  // halls joined to the front of the vimana
  const maha = hall(20, 8, 18, wall, stone)
  maha.position.z = BASE / 2 + 10
  const ardha = hall(14, 7, 8, wall, stone)
  ardha.position.z = BASE / 2 + 2.5
  temple.add(ardha, maha)
  // Nandi mandapam on the axis
  const nm = nandiMandapam(stone, polished)
  nm.position.z = 58
  temple.add(nm)
  // gateways: inner Rajarajan (3 tiers) in the cloister wall, outer Keralantakan (5 tiers)
  const inner = makeGopuram({ tiers: 3, baseW: 22, baseD: 12, tierH: 4.6, palette: 'thanjavur', seed: 12, podiumH: 9 })
  inner.position.z = 82
  const outer = makeGopuram({ tiers: 5, baseW: 28, baseD: 14, tierH: 4.8, palette: 'thanjavur', seed: 13, podiumH: 9 })
  outer.position.z = 112
  temple.add(inner, outer)
  // cloister around the courtyard, open where the inner gateway stands
  const bulls = []
  const W = 62
  temple.add(
    cloister(stone, colonnade, -W, 82, -13, 82, bulls),
    cloister(stone, colonnade, 13, 82, W, 82, bulls),
    cloister(stone, colonnade, -W, -48, W, -48, bulls),
    cloister(stone, colonnade, -W, -48, -W, 82, bulls),
    cloister(stone, colonnade, W, -48, W, 82, bulls),
  )
  const bullMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.4, 0.9, 0.7), stone, bulls.length)
  bulls.forEach((mm, i) => bullMesh.setMatrixAt(i, mm))
  temple.add(bullMesh)
  // lawns and the stone path along the axis
  const lawn = new THREE.Mesh(new THREE.BoxGeometry(W * 2 - 6, 0.12, 124), lambert(0x86a35a, { roughness: 1 }))
  lawn.position.set(0, 0.06, 17)
  lawn.userData.receiveOnly = true
  const path = new THREE.Mesh(new THREE.BoxGeometry(9, 0.16, 100), lambert(0xc9b18c, { roughness: 0.95 }))
  path.position.set(0, 0.1, 62)
  path.userData.receiveOnly = true
  temple.add(lawn, path)

  // Seen side-on from the road, across the cloister: the classic view of the vimana rising over the wall.
  // The vimana stands 100 m from the road; the gateways line up along the road.
  temple.position.copy(route.side(u, 100))
  faceRoad(temple, route, u)
  temple.rotation.y -= Math.PI / 2
  scene.add(temple)
  temple.updateMatrixWorld(true)
  const focus = new THREE.Vector3(0, 34, 0).applyMatrix4(temple.matrixWorld)
  return { focus, slots: [{ name: 'thanjavur', group: v, height: 66 }], update() {} }
}
