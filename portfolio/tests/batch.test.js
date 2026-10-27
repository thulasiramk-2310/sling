import {it,expect} from 'vitest'
import * as THREE from 'three'
import {batchStaticMeshes} from '../src/scene/batch.js'
import {createRathas} from '../src/scene/landmarks/rathas.js'

const stats=root=>{let draws=0,triangles=0;root.traverse(o=>{if(o.isMesh){draws++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.count??1)}});return {draws,triangles}}

it('reduces actual nested Pancha Rathas draws while preserving geometry and world bounds',()=>{
  const root=createRathas(new THREE.MeshStandardMaterial())
  root.position.set(13,2,-30);root.rotation.y=.3
  const before=stats(root),bounds=new THREE.Box3().setFromObject(root,true)
  batchStaticMeshes(root)
  const after=stats(root),result=new THREE.Box3().setFromObject(root,true)
  expect(before.draws).toBe(44);expect(after.draws).toBeLessThanOrEqual(12)
  expect(after.triangles).toBe(before.triangles)
  expect(result.min.distanceTo(bounds.min)).toBeLessThan(1e-4)
  expect(result.max.distanceTo(bounds.max)).toBeLessThan(1e-4)
})

it('preserves nested rotated/mirrored surfaces, UVs and front-face ray intersections',()=>{
  const root=new THREE.Group();root.userData.staticBatchRoot=true;root.position.set(11,3,-8)
  const material=new THREE.MeshBasicMaterial(),groups=[]
  for(let i=0;i<2;i++){
    const group=new THREE.Group();group.position.set(2+i*4,1,-2);group.scale.x=i?-1:1
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material)
    group.add(mesh);root.add(group);groups.push(group)
  }
  root.updateMatrixWorld(true)
  const ray=new THREE.Raycaster(new THREE.Vector3(13,4,10),new THREE.Vector3(0,0,-1))
  const before=ray.intersectObject(root,true).map(hit=>({p:hit.point.clone(),uv:hit.uv.clone()}))
  const points=[];root.traverse(o=>{if(o.isMesh)for(let i=0;i<o.geometry.attributes.position.count;i++)points.push(new THREE.Vector3().fromBufferAttribute(o.geometry.attributes.position,i).applyMatrix4(o.matrixWorld))})
  batchStaticMeshes(root);root.updateMatrixWorld(true)
  const after=ray.intersectObject(root,true)
  expect(after.length).toBe(before.length)
  for(let i=0;i<after.length;i++){expect(after[i].point.distanceTo(before[i].p)).toBeLessThan(1e-5);expect(after[i].uv.distanceTo(before[i].uv)).toBeLessThan(1e-5)}
  expect(root.children.includes(groups[0])).toBe(true)
  const batch=root.children.find(o=>o.isMesh)
  expect(batch.material).toBe(material)
  for(const point of points){const local=point.clone().applyMatrix4(root.matrixWorld.clone().invert()),p=batch.geometry.attributes.position;expect(Array.from({length:p.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(p,i).distanceTo(local)).some(d=>d<1e-5)).toBe(true)}
  const p=batch.geometry.attributes.position,n=batch.geometry.attributes.normal
  for(let i=0;i<p.count;i+=3){const a=new THREE.Vector3().fromBufferAttribute(p,i),b=new THREE.Vector3().fromBufferAttribute(p,i+1),c=new THREE.Vector3().fromBufferAttribute(p,i+2);expect(b.sub(a).cross(c.sub(a)).dot(new THREE.Vector3().fromBufferAttribute(n,i))).toBeGreaterThan(0)}
})

it('keeps material identity, render layers, exact shadow states and distant cell bounds separate',()=>{
  const root=new THREE.Group();root.userData.staticBatchRoot=true
  const material=new THREE.MeshStandardMaterial(),other=material.clone()
  const states=[{material,cast:true,layer:1,x:0},{material,cast:false,layer:1,x:10},{material,cast:true,layer:2,x:20},{material:other,cast:true,layer:1,x:30},{material,cast:true,layer:1,x:300}]
  for(const state of states)for(let i=0;i<3;i++){
    const group=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(),state.material)
    group.position.x=state.x+i;mesh.castShadow=state.cast;mesh.receiveShadow=true;mesh.layers.mask=state.layer;group.add(mesh);root.add(group)
  }
  batchStaticMeshes(root)
  const batches=root.children.filter(o=>o.isMesh)
  expect(batches).toHaveLength(states.length)
  expect(batches.filter(o=>o.material===other)).toHaveLength(1)
  expect(batches.filter(o=>!o.castShadow)).toHaveLength(1)
  expect(batches.filter(o=>o.layers.mask===2)).toHaveLength(1)
  for(const mesh of batches)expect(mesh.geometry.boundingBox.max.x-mesh.geometry.boundingBox.min.x).toBeLessThan(4)
})

it('retains hero, LOD, transparent, animated and interactive objects by identity',()=>{
  const root=new THREE.Group();root.userData.staticBatchRoot=true
  const material=new THREE.MeshStandardMaterial(),make=()=>new THREE.Mesh(new THREE.BoxGeometry(),material)
  const hero=make();hero.name='Great Nandi beneath the mandapam';hero.userData.preserveAssembly=true
  const lod=new THREE.Group();lod.userData.preserveAssembly=true;lod.add(make(),make())
  const animated=new THREE.Group();animated.userData.update=()=>{};animated.add(make(),make())
  const transparent=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({transparent:true}))
  const target=make();target.userData.project=0
  const billboard=new THREE.Sprite();billboard.add(make())
  root.add(hero,lod,animated,transparent,target,billboard,make(),make())
  batchStaticMeshes(root)
  for(const o of [hero,lod,animated,transparent,target,billboard])expect(root.children.includes(o)).toBe(true)
  expect(lod.children).toHaveLength(2);expect(animated.children).toHaveLength(2);expect(billboard.children).toHaveLength(1)
})
