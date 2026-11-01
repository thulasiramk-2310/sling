import * as THREE from 'three'
import { introFrame } from './landmarks/intro-bridge.js'
import { smooth } from './util.js'
import { vehicleAt } from './intro-actors.js'

const POET_VISIT=[.930,.943,.953,.972]

const DRIVING=[
  [.235,[-4,7,2.4],[0,-1.3,1.1]],
  [.285,[-4,7,2.4],[0,-1.3,1.1]],
  [.303,[-8,0,3],[6,0,1.4]],
  [.32,[-6,-5,2.7],[8,1,1.6]],
  [.38,[-9,-2.4,3.6],[16,1,2]],
  [.46,[-10,-4,4],[13,18,4]],
  [.49,[-5,-18,4.5],[0,65,8]],
  [.50,[-5,-18,4.5],[0,65,8]],
  [.525,[-9,-4.5,4],[14,12,4]],
  [.58,[-9,-4.5,4],[12,15,4]],
  [.625,[-2,-14,3.6],[2,60,24]],
  [.635,[-2,-14,3.6],[2,60,24]],
  [.65,[-10,-5,4],[14,12,4]],
  [.69,[-13,-16,4.6],[2,42,15]],
  [.71,[-16,-22,5.2],[0,60,23]],
  [.725,[-16,-22,5.2],[0,60,23]],
  [.735,[-10,-7,4],[14,8,3]],
  [.78,[-10,-2,4],[22,0,2.5]],
  [.835,[-10,-2,3.6],[22,0,2.5]],
  [.89,[-7,-23,4],[3,65,14]],
  [.915,[-3,-28,4.5],[0,75,15]],
  [.93,[-3,-28,4.5],[0,75,15]],
  [.955,[-20,-45,65],[0,50,14]],
  [.985,[-48,-20,135],[0,30,145]],
  [1,[-60,0,140],[0,30,145]],
]

// Portrait arrivals look across the foreground vehicle toward the landmark.
// A narrow viewport cannot reuse the desktop down-road dolly and keep a temple
// ninety metres beside the road in frame. Offsets remain in the moving road
// basis, so travelling and reversing still follow the same continuous route.
const PORTRAIT_DRIVING=[
  [.235,[-6,15,2],[10,-68,22]],
  [.285,[-6,15,2],[10,-68,22]],
  [.303,[-13,2,4.5],[10,1,1.6]],
  [.32,[-10,-12,5],[8,1,1.6]],
  [.38,[-14,-5,5],[16,1,2]],
  [.46,[-15,-8,5],[13,18,4]],
  [.49,[-1.5,-25,5.5],[0,75,8]],
  [.50,[-1.5,-25,5.5],[0,75,8]],
  [.525,[-9,-4.5,4],[14,12,4]],
  [.58,[-9,-4.5,4],[14,12,4]],
  [.625,[-3,-24,3.8],[0,90,24]],
  [.64,[-3,-24,3.8],[0,90,24]],
  [.69,[-9,-20,4],[2,42,15]],
  [.71,[-3,-24,2.8],[0,60,23]],
  [.725,[-3,-24,2.8],[0,60,23]],
  [.735,[-10,-10,4],[14,8,3]],
  [.78,[-16,-2,5],[22,0,2.5]],
  [.835,[-16,-2,5],[22,0,2.5]],
  [.89,[-6,-24,4.5],[20,85,14]],
  [.93,[-6,-24,4.5],[20,85,14]],
  [.955,[-20,-45,65],[0,50,14]],
  [.985,[-48,-20,135],[0,30,145]],
  [1,[-60,0,140],[0,30,145]],
]

