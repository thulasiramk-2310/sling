import {it,expect} from 'vitest'
import * as THREE from 'three'
import {registerDetailLod,updateDetailLods} from '../src/scene/detail-lod.js'
import {createSculptureInstances,guardianGeometry,guardianProxyGeometry} from '../src/scene/landmarks/sculptures.js'

it('selects detail in CSS pixels with hysteresis and explicit main-camera updates',()=>{
  const levels=[1,2,3].map(()=>new THREE.BoxGeometry(1,1,1))
  const mesh=new THREE.InstancedMesh(levels[0],new THREE.MeshBasicMaterial(),1),root=new THREE.Group()
  root.add(mesh);mesh.setMatrixAt(0,new THREE.Matrix4())
  registerDetailLod(mesh,{levels,center:new THREE.Vector3(),height:1})
  const camera=new THREE.PerspectiveCamera(90,1,.1,2000)
  const at=pixels=>{camera.position.z=500/pixels;return updateDetailLods(root,camera,1000)}
  expect(at(40).full).toBe(1);expect(mesh.geometry).toBe(levels[0])
  at(30);expect(mesh.geometry).toBe(levels[0])
  at(26);expect(mesh.geometry).toBe(levels[1])
  at(31);expect(mesh.geometry).toBe(levels[1])
  at(33);expect(mesh.geometry).toBe(levels[0])
  at(31);expect(mesh.geometry).toBe(levels[0])
  at(10);expect(mesh.geometry).toBe(levels[1])
  at(7.5);expect(mesh.geometry).toBe(levels[1])
  at(6);expect(mesh.geometry).toBe(levels[2])
  at(7.5);expect(mesh.geometry).toBe(levels[2])
  at(8.1);expect(mesh.geometry).toBe(levels[1])
  at(2);expect(mesh.geometry).toBe(levels[2])
  at(33);expect(mesh.geometry).toBe(levels[0])
  at(31);expect(mesh.geometry).toBe(levels[0])
  at(8.1);expect(mesh.geometry).toBe(levels[1])
  // A second camera can render without invoking the registered main updater.
  new THREE.PerspectiveCamera().updateMatrixWorld()
  expect(mesh.geometry).toBe(levels[1])
  root.visible=false
  expect(at(100).switched).toBe(0);expect(mesh.geometry).toBe(levels[1])
})

it('respects world scale, viewport height and custom thresholds',()=>{
  const levels=[1,2,3].map(()=>new THREE.BoxGeometry(1,1,1)),root=new THREE.Group()
  const mesh=new THREE.InstancedMesh(levels[0],new THREE.MeshBasicMaterial(),1)
  mesh.setMatrixAt(0,new THREE.Matrix4());root.add(mesh);root.scale.setScalar(2)
  registerDetailLod(mesh,{levels,center:new THREE.Vector3(),height:1,thresholds:[12,3],hysteresis:0})
  const camera=new THREE.PerspectiveCamera(90,1,.1,1000);camera.position.z=50
  updateDetailLods(root,camera,1000)
  expect(mesh.userData.detailLodPixels).toBeCloseTo(20)
  expect(mesh.geometry).toBe(levels[0])
  updateDetailLods(root,camera,500);expect(mesh.geometry).toBe(levels[1])
  camera.position.z=500;updateDetailLods(root,camera,500);expect(mesh.geometry).toBe(levels[2])
})

it('keeps recognizable finite far figures within the proxy budget and retains paint finishes',()=>{
  for(let variant=0;variant<3;variant++)for(const painted of [false,true]){
    const geometry=guardianProxyGeometry(variant,painted)
    const triangles=geometry.attributes.position.count/3
    expect(triangles).toBeGreaterThanOrEqual(100);expect(triangles).toBeLessThanOrEqual(180)
    for(const name of ['position','normal'])expect(geometry.attributes[name].array.every(Number.isFinite)).toBe(true)
    const size=geometry.boundingBox.getSize(new THREE.Vector3())
    expect(size.y).toBeCloseTo(1.06);expect(size.x).toBeGreaterThan(.4)
    expect(Boolean(geometry.attributes.color)).toBe(painted)
    expect(triangles).toBeLessThan(guardianGeometry(true,variant,painted).attributes.position.count/3/5)
  }
})

