// Ground, road, sea, palms, street lamps, houses and drifting dust. Everything that is not a landmark.
import * as THREE from 'three'
import { Water } from 'three/addons/objects/Water.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { frondTexture, glowTexture, grainTexture, roadTexture, seaNormalTexture, trunkTexture, windowTextures } from './textures.js'
import { quality } from './quality.js'
import { isReserved } from './route.js'
import { clamp, glow, lambert, lerp, rng, smooth, surface } from './util.js'

// Distances from the road centre where the ground mesh has a row of points.
const COLUMNS = [-320, -140, -60, -26, -8, 8, 26, 50, 80, 110, 150, 220, 320]

// Ground colours along the trip: city and beach, coastal scrub, green paddy, dry plain.
const GROUND = [
  { u: 0.0, near: '#d8c3a0', far: '#b9ab94' },
  { u: 0.2, near: '#d6c093', far: '#aeb184' },
  { u: 0.4, near: '#a3ad6e', far: '#8e9d62' },
  { u: 0.55, near: '#a6ae70', far: '#93a066' },
  { u: 0.7, near: '#c9a77a', far: '#b6966c' },
  { u: 0.85, near: '#b39c7c', far: '#a28f74' },
]
const groundColor = (u, far, out) => {
  let i = 0
  while (i < GROUND.length - 2 && u > GROUND[i + 1].u) i++
  const a = GROUND[i]
  const b = GROUND[i + 1]
  const t = clamp((u - a.u) / (b.u - a.u), 0, 1)
  const pick = far ? 'far' : 'near'
  return out.set(a[pick]).lerp(new THREE.Color(b[pick]), t)
}

export function buildGround(scene, route) {
  const rows = 460
  const pos = new Float32Array(rows * COLUMNS.length * 3)
  const col = new Float32Array(rows * COLUMNS.length * 3)
  const uv = new Float32Array(rows * COLUMNS.length * 2)
  const r = rng(5)
  const c = new THREE.Color()
  const seaFrom = route.bridgeU - 0.012
  const seaTo = route.bridgeU + 0.02
  const s = route.sample()
  for (let i = 0; i < rows; i++) {
    const u = i / (rows - 1)
    route.at(u, s)
    const sea = smooth(seaFrom, seaTo, u)
    const coast = 1 - smooth(0.31, 0.37, u)
    COLUMNS.forEach((lat, j) => {
      const edge = Math.abs(lat)
      // follow the road's height near it (so the bridge approach is supported), then fall away
      const roadW = 1 - smooth(8, 30, edge)
      let y = s.pos.y * roadW
      if (lat > 50) y -= coast * smooth(50, 125, lat) * 4.6
      // gentle hills away from the road
      y += smooth(30, 120, edge) * (Math.sin(u * 80 + lat * 0.03) * 1.6 + Math.sin(u * 31 + lat * 0.011) * 2.4) * (1 - sea)
      y = lerp(y, -6, sea)
      const k = (i * COLUMNS.length + j) * 3
      const p = s.pos.clone().addScaledVector(s.right, lat)
      pos[k] = p.x
      pos[k + 1] = y
      pos[k + 2] = p.z
      groundColor(u, edge > 60, c)
      const shade = 0.88 + r() * 0.2
      // beach sand on the sea side near the coast
      if (lat > 40 && coast > 0.2) c.lerp(new THREE.Color('#ead9b6'), coast * 0.75)
      col[k] = c.r * shade
      col[k + 1] = c.g * shade
      col[k + 2] = c.b * shade
      uv[(i * COLUMNS.length + j) * 2] = lat / 14
      uv[(i * COLUMNS.length + j) * 2 + 1] = (u * route.length) / 14
    })
  }
  const idx = []
  for (let i = 0; i < rows - 1; i++)
    for (let j = 0; j < COLUMNS.length - 1; j++) {
      const a = i * COLUMNS.length + j
      const b = a + 1
      const d = a + COLUMNS.length
      const e = d + 1
      idx.push(a, b, d, b, e, d)
    }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  const mesh = new THREE.Mesh(geo, surface({ vertexColors: true, map: grainTexture() }))
  mesh.userData.receiveOnly = true
  scene.add(mesh)
  return mesh
}

