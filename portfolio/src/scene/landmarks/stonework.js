import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

export function combineStone(parts) {
  const normalized=parts.map((part)=>part.index?part.toNonIndexed():part.clone())
  const result=mergeGeometries(normalized)
  normalized.forEach((part)=>part.dispose())
  parts.forEach((part)=>part.dispose())
  result.computeBoundingBox()
  result.computeBoundingSphere()
  return result
}

export function carvedPillarGeometry(height=5,width=.7) {
  const profile=[[.55,0],[.55,.05],[.44,.06],[.44,.12],[.32,.14],[.32,.23],[.39,.25],[.33,.29],[.29,.35],[.27,.7],[.34,.73],[.38,.78],[.27,.82],[.28,.87],[.43,.91],[.48,.93],[.48,.98]]
  const parts=[new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r*width,y*height)),8)]
  const bracket=new THREE.BoxGeometry(width*1.5,height*.06,width*.8)
  bracket.translate(0,height*.97,0)
  const cross=bracket.clone().rotateY(Math.PI/2)
  parts.push(bracket,cross)
  return combineStone(parts)
}

// A hollow barrel vault, with real underside and rounded cornice edges.
export function barrelVaultGeometry(length=12,width=6,rise=3) {
  const shape=new THREE.Shape()
  shape.moveTo(-width/2,0)
  shape.bezierCurveTo(-width/2,rise*.8,-width*.2,rise,0,rise)
  shape.bezierCurveTo(width*.2,rise,width/2,rise*.8,width/2,0)
  shape.lineTo(width/2-.25,0)
  shape.bezierCurveTo(width/2-.25,rise*.68,width*.18,rise-.25,0,rise-.25)
  shape.bezierCurveTo(-width*.18,rise-.25,-width/2+.25,rise*.68,-width/2+.25,0)
  shape.closePath()
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:length,bevelEnabled:true,bevelSize:.08,bevelThickness:.08,bevelSegments:2,curveSegments:20})
  geometry.translate(0,0,-length/2)
  return geometry
}

export function kuduGeometry(detail=0) {
  const frame=new THREE.Shape()
  if(detail===2){
    // A solid extruded arch remains legible below eight CSS pixels. Match
    // the full carving's outer bevel envelope; retain its actual open centre.
    frame.moveTo(-.38556343,-.025)
    frame.lineTo(-.38556343,.55)
    frame.lineTo(-.30,.91)
    frame.lineTo(-.16,1.075)
    frame.lineTo(0,1.12621045)
    frame.lineTo(.16,1.075)
    frame.lineTo(.30,.91)
    frame.lineTo(.38556343,.55)
    frame.lineTo(.38556343,-.025)
    frame.lineTo(.25,-.025)
  }else{
    frame.moveTo(-.36,0)
    frame.lineTo(-.36,.55)
    frame.bezierCurveTo(-.38,.92,-.18,1.05,0,1.1)
    frame.bezierCurveTo(.18,1.05,.38,.92,.36,.55)
    frame.lineTo(.36,0)
    frame.lineTo(.25,0)
  }
  frame.lineTo(.25,.55)
  frame.bezierCurveTo(.26,.8,.13,.92,0,.96)
  frame.bezierCurveTo(-.13,.92,-.26,.8,-.25,.55)
  frame.lineTo(-.25,detail===2?-.025:0)
  frame.closePath()
  const geometry=new THREE.ExtrudeGeometry(frame,detail===2?
    {depth:.21,bevelEnabled:false,curveSegments:3}:
    {depth:.16,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:detail===1?1:2,curveSegments:detail===1?4:12})
  if(detail===2)geometry.translate(0,0,-.025)
  geometry.computeBoundingBox();geometry.computeBoundingSphere()
  return geometry
}

export function taperedStoneCourse(width,depth,height,shrink=.93) {
  const geometry=new THREE.BoxGeometry(width,height,depth)
  const p=geometry.attributes.position
  for(let i=0;i<p.count;i++) if(p.getY(i)>0) p.setXYZ(i,p.getX(i)*shrink,p.getY(i),p.getZ(i)*shrink)
  geometry.translate(0,height/2,0)
  geometry.computeVertexNormals()
  return geometry
}

export function gatewayGeometry(width,depth,podiumH) {
  const arch=new THREE.Shape()
  const doorW=width*.26/1.06,doorH=podiumH*.8
  arch.moveTo(-width/2,0)
  arch.lineTo(-doorW/2,0)
  arch.lineTo(-doorW/2,doorH*.85)
  arch.lineTo(-doorW*.35,doorH)
  arch.lineTo(doorW*.35,doorH)
  arch.lineTo(doorW/2,doorH*.85)
  arch.lineTo(doorW/2,0)
  arch.lineTo(width/2,0)
  arch.lineTo(width/2,podiumH)
  arch.lineTo(-width/2,podiumH)
  arch.closePath()
  const podiumGeometry=new THREE.ExtrudeGeometry(arch,{depth,bevelEnabled:true,bevelThickness:.12,bevelSize:.1,bevelSegments:2})
  podiumGeometry.translate(0,0,-depth/2)
  return podiumGeometry
}
