import { it, expect } from 'vitest'
import * as THREE from 'three'
import { nandiGeometry } from '../src/scene/landmarks/nandi.js'
import { barrelVaultGeometry, carvedPillarGeometry, gatewayGeometry } from '../src/scene/landmarks/stonework.js'
import { createRathas } from '../src/scene/landmarks/rathas.js'
import { createJourneyCamera, journeyLens, journeyFar } from '../src/scene/camera.js'
import { createRoute, faceRoad } from '../src/scene/route.js'
import { poetStatue } from '../src/scene/landmarks/poet-statue.js'
import { sample } from '../src/scene/timeline.js'
import { storyAt, STORY_STOPS, chapterAt } from '../src/scene/story.js'
import { introFrame } from '../src/scene/landmarks/intro-bridge.js'
import { roundedNoseGeometry, passengerShellGeometry, windshieldGeometry } from '../src/scene/auto-panels.js'
import { stepSuspension } from '../src/scene/suspension.js'

it('Nandi has finite outward geometry and a smaller mobile mesh', () => {
  const high = nandiGeometry(false)
  const low = nandiGeometry(true)
  expect(low.attributes.position.count).toBeLessThan(high.attributes.position.count)
  for (const geometry of [high, low]) {
    const p = geometry.attributes.position
    const n = geometry.attributes.normal
    expect(geometry.attributes.uv.count).toBe(p.count)
    for (const value of p.array) expect(Number.isFinite(value)).toBe(true)
    let reversed = 0
    for (let i = 0; i < p.count; i += 3) {
      const a = new THREE.Vector3().fromBufferAttribute(p, i)
      const b = new THREE.Vector3().fromBufferAttribute(p, i + 1)
      const c = new THREE.Vector3().fromBufferAttribute(p, i + 2)
      const normal = new THREE.Vector3().fromBufferAttribute(n, i)
        .add(new THREE.Vector3().fromBufferAttribute(n, i + 1))
        .add(new THREE.Vector3().fromBufferAttribute(n, i + 2))
      if (b.sub(a).cross(c.sub(a)).dot(normal) < -1e-8) reversed++
    }
    expect(reversed).toBe(0)
    const size = geometry.boundingBox.getSize(new THREE.Vector3())
    expect(size.x).toBeGreaterThan(5)
    expect(size.y).toBeGreaterThan(2.5)
    expect(size.z).toBeGreaterThan(2)
  }
})

it('barrel vault has an open interior and a real roof, with dimensioned pillars', () => {
  const vault = new THREE.Mesh(barrelVaultGeometry(12, 6, 3), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))
  vault.updateMatrixWorld(true)
  const into = new THREE.Raycaster(new THREE.Vector3(0, .5, 10), new THREE.Vector3(0, 0, -1))
  expect(into.intersectObject(vault)).toHaveLength(0)
  const up = new THREE.Raycaster(new THREE.Vector3(0, .5, 0), new THREE.Vector3(0, 1, 0))
  expect(up.intersectObject(vault).length).toBeGreaterThan(0)
  const pillar = carvedPillarGeometry(6.4, .85)
  expect(pillar.boundingBox.min.y).toBeCloseTo(0)
  expect(pillar.boundingBox.max.y).toBeCloseTo(6.4)
})

it('gateway passage stays open through the full depth while its piers remain solid', () => {
  const mesh = new THREE.Mesh(gatewayGeometry(30, 18, 7), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))
  mesh.updateMatrixWorld(true)
  const direction = new THREE.Vector3(0, 0, -1)
  expect(new THREE.Raycaster(new THREE.Vector3(0, 2, 30), direction).intersectObject(mesh)).toHaveLength(0)
  expect(new THREE.Raycaster(new THREE.Vector3(10, 2, 30), direction).intersectObject(mesh).length).toBeGreaterThan(0)
})

it('five rathas have distinct silhouettes and finite geometric details', () => {
  const group = createRathas(new THREE.MeshStandardMaterial())
  expect(group.children).toHaveLength(5)
  const sizes = group.children.map((child) => new THREE.Box3().setFromObject(child).getSize(new THREE.Vector3()))
  expect(sizes[2].z / sizes[2].x).toBeGreaterThan(1.5)
  expect(sizes[3].y).toBeGreaterThan(sizes[1].y)
  expect(sizes[0].y).toBeLessThan(sizes[1].y)
  group.traverse((object) => {
    if (!object.geometry) return
    for (const value of object.geometry.attributes.position.array) expect(Number.isFinite(value)).toBe(true)
  })
})

