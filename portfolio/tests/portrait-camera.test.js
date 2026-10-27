import {describe,it,expect} from 'vitest'
import * as THREE from 'three'
import {createRoute} from '../src/scene/route.js'
import {createJourneyCamera,frameVehicle,journeyLens} from '../src/scene/camera.js'
import {storyAt} from '../src/scene/story.js'

const width=390,height=844,aspect=width/height,up=new THREE.Vector3(0,1,0)
const route=createRoute(),rig=createJourneyCamera(route)
const landmarkPoint=(u,lateral,local,quarterTurn=0,facing=u)=>new THREE.Vector3(...local)
  .applyAxisAngle(up,Math.atan2(-route.at(facing).right.x,-route.at(facing).right.z)+quarterTurn)
  .add(route.side(u,lateral))

function frame(progress) {
  const camera=new THREE.PerspectiveCamera(journeyLens(aspect,progress),aspect,.3,1600)
  const pose=rig.sample(progress,aspect),car=route.at(storyAt(progress).road)
  camera.position.copy(pose.eye);camera.lookAt(pose.target);camera.updateMatrixWorld(true)
  const autoCenter=car.pos.clone().add(up).addScaledVector(car.right,.9*pose.portrait)
  frameVehicle(camera,autoCenter,width,height,progress,pose)
  const project=point=>{
    const p=point.clone().project(camera)
    return new THREE.Vector3((p.x+1)*width/2,(1-p.y)*height/2,p.z)
  }
  const auto=[]
  for(const x of [-.8,.8])for(const y of [0,2])for(const z of [-1.4,1.4])auto.push(project(
    car.pos.clone().addScaledVector(car.right,x).addScaledVector(car.tan,z).addScaledVector(up,y),
  ))
  return {project,auto,center:project(autoCenter)}
}

// These are authored landmark features from each builder, not bounds of an
// entire town or ocean. Base/apex and lateral facade points test what a visitor
// needs to recognize at the actual reading stops, after vehicle lens shift.
const end=route.at(route.bridgeEndU)
const islandTemple=end.pos.clone().addScaledVector(end.tan,80).addScaledVector(end.right,65)
islandTemple.y=.6
const stops=[
  {name:'Chennai Central',p:.245,minHeight:150,points:[[0,0,0],[0,46,0],[-26,9,6],[26,9,6]].map(v=>landmarkPoint(.097,-105,v,Math.PI))},
  {name:'Shore Temple',p:.49,minHeight:100,points:[[-6,1.2,-1],[-6,20,-1],[-13,6,-1],[1,6,-1]].map(v=>landmarkPoint(.27,84,v))},
  {name:'Thanjavur vimana',p:.635,minHeight:240,points:[[0,0,0],[0,66,0],[0,8,-17],[0,8,17]].map(v=>landmarkPoint(.47,100,v,-Math.PI/2))},
  {name:'Madurai main gopuram',p:.725,minHeight:240,points:[[0,0,52],[0,52,52],[-15,8,52],[15,8,52]].map(v=>landmarkPoint(.64,112,v))},
  {name:'Rameswaram island temple',p:.815,minHeight:100,points:[islandTemple,islandTemple.clone().addScaledVector(up,52),islandTemple.clone().addScaledVector(end.right,-15),islandTemple.clone().addScaledVector(end.right,15)]},
  {name:'Kanyakumari memorial and poet',p:.915,minHeight:90,points:[landmarkPoint(.955,85,[0,0,0],0,.96),landmarkPoint(.955,85,[0,27,0],0,.96),landmarkPoint(.976,96,[0,12,0],0,.96),landmarkPoint(.976,96,[0,40.05,0],0,.96)]},
]

