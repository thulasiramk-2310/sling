// Ground, road, sea, palms, street lamps, houses and drifting dust. Everything that is not a landmark.
import * as THREE from 'three'
import { Water } from 'three/addons/objects/Water.js'
import { streetGeometry } from './architecture.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { glowTexture, grainTexture, roadTexture, seaNormalTexture, trunkTexture } from './textures.js'
import { quality } from './quality.js'
import { isReserved, ROAD_DECK_HEIGHT } from './route.js'
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
    const sea = smooth(seaFrom, seaTo, u) * (1 - smooth(route.bridgeEndU-.005,route.bridgeEndU+.045,u))
    const coast = 1 - smooth(0.31, 0.37, u)
    COLUMNS.forEach((lat, j) => {
      const edge = Math.abs(lat)
      // follow the road's height near it (so the bridge approach is supported), then fall away
      const roadW = 1 - smooth(8, 30, edge)
      let y = s.pos.y * roadW
      if (lat > 50) y -= coast * smooth(50, 125, lat) * 4.6
      if (u > .88) y -= smooth(.88,.94,u) * smooth(24,100,edge) * 5
      // gentle hills away from the road
      y += smooth(30, 120, edge) * (Math.sin(u * 80 + lat * 0.03) * 1.6 + Math.sin(u * 31 + lat * 0.011) * 2.4) * (1 - sea)
      const forecourt=smooth(.025,.045,u)*(1-smooth(.108,.125,u))*smooth(8,20,-lat)*(1-smooth(160,200,-lat))
      y=lerp(y,0,forecourt)
      y = lerp(y, -6, sea)
      // Beyond the final promenade, the sea must surround both rock islands.
      // Apply after hills so a terrain ridge cannot join the memorial to shore.
      const finalShore=smooth(.88,.94,u)*smooth(18,42,lat)
      y=lerp(y,-6,finalShore)
      const k = (i * COLUMNS.length + j) * 3
      // Thanjavur and Madurai are inland. Extend their land to the horizon
      // instead of exposing the shared ocean plane behind the temple compounds.
      const inland=smooth(.32,.38,u)*(1-smooth(route.bridgeU-.03,route.bridgeU+.005,u))
      const outer=smooth(150,320,edge)
      const terrainLat=lat+Math.sign(lat)*outer*1400*inland
      y += outer*inland*(8+Math.pow(Math.sin(u*22+lat*.009),2)*20)
      const p = s.pos.clone().addScaledVector(s.right, terrainLat)
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
      pos.set([p.x, p.y + ROAD_DECK_HEIGHT, p.z], (i * 2 + j) * 3)
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

function coastalWaterFinish(material) {
  const horizon={value:new THREE.Color(0xa5bbc2)}
  material.userData.seaHorizon=horizon
  material.onBeforeCompile=shader=>{
    shader.uniforms.tripSeaHorizon=horizon
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>','#include <common>\nuniform vec3 tripSeaHorizon;')
      .replace('#include <envmap_fragment>',`#include <envmap_fragment>
        float tripGrazing=1.0-clamp(dot(normal,geometryViewDir),0.0,1.0);
        float tripReflectance=.02+.98*pow(tripGrazing,5.0);
        outgoingLight=mix(outgoingLight,tripSeaHorizon*.85,tripReflectance*.72);
      `)
  }
  material.customProgramCacheKey=()=> 'coastal-water-horizon-1'
  return material
}

// The sea: desktop renders the reflected scene. The lighter surface uses an
// inexpensive horizon/Fresnel approximation, not a second world render.
export function buildSea(scene) {
  const normal = seaNormalTexture()
  const geo = new THREE.PlaneGeometry(12000, 12000)
  if (!quality.low) {
    const water = new Water(geo, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: normal,
      sunDirection: new THREE.Vector3(0, 1, 0),
      sunColor: 0xffffff,
      waterColor: 0x0f5f86,
      distortionScale: .7,
      fog: true,
    })
    water.rotation.x = -Math.PI / 2
    water.position.set(0, -1.4, -600)
    water.userData.noShadow = true
    water.material.uniforms.size.value = 30
    scene.add(water)
    const u = water.material.uniforms
    const reflect = water.onBeforeRender
    let reflections = true
    const waterMaterial = water.material
    const fallbackNormal = normal.clone()
    fallbackNormal.repeat.set(1000, 1000)
    const fallback = coastalWaterFinish(new THREE.MeshPhongMaterial({ color: 0x0f5f86, specular: 0x718d98, shininess: 70, normalMap: fallbackNormal, normalScale: new THREE.Vector2(0.15, 0.15) }))
    water.onBeforeRender = (...args) => {
      // The AO normal/depth pass needs this opaque surface, but its override
      // material does not sample a reflection. Do not rerender the mirror there.
      if (!reflections || args[1].overrideMaterial) return
      reflect.apply(water, args)
    }
    return {
      mesh: water,
      reflectionsOn: () => reflections,
      setReflections: (on) => { reflections = on; water.material = on ? waterMaterial : fallback },
      update(time, p, lightDir) {
        u.time.value = time * 0.4
        u.sunDirection.value.copy(lightDir)
        u.sunColor.value.setRGB(...p.light).multiplyScalar(0.6 + (1 - p.night) * 0.4)
        u.waterColor.value.setRGB(...p.sea).multiplyScalar(0.7)
        fallback.color.setRGB(...p.sea).multiplyScalar(0.7)
        fallback.userData.seaHorizon.value.setRGB(...p.horizon)
        fallbackNormal.offset.set(time * 0.002, time * 0.001)
      },
    }
  }
  normal.repeat.set(1000, 1000)
  const mat = coastalWaterFinish(new THREE.MeshPhongMaterial({ color: 0x0f7fae, specular: 0x718d98, shininess: 50, normalMap: normal, normalScale: new THREE.Vector2(0.18, 0.18) }))
  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(0, -1.4, -600)
  mesh.userData.noShadow = true
  scene.add(mesh)
  return {
    mesh,
    reflectionsOn: () => false,
    setReflections() {},
    update(time, p) {
      mat.color.setRGB(...p.sea)
      mat.userData.seaHorizon.value.setRGB(...p.horizon)
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
  const positions=[],uv=[]
  const fronds=quality.low?8:11
  const leaves=quality.low?9:16
  const v=new THREE.Vector3()
  const vertex=(x,y,z,angle)=>{
    v.set(x,y,z).applyAxisAngle(new THREE.Vector3(0,1,0),angle)
    positions.push(v.x+1.3,v.y+9,v.z)
    uv.push(x,z/4.8)
  }
  for(let i=0;i<fronds;i++) {
    const angle=i/fronds*Math.PI*2
    for(let j=0;j<leaves;j++) {
      const t=(j+.7)/leaves
      const z=t*4.8
      const y=Math.sin(t*Math.PI)*1.2-t*t*2.2+(i%3)*.25*t
      const width=.58*Math.pow(1-t,.65)+.025
      for(const side of [-1,1]) {
        // Broad, folded leaflets are real surfaces, without alpha-cutout moire.
        const points=[[0,y,z],[side*width*.5,y+.09,z-.22],[side*width,y-.06,z-.7],[0,y-.025,z-.16]]
        for(const k of [0,1,2,0,2,3]) vertex(...points[k],angle)
      }
    }
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2))
  geometry.computeVertexNormals()
  const parts=[geometry]
  for(let i=0;i<fronds;i++) {
    const angle=i/fronds*Math.PI*2
    const points=[]
    for(let j=0;j<=12;j++) {
      const t=j/12
      points.push(new THREE.Vector3(0,Math.sin(t*Math.PI)*1.2-t*t*2.2+(i%3)*.25*t,t*4.8).applyAxisAngle(new THREE.Vector3(0,1,0),angle).add(new THREE.Vector3(1.3,9,0)))
    }
    parts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),12,.025,4,false))
  }
  const merged=mergeGeometries(parts.map((part)=>part.index?part.toNonIndexed():part))
  parts.forEach((part)=>part.dispose())
  return merged
}