export function buildRoad(scene, route) {
  const rows = 900
  const pos = new Float32Array(rows * 2 * 3)
  const uv = new Float32Array(rows * 2 * 2)
  const s = route.sample()
  for (let i = 0; i < rows; i++) {
    const u = i / (rows - 1)
    route.at(u, s)
    for (let j = 0; j < 2; j++) {
      const p = s.pos.clone().addScaledVector(s.right, j ? 4.2 : -4.2)
      pos.set([p.x, p.y + 0.04, p.z], (i * 2 + j) * 3)
      uv.set([j, (u * route.length) / 16], (i * 2 + j) * 2)
    }
  }
  const idx = []
  for (let i = 0; i < rows - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  const mesh = new THREE.Mesh(geo, surface({ map: roadTexture() }))
  mesh.userData.receiveOnly = true
  scene.add(mesh)
  return mesh
}

// The sea: one big plane under everything. On desktop it reflects the sky and the bridge.
export function buildSea(scene) {
  const normal = seaNormalTexture()
  const geo = new THREE.PlaneGeometry(4000, 4000)
  if (!quality.low) {
    const water = new Water(geo, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: normal,
      sunDirection: new THREE.Vector3(0, 1, 0),
      sunColor: 0xffffff,
      waterColor: 0x0f5f86,
      distortionScale: 2.4,
      fog: true,
    })
    water.rotation.x = -Math.PI / 2
    water.position.set(0, -1.4, -600)
    water.userData.noShadow = true
    water.material.uniforms.size.value = 2.2
    scene.add(water)
    const u = water.material.uniforms
    return {
      mesh: water,
      update(time, p, lightDir) {
        u.time.value = time * 0.4
        u.sunDirection.value.copy(lightDir)
        u.sunColor.value.setRGB(...p.light).multiplyScalar(0.6 + (1 - p.night) * 0.4)
        u.waterColor.value.setRGB(...p.sea).multiplyScalar(0.7)
      },
    }
  }
  normal.repeat.set(60, 60)
  const mat = new THREE.MeshPhongMaterial({ color: 0x0f7fae, specular: 0xbbd8ee, shininess: 90, normalMap: normal, normalScale: new THREE.Vector2(0.5, 0.5) })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(0, -1.4, -600)
  mesh.userData.noShadow = true
  scene.add(mesh)
  return {
    mesh,
    update(time, p) {
      mat.color.setRGB(...p.sea)
    },
  }
}

// A coconut palm: a leaning, ringed trunk with coconuts, and a crown of drooping leafy fronds.
function trunkGeometry() {
  const trunk = new THREE.CylinderGeometry(0.16, 0.3, 9, 8, 8)
  trunk.translate(0, 4.5, 0)
  const p = trunk.attributes.position
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i)
    p.setX(i, p.getX(i) + (y / 9) * (y / 9) * 1.3)
  }
  const parts = [trunk]
  for (let i = 0; i < 5; i++) {
    const nut = new THREE.SphereGeometry(0.2, 8, 6)
    const a = (i / 5) * Math.PI * 2
    nut.translate(1.3 + Math.cos(a) * 0.3, 8.6, Math.sin(a) * 0.3)
    parts.push(nut)
  }
  const g = mergeGeometries(parts)
  g.computeVertexNormals()
  return g
}

function frondsGeometry() {
  const parts = []
  const fronds = 11
  for (let i = 0; i < fronds; i++) {
    const f = new THREE.PlaneGeometry(1.9, 4.8, 1, 10)
    f.translate(0, 2.4, 0)
    const q = f.attributes.position
    const lift = 0.35 + (i % 3) * 0.18
    for (let k = 0; k < q.count; k++) {
      const t = q.getY(k) / 4.8
      q.setZ(k, q.getZ(k) - t * t * 2.6) // droop
      q.setX(k, q.getX(k) * (1 - t * 0.35)) // taper
      q.setZ(k, q.getZ(k) + Math.abs(q.getX(k)) * 0.25) // leaflets fold into a shallow V
    }
    f.rotateX(-Math.PI / 2 + lift)
    f.rotateY((i / fronds) * Math.PI * 2 + (i % 2) * 0.2)
    f.translate(1.3, 9, 0)
    parts.push(f)
  }
  const g = mergeGeometries(parts)
  g.computeVertexNormals()
  return g
}

export function buildPalms(scene, route) {
  const trunks = new THREE.InstancedMesh(trunkGeometry(), surface({ map: trunkTexture(), roughness: 0.95 }), quality.palms)
  const crowns = new THREE.InstancedMesh(frondsGeometry(), surface({ map: frondTexture(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.7 }), quality.palms)
  const r = rng(13)
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const sc = new THREE.Vector3()
  const tint = new THREE.Color()
  const s = route.sample()
  let n = 0
  let guard = 0
  while (n < quality.palms && guard++ < quality.palms * 8) {
    const u = r() * 0.78
    // fewer palms on the beach side near the coast
    const side = r() > 0.5 ? 1 : -1
    if (side > 0 && u < 0.33 && r() < 0.8) continue
    const lat = side * (8 + Math.pow(r(), 1.7) * 55)
    if (isReserved(u, lat)) continue
    route.at(u, s)
    const p = s.pos.clone().addScaledVector(s.right, lat)
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI * 2)
    const k = 0.8 + r() * 0.7
    sc.set(k, k, k)
    m.compose(new THREE.Vector3(p.x, 0, p.z), q, sc)
    trunks.setMatrixAt(n, m)
    crowns.setMatrixAt(n, m)
    // every palm a slightly different green
    crowns.setColorAt(n, tint.setHSL(0.2 + r() * 0.05, 0.35 + r() * 0.2, 0.42 + r() * 0.12))
    n++
  }
  trunks.count = crowns.count = n
  scene.add(trunks, crowns)
  return { crowns }
}

