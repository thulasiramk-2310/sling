// Rameswaram: the road runs out over the sea on a long bridge with lift-span towers,
// an older rail bridge beside it, boats with lamps, and a lit temple on the island ahead.
import * as THREE from 'three'
import { glowTexture } from '../textures.js'
import { block, glow, lambert, rng } from '../util.js'
import { makeGopuram } from './gopuram.js'

const UP = new THREE.Vector3(0, 1, 0)

// A steel truss along the route between two points: posts and diagonals as instanced boxes.
function truss(route, { from, to, lateral, lift, height, spacing, color }) {
  const mat = lambert(color)
  const steps = Math.floor(((to - from) * route.length) / spacing)
  const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, height, 0.16), mat, steps + 1)
  const diags = new THREE.InstancedMesh(new THREE.BoxGeometry(0.13, 0.13, 1), mat, steps)
  const s = route.sample()
  const basis = new THREE.Matrix4()
  const m = new THREE.Matrix4()
  const tilt = new THREE.Matrix4()
  const diagLen = Math.hypot(spacing, height)
  const angle = Math.atan2(height, spacing)
  for (let i = 0; i <= steps; i++) {
    const u = from + ((i + (i % 2 ? 0 : 0)) / steps) * (to - from)
    route.at(u, s)
    const p = s.pos.clone().addScaledVector(s.right, lateral)
    basis.makeBasis(s.right, UP, s.tan)
    m.copy(basis).setPosition(p.x, p.y + lift + height / 2, p.z)
    posts.setMatrixAt(i, m)
    if (i < steps) {
      const mid = route.at(from + ((i + 0.5) / steps) * (to - from), route.sample())
      const q = mid.pos.clone().addScaledVector(mid.right, lateral)
      tilt.makeRotationX(i % 2 ? angle : -angle)
      m.copy(basis).multiply(tilt).multiply(new THREE.Matrix4().makeScale(1, 1, diagLen))
      m.setPosition(q.x, q.y + lift + height / 2, q.z)
      diags.setMatrixAt(i, m)
    }
  }
  const group = new THREE.Group()
  group.add(posts, diags)
  // top and bottom chords along the whole span
  for (const dy of [0, height]) {
    const pts = []
    for (let i = 0; i <= 40; i++) {
      route.at(from + (i / 40) * (to - from), s)
      pts.push(s.pos.clone().addScaledVector(s.right, lateral).add(new THREE.Vector3(0, lift + dy, 0)))
    }
    group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.1, 5), mat))
  }
  return group
}

// Concrete deck and piers standing in the sea.
function deckAndPiers(route, from, to, lateral, width, y) {
  const group = new THREE.Group()
  const deckMat = lambert(0x6a665e)
  const pos = []
  const idx = []
  const s = route.sample()
  const rows = 160
  for (let i = 0; i <= rows; i++) {
    route.at(from + (i / rows) * (to - from), s)
    for (const side of [-width, width]) {
      const p = s.pos.clone().addScaledVector(s.right, lateral + side)
      pos.push(p.x, p.y + y, p.z)
    }
    if (i < rows) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  group.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x6a665e, side: THREE.DoubleSide })))
  const piers = Math.floor(((to - from) * route.length) / 16)
  const pierMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.9, 1.3, 9, 8), deckMat, piers + 1)
  const m = new THREE.Matrix4()
  for (let i = 0; i <= piers; i++) {
    route.at(from + (i / piers) * (to - from), s)
    const p = s.pos.clone().addScaledVector(s.right, lateral)
    m.setPosition(p.x, p.y + y - 4.6, p.z)
    pierMesh.setMatrixAt(i, m)
  }
  group.add(pierMesh)
  return group
}

