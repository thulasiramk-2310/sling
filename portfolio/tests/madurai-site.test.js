import {it,expect,vi} from 'vitest'
import * as THREE from 'three'
import {createRoute,faceRoad,STOPS,ROAD_DECK_HEIGHT} from '../src/scene/route.js'
import {buildGround,buildRoad} from '../src/scene/world.js'
import {templeForecourt} from '../src/scene/landmarks/temple-forecourt.js'
import {createJourneyCamera,frameVehicle,journeyLens} from '../src/scene/camera.js'
import {vehicleAt} from '../src/scene/intro-actors.js'

// Bitmap contents do not change the real terrain/paving intersections.
vi.mock('../src/scene/textures.js',()=>({glowTexture:()=>null,grainTexture:()=>null,roadTexture:()=>null,seaNormalTexture:()=>null,trunkTexture:()=>null}))

const route=createRoute(),u=STOPS[3]
const placement=()=>{
  const group=new THREE.Group();group.position.copy(route.side(u,112));faceRoad(group,route,u)
  return group
}
const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0)
const topAt=(mesh,point)=>{
  ray.set(point.clone().setY(40),down)
  return ray.intersectObject(mesh,true)[0]?.point.y
}

it('keeps the built terrain below every sampled forecourt and courtyard surface',()=>{
  const scene=new THREE.Scene(),ground=buildGround(scene,route),local=placement()
  scene.add(local);scene.updateMatrixWorld(true)
  for(let x=-50;x<=50;x+=5)for(let z=-54;z<=98;z+=4){
    const point=new THREE.Vector3(x,0,z).applyMatrix4(local.matrixWorld)
    const height=topAt(ground,point)
    expect(height,`terrain below temple at ${x},${z}`).toBeDefined()
    expect(height,`terrain below temple at ${x},${z}`).toBeLessThanOrEqual(-.03-.015)
  }
  // This bounded correction must not restore land under the ocean crossing.
  for(let at=route.bridgeU+.025;at<route.bridgeEndU-.01;at+=.01)for(const lat of [26,50,80,110,150]){
    const height=topAt(ground,route.side(at,lat))
    expect(height,`seabed at ${at},${lat}`).toBeLessThan(-5.9)
  }
})

it('connects the actual curved road to the original instanced paving without a dirt gap',()=>{
  const scene=new THREE.Scene(),road=buildRoad(scene,route),local=placement(),forecourt=templeForecourt(route,u)
  local.add(forecourt);scene.add(local);scene.updateMatrixWorld(true)
  const apron=forecourt.getObjectByName('Madurai curved pedestrian approach')
  const slabs=forecourt.getObjectByName('Madurai forecourt granite slabs')
  expect(apron).toBeDefined();expect(slabs.count).toBe(84*36)
  for(let i=1;i<80;i++){
    const at=u-.019+.038*i/80
    expect(topAt(road,route.side(at,4.19))).toBeCloseTo(ROAD_DECK_HEIGHT,5)
    for(let lat=4.22;lat<=25.9;lat+=.35){
      const point=route.side(at,lat),height=topAt(apron,point)
      expect(height,`approach continuous at ${at},${lat}`).toBeDefined()
      expect(height).toBeGreaterThanOrEqual(ROAD_DECK_HEIGHT-.001)
      expect(height).toBeLessThanOrEqual(.141)
    }
  }
  // Sample physical slab centres rather than their intentional 2 cm joints.
  for(let col=6;col<78;col++){
    const seam=new THREE.Vector3((col-41.5)*1.25,0,87.75).applyMatrix4(local.matrixWorld)
    const levelChange=topAt(apron,seam)-topAt(slabs,seam)
    expect(levelChange,`paving seam at column ${col}`).toBeGreaterThan(0);expect(levelChange).toBeLessThan(.025)
  }
})

it('releases the vehicle projection smoothly across the Madurai camera-plane crossing',()=>{
  const rig=createJourneyCamera(route)
  for(const [width,height] of [[1440,900],[390,844]])for(let i=0;i<=600;i++){
    const p=.69+i/600*.04,aspect=width/height,pose=rig.sample(p,aspect)
    const camera=new THREE.PerspectiveCamera(journeyLens(aspect,p),aspect,.3,1600)
    camera.position.copy(pose.eye);camera.lookAt(pose.target);camera.updateMatrixWorld(true)
    const center=vehicleAt(route,p).pos.clone().add(new THREE.Vector3(0,1,0))
    frameVehicle(camera,center,width,height,p,pose)
    expect(camera.projectionMatrix.elements.every(Number.isFinite)).toBe(true)
    expect(Math.abs(camera.view?.offsetX||0)).toBeLessThan(width)
    expect(Math.abs(camera.view?.offsetY||0)).toBeLessThan(height)
    if(Math.abs(p-.700)<1e-6){
      expect(camera.view?.enabled||false).toBe(false)
      const local=placement();local.updateMatrixWorld(true)
      for(const corner of [[-15,0,52],[15,52,52],[0,52,52]]){
        const projected=new THREE.Vector3(...corner).applyMatrix4(local.matrixWorld).project(camera)
        const x=(projected.x+1)*width/2,y=(1-projected.y)*height/2
        if(width>1000)expect(x).toBeGreaterThan(500)
        else expect(y).toBeGreaterThan(240)
      }
    }
  }
})
