import * as THREE from 'three'
import { faceRoad } from '../route.js'
import { block, surface } from '../util.js'
import { coastalRock } from './coastal-rock.js'
import { poetPedestal } from './poet-pedestal.js'
import { poetIslandTerrace } from './poet-terrace.js'
import { rockMemorial } from './rock-memorial.js'
import { poetStatue, poetStoneMaterial } from './poet-statue.js'
import { quality } from '../quality.js'

export function buildKanyakumari({scene,route,u}) {
  const group=new THREE.Group();group.name='Kanyakumari — the meeting of three seas'
  const granite=surface({color:0x8f8980,roughness:.93}),rose=surface({color:0xa28673,roughness:.92}),trim=surface({color:0xc2ad92,roughness:.88})
  // The poet's dark granite is distinct from the memorial's warmer masonry.
  const poetGranite=surface({color:0x656c67,roughness:.88})
  const place=(object,along,lateral)=>{object.position.copy(route.side(u+along,lateral));object.position.y=0;faceRoad(object,route,u);group.add(object);return object}
  const shadow=surface({color:0x393d3b,roughness:1})
  const memorial=rockMemorial(granite,rose,trim,shadow)
  place(memorial,-.005,85)
  const statueGroup=new THREE.Group()
  const island=coastalRock({rx:22,rz:19,seed:88,low:quality.low});statueGroup.add(island)
  statueGroup.add(poetIslandTerrace(poetGranite,surface({color:0xb9bbad,roughness:.92})))
  statueGroup.add(poetPedestal(poetGranite,shadow,quality.low))
  const statue=new THREE.Group();statue.name='Original poet figure';statue.position.y=12;statueGroup.add(statue)
  const figureSlot={name:'poet-figure',group:statue,material:poetStoneMaterial(poetGranite,quality.low),fallback:()=>poetStatue(poetGranite,quality.low)}
  place(statueGroup,.016,96)

  // A curved stone viewing terrace gives this stop its own coastal silhouette.
  const terrace=new THREE.Group();terrace.name='Dawn promenade — curved granite sea wall'
  const paving=surface({color:0xb7b09d,roughness:.94})
  const darkStone=surface({color:0x646a65,roughness:.94})
  const brass=surface({color:0x9e8b58,roughness:.48,metalness:.4})
  const point=(a,r,y)=>new THREE.Vector3(Math.sin(a)*r,y,30-Math.cos(a)*r)
  const band=(inner,outer,y,material)=>{
    const positions=[],indices=[],steps=64
    for(let i=0;i<=steps;i++) for(const r of [inner,outer]) positions.push(...point(-1.05+i/steps*2.1,r,y).toArray())
    for(let i=0;i<steps;i++){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3)}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals()
    const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;terrace.add(mesh)
  }
  for(let step=0;step<5;step++) band(34+step*1.5,35.5+step*1.5,.12-step*.22,paving)
  band(26,34,.34,paving)
  band(33.6,34,.36,brass)
  // Joint lines, curved parapet blocks and low seats; no billboard decorations.
  const joints=new THREE.InstancedMesh(new THREE.BoxGeometry(.035,.012,7.8),darkStone,43)
  const wall=new THREE.InstancedMesh(new THREE.BoxGeometry(1.28,.65,.65),granite,53)
  const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3(1,1,1)
  for(let i=0;i<53;i++){
    const angle=-1.04+i/52*2.08;rotation.setFromAxisAngle(new THREE.Vector3(0,1,0),-angle)
    wall.setMatrixAt(i,matrix.compose(point(angle,34,.65),rotation,scale))
  }
  for(let i=0;i<43;i++){
    const angle=-1.03+i/42*2.06;rotation.setFromAxisAngle(new THREE.Vector3(0,1,0),-angle)
    joints.setMatrixAt(i,matrix.compose(point(angle,30,.35),rotation,scale))
  }
  terrace.add(joints,wall)
  for(const angle of [-.75,-.35,.35,.75]) {
    const bench=new THREE.Group();bench.add(block(3.4,.22,1,paving,0,.68),block(.35,.68,.8,darkStone,-1.1),block(.35,.68,.8,darkStone,1.1))
    bench.position.copy(point(angle,27.5,.34));bench.rotation.y=-angle;terrace.add(bench)
  }
  place(terrace,0,14)

  const endLight=new THREE.SpotLight(0xffd2a0,0,160,1.1,.65,2)
  endLight.position.copy(route.side(u,55,25));endLight.target.position.copy(route.side(u,100,14))
  group.add(endLight,endLight.target)
  scene.add(group)
  return {focus:route.side(u,98,16),slots:[{name:'kanyakumari-memorial',group:memorial,height:27},{name:'thiruvalluvar',group:statueGroup,height:40},figureSlot],update(time,night){endLight.intensity=night*13000;island.userData.updateFoam(time);memorial.userData.coastalRock.userData.updateFoam(time)}}
}
