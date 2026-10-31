import * as THREE from 'three'
import { block,surface } from '../util.js'
import { faceRoad } from '../route.js'
import {createArrivalFrontage} from './arrival-frontage.js'
import {createArrivalTrees} from './arrival-trees.js'
import {arrivalApronHeight} from '../arrival-surface.js'

// The road curves away from the rectangular station square. Follow its actual
// outside footway so the lay-by never exposes a wedge of sand beneath the auto.
function arrivalApron(route,u,group,stone,inlay) {
  const from=u-.035,to=u+.045,far=-36,near=-8.6,height=arrivalApronHeight
  const rows=Math.ceil((to-from)*route.length/1.5)+1
  const paving=[],joints=[]
  const point=(at,lat,y=height)=>route.side(at,lat,y)
  const quad=(positions,a,b,c,d)=>{
    for(const v of [a,b,c,b,d,c])positions.push(v.x,v.y,v.z)
  }
  for(let row=0;row<rows-1;row++) {
    const a=from+(to-from)*row/(rows-1),b=from+(to-from)*(row+1)/(rows-1)
    quad(paving,point(a,far),point(a,near),point(b,far),point(b,near))
    // A real slab edge, with separate vertices to keep its top normal level.
    quad(paving,point(a,far,0),point(a,far),point(b,far,0),point(b,far))
    for(let lat=far+3;lat<near;lat+=3)
      quad(joints,point(a,lat-.009,height+.003),point(a,lat+.009,height+.003),point(b,lat-.009,height+.003),point(b,lat+.009,height+.003))
  }
  quad(paving,point(from,near,0),point(from,near),point(from,far,0),point(from,far))
  quad(paving,point(to,far,0),point(to,far),point(to,near,0),point(to,near))
  const courses=Math.floor((to-from)*route.length/3),halfJoint=.009/route.length
  for(let course=1;course<=courses;course++) {
    const at=from+course*3/route.length
    quad(joints,point(at-halfJoint,far,height+.003),point(at-halfJoint,near,height+.003),point(at+halfJoint,far,height+.003),point(at+halfJoint,near,height+.003))
  }
  group.updateMatrixWorld()
  const inverse=group.matrixWorld.clone().invert()
  for(const [positions,material,name] of [[paving,stone,'Curved station parking apron'],[joints,inlay,'Station apron paving joints']]) {
    const geometry=new THREE.BufferGeometry()
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
    geometry.computeVertexNormals();geometry.applyMatrix4(inverse);geometry.computeBoundingSphere()
    const mesh=new THREE.Mesh(geometry,material)
    mesh.name=name;mesh.userData.receiveOnly=true;group.add(mesh)
  }
}

// An authored station forecourt in the compressed journey, not a map recreation.
export function createArrivalPlaza(route,u) {
  const group=new THREE.Group();group.name='Chennai arrival forecourt'
  group.position.copy(route.side(u+.023,-55));faceRoad(group,route,u);group.rotation.y+=Math.PI
  const stone=surface({color:0xb8ad99,roughness:.94}),inlay=surface({color:0xaaa392,roughness:.96})
  const red=surface({color:0x9e6c55,roughness:.95}),soil=surface({color:0x494a35,roughness:1})
  const metal=surface({color:0x424c48,roughness:.55,metalness:.35})
  // Meet the footway and reach the station with one continuous stone apron.
  // Trim before the curved street. The former z47 edge crossed the road and
  // its transverse curb intersected a rear tire after the merge.
  group.add(block(96,.12,77,stone,0,0,-8.5))
  arrivalApron(route,u,group,stone,inlay)
  const joints=new THREE.InstancedMesh(new THREE.BoxGeometry(.012,.014,77),inlay,31),matrix=new THREE.Matrix4()
  for(let i=0;i<31;i++)joints.setMatrixAt(i,matrix.makeTranslation(-45+i*3,.128,-8.5))
  group.add(joints)
  const courses=new THREE.InstancedMesh(new THREE.BoxGeometry(96,.014,.012),inlay,25)
  for(let i=0;i<25;i++)courses.setMatrixAt(i,matrix.makeTranslation(0,.129,-45+i*3))
  group.add(courses)
  // A broad central promenade stays clear. Raised gardens define its edges.
  for(const side of [-1,1])for(const z of [-22,0,22]) {
    const planter=new THREE.Group();planter.position.set(side*29,.12,z)
    planter.add(block(10,.65,8,red),block(9,.04,7,soil,0,.66))
    // The edge doubles as a stone seat; planting frames rather than hides the view.
    planter.add(block(10.3,.14,8.3,stone,0,.57));group.add(planter)
  }
  group.add(createArrivalFrontage(),createArrivalTrees())
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
