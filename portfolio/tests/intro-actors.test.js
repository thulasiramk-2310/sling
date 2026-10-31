import {it,expect,vi,afterEach} from 'vitest'
import * as THREE from 'three'
import {createRoute,ROAD_DECK_HEIGHT} from '../src/scene/route.js'
import {createRamAvatar} from '../src/scene/avatar.js'
import {vehicleAt,introductionActor} from '../src/scene/intro-actors.js'
import {storyAt} from '../src/scene/story.js'
import {advanceDrive,journeyPace} from '../src/scene/drive.js'
import {createJourneyCamera,journeyLens,frameVehicle} from '../src/scene/camera.js'
import {createArrivalPlaza} from '../src/scene/landmarks/arrival-plaza.js'
import {createStreetEdges} from '../src/scene/street-edges.js'
import {buildRoad} from '../src/scene/world.js'
import {createAuto} from '../src/scene/auto.js'

// CPU geometry proof uses the real road and vehicle. Their bitmap contents do
// not affect intersections, so no browser/canvas is needed for texture baking.
vi.mock('../src/scene/textures.js',()=>({glowTexture:()=>null,grainTexture:()=>null,roadTexture:()=>null,seaNormalTexture:()=>null,trunkTexture:()=>null,withRelief:()=>({})}))
afterEach(()=>vi.unstubAllGlobals())

it('parks on the paved arrival side and merges into the same continuous road',()=>{
  const route=createRoute(),park=vehicleAt(route,.245),road=route.at(.07)
  const offset=park.pos.clone().sub(road.pos)
  expect(offset.dot(road.right)).toBeCloseTo(-10)
  expect(offset.dot(road.tan)).toBeCloseTo(12)
  expect(park.pos.y).toBeCloseTo(.145)
  let previous=null,heading=null
  for(let i=0;i<=2000;i++){
    const p=.30+i/2000*.10,pose=vehicleAt(route,p)
    expect(pose.heading.length()).toBeCloseTo(1)
    if(previous){expect(pose.pos.distanceTo(previous)).toBeLessThan(.25);expect(pose.heading.dot(heading)).toBeGreaterThan(.999)}
    previous=pose.pos.clone();heading=pose.heading.clone()
  }
  expect(vehicleAt(route,.38).pos.distanceTo(route.at(storyAt(.38).road).pos.add(new THREE.Vector3(0,ROAD_DECK_HEIGHT,0)))).toBeLessThan(1e-8)
})

it('keeps all three tires clear of curbs throughout the full departure onto the actual road',()=>{
  const route=createRoute(),surface=new THREE.Group()
  surface.add(createArrivalPlaza(route,.07),createStreetEdges(route,.035,.115));buildRoad(surface,route);surface.updateMatrixWorld(true)
  vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})})
  const auto=createAuto(),tires=[]
  auto.root.traverse(object=>{if(object.name==='Rickshaw rolling wheel')tires.push(object.children[0])})
  expect(tires).toHaveLength(3)
  const down=new THREE.Vector3(0,-1,0),ray=new THREE.Raycaster(),origin=new THREE.Vector3()
  let rampSamples=0
  for(let i=0;i<=8000;i++){
    const p=.32+i/8000*.08,car=vehicleAt(route,p)
    auto.root.position.copy(car.pos);auto.root.up.copy(car.normal);auto.root.lookAt(car.pos.clone().add(car.heading));auto.root.updateMatrixWorld(true)
    for(const tire of tires){
      // A transformed bounding box includes corners that do not exist on a
      // round tire and overstates penetration when the chassis rolls. Inspect
      // the actual rendered torus vertices instead.
      const positions=tire.geometry.attributes.position,point=new THREE.Vector3(),bottom=new THREE.Vector3(0,Infinity,0)
      for(let vertex=0;vertex<positions.count;vertex++){
        point.fromBufferAttribute(positions,vertex).applyMatrix4(tire.matrixWorld)
        if(point.y<bottom.y)bottom.copy(point)
      }
      origin.copy(bottom);origin.y=5;ray.set(origin,down)
      const hits=ray.intersectObject(surface,true)
      expect(hits.length,`surface beneath tire at progress ${p}`).toBeGreaterThan(0)
      // Includes the tire's rounded section and the small cross-slope of the
      // dropped drive. A solid plaza curb crossing the road is not tolerated.
      expect(Math.abs(hits[0].point.y-bottom.y),`tire at progress ${p}`).toBeLessThan(.02)
    }
    if(car.pos.y<.14 && car.pos.y>ROAD_DECK_HEIGHT+.001)rampSamples++
  }
  expect(rampSamples).toBeGreaterThan(20)
},20000)

