import * as THREE from 'three'
import { block,surface } from '../util.js'
import { faceRoad } from '../route.js'
import { quality } from '../quality.js'

// An authored station forecourt in the compressed journey, not a map recreation.
export function createArrivalPlaza(route,u) {
  const group=new THREE.Group();group.name='Chennai arrival forecourt'
  group.position.copy(route.side(u+.023,-55));faceRoad(group,route,u);group.rotation.y+=Math.PI
  const stone=surface({color:0xb8ad99,roughness:.94}),inlay=surface({color:0x827b70,roughness:.96})
  const red=surface({color:0x9e6c55,roughness:.95}),soil=surface({color:0x494a35,roughness:1})
  const foliage=surface({color:0x63775b,roughness:.97}),metal=surface({color:0x424c48,roughness:.55,metalness:.35})
  // Meet the footway and reach the station with one continuous stone apron.
  group.add(block(96,.12,94,stone))
  const joints=new THREE.InstancedMesh(new THREE.BoxGeometry(.025,.014,94),inlay,31),matrix=new THREE.Matrix4()
  for(let i=0;i<31;i++)joints.setMatrixAt(i,matrix.makeTranslation(-45+i*3,.128,0))
  group.add(joints)
  const courses=new THREE.InstancedMesh(new THREE.BoxGeometry(96,.014,.025),inlay,31)
  for(let i=0;i<31;i++)courses.setMatrixAt(i,matrix.makeTranslation(0,.129,-45+i*3))
  group.add(courses)
  group.add(block(96,.24,.35,stone,0,0,46.8))
  // A broad central promenade stays clear. Raised gardens define its edges.
  for(const side of [-1,1])for(const z of [-22,0,22]) {
    const planter=new THREE.Group();planter.position.set(side*29,.12,z)
    planter.add(block(10,.65,8,red),block(9,.04,7,soil,0,.66))
    const hedge=new THREE.Mesh(new THREE.CapsuleGeometry(1.15,5.8,6,quality.low?12:20),foliage)
    hedge.rotation.z=Math.PI/2;hedge.position.y=1.35;hedge.scale.z=1.9;planter.add(hedge)
    // The edge doubles as a stone seat; planting frames rather than hides the view.
    planter.add(block(10.3,.14,8.3,stone,0,.57));group.add(planter)
  }
  const bollards=new THREE.InstancedMesh(new THREE.CylinderGeometry(.12,.15,.85,12),metal,18)
  for(let i=0;i<18;i++)bollards.setMatrixAt(i,matrix.makeTranslation(-34+i*4,.53,33))
  group.add(bollards)
  const medallion=new THREE.Mesh(new THREE.RingGeometry(6,6.18,64),red)
  medallion.rotation.x=-Math.PI/2;medallion.position.set(0,.14,10);group.add(medallion)
  for(let i=0;i<8;i++) {
    const arm=new THREE.Mesh(new THREE.TorusGeometry(2.15,.055,5,32,Math.PI*1.55),inlay)
    arm.rotation.x=-Math.PI/2;arm.rotation.z=i/8*Math.PI*2
    const angle=i/8*Math.PI*2;arm.position.set(Math.sin(angle)*2.9,.15,10+Math.cos(angle)*2.9);group.add(arm)
  }
  return group
}