it('camera velocities remain continuous across shot keys and the bridge lens stays inside its rails', () => {
  const route = createRoute(), rig = createJourneyCamera(route), h = 1e-7
  for (const u of [.05,.09,.13,.155,.18,.195,.235,.285,.303,.32,.38,.408,.435,.444,.451,.458,.469,.474,.488,.46,.50,.55,.58,.610,.615,.632,.625,.635,.65,.725,.735,.78,.835,.89,.915,.92,.93,.943,.953,.955,.972,.985]) {
    const before = rig.sample(u - h).eye.clone()
    const at = rig.sample(u).eye.clone()
    const after = rig.sample(u + h).eye.clone()
    const left = at.clone().sub(before).divideScalar(h)
    const right = after.clone().sub(at).divideScalar(h)
    expect(left.distanceTo(right)).toBeLessThan(.1 + .01 * Math.max(left.length(), right.length()))
  }
  for (let u = .78; u <= .835; u += .002) {
    const car = route.at(storyAt(u).road), eye = rig.sample(u).eye
    expect(Math.abs(eye.clone().sub(car.pos).dot(car.right))).toBeLessThan(4)
    expect(eye.y - car.pos.y).toBeGreaterThan(3)
  }
})

it('the final approach frames the actual statue at useful desktop and phone scale',()=>{
  const route=createRoute(),rig=createJourneyCamera(route),material=new THREE.MeshStandardMaterial()
  const statue=poetStatue(material)
  statue.position.copy(route.side(.976,96));statue.position.y=12;faceRoad(statue,route,.96)
  const bounds=new THREE.Box3().setFromObject(statue)
  for(const [width,height] of [[1440,900],[390,844]]) {
    const camera=new THREE.PerspectiveCamera(journeyLens(width/height,.947),width/height,.3,1600),pose=rig.sample(.947,width/height)
    camera.position.copy(pose.eye);camera.lookAt(pose.target);camera.updateMatrixWorld(true)
    expect(pose.visitWeight).toBe(1)
    const projected=[]
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])projected.push(new THREE.Vector3(x,y,z).project(camera))
    expect(projected.every(p=>Math.abs(p.x)<.95 && Math.abs(p.y)<.95 && p.z>-1 && p.z<1)).toBe(true)
    const pixels=(Math.max(...projected.map(p=>p.y))-Math.min(...projected.map(p=>p.y)))*height/2
    expect(pixels).toBeGreaterThan(width<600?400:450)
  }
  statue.children[0].geometry.dispose();statue.children[0].material.dispose();material.dispose()
})

it('keeps the distant ocean inside the final ascent instead of exposing its clip boundary',()=>{
  const progress=.987,aspect=1440/900,pose=createJourneyCamera(createRoute()).sample(progress,aspect)
  const camera=new THREE.PerspectiveCamera(journeyLens(aspect,progress),aspect,.3,journeyFar(progress))
  camera.position.copy(pose.eye);camera.lookAt(pose.target);camera.updateMatrixWorld(true)
  const ahead=pose.target.clone().sub(pose.eye);ahead.y=0;ahead.normalize()
  const water=pose.eye.clone().addScaledVector(ahead,3000);water.y=-1.4
  const projected=water.project(camera)
  expect(Math.abs(projected.x)).toBeLessThan(1)
  expect(Math.abs(projected.y)).toBeLessThan(1)
  expect(projected.z).toBeLessThan(1)
  expect(journeyFar(.947)).toBe(1600)
})

it('timeline converts authored sRGB sky colours to linear lighting values', () => {
  const expected = new THREE.Color('#4c84c4')
  const noon = sample(.5)
  expect(noon.top[0]).toBeCloseTo(expected.r, 6)
  expect(noon.top[1]).toBeCloseTo(expected.g, 6)
  expect(noon.top[2]).toBeCloseTo(expected.b, 6)
})

it('suspension stays grounded through slow rendering and settles independently of frame rate', () => {
  for (const dt of [1 / 120, 1 / 30, .1]) {
    let state = { position: 0, velocity: 0 }
    for (let t = 0; t < 30; t += dt) {
      const target = (Math.sin(t * 17) + Math.sin(t * 23.7) * .6) * .004 * 900 / 220
      state = stepSuspension(state.position, state.velocity, target, dt)
      expect(Math.abs(state.position)).toBeLessThan(.03)
    }
    for (let t = 0; t < 2; t += dt) state = stepSuspension(state.position, state.velocity, 0, dt)
    expect(Math.abs(state.position)).toBeLessThan(1e-9)
  }
})