export function buildPalms(scene, route) {
  const trunk = trunkGeometry(), fronds = frondsGeometry()
  const bark = surface({ map: trunkTexture(), roughness: 0.95 })
  const foliage = surface({ color: 0xa2b080, side: THREE.DoubleSide, roughness: .9 })
  const trunks = new THREE.Group(), crowns = new THREE.Group(), bins = new Map()
  trunks.name = 'Spatial palm trunks'; crowns.name = 'Spatial palm crowns'
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
    // Keep vegetation behind the camera-side dolly corridor.
    const lat = side < 0 ? -(65 + r() * 25) : 8 + Math.pow(r(), 1.7) * 55
    if (isReserved(u, lat)) continue
    route.at(u, s)
    const p = s.pos.clone().addScaledVector(s.right, lat)
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI * 2)
    const k = 0.8 + r() * 0.7
    sc.set(k, k, k)
    m.compose(new THREE.Vector3(p.x, 0, p.z), q, sc)
    // Keep the original seeded transforms and colours; partition only their
    // draw submission so distant palms have independent frustum bounds.
    const key = `${Math.floor(p.x / 90)}:${Math.floor(p.z / 90)}`
    if (!bins.has(key)) bins.set(key, [])
    tint.setHSL(0.2 + r() * 0.05, 0.35 + r() * 0.2, 0.42 + r() * 0.12)
    bins.get(key).push({ matrix: m.clone(), color: tint.clone() })
    n++
  }
  for (const [key, placements] of bins) {
    const trunkChunk = new THREE.InstancedMesh(trunk, bark, placements.length)
    const crownChunk = new THREE.InstancedMesh(fronds, foliage, placements.length)
    trunkChunk.name = `Palm trunks ${key}`; crownChunk.name = `Palm crowns ${key}`
    for (const [i, placement] of placements.entries()) {
      trunkChunk.setMatrixAt(i, placement.matrix)
      crownChunk.setMatrixAt(i, placement.matrix)
      crownChunk.setColorAt(i, placement.color)
    }
    for (const mesh of [trunkChunk, crownChunk]) { mesh.computeBoundingBox(); mesh.computeBoundingSphere() }
    trunks.add(trunkChunk); crowns.add(crownChunk)
  }
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