// Street lamps along the road; the bulbs light up at night.
export function buildLamps(scene, route) {
  const group = new THREE.Group()
  const pole = lambert(0x2b2b30)
  const bulb = glow(surface({ color: 0xfff0c0, emissive: 0xffd88a, emissiveIntensity: 0 }), 2.2)
  const halo = new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffd58a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  const s = route.sample()
  const count = quality.lamps
  for (let i = 0; i < count; i++) {
    const u = (i + 0.5) / count
    route.at(u, s)
    // on the bridge the lamps stand on the deck edge instead
    const p = s.pos.clone().addScaledVector(s.right, u > route.bridgeU ? 4.9 : 6.2)
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 6, 6), pole)
    post.position.set(p.x, p.y + 3, p.z)
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.07, 0.07), pole)
    arm.position.set(p.x - s.right.x * 0.6, p.y + 6, p.z - s.right.z * 0.6)
    arm.rotation.y = Math.atan2(-s.right.z, s.right.x)
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), bulb)
    lamp.position.set(p.x - s.right.x * 1.2, p.y + 5.95, p.z - s.right.z * 1.2)
    const h = new THREE.Sprite(halo)
    h.scale.setScalar(4)
    h.position.copy(lamp.position)
    group.add(post, arm, lamp, h)
  }
  scene.add(group)
  return { setNight: (n) => (halo.opacity = n * 0.7) }
}

// Blocks of buildings (city) and low houses (towns), as instanced boxes with window textures.
export function buildTown(scene, route, { from, to, count, minH, maxH, seed, flat = false, lateral = [22, 90], side: onlySide = 0 }) {
  const win = windowTextures()
  const mat = glow(surface({ map: win.map, emissiveMap: win.glow, emissive: 0xffffff, emissiveIntensity: 0 }), 1.5)
  const geo = new THREE.BoxGeometry(1, 1, 1)
  geo.translate(0, 0.5, 0)
  const mesh = new THREE.InstancedMesh(geo, mat, count)
  const r = rng(seed)
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const color = new THREE.Color()
  const palette = flat ? ['#f0d8b8', '#e6b9a6', '#dfe2cf', '#efe0bb', '#cdd8e2', '#f2c9b6'] : ['#e2d6c4', '#d6cbbb', '#eadfcd', '#cfc8bd']
  const s = route.sample()
  for (let i = 0; i < count; i++) {
    const u = from + r() * (to - from)
    route.at(u, s)
    const side = onlySide || (r() > 0.5 ? 1 : -1)
    const lat = side * (lateral[0] + r() * (lateral[1] - lateral[0]))
    if (isReserved(u, lat)) {
      // tuck it away out of sight rather than through a temple
      m.makeScale(0, 0, 0)
      mesh.setMatrixAt(i, m)
      continue
    }
    const p = s.pos.clone().addScaledVector(s.right, lat)
    const w = flat ? 5 + r() * 5 : 8 + r() * 9
    const h = minH + r() * (maxH - minH)
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(s.tan.x, s.tan.z) + (r() - 0.5) * 0.2)
    m.compose(new THREE.Vector3(p.x, 0, p.z), q, new THREE.Vector3(w, h, flat ? 5 + r() * 5 : 8 + r() * 8))
    mesh.setMatrixAt(i, m)
    mesh.setColorAt(i, color.set(palette[Math.floor(r() * palette.length)]))
  }
  scene.add(mesh)
  return mesh
}

// Dust by day, fireflies at night. They float around the camera.
export function buildParticles(scene) {
  const n = quality.particles
  const r = rng(99)
  const base = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) base.set([(r() - 0.5) * 44, r() * 14 - 1, (r() - 0.5) * 80], i * 3)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
  const mat = new THREE.PointsMaterial({ map: glowTexture(), size: 0.45, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff1d0 })
  const points = new THREE.Points(geo, mat)
  points.frustumCulled = false
  scene.add(points)
  const dust = new THREE.Color(0xfff1d0)
  const fly = new THREE.Color(0xc8ff7a)
  return {
    update(cam, time, night) {
      const p = geo.attributes.position
      for (let i = 0; i < n; i++) {
        const k = i * 3
        const t = time * 0.3 + i
        // wrap the cloud around the camera so it never runs out
        const z = ((((base[k + 2] + time * 0.5) % 80) + 120) % 80) - 40
        p.array[k] = cam.x + base[k] + Math.sin(t) * 0.8
        p.array[k + 1] = Math.max(0.2, cam.y + base[k + 1] * 0.5 + Math.cos(t * 1.3) * 0.5)
        p.array[k + 2] = cam.z + z
      }
      p.needsUpdate = true
      mat.color.copy(dust).lerp(fly, night)
      mat.size = 0.3 + night * 0.12
      mat.opacity = 0.25 + night * 0.5
    },
  }
}