it('story holds the vehicle during greeting and introduction, then visits Kanyakumari after Rameswaram', () => {
  for(const p of [0,.05,.17,.235,.28,.32]) expect(storyAt(p).road).toBe(.07)
  expect(storyAt(.17).stage).toBe('bridge-flight')
  expect(storyAt(.245).intro).toBe(1)
  expect(storyAt(.915).road).toBeGreaterThan(storyAt(.815).road)
  expect(storyAt(.995).stage).toBe('connections')
  const finalCamera=createJourneyCamera(createRoute())
  const hold=finalCamera.sample(.922).eye.clone()
  expect(finalCamera.sample(.929).eye.distanceTo(hold)).toBeLessThan(1e-8)
  expect(STORY_STOPS.map(chapterAt)).toEqual([0,1,2,3,4,5])
  let previous=0
  for(let i=0;i<=10000;i++) {
    const road=storyAt(i/10000).road
    expect(road).toBeGreaterThanOrEqual(previous)
    previous=road
  }
})

it('bridge flight passes through the arch aperture while the vehicle stays parked', () => {
  const route=createRoute(),rig=createJourneyCamera(route),frame=introFrame(route)
  const inverse=frame.rotation.clone().invert()
  for(let p=.16;p<=.18;p+=.001) {
    const local=rig.sample(p).eye.clone().sub(frame.position).applyQuaternion(inverse)
    expect(local.x).toBeCloseTo(6,5)
    expect(local.y).toBeGreaterThan(0)
    expect(local.y).toBeLessThan(6.8)
  }
})

it('auto body uses curved finite surfaces and a genuinely curved windshield', () => {
  for(const geometry of [roundedNoseGeometry(),passengerShellGeometry(),windshieldGeometry()]) {
    for(const value of geometry.attributes.position.array)expect(Number.isFinite(value)).toBe(true)
    expect(geometry.attributes.normal.count).toBe(geometry.attributes.position.count)
  }
  const glass=windshieldGeometry().attributes.position
  const heights=new Set(Array.from({length:glass.count},(_,i)=>Math.round(glass.getZ(i)*10000)))
  expect(heights.size).toBeGreaterThan(20)
})

it('phone entrance joins the parked shot without a camera jump', () => {
  const rig=createJourneyCamera(createRoute())
  const before=rig.sample(.235-1e-7,390/844).eye.clone()
  const after=rig.sample(.235+1e-7,390/844).eye.clone()
  expect(before.distanceTo(after)).toBeLessThan(.001)
})

it('complete landmark roofs remain in frame at the two temple reading stops', async () => {
  const { frameVehicle, journeyLens } = await import('../src/scene/camera.js')
  const route = createRoute()
  for (const [width,height] of [[1440,900],[390,844]]) {
    const rig = createJourneyCamera(route)
    for (const [progress,road,lateral,heightMetres] of [[.635,.47,100,66],[.725,.64,60,52]]) {
      const camera = new THREE.PerspectiveCamera(journeyLens(width/height,progress),width/height,.3,1600)
      const pose = rig.sample(progress,width/height)
      camera.position.copy(pose.eye);camera.lookAt(pose.target)
      const center = route.at(storyAt(progress).road).pos.clone().add(new THREE.Vector3(0,1,0))
      frameVehicle(camera,center,width,height,progress,pose)
      const roof = route.side(road,lateral,heightMetres).project(camera)
      expect(roof.y).toBeLessThan(.85)
      expect(Math.abs(roof.x)).toBeLessThan(.8)
      expect(roof.z).toBeLessThan(1)
    }
  }
})

it('painted guardian details retain distinct finishes without coloring the stone variants', async () => {
  const { guardianGeometry, createSculptureInstances } = await import('../src/scene/landmarks/sculptures.js')
  const painted = guardianGeometry(false,0,true), stone = guardianGeometry(false,0)
  expect(stone.attributes.color).toBeUndefined()
  expect(painted.attributes.color.count).toBe(painted.attributes.position.count)
  const colors = painted.attributes.color.array
  const finishes = new Set()
  for(let i=0;i<colors.length;i+=3) finishes.add(`${colors[i].toFixed(3)}:${colors[i+1].toFixed(3)}:${colors[i+2].toFixed(3)}`)
  expect(finishes.size).toBeGreaterThanOrEqual(4)
  const assembly = createSculptureInstances(false,{polychrome:true})
  assembly.place(0,0,0,0,3,'#ff0000')
  expect(assembly.build().children[0].material.vertexColors).toBe(true)
})