// Layered, shaded street fronts, built and instanced as real geometry.
export function buildTown(scene, route, { from, to, count, seed, flat = false, side: onlySide = 0, setback = null }) {
  const modules=[streetGeometry(flat?2:3),streetGeometry(flat?1:2,1)]
  if(!quality.low)modules.push(streetGeometry(flat?2:3,2))
  const slots = Math.max(1, Math.floor((to-from)*route.length/7.5))
  count = Math.min(count,slots*(onlySide?1:2))
  const materials = {
    plaster: surface({ color: 0xffffff, roughness: .95 }),
    trim: surface({ color: 0xe4d8bc, roughness: .88 }),
    wood: surface({ color: 0x536c61, roughness: .8 }),
    glass: glow(surface({ color: 0x273d3d, roughness: .24, emissive: 0xffd093, emissiveIntensity: 0 }),.45),
    metal: surface({ color: 0x414a46, roughness: .52, metalness: .5 }),
    roof: surface({ color: 0x8b7563, roughness: .9 }),
  }
  const group = new THREE.Group()
  group.name = 'Tamil terrace street frontage'
  const meshSets=modules.map((module,index)=>Object.entries(module.geometries).map(([name,geometry])=>{
    const mesh=new THREE.InstancedMesh(geometry,materials[name],Math.max(0,Math.ceil((count-index)/modules.length)))
    mesh.name=name;group.add(mesh);return mesh
  }))
  const r=rng(seed),m=new THREE.Matrix4(),q=new THREE.Quaternion(),color=new THREE.Color()
  const palette=['#b88067','#d2bc8e','#b9c1b1','#c1a193','#aebbb7','#d7c3a2']
  const rows=Math.ceil(count/(onlySide?1:2))
  for(let i=0;i<count;i++) {
    const row=onlySide?i:Math.floor(i/2)
    const u=from+(row+.5)/rows*(to-from)
    const side=onlySide||(i%2?1:-1)
    const lateral=setback?side*setback:side<0?-(flat?65:70):(flat?17.5:19)
    if(isReserved(u,lateral)) m.makeScale(0,0,0)
    else {
      const sample=route.at(u)
      const position=route.side(u,lateral)
      position.y=0
      q.setFromAxisAngle(new THREE.Vector3(0,1,0),Math.atan2(-side*sample.right.x,-side*sample.right.z))
      m.compose(position,q,new THREE.Vector3(.96+r()*.1,.96+r()*.12,1))
    }
    const tint=palette[Math.floor(r()*palette.length)]
    const slot=Math.floor(i/modules.length)
    for(const mesh of meshSets[i%modules.length]) {
      mesh.setMatrixAt(slot,m)
      if(mesh.name==='plaster') mesh.setColorAt(slot,color.set(tint))
    }
  }
  for(const meshes of meshSets)for(const mesh of meshes) { mesh.computeBoundingBox(); mesh.computeBoundingSphere() }
  scene.add(group)
  return group
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
      mat.size = 0.12 + night * 0.08
      mat.opacity = 0.08 + night * 0.3
    },
  }
}