// Two tall towers with a girder across: the lift span the road passes through.
function liftTowers(route, u) {
  const g = new THREE.Group()
  const steel = lambert(0xd7d3c8)
  const red = lambert(0xb3281f)
  const lightMat = glow(new THREE.MeshBasicMaterial({ color: 0xff3b30 }), 1)
  lightMat.userData.glow = 0
  const halo = new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff4a40, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  const gap = 12 / route.length
  const s = route.sample()
  const tops = []
  for (const du of [-gap, gap]) {
    route.at(u + du, s)
    const yaw = Math.atan2(s.tan.x, s.tan.z)
    const tower = new THREE.Group()
    for (const side of [-6.4, 6.4]) tower.add(block(1.1, 30, 1.1, steel, side, 0))
    for (const y of [10, 20, 29]) tower.add(block(13.9, 0.8, 0.9, steel, 0, y))
    tower.add(block(13.9, 1.2, 1.2, red, 0, 30))
    tower.position.copy(s.pos)
    tower.rotation.y = yaw
    g.add(tower)
    for (const side of [-6.4, 6.4]) {
      const top = s.pos.clone().addScaledVector(s.right, side)
      top.y += 31.2
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), lightMat)
      bulb.position.copy(top)
      const h = new THREE.Sprite(halo)
      h.scale.setScalar(7)
      h.position.copy(top)
      g.add(bulb, h)
      tops.push(bulb)
    }
  }
  // girder between the towers
  const a = route.at(u - gap).pos
  const b = route.at(u + gap).pos
  const girder = block(1.2, 1.4, a.distanceTo(b), steel)
  girder.position.copy(a).lerp(b, 0.5)
  girder.position.y = a.y + 30
  girder.lookAt(b.x, girder.position.y, b.z)
  g.add(girder)
  return { group: g, blink: (t, night) => (halo.opacity = night * (0.3 + 0.7 * (Math.sin(t * 3) > 0 ? 1 : 0.1))), lightMat }
}

// Small fishing boats with a lamp each.
function boats(route, from, to) {
  const g = new THREE.Group()
  const r = rng(61)
  const hull = lambert(0x7a4a2a)
  const lamp = new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffd48a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
  const s = route.sample()
  for (let i = 0; i < 9; i++) {
    route.at(from + r() * (to - from), s)
    const p = s.pos.clone().addScaledVector(s.right, (r() > 0.5 ? 1 : -1) * (24 + r() * 70))
    const boat = new THREE.Group()
    boat.add(block(5, 0.8, 1.6, hull, 0, -0.4))
    boat.add(block(0.15, 3, 0.15, hull, 0, 0.4))
    const l = new THREE.Sprite(lamp)
    l.scale.setScalar(3)
    l.position.y = 3.6
    boat.add(l)
    boat.position.set(p.x, -1.1, p.z)
    boat.rotation.y = r() * Math.PI
    g.add(boat)
  }
  return g
}

export function buildRameswaram({ scene, route, u }) {
  const world = new THREE.Group()
  scene.add(world)
  const from = route.bridgeU
  world.add(deckAndPiers(route, from - 0.004, 1, 0, 5.4, -0.3))
  world.add(truss(route, { from, to: 1, lateral: 4.9, lift: 0, height: 3.4, spacing: 4, color: 0xd9d4c8 }))
  world.add(truss(route, { from, to: 1, lateral: -4.9, lift: 0, height: 3.4, spacing: 4, color: 0xd9d4c8 }))
  // the older rail bridge, lower and rustier, to the right
  world.add(deckAndPiers(route, from + 0.02, 1, 26, 2.4, -1.2))
  world.add(truss(route, { from: from + 0.02, to: 1, lateral: 26, lift: -1.2, height: 4.5, spacing: 6, color: 0x7a2f22 }))
  const lift = liftTowers(route, u)
  world.add(lift.group)
  world.add(boats(route, from, 1))

  // the island ahead: low sand, with a lit temple tower
  const end = route.at(1)
  const island = new THREE.Mesh(new THREE.CylinderGeometry(130, 170, 7, 28), lambert(0xb6a07a))
  island.position.copy(end.pos).addScaledVector(end.tan, 220)
  island.position.y = -2.9
  world.add(island)
  const temple = makeGopuram({ tiers: 7, baseW: 30, baseD: 17, tierH: 5.6, palette: 'madurai', seed: 6, podiumH: 7 })
  temple.position.copy(end.pos).addScaledVector(end.tan, 210)
  temple.position.y = 0.6
  temple.rotation.y = Math.atan2(-end.tan.x, -end.tan.z)
  world.add(temple)

  return {
    focus: route.side(u + 0.012, 8, 14),
    update(time, night) {
      lift.blink(time, night)
      lift.lightMat.color.setRGB(0.2 + night * 0.8, 0.05, 0.04)
    },
  }
}
