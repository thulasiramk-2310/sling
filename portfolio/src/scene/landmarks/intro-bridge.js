import * as THREE from 'three'
import { block, surface } from '../util.js'
import { grainTexture, withRelief } from '../textures.js'

export function introFrame(route) {
  const road=route.at(.07)
  const position=road.pos.clone().addScaledVector(road.right,88).addScaledVector(road.tan,-50)
  const rotation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(road.right,new THREE.Vector3(0,1,0),road.tan.clone().negate()))
  return {position,rotation,point:(x,y,z)=>new THREE.Vector3(x,y,z).applyQuaternion(rotation).add(position)}
}

export function buildIntroBridge(scene,route) {
  const group=new THREE.Group()
  group.name='Original Chennai coastal arch bridge — cinematic entrance'
  const stone=surface({color:0xd2cdbd,roughness:.9,...withRelief('coastal-bridge-plaster',grainTexture,.13)}),trim=surface({color:0x878c83,roughness:.85})
  const arch=new THREE.Shape()
  arch.moveTo(-6,-2);arch.lineTo(-4.8,-2);arch.lineTo(-4.8,2.1)
  arch.absarc(0,2.1,4.8,Math.PI,0,true)
  arch.lineTo(4.8,-2);arch.lineTo(6,-2);arch.lineTo(6,8);arch.lineTo(-6,8);arch.closePath()
  const archGeometry=new THREE.ExtrudeGeometry(arch,{depth:1.1,bevelEnabled:true,bevelSize:.13,bevelThickness:.13,bevelSegments:2,curveSegments:28})
  const arches=new THREE.InstancedMesh(archGeometry,stone,12),m=new THREE.Matrix4()
  let k=0
  for(const x of [-30,-18,-6,6,18,30]) for(const z of [-4,3]) {
    arches.setMatrixAt(k++,m.makeTranslation(x,0,z))
  }
  group.add(arches,block(74,.6,9,trim,0,8))
  // Individually cut arch stones, with recessed mortar and projecting keystones.
  // The opening stays a continuous 9.6m clear span for the camera flight.
  const voussoir = new THREE.Shape(), step = Math.PI / 19, gap = .009
  const point = (radius, angle) => [Math.cos(angle)*radius,Math.sin(angle)*radius]
  voussoir.moveTo(...point(4.8,gap))
  voussoir.absarc(0,0,4.8,gap,step-gap,false)
  voussoir.lineTo(...point(5.18,step-gap))
  voussoir.absarc(0,0,5.18,step-gap,gap,true);voussoir.closePath()
  const archStone = new THREE.ExtrudeGeometry(voussoir,{depth:.13,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1,curveSegments:4})
  const cut = new THREE.InstancedMesh(archStone,stone,6*2*19)
  const quaternion=new THREE.Quaternion(), axis=new THREE.Vector3(0,0,1), position=new THREE.Vector3()
  k=0
  for(const x of [-30,-18,-6,6,18,30])for(const z of [-4.16,4.12])for(let i=0;i<19;i++) {
    quaternion.setFromAxisAngle(axis,i*step)
    m.compose(position.set(x,2.1,z),quaternion,new THREE.Vector3(1,1,1))
    cut.setMatrixAt(k,m)
    cut.setColorAt(k++,new THREE.Color().setHSL(.105,.09,.61+(i%4)*.025))
  }
  group.add(cut)
  for(const x of [-36,-24,-12,0,12,24,36])for(const z of [-3.5,3.5]) {
    group.add(block(2.8,.48,1.7,trim,x,-1.75,z))
    group.add(block(2.45,.20,1.45,stone,x,1.9,z))
  }
  for(const z of [-4.15,4.15]) {
    group.add(block(74,.22,.32,stone,0,7.5,z),block(74,.18,.38,stone,0,8.35,z))
    for(const x of [-24,0,24]) {
      const metal=surface({color:0x34413d,roughness:.6,metalness:.35})
      const post=new THREE.Mesh(new THREE.CylinderGeometry(.055,.10,3.4,8),metal)
      post.position.set(x,10.1,z);group.add(post)
      group.add(block(.4,.65,.4,metal,x,11.8,z))
      group.add(block(.29,.45,.42,surface({color:0xf7dfaf,emissive:0xc78b32,emissiveIntensity:.35}),x,11.8,z))
      const cap=new THREE.Mesh(new THREE.ConeGeometry(.36,.28,4),metal)
      cap.position.set(x,12.25,z);cap.rotation.y=Math.PI/4;group.add(cap)
    }
  }

  const rail=new THREE.InstancedMesh(new THREE.BoxGeometry(.16,1.2,.18),stone,98)
  k=0
  for(const z of [-4.1,4.1]) for(let i=0;i<49;i++) rail.setMatrixAt(k++,m.makeTranslation(-36+i*1.5,9.2,z))
  group.add(rail,block(74,.22,.3,stone,0,9.8,-4.1),block(74,.22,.3,stone,0,9.8,4.1))
  const frame=introFrame(route)
  group.position.copy(frame.position);group.quaternion.copy(frame.rotation)
  scene.add(group)
  return {group,frame}
}
