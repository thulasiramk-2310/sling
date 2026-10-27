import * as THREE from 'three'
import { block } from '../util.js'
import { coastalRock } from './coastal-rock.js'
import { quality } from '../quality.js'
import { carvedPillarGeometry } from './stonework.js'

// Original architectural study informed by district photographs. All surfaces
// and relief are geometry; no photographic facade or third-party mesh.
export function rockMemorial(granite,rose,trim,shadow) {
  const group=new THREE.Group();group.name='Vivekananda Rock Memorial — architectural study'
  const rock=coastalRock({rx:35,rz:32,kind:'memorial',seed:82,low:quality.low});group.add(rock)
  group.userData.coastalRock=rock
  // Upper platform, stone courses and the long assembly hall.
  for(let i=0;i<5;i++)group.add(block(28-i*.7,.55,34-i*.7,granite,0,5+i*.55,-3))
  group.add(block(20,7.8,25,granite,0,7.75,-5))
  for(const y of [8.1,14.9,15.5])group.add(block(21.1,.35,26.1,rose,0,y,-5))
  group.add(block(22,.55,27,rose,0,15.85,-5))
  // A profiled dome with a tall drum and shallow ribs, rather than a hemisphere.
  const domeProfile=[[0,0],[3.15,0],[3.15,.5],[2.65,.6],[2.65,1.8],[2.9,2.1],[2.95,2.6],[2.8,3.3],[2.45,4.2],[1.9,5.1],[1.1,5.9],[.4,6.35],[.3,6.8],[0,6.8]]
  const domeGeometry=new THREE.LatheGeometry(domeProfile.map(p=>new THREE.Vector2(...p)),48)
  const dome=(x,y,z,scale=1)=>{
    const root=new THREE.Group();root.position.set(x,y,z);root.scale.setScalar(scale)
    root.add(new THREE.Mesh(domeGeometry,rose))
    for(let i=0;i<16;i++) {
      const angle=i/16*Math.PI*2
      const points=domeProfile.slice(6,12).map(([r,h])=>new THREE.Vector3(Math.cos(angle)*(r+.035),h,Math.sin(angle)*(r+.035)))
      root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),16,.055,5,false),rose))
    }
    const top=new THREE.Mesh(new THREE.LatheGeometry([[0,0],[.37,0],[.36,.24],[.14,.36],[.2,.6],[0,1.15]].map(p=>new THREE.Vector2(...p)),16),trim)
    top.position.y=6.8;root.add(top);group.add(root)
  }
  group.add(block(8,1.8,8,rose,0,16.4,-7))
  dome(0,18.2,-7,1)
  for(const x of [-8,8])for(const z of [-15,5]) {
    group.add(block(4.2,1,4.2,rose,x,16.4,z));dome(x,17.4,z,.56)
  }
  // Recessed side bays with shaped arch heads and pilasters.
  const pillarGeometry=carvedPillarGeometry(7,.42)
  const columns=new THREE.InstancedMesh(pillarGeometry,granite,28),matrix=new THREE.Matrix4()
  let count=0
  for(const side of [-1,1]) for(let i=0;i<7;i++) {
    const z=-16+i*3.6
    columns.setMatrixAt(count++,matrix.makeTranslation(side*10.22,8,z))
    group.add(block(.13,4.5,1.8,shadow,side*10.08,9,z+1.65))
    const arch=new THREE.Mesh(new THREE.TorusGeometry(.92,.14,6,18,Math.PI),rose)
    arch.rotation.y=side*Math.PI/2;arch.position.set(side*10.18,13.5,z+1.65);group.add(arch)
  }
  // Front portico leaves real space between its columns and the hall doors.
  for(const x of [-8,-4,0,4,8])for(const z of [9,13])columns.setMatrixAt(count++,matrix.makeTranslation(x,7.75,z))
  columns.count=count;group.add(columns)
  for(const x of [-6,0,6])group.add(block(2.1,5.4,.14,shadow,x,7.8,7.57))
  group.add(block(19.5,.6,7,rose,0,14.7,10.8))
  group.add(block(18.4,.45,6,rose,0,15.3,10.8))
  dome(0,15.75,10.8,.55)
  // Broad entry stairs and separate lower pavilion on the rock's shoulder.
  for(let i=0;i<23;i++)group.add(block(8.5,.34,1.1,granite,0,i*.34,29-i*.63))
  for(const side of [-1,1])for(let i=0;i<6;i++)group.add(block(.65,1.3,2.5,rose,side*4.65,1+i*1.15,27-i*2.3))
  const lower=new THREE.Group();lower.position.set(-18,3.2,12)
  lower.add(block(12,.6,9,granite),block(12.6,.4,9.6,trim,0,.6))
  const smallPillar=carvedPillarGeometry(3.3,.4)
  for(const x of [-5,-1.7,1.7,5])for(const z of [-3.6,3.6]){
    const p=new THREE.Mesh(smallPillar,granite);p.position.set(x,1,z);lower.add(p)
  }
  lower.add(block(13,.5,10,granite,0,4.3),block(10.8,.5,8,rose,0,4.8),block(8.8,.4,6.2,rose,0,5.3));group.add(lower)
  group.traverse(object=>{if(object.isMesh && !object.userData.noShadow){object.castShadow=true;object.receiveShadow=true}})
  return group
}
