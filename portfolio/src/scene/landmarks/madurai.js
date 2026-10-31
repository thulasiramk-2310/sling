// An original Meenakshi Amman Temple interpretation: cardinal gateways,
// enclosure passages, twin golden shrines, tank and pillared mandapams.
import * as THREE from 'three'
import { faceRoad } from '../route.js'
import { stoneTexture, withRelief } from '../textures.js'
import { block, surface } from '../util.js'
import { goldMaterial, makeGopuram } from './gopuram.js'
import { dravidaTower } from './shrines.js'
import { carvedPillarGeometry } from './stonework.js'
import { quality } from '../quality.js'
import { templeForecourt } from './temple-forecourt.js'
import { createMaduraiTown } from './madurai-town.js'

export function buildMadurai({scene,route,u}) {
  const complex=new THREE.Group()
  complex.name='Madurai — Meenakshi Amman Temple architectural study'
  const relief=withRelief('meenakshi-granite',()=>stoneTexture('#aaa18c',17),1.1)
  const stone=surface({map:relief.map,normalMap:quality.low?null:relief.normalMap,roughness:.94})
  const main=makeGopuram({tiers:9,baseW:30,baseD:18,tierH:5.4,palette:'madurai',seed:2,podiumH:7})
  main.scale.setScalar(52/main.userData.height)
  main.position.z=52
  complex.add(main,templeForecourt(route,u),createMaduraiTown())
  // All four outer gateways have nine registers. Heights/spacing are compressed
  // for this authored world; these are not survey dimensions of the compound.
  const gates=[[0,-56,Math.PI,24,49],[52,0,Math.PI/2,25,48],[-52,0,-Math.PI/2,22,50]]
  for(const [x,z,rotation,width,height] of gates) {
    const gate=makeGopuram({tiers:9,baseW:width,baseD:15,tierH:4.8,palette:'madurai',seed:width,podiumH:6})
    gate.scale.setScalar(height/gate.userData.height)
    gate.position.set(x,0,z);gate.rotation.y=rotation;complex.add(gate)
  }
  // Split each wall at its gate. No full-width wall fills the open passages.
  for(const z of [-56,52]) for(const side of [-1,1]) complex.add(block(44,5.4,1.4,stone,side*30,0,z))
  for(const x of [-52,52]) for(const side of [-1,1]) complex.add(block(1.4,5.4,46,stone,x,0,side*32))
  complex.add(block(104,.15,108,stone,0,-.18,-2))
  const gold=goldMaterial()
  for(const [x,z,scale] of [[-12,-20,1],[17,-15,.8]]) {
    const shrine=dravidaTower({base:13,tiers:2,wallH:6,tierH:2.3,mat:gold,wallMat:stone,finialMat:gold})
    shrine.scale.setScalar(scale);shrine.position.set(x,0,z);complex.add(shrine)
  }
  // Golden-lotus-tank interpretation, with terraced steps and a colonnade.
  const tank=new THREE.Group();tank.position.set(-18,0,20)
  const water=surface({color:0x305a53,roughness:.22,metalness:.2})
  tank.add(block(25,.12,22,water,0,.12))
  for(let i=0;i<4;i++) {
    const w=26+i*1.5,d=23+i*1.5
    tank.add(block(w,.24,.7,stone,0,i*.24,-d/2),block(w,.24,.7,stone,0,i*.24,d/2),block(.7,.24,d,stone,-w/2,i*.24),block(.7,.24,d,stone,w/2,i*.24))
  }
  complex.add(tank)
  const pillars=new THREE.InstancedMesh(carvedPillarGeometry(6.5,.85),stone,64)
  const matrix=new THREE.Matrix4();let k=0
  for(const side of [-1,1]) for(let i=0;i<16;i++) {
    pillars.setMatrixAt(k++,matrix.makeTranslation(side*43,.1,-46+i*6))
    pillars.setMatrixAt(k++,matrix.makeTranslation(-44+i*5.8,.1,side*43))
  }
  complex.add(pillars)
  for(const x of [-43,43]) complex.add(block(11,.65,99,stone,x,6.6,-1))
  for(const z of [-43,43]) complex.add(block(96,.65,10,stone,0,6.6,z))
  const uplights=[]
  for(const x of [-19,19]) {
    const light=new THREE.SpotLight(0xffd6aa,0,120,.64,.82,2)
    light.position.set(x,4,80);light.target.position.set(0,25,52)
    complex.add(light,light.target);uplights.push(light)
  }
  complex.position.copy(route.side(u,112));faceRoad(complex,route,u)
  scene.add(complex)
  return {focus:route.side(u,60,27),slots:[{name:'madurai',group:main,height:52}],update(time,night){uplights.forEach(light=>{light.intensity=night*5200})}}
}