export function createJourneyCamera(route) {
  const intro=introFrame(route),up=new THREE.Vector3(0,1,0)
  const car=route.sample(),eye=new THREE.Vector3(),target=new THREE.Vector3()
  const previous=new THREE.Vector3(),movement=new THREE.Vector3()
  let initialized=false
  const park=vehicleAt(route,.245).pos
  const keys=[
    [0,intro.point(6,83,122),intro.point(6,66,30)],
    [.05,intro.point(6,76,105),intro.point(6,66,30)],
    [.09,intro.point(6,43,70),intro.point(6,7,0)],
    [.13,intro.point(6,13,34),intro.point(6,3.2,0)],
    [.155,intro.point(6,3.3,13),intro.point(6,3.2,-14)],
    [.18,intro.point(6,3.3,-10),intro.point(6,4,-30)],
    [.195,intro.point(6,9,-25),park.clone().add(up)],
    [.213,park.clone().addScaledVector(route.at(.07).tan,-7).addScaledVector(route.at(.07).right,11).addScaledVector(up,2.7),park.clone().addScaledVector(route.at(.07).right,-1.3).addScaledVector(up,1.2)],
    [.235,park.clone().addScaledVector(route.at(.07).tan,-4).addScaledVector(route.at(.07).right,7).addScaledVector(up,2.4),park.clone().addScaledVector(route.at(.07).right,-1.3).addScaledVector(up,1.1)],
  ]
  const portraitKeys=keys.map(key=>[key[0],key[1].clone(),key[2].clone()])
  portraitKeys[0]=[0,intro.point(-16,85,132),intro.point(-14,30,5)]
  portraitKeys[1]=[.05,intro.point(-15,76,115),intro.point(-12,30,0)]
  portraitKeys[2]=[.09,intro.point(-6,43,70),intro.point(0,7,0)]
  portraitKeys[7]=[.213,
    park.clone().addScaledVector(route.at(.07).tan,-10).addScaledVector(route.at(.07).right,20).addScaledVector(up,3),
    park.clone().addScaledVector(route.at(.07).tan,10).addScaledVector(route.at(.07).right,-68).addScaledVector(up,22),
  ]
  portraitKeys[8]=[.235,
    park.clone().addScaledVector(route.at(.07).tan,-6).addScaledVector(route.at(.07).right,15).addScaledVector(up,2),
    park.clone().addScaledVector(route.at(.07).tan,10).addScaledVector(route.at(.07).right,-68).addScaledVector(up,22),
  ]
  // Shape-preserving cubic Hermite tangents prevent the camera from diving
  // below ground or swinging ahead of the vehicle near a parked/ride boundary.
  const track=(list,index)=>{
    const points=list.map(key=>key[index] instanceof THREE.Vector3?key[index]:new THREE.Vector3(...key[index]))
    const slope=(a,b,axis)=>(points[b][axis]-points[a][axis])/(list[b][0]-list[a][0])
    const slopes=points.map((_,i)=>{
      const tangent=new THREE.Vector3()
      for(const axis of ['x','y','z']) {
        if(i===0 || i===points.length-1) {tangent[axis]=0;continue}
        const previous=slope(i-1,i,axis),next=slope(i,i+1,axis)
        if(previous*next<=0)tangent[axis]=0
        else {
          const a=list[i][0]-list[i-1][0],b=list[i+1][0]-list[i][0]
          const w1=2*b+a,w2=b+2*a
          tangent[axis]=(w1+w2)/(w1/previous+w2/next)
        }
      }
      return tangent
    })
    return (p,out)=>{
      let i=0;while(i<list.length-2 && p>list[i+1][0])i++
      const dt=list[i+1][0]-list[i][0],t=THREE.MathUtils.clamp((p-list[i][0])/dt,0,1),t2=t*t,t3=t2*t
      return out.copy(points[i]).multiplyScalar(2*t3-3*t2+1).addScaledVector(slopes[i],(t3-2*t2+t)*dt)
        .addScaledVector(points[i+1],-2*t3+3*t2).addScaledVector(slopes[i+1],(t3-t2)*dt)
    }
  }
  const introEyes=track(keys,1),introLooks=track(keys,2),localEyes=track(DRIVING,1),localLooks=track(DRIVING,2)
  const portraitIntroEyes=track(portraitKeys,1),portraitIntroLooks=track(portraitKeys,2)
  const portraitEyes=track(PORTRAIT_DRIVING,1),portraitLooks=track(PORTRAIT_DRIVING,2)
  const offset=new THREE.Vector3(),lookOffset=new THREE.Vector3()
  // These are visits within the continuous drive, not chapter cuts. The camera
  // leaves the vehicle briefly to read the original sculpture at human scale.
  const landmarkPoint=(u,lateral,local,quarterTurn=0,facingU=u)=>{
    const anchor=route.at(facingU),rotation=Math.atan2(-anchor.right.x,-anchor.right.z)+quarterTurn
    return new THREE.Vector3(...local).applyAxisAngle(up,rotation).add(route.side(u,lateral))
  }
  const visits=[
    {range:[.408,.435,.444,.458],eye:landmarkPoint(.23,42,[7,4.8,14]),target:landmarkPoint(.23,42,[0,2.2,2])},
    {range:[.451,.469,.474,.488],eye:landmarkPoint(.27,52,[30,18,53]),phoneEye:landmarkPoint(.27,52,[15,16,94]),target:landmarkPoint(.27,52,[-2,5,0])},
    {range:[.585,.610,.615,.632],eye:landmarkPoint(.47,100,[0,4.4,40],-Math.PI/2),target:landmarkPoint(.47,100,[0,3.6,58],-Math.PI/2),lift:16,lookLead:.08},
    {range:[.692,.708,.718,.725],eye:landmarkPoint(.64,112,[14,13,118]),phoneEye:landmarkPoint(.64,112,[10,13,134]),target:landmarkPoint(.64,112,[0,25,58]),lift:12,lookLead:.62},
    {range:POET_VISIT,eye:landmarkPoint(.976,96,[21,31,57],0,.96),target:landmarkPoint(.976,96,[0,21,0],0,.96)},
  ]
  return {
    sample(progress,aspect=1.6) {
      const p=THREE.MathUtils.clamp(progress,0,1)
      vehicleAt(route,p,car)
      if(p<.235) {
        ;(aspect<.8?portraitIntroEyes:introEyes)(p,eye)
        ;(aspect<.8?portraitIntroLooks:introLooks)(p,target)
      }
      else {
        ;(aspect<.8?portraitEyes:localEyes)(p,offset)
        ;(aspect<.8?portraitLooks:localLooks)(p,lookOffset)
        eye.copy(car.pos).addScaledVector(car.tan,offset.x).addScaledVector(car.right,offset.y).addScaledVector(up,offset.z)
        target.copy(car.pos).addScaledVector(car.tan,lookOffset.x).addScaledVector(car.right,lookOffset.y).addScaledVector(up,lookOffset.z)
      }
      // Flight and ascent use the authored composition. During the ride, a
      // blended lens shift protects the vehicle without pinning it during flight.
      let visitWeight=0
      for(const visit of visits) {
        const [a,b,c,d]=visit.range
        const weight=THREE.MathUtils.smootherstep(p,a,b)*(1-THREE.MathUtils.smootherstep(p,c,d))
        if(weight<=0)continue
        eye.lerp(aspect<.8 && visit.phoneEye?visit.phoneEye:visit.eye,weight)
        // Clear the cloister during entry/exit before settling below its roof.
        eye.y+=(visit.lift||0)*Math.sin(Math.PI*weight)
        // Lead the dolly with the sculpture/gateway view, keeping the
        // destination visible while the eye crosses the open approach.
        target.lerp(visit.target,visit.lookLead?THREE.MathUtils.smootherstep(weight,0,visit.lookLead):weight)
        visitWeight=Math.max(visitWeight,weight)
      }
      const frameWeight=smooth(.20,.235,p)*(1-smooth(.92,.95,p))*(1-visitWeight)
      const portrait=1-smooth(.285,.34,p)
      return {eye,target,frameWeight,visitWeight,screenX:aspect<.8?.08:.32,screenY:aspect<.8?-.54:-.26,portrait}
    },
    transport(position,look) {
      if(initialized){movement.copy(car.pos).sub(previous);position.add(movement);look.add(movement)}
      previous.copy(car.pos);initialized=true
    },
  }
}