it('walks in, settles without a treadmill cycle, and offers the settled reduced-motion pose',()=>{
  const first=introductionActor(.213),last=introductionActor(.245)
  expect(last.distance-first.distance).toBeGreaterThan(1.9)
  expect(first.along).toBeLessThan(last.along)
  expect(last.walking).toBe(0)
  expect(last.heading).toBeCloseTo(1.4)
  const reduced=introductionActor(.20,true)
  expect(reduced).toEqual(last)
  const boarded=introductionActor(.325)
  expect(boarded.along).toBe(0);expect(boarded.lateral).toBe(0);expect(boarded.heading).toBe(0)
  let drive={u:.213,velocity:.045},time=0,speed=0
  let previous=first.distance
  while(drive.u<.242 && time<15){
    drive=advanceDrive(drive,.245,journeyPace(drive.u)/60)
    const distance=introductionActor(drive.u).distance
    speed=Math.max(speed,(distance-previous)*60);previous=distance;time+=1/60
  }
  expect(time).toBeGreaterThan(2);expect(time).toBeLessThan(4)
  expect(speed).toBeLessThan(1.7)
})

it('shows the arriving person at a readable scale while he walks, before the reading stop',()=>{
  const route=createRoute(),rig=createJourneyCamera(route),up=new THREE.Vector3(0,1,0)
  for(const [width,height] of [[1440,900],[390,844]])for(const progress of [.218,.225,.232]){
    const pose=rig.sample(progress,width/height),car=vehicleAt(route,progress)
    const camera=new THREE.PerspectiveCamera(journeyLens(width/height,progress),width/height,.3,1600)
    camera.position.copy(pose.eye);camera.lookAt(pose.target);camera.updateMatrixWorld(true)
    frameVehicle(camera,car.pos.clone().add(up).addScaledVector(car.right,.9*pose.portrait),width,height,progress,pose)
    const actor=introductionActor(progress),feet=car.pos.clone().addScaledVector(car.heading,actor.along).addScaledVector(car.vehicleRight,actor.lateral).addScaledVector(up,actor.height)
    const top=feet.clone().addScaledVector(up,1.8).project(camera),bottom=feet.project(camera)
    expect(actor.walking).toBeGreaterThan(0)
    expect((top.y-bottom.y)*height/2).toBeGreaterThan(width<600?60:100)
    expect(Math.abs(top.x)).toBeLessThan(.95);expect(Math.abs(bottom.x)).toBeLessThan(.95)
    expect(bottom.y).toBeGreaterThan(-.9);expect(top.y).toBeLessThan(.7)
  }
})

it('plants each stance ankle in the world while the walking body advances',()=>{
  const avatar=createRamAvatar(),ankles=['Ram left ankle','Ram right ankle'].map(name=>avatar.root.getObjectByName(name))
  let previous=[null,null],compared=0
  for(let i=0;i<1000;i++){
    const distance=1+i/1000*.76,cycle=distance/.76
    avatar.root.position.z=distance
    avatar.update(0,0,false,{walking:1,distance});avatar.root.updateMatrixWorld(true)
    for(let index=0;index<2;index++){
      const phase=(cycle+index*.5)%1,point=ankles[index].getWorldPosition(new THREE.Vector3())
      if(phase>.08 && phase<.48){
        expect(point.y).toBeCloseTo(.112,5)
        if(previous[index]){expect(point.distanceTo(previous[index])).toBeLessThan(.002);compared++}
        previous[index]=point
      }else previous[index]=null
    }
  }
  expect(compared).toBeGreaterThan(500)
})