it('preserves every original placement, color and global pose across facade partitions and LODs',()=>{
  const assembly=createSculptureInstances(false,{polychrome:true})
  const placements=[[-40,2,0,0,3,'#ef5544'],[40,3,0,Math.PI/2,2,'#44aa66'],[-39,4,0,0,4,'#4488dd'],[-38,2,0,0,3,'#efcc55']]
  for(const p of placements)assembly.place(...p)
  const root=assembly.build(),matrix=new THREE.Matrix4(),expected=new THREE.Matrix4(),q=new THREE.Quaternion()
  expect(root.userData.preserveAssembly).toBe(true)
  expect(root.children.reduce((sum,mesh)=>sum+mesh.count,0)).toBe(placements.length)
  const verify=()=>{
    for(const mesh of root.children){
      expect(mesh.isInstancedMesh).toBe(true);expect(mesh.userData.preserveAssembly).toBe(true)
      for(let i=0;i<mesh.count;i++){
        mesh.getMatrixAt(i,matrix)
        const index=placements.findIndex(p=>Math.abs(p[0]-matrix.elements[12])<1e-5),p=placements[index]
        expect(mesh.userData.guardianVariant).toBe(index%3)
        q.setFromAxisAngle(new THREE.Vector3(0,1,0),p[3]);const k=p[4]/1.06
        expected.compose(new THREE.Vector3(...p.slice(0,3)),q,new THREE.Vector3(k,k,k*.95))
        for(let j=0;j<16;j++)expect(matrix.elements[j]).toBeCloseTo(expected.elements[j],5)
        const actual=new THREE.Color();mesh.getColorAt(i,actual)
        const color=new THREE.Color(p[5]).lerp(new THREE.Color(0xffffff),.94)
        expect(actual.r).toBeCloseTo(color.r,6);expect(actual.g).toBeCloseTo(color.g,6);expect(actual.b).toBeCloseTo(color.b,6)
      }
    }
  }
  verify()
  const camera=new THREE.PerspectiveCamera(60,1,.1,5000);camera.position.z=2000
  expect(updateDetailLods(root,camera,800).proxy).toBe(root.children.length)
  verify()
  camera.position.z=10;updateDetailLods(root,camera,800)
  for(const mesh of root.children)expect(mesh.geometry).toBe(guardianGeometry(false,mesh.userData.guardianVariant,true))
  verify()
})

it('keeps the original lower-detail guardian geometry for near views on phones',()=>{
  const assembly=createSculptureInstances(true);assembly.place(0,0,0,0,3,'#aa8877')
  const root=assembly.build(),camera=new THREE.PerspectiveCamera(60,1,.1,100)
  camera.position.z=5;updateDetailLods(root,camera,844)
  expect(root.children[0].geometry).toBe(guardianGeometry(true,0,false))
})

it('bounds four-facade guardian draw batches to twelve while retaining every placement',()=>{
  const assembly=createSculptureInstances(),placements=[]
  for(let face=0;face<4;face++)for(let tier=0;tier<8;tier++)for(let i=0;i<15;i++){
    const angle=face*Math.PI/2
    const position=new THREE.Vector3((i-7)*5,tier*8,40).applyAxisAngle(new THREE.Vector3(0,1,0),angle)
    const p=[position.x,position.y,position.z,angle,3,'#aa8877']
    placements.push(p);assembly.place(...p)
  }
  const group=assembly.build()
  expect(group.children).toHaveLength(12)
  expect(group.children.reduce((count,mesh)=>count+mesh.count,0)).toBe(placements.length)
  const actual=[],matrix=new THREE.Matrix4()
  for(const mesh of group.children)for(let i=0;i<mesh.count;i++){
    mesh.getMatrixAt(i,matrix)
    actual.push([matrix.elements[12],matrix.elements[13],matrix.elements[14]].map(v=>v.toFixed(4)).join(':'))
  }
  const expected=placements.map(p=>p.slice(0,3).map(v=>v.toFixed(4)).join(':'))
  expect(actual.sort()).toEqual(expected.sort())
})

it('uses a painted intermediate phone figure while preserving the original close sculpture',()=>{
  const assembly=createSculptureInstances(true,{polychrome:true});assembly.place(0,0,0,0,3,'#aa8877')
  const root=assembly.build(),camera=new THREE.PerspectiveCamera(60,1,.1,1000)
  camera.position.z=100;updateDetailLods(root,camera,844)
  const medium=guardianProxyGeometry(0,true,true)
  expect(root.children[0].geometry).toBe(medium)
  expect(medium.attributes.position.count).toBeLessThan(guardianGeometry(true,0,true).attributes.position.count*.65)
  expect(medium.attributes.color.count).toBe(medium.attributes.position.count)
  expect(medium.attributes.position.array.every(Number.isFinite)).toBe(true)
  camera.position.z=10;updateDetailLods(root,camera,844)
  expect(root.children[0].geometry).toBe(guardianGeometry(true,0,true))
})
