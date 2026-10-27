import assert from 'node:assert/strict'
import * as THREE from 'three'
import { advanceDrive, DRIVE, journeyPace } from '../src/scene/drive.js'
import { createRoute } from '../src/scene/route.js'
import { createJourneyCamera, frameVehicle, journeyLens } from '../src/scene/camera.js'
import { guardianGeometry, createSculptureInstances } from '../src/scene/landmarks/sculptures.js'
import { createLighthouse } from '../src/scene/landmarks/lighthouse.js'
import { batchStaticMeshes } from '../src/scene/batch.js'
import { PROJECTS, STRINGS } from '../src/content.js'
import { elephantBodyGeometry,createStoneElephant } from '../src/scene/landmarks/elephant.js'
import { rockGeometry } from '../src/scene/landmarks/rocks.js'
import { streetGeometry } from '../src/scene/architecture.js'
import { readFile } from 'node:fs/promises'
import { storyAt } from '../src/scene/story.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { createRathas } from '../src/scene/landmarks/rathas.js'
import { faceRoad } from '../src/scene/route.js'

export function registerSceneCases(test) {
  test('generated elephant GLBs load successfully with a smaller mobile asset', async () => {
    const counts=[]
    for(const filename of ['elephant-study.glb','elephant-study-low.glb']) {
      const data=await readFile(new URL('../public/models/'+filename,import.meta.url))
      const gltf=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'')
      let triangles=0
      gltf.scene.traverse((o)=>{if(o.isMesh) triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3})
      assert.ok(triangles>1000)
      counts.push(triangles)
    }
    assert.ok(counts[1]<counts[0]/2)
  })
  test('elephant is a volumetric sculpture with an outward, continuous body surface', () => {
    const high=elephantBodyGeometry(false),low=elephantBodyGeometry(true)
    assert.ok(high.attributes.position.count>low.attributes.position.count)
    const mesh=createStoneElephant(new THREE.MeshStandardMaterial(),false)
    const size=new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3())
    assert.ok(size.x>5 && size.y>3.5 && size.z>1.8)
    const p=high.attributes.position,n=high.attributes.normal
    for(let i=0;i<p.count;i+=3) {
      const a=new THREE.Vector3().fromBufferAttribute(p,i)
      const b=new THREE.Vector3().fromBufferAttribute(p,i+1)
      const c=new THREE.Vector3().fromBufferAttribute(p,i+2)
      const normal=new THREE.Vector3().fromBufferAttribute(n,i)
      assert.ok(Number.isFinite(a.x+a.y+a.z+normal.length()))
      assert.ok(b.sub(a).cross(c.sub(a)).dot(normal)>=-1e-9)
    }
    mesh.updateMatrixWorld(true)
    for(const [origin,direction] of [[[0,2,10],[0,0,-1]],[[10,2,0],[-1,0,0]]]) {
      assert.ok(new THREE.Raycaster(new THREE.Vector3(...origin),new THREE.Vector3(...direction)).intersectObject(mesh,true).length>0)
    }
  })
  test('rock seams keep shared source positions coincident after deformation', () => {
    const source=new THREE.SphereGeometry(1,40,28).attributes.position
    const target=rockGeometry(4,12).attributes.position
    const shared=new Map()
    for(let i=0;i<source.count;i++) {
      const key=[source.getX(i),source.getY(i),source.getZ(i)].map((v)=>Math.round(v*1e5)).join(':')
      const point=new THREE.Vector3().fromBufferAttribute(target,i)
      if(shared.has(key)) assert.ok(shared.get(key).distanceTo(point)<1e-5)
      else shared.set(key,point)
    }
  })
  test('street fronts contain projecting architecture within a bounded mesh budget', () => {
    const model=streetGeometry(3)
    let triangles=0
    const bounds=new THREE.Box3()
    for(const geometry of Object.values(model.geometries)) {
      geometry.computeBoundingBox()
      bounds.union(geometry.boundingBox)
      triangles+=(geometry.index?geometry.index.count:geometry.attributes.position.count)/3
      for(const value of geometry.attributes.position.array) assert.ok(Number.isFinite(value))
    }
    assert.ok(bounds.max.z>3.5)
    assert.ok(bounds.max.y>9.6)
    assert.ok(triangles<5000)
  })
  test('story camera is finite and stays above the water across flight, riding and ascent', () => {
    const route=createRoute(),rig=createJourneyCamera(route)
    for(const aspect of [1.6,390/844]) {
      let previous=null
      for(let i=0;i<=10000;i++) {
      const pose=rig.sample(i/10000,aspect)
      assert.ok(Number.isFinite(pose.eye.length()+pose.target.length()))
      assert.ok(pose.eye.y>1.5)
      assert.ok(pose.eye.distanceTo(pose.target)>1)
      if(previous)assert.ok(previous.distanceTo(pose.eye)<4)
      previous=pose.eye.clone()
      }
    }
  })
  test('hard scroll and reversal respect acceleration, speed and route bounds', () => {
    let state = { u: 0.02, velocity: 0 }
    for (let i = 0; i < 3600; i++) {
      const target = i < 720 ? 0.92 : 0.07
      const next = advanceDrive(state, target, 1 / 60)
      assert.ok(Math.abs(next.velocity - state.velocity) <= DRIVE.acceleration / 60 + 1e-8)
      assert.ok(Math.abs(next.velocity) <= DRIVE.speed + 1e-8)
      assert.ok(next.u >= 0 && next.u <= 1)
      state = next
    }
    assert.equal(state.u, 0.07)
    assert.equal(state.velocity, 0)
  })
  test('sculpture visits contain the elephant and five rathas at useful screen scale',()=>{
    const route=createRoute(),rig=createJourneyCamera(route),material=new THREE.MeshStandardMaterial()
    const elephant=createStoneElephant(material,true)
    const garden=new THREE.Group();garden.position.copy(route.side(.23,42));faceRoad(garden,route,.23)
    elephant.position.z=2;garden.add(elephant);garden.updateMatrixWorld(true)
    const rathas=createRathas(material);rathas.position.copy(route.side(.27,52));faceRoad(rathas,route,.27)
    for(const [width,height] of [[1440,900],[390,844]])for(const [p,model,minHeight] of [[.44,elephant,150],[.471,rathas,90]]) {
      const camera=new THREE.PerspectiveCamera(journeyLens(width/height,p),width/height,.3,1600),pose=rig.sample(p,width/height)
      assert.equal(pose.visitWeight,1)
      camera.position.copy(pose.eye);camera.lookAt(pose.target);camera.updateMatrixWorld(true)
      const bounds=new THREE.Box3().setFromObject(model),points=[]
      for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]) {
        points.push(new THREE.Vector3(x,y,z).project(camera))
      }
      assert.ok(points.every(v=>v.z>-1 && v.z<1))
      const center=bounds.getCenter(new THREE.Vector3()).project(camera)
      assert.ok(Math.abs(center.x)<.5 && Math.abs(center.y)<.5)
      assert.ok((Math.max(...points.map(v=>v.y))-Math.min(...points.map(v=>v.y)))*height/2>minHeight)
    }
    for(const p of [.245,.49,.635,.725,.815,.915])assert.equal(rig.sample(p).visitWeight,0)
  })
  test('driving is independent of 30 versus 120 Hz frame cadence', () => {
    const run = (hz) => {
      let state = { u: 0.02, velocity: 0 }
      for (let i = 0; i < hz * 7; i++) state = advanceDrive(state, 0.68, 1 / hz)
      return state
    }
    assert.ok(Math.abs(run(30).u - run(120).u) < 1e-6)
  })
  test('reduced motion settles immediately and discards vehicle inertia', () => {
    assert.deepEqual(advanceDrive({ u: 0.1, velocity: 0.04 }, 0.68, 1 / 60, true), { u: 0.68, velocity: 0 })
  })
  test('bridge climbs monotonically and returns to dry land before Kanyakumari', () => {
    const route = createRoute()
    let previous = 0
    for (let i = 0; i <= 10000; i++) {
      const { pos, tan, right } = route.at(i / 10000)
      assert.ok(pos.y >= 0 && pos.y <= 5)
      if(pos.z >= -2010) assert.ok(pos.y >= previous-1e-8)
      else assert.ok(pos.y <= previous+1e-8)
      assert.ok(Math.abs(tan.length() - 1) < 1e-6)
      assert.ok(Math.abs(tan.dot(right)) < 1e-6)
      previous = pos.y
    }
  })
  test('the auto stays readable throughout driving shots and all reading stops', () => {
    const route = createRoute()
    const rig = createJourneyCamera(route)
    for (const [width,height] of [[1440,900],[390,844]]) {
      const camera = new THREE.PerspectiveCamera(width/height < .8 ? 66 : 52,width/height,.3,1600)
      for (let i = 0; i <= 2000; i++) {
        const u = .235 + i / 2000 * (.92-.235)
        camera.fov=journeyLens(camera.aspect,u);camera.updateProjectionMatrix()
        const pose = rig.sample(u,camera.aspect)
        camera.position.copy(pose.eye)
        camera.lookAt(pose.target)
        const car = route.at(storyAt(u).road)
        const center = car.pos.clone().add(new THREE.Vector3(0,1,0)).addScaledVector(car.right,.9*pose.portrait)
        frameVehicle(camera,center,width,height,u,pose)
        // Authored sculpture visits briefly release the vehicle anchor. The
        // continuous driving composition returns before each reading stop.
        if(pose.visitWeight>0)continue
        const projected = center.clone().project(camera)
        // Portrait arrivals reserve the upper frame for the chapter caption
        // and landmark; their vehicle sits in the lower fifth of the screen.
        assert.ok(width<600
          ? projected.y>=-.541 && projected.y<=-.514
          : projected.y>=-.401 && projected.y<=-.239)
        const corners = []
        for (const x of [-.8,.8]) for (const y of [0,2]) for (const z of [-1.4,1.4]) {
          const corner = car.pos.clone().addScaledVector(car.right,x).addScaledVector(car.tan,z)
          corner.y += y
          corner.project(camera)
          assert.ok(Math.abs(corner.x) < .99 && Math.abs(corner.y) < .99)
          assert.ok(corner.z > -1 && corner.z < 1)
          corners.push(corner)
        }
        const pixelHeight = (Math.max(...corners.map((p) => p.y)) - Math.min(...corners.map((p) => p.y))) * height / 2
        assert.ok(pixelHeight > (width < 600 ? 45 : 55))
      }
    }
  })
  test('sculptures have modeled relief and a smaller mobile geometry budget', () => {
    const high = guardianGeometry(false)
    const low = guardianGeometry(true)
    assert.ok(low.attributes.position.count < high.attributes.position.count)
    const size = high.boundingBox.getSize(new THREE.Vector3())
    assert.ok(size.z > .3 && size.x > .4 && size.y > 1)
    for (const geometry of [high,low]) for (const value of geometry.attributes.position.array) assert.ok(Number.isFinite(value))
    const figures = createSculptureInstances()
    figures.place(0,0,2,0,3,'#bba07e')
    figures.place(4,6,2,Math.PI/2,2,'#a49078')
    const mesh = figures.build()
    assert.equal(mesh.children.reduce((sum, child) => sum + child.count, 0),2)
    assert.ok(mesh.children.every((child) => child.isInstancedMesh && child.instanceColor && Number.isFinite(child.boundingSphere.radius)))
  })
  test('camera smoothing keeps up with a hard scroll and a reversal', () => {
    const route = createRoute()
    const rig = createJourneyCamera(route)
    const eye = new THREE.Vector3()
    const look = new THREE.Vector3()
    let drive = { u: .02, velocity: 0 }
    for (let i = 0; i < 12000; i++) {
      drive = advanceDrive(drive, i < 6000 ? .92 : .07, journeyPace(drive.u)/60)
      const pose = rig.sample(drive.u)
      rig.transport(eye,look)
      if (!i) { eye.copy(pose.eye); look.copy(pose.target) }
      const ease = 1-Math.exp(-3.2/60)
      eye.lerp(pose.eye,ease)
      look.lerp(pose.target,ease)
      const car = route.at(storyAt(drive.u).road).pos
      assert.ok(Number.isFinite(eye.length()))
      // Includes the off-road visits: tracking must stay within 25 m of the
      // authored shot at normal pace, including the reverse journey.
      if(drive.u>.34 && drive.u<.92)assert.ok(eye.distanceTo(pose.eye)<25)
      if(drive.u>.34 && drive.u<.92 && !(drive.u>.40 && drive.u<.65)) {
        assert.ok(eye.distanceTo(car)<65)
        assert.ok(eye.distanceTo(car)>5)
      }
    }
  })
  test('Marina lighthouse is 46 m high with a triangular shaft and valid geometry', () => {
    const material = new THREE.MeshStandardMaterial()
    const materials = Object.fromEntries(['white', 'red', 'metal', 'glass', 'dark', 'lamp'].map((key) => [key, material]))
    const group = createLighthouse(materials)
    const size = new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3())
    assert.ok(Math.abs(size.y - 46) < 1e-5)
    assert.equal(group.children.filter((o) => o.geometry?.parameters?.height === 6.5 && o.geometry.parameters.radialSegments === 3).length, 6)
    group.traverse((o) => {
      if (o.geometry) for (const value of o.geometry.attributes.position.array) assert.ok(Number.isFinite(value))
    })
    group.updateMatrixWorld(true)
    const hits = new THREE.Raycaster(new THREE.Vector3(0, 20, 60), new THREE.Vector3(0, 0, -1)).intersectObject(group, true)
    assert.ok(hits.length > 0)
  })
  test('static batches preserve world bounds, instances, transparency and vehicle transforms', () => {
    const root = new THREE.Group()
    root.position.set(13, 2, -30)
    root.rotation.y = 0.3
    const stone = new THREE.MeshStandardMaterial()
    for (let i = 0; i < 12; i++) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 4), stone)
      mesh.position.set(i * 3, 0, 0)
      mesh.rotation.y = i * 0.03
      root.add(mesh)
    }
    const glass = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.5 }))
    const instances = new THREE.InstancedMesh(new THREE.BoxGeometry(), stone, 2)
    root.add(glass, instances)
    const vehicle = new THREE.Group()
    vehicle.userData.preserveAssembly = true
    vehicle.add(new THREE.Mesh(new THREE.BoxGeometry(), stone), new THREE.Mesh(new THREE.BoxGeometry(), stone))
    root.add(vehicle)
    const before = new THREE.Box3().setFromObject(root, true)
    batchStaticMeshes(root)
    const after = new THREE.Box3().setFromObject(root, true)
    assert.ok(before.min.distanceTo(after.min) < 1e-5 && before.max.distanceTo(after.max) < 1e-5)
    assert.equal(root.children.length, 4)
    assert.equal(vehicle.children.length, 2)
    assert.ok(root.children.includes(glass) && root.children.includes(instances))
  })
  test('draft projects are marked visibly in both languages', () => {
    assert.deepEqual(PROJECTS.filter((p) => p.draft).map((p) => p.name), ['CreditGuard AI'])
    assert.ok(STRINGS.en['projects.draft'] && STRINGS.ta['projects.draft'])
    assert.deepEqual(Object.keys(STRINGS.en).sort(), Object.keys(STRINGS.ta).sort())
  })
}
