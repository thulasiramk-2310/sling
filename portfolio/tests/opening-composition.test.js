import {it,expect,vi} from 'vitest'
import * as THREE from 'three'
import {createRoute} from '../src/scene/route.js'
import {createJourneyCamera,journeyLens} from '../src/scene/camera.js'
import {buildIntroBridge} from '../src/scene/landmarks/intro-bridge.js'
import {advanceDrive,journeyPace} from '../src/scene/drive.js'

vi.mock('../src/scene/textures.js',()=>({grainTexture:()=>null,withRelief:()=>({map:null,normalMap:null})}))
const route=createRoute()
const frame=(progress,aspect)=>{
  const pose=createJourneyCamera(route).sample(progress,aspect)
  const camera=new THREE.PerspectiveCamera(journeyLens(aspect,progress),aspect,.3,1600)
  camera.position.copy(pose.eye);camera.lookAt(pose.target);camera.updateMatrixWorld(true)
  return camera
}

it('establishes the complete Marina lighthouse at readable scale in both coastal views',()=>{
  for(const [width,height]of [[1440,900],[390,844]]){
    const camera=frame(.09,width/height),points=[0,46].map(y=>route.side(.058,50,y).project(camera))
    for(const p of points){expect(Math.abs(p.x)).toBeLessThan(.9);expect(Math.abs(p.y)).toBeLessThan(.9);expect(p.z).toBeGreaterThan(-1);expect(p.z).toBeLessThan(1)}
    expect((points[1].y-points[0].y)*height/2).toBeGreaterThan(300)
  }
})

it('frames the real bridge geometry above a clear flight aperture at the arch beat',()=>{
  const {group}=buildIntroBridge(new THREE.Scene(),route);group.updateMatrixWorld(true)
  const ray=new THREE.Raycaster()
  for(const aspect of[1.6,390/844]){
    const camera=frame(.172,aspect)
    ray.setFromCamera(new THREE.Vector2(0,0),camera)
    expect(ray.intersectObject(group,true)).toHaveLength(0)
    ray.setFromCamera(new THREE.Vector2(0,aspect<.8?.45:.6),camera)
    expect(ray.intersectObject(group,true).length).toBeGreaterThan(0)
  }
})

it('gives a sustained end-scroll request time to show the descent and bridge approach',()=>{
  let state={u:.05,velocity:0},seconds=0
  while(state.u<.18 && seconds<20){state=advanceDrive(state,.195,journeyPace(state.u)/60);seconds+=1/60}
  expect(state.u).toBeGreaterThanOrEqual(.18)
  expect(seconds).toBeGreaterThan(6);expect(seconds).toBeLessThan(12)
})

it('joins both bridge faces with a continuous circular soffit above the flight',()=>{
  const {group,frame:bridge}=buildIntroBridge(new THREE.Scene(),route);group.updateMatrixWorld(true)
  const ray=new THREE.Raycaster(),up=new THREE.Vector3(0,1,0)
  for(const offset of[0,3]){
    ray.set(bridge.point(6+offset,3.3,0),up)
    const hit=ray.intersectObject(group,true)[0]
    expect(hit).toBeDefined()
    expect(hit.point.y).toBeCloseTo(2.1+Math.sqrt((4.8-.13)**2-offset**2),1)
  }
})

it('keeps the complete bridge inside its opening sun shadow frustum',async()=>{
  const {sample,sunBearing}=await import('../src/scene/timeline.js')
  const {group,shadowAnchor}=buildIntroBridge(new THREE.Scene(),route);group.updateMatrixWorld(true)
  const bounds=new THREE.Box3().setFromObject(group),p=sample(.07)
  const e=THREE.MathUtils.degToRad(p.elev),b=THREE.MathUtils.degToRad(sunBearing(.07))
  const direction=new THREE.Vector3(Math.sin(b)*Math.cos(e),Math.sin(e),-Math.cos(b)*Math.cos(e))
  const shadow=new THREE.OrthographicCamera(-110,110,110,-110,1,600)
  shadow.position.copy(shadowAnchor).addScaledVector(direction,300);shadow.lookAt(shadowAnchor);shadow.updateMatrixWorld(true)
  for(const x of[bounds.min.x,bounds.max.x])for(const y of[bounds.min.y,bounds.max.y])for(const z of[bounds.min.z,bounds.max.z]){
    const point=new THREE.Vector3(x,y,z).project(shadow)
    expect(Math.abs(point.x)).toBeLessThan(.95);expect(Math.abs(point.y)).toBeLessThan(.95)
    expect(point.z).toBeGreaterThan(-1);expect(point.z).toBeLessThan(1)
  }
})