export function frameVehicle(camera,center,width,height,progress=0,pose=null) {
  camera.clearViewOffset();camera.updateMatrixWorld(true)
  const local=center.clone().applyMatrix4(camera.matrixWorldInverse)
  const p=center.clone().project(camera)
  const weight=pose?.frameWeight ?? 1
  const portrait=pose?.portrait ?? 0
  const x=camera.aspect<.8?.08+portrait*.12-.16*smooth(.86,.915,progress):.06+portrait*.28
  const y=camera.aspect<.8?-.54+portrait*.025:-.40+portrait*.16
  // During a sculpture visit the auto can pass across the camera plane.
  // Its perspective projection then tends to infinity; following that point
  // swings the view away from the authored target and magnifies the road.
  // Fade before either extreme displacement or a near/behind-camera crossing.
  const displacement=Math.max(Math.abs(p.x-x),Math.abs(p.y-y))
  const framing=Number.isFinite(displacement)?weight*smooth(camera.near*2,camera.near*10,-local.z)*(1-smooth(1.25,2,displacement)):0
  if(framing>0)camera.setViewOffset(width,height,(p.x-x)*width/2*framing,(y-p.y)*height/2*framing,width,height)
}

// The phone renderer need not submit another city through nearly opaque haze.
// Sky sprites remain inside its 1km view; the final ascent restores both islands
// and the full coastal horizon on either quality setting.
export const journeyFar=(progress,compact=false)=>THREE.MathUtils.lerp(compact?1000:1600,4000,smooth(.955,.985,progress))

export function journeyLens(aspect,progress,speed=0) {
  const templeLens=12*smooth(.59,.625,progress)*(1-smooth(.64,.675,progress))+12*smooth(.69,.725,progress)*(1-smooth(.73,.755,progress))
  // The wide portrait establishing lens becomes a closer sculpture lens during
  // this authored visit, then eases back for the ascent on the same timing.
  const [a,b,c,d]=POET_VISIT
  const poet=THREE.MathUtils.smootherstep(progress,a,b)*(1-THREE.MathUtils.smootherstep(progress,c,d))
  const portraitTemples=12*smooth(.625,.635,progress)*(1-smooth(.64,.675,progress))
    +18*smooth(.675,.71,progress)*(1-smooth(.73,.755,progress))
  return (aspect<.8?66+portraitTemples+18*smooth(.86,.915,progress)-30*poet:52+templeLens-6*poet+8*smooth(.195,.235,progress)*(1-smooth(.285,.335,progress)))+speed*2
}
