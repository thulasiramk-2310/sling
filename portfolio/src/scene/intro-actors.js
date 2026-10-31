import * as THREE from 'three'
import { storyAt } from './story.js'
import { smooth } from './util.js'
import {arrivalSupportHeight} from './arrival-surface.js'
import {ROAD_DECK_HEIGHT} from './route.js'

const quintic=(a,b,p)=>THREE.MathUtils.smootherstep(p,a,b)
const UP=new THREE.Vector3(0,1,0),delta=new THREE.Vector3(),contact=new THREE.Vector3(),forward=new THREE.Vector3()
const sample=()=>({pos:new THREE.Vector3(),tan:new THREE.Vector3(),right:new THREE.Vector3()})
const before=sample(),after=sample(),ground=sample()
export const introParkingWeight=progress=>1-smooth(.32,.37,progress)

function surfaceHeight(route,road,point,along) {
  let at=road+along/route.length
  for(let i=0;i<2;i++){
    route.at(at,ground)
    at+=delta.copy(point).sub(ground.pos).dot(ground.tan)/route.length
  }
  route.at(at,ground)
  return ground.pos.y+arrivalSupportHeight(delta.copy(point).sub(ground.pos).dot(ground.right))
}

function placeAtRoad(route,road,parked,out) {
  route.at(road,out)
  out.pos.addScaledVector(out.tan,12*parked)
  out.pos.addScaledVector(out.right,-10*parked)
  if(parked>0){
    // Project onto the curved road, rather than assuming the 12m forward
    // offset preserves its lateral distance. This keeps wheels on the ramp.
    out.pos.y=surfaceHeight(route,road,out.pos,12*parked)
  }else out.pos.y+=ROAD_DECK_HEIGHT
  return out
}
const place=(route,progress,out)=>placeAtRoad(route,storyAt(progress).road,introParkingWeight(progress),out)

// The forecourt stop and merge share the same road basis as camera, actors and
// exhibits. Road progress remains independent of this short physical pull-out.
export function vehicleAt(route,progress,out=route.sample()) {
  place(route,progress,out)
  place(route,Math.max(0,progress-.0001),before)
  place(route,Math.min(1,progress+.0001),after)
  out.heading??=new THREE.Vector3()
  out.heading.copy(after.pos).sub(before.pos)
  if(out.heading.lengthSq()<1e-10){
    // A parked vehicle already points along the tangent of its offset path.
    // Falling back to the road centre's tangent made it snap several degrees
    // on the first moving frame of the forecourt departure.
    const road=storyAt(progress).road,parked=introParkingWeight(progress)
    if(progress<=.32){
      // A three-quarter parking angle is the actual tangent of the pull-out,
      // so departing never rotates a parked model independently of its path.
      place(route,.32,before);place(route,.3201,after)
    }else{
      placeAtRoad(route,Math.max(0,road-.0001),parked,before)
      placeAtRoad(route,Math.min(1,road+.0001),parked,after)
    }
    out.heading.copy(after.pos).sub(before.pos)
  }
  out.heading.normalize()
  out.vehicleRight??=new THREE.Vector3()
  out.vehicleRight.crossVectors(out.heading,UP).normalize()
  out.normal??=new THREE.Vector3()
  out.normal.copy(UP)
  const parked=introParkingWeight(progress)
  if(parked>0){
    // Fit the chassis to its three actual wheel supports. A centre sample and
    // tangent alone sink a rear tire when the front reaches flat asphalt first.
    forward.copy(out.heading);forward.y=0;forward.normalize()
    const road=storyAt(progress).road
    const height=(along,lateral)=>surfaceHeight(route,road,contact.copy(out.pos).addScaledVector(forward,along).addScaledVector(out.vehicleRight,lateral),12*parked+along)
    const front=height(1.02,0),left=height(-.82,.66),right=height(-.82,-.66),rear=(left+right)/2
    const alongGrade=(front-rear)/1.84,crossGrade=(left-right)/1.32
    out.pos.y=rear+.82*alongGrade
    out.normal.addScaledVector(forward,-alongGrade).addScaledVector(out.vehicleRight,-crossGrade).normalize()
    out.heading.copy(forward);out.heading.y=alongGrade;out.heading.normalize()
  }
  return out
}

const WALK_LENGTH=Math.hypot(2,.4)
export function introductionActor(progress,reduced=false) {
  // Arrive after the camera reaches the forecourt. A longer walk while the
  // camera was still under the bridge made the action almost imperceptible.
  const arrival=reduced?1:quintic(.213,.242,progress)
  const boarding=progress<.5?smooth(.285,.325,progress):0
  const settled=smooth(.72,1,arrival)
  const travelHeading=Math.atan2(-.4,2)
  return {
    along:THREE.MathUtils.lerp(-1.9,.1,arrival)*(1-boarding),
    lateral:THREE.MathUtils.lerp(2.05,1.65,arrival)*(1-boarding),
    height:0,
    heading:THREE.MathUtils.lerp(travelHeading,1.4,settled)*(1-boarding),
    distance:WALK_LENGTH*arrival,
    walking:reduced?0:smooth(0,.12,arrival)*(1-smooth(.82,1,arrival)),
  }
}

// A short, grounded step in a two-link leg. Knee flexion stays positive and the
// ankle cancels the accumulated angle to keep the stance shoe level.
export function legPose(z,y,thigh=.4,shin=.36) {
  const distance=THREE.MathUtils.clamp(Math.hypot(z,y),.05,thigh+shin-.00001)
  const cosine=THREE.MathUtils.clamp((thigh*thigh+distance*distance-shin*shin)/(2*thigh*distance),-1,1)
  const hip=Math.atan2(-z,-y)-Math.acos(cosine)
  const knee=Math.PI-Math.acos(THREE.MathUtils.clamp((thigh*thigh+shin*shin-distance*distance)/(2*thigh*shin),-1,1))
  return {hip,knee,ankle:-hip-knee}
}