describe('portrait landmark composition',()=>{
  it('includes the lighthouse in the opening coastal view',()=>{
    const {project}=frame(.02)
    const base=project(route.side(.058,50)),apex=project(route.side(.058,50,46))
    expect(base.x).toBeGreaterThan(18);expect(apex.x).toBeGreaterThan(18)
    expect(base.x).toBeLessThan(width-18);expect(apex.x).toBeLessThan(width-18)
    expect(base.y-apex.y).toBeGreaterThan(160)
    expect(apex.y).toBeGreaterThan(280);expect(base.y).toBeLessThan(height-200)
  })

  for(const stop of stops)it(`keeps ${stop.name} and the auto visible beneath the reading caption`,()=>{
    const {project,auto,center}=frame(stop.p),points=stop.points.map(project)
    for(const p of points){
      expect(p.z).toBeGreaterThan(-1);expect(p.z).toBeLessThan(1)
      expect(p.x).toBeGreaterThan(12);expect(p.x).toBeLessThan(width-12)
      // Caption starts at102px and is constrained to28vh on portrait.
      expect(p.y).toBeGreaterThanOrEqual(102+height*.28)
      expect(p.y).toBeLessThan(height*.77)
    }
    const landmarkHeight=Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y))
    expect(landmarkHeight).toBeGreaterThan(stop.minHeight)
    const autoHeight=Math.max(...auto.map(p=>p.y))-Math.min(...auto.map(p=>p.y))
    expect(autoHeight).toBeGreaterThan(45);expect(autoHeight).toBeLessThan(145)
    expect(center.y).toBeGreaterThan(height*.75);expect(center.y).toBeLessThan(height*.78)
    for(const p of auto){expect(p.x).toBeGreaterThan(0);expect(p.x).toBeLessThan(width);expect(p.y).toBeLessThan(height-40)}
  })
})

it('keeps every roadside project below the caption and available before the sculpture visit',async()=>{
  const {PROJECTS}=await import('../src/content.js')
  const {projectRoadPosition}=await import('../src/scene/interactions/journey-exhibits.js')
  for(let index=0;index<PROJECTS.length;index++){
    const road=projectRoadPosition(index,PROJECTS.length)
    let a=.5,b=.59
    for(let i=0;i<40;i++){const mid=(a+b)/2;if(storyAt(mid).road<road-.007)a=mid;else b=mid}
    const {project}=frame((a+b)/2)
    const point=route.side(road,8.5).addScaledVector(up,index===0?3.125:2.5),screen=project(point)
    expect(screen.x).toBeGreaterThan(18);expect(screen.x).toBeLessThan(width-18)
    expect(screen.y).toBeGreaterThan(102+height*.28);expect(screen.y).toBeLessThan(height*.8)
    expect(screen.z).toBeLessThan(1);expect(screen.z).toBeGreaterThan(-1)
    expect((a+b)/2).toBeLessThan(.585)
  }
})

it('frames the Shore Temple in the desktop arrival, clear of the left reading column',()=>{
  const p=.49,desktopWidth=1440,desktopHeight=900,desktopAspect=desktopWidth/desktopHeight
  const camera=new THREE.PerspectiveCamera(journeyLens(desktopAspect,p),desktopAspect,.3,1600)
  const pose=rig.sample(p,desktopAspect),car=route.at(storyAt(p).road)
  camera.position.copy(pose.eye);camera.lookAt(pose.target);camera.updateMatrixWorld(true)
  frameVehicle(camera,car.pos.clone().add(up),desktopWidth,desktopHeight,p,pose)
  const points=[[-6,1.2,-1],[-6,20,-1],[-13,6,-1],[1,6,-1]].map(local=>landmarkPoint(.27,84,local).project(camera))
  for(const point of points){
    const x=(point.x+1)*desktopWidth/2,y=(1-point.y)*desktopHeight/2
    expect(x).toBeGreaterThan(500);expect(x).toBeLessThan(desktopWidth-120)
    expect(y).toBeGreaterThan(130);expect(y).toBeLessThan(desktopHeight*.7)
    expect(point.z).toBeGreaterThan(-1);expect(point.z).toBeLessThan(1)
  }
  expect(Math.abs(points[0].y-points[1].y)*desktopHeight/2).toBeGreaterThan(150)
})
