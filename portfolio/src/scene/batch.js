import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const matrix=new THREE.Matrix4(),inverse=new THREE.Matrix4(),bounds=new THREE.Box3(),center=new THREE.Vector3()
const shadowKeys=new Set(['noShadow','receiveOnly'])

function protectedNode(node) {
  return node.userData.preserveAssembly||node.animations.length>0||node.name.toLowerCase().includes('rotating beam')||
    Object.values(node.userData).some(value=>typeof value==='function')
}

function eligible(mesh) {
  if(!mesh.isMesh||mesh.isInstancedMesh||mesh.isSkinnedMesh||!mesh.visible||protectedNode(mesh)||mesh.children.length)return false
  const material=mesh.material,g=mesh.geometry
  if(Array.isArray(material)||!material.visible||material.transparent||material.isShaderMaterial||material.onBeforeCompile!==THREE.Material.prototype.onBeforeCompile)return false
  if(mesh.onBeforeRender!==THREE.Object3D.prototype.onBeforeRender||mesh.onAfterRender!==THREE.Object3D.prototype.onAfterRender)return false
  if(Object.keys(mesh.userData).some(key=>!shadowKeys.has(key)))return false
  return !Object.keys(g.morphAttributes).length&&g.drawRange.start===0&&g.drawRange.count===Infinity&&
    Object.values(g.attributes).every(attribute=>!attribute.isInterleavedBufferAttribute)
}

function reflectedWinding(geometry) {
  // Baking a mirrored child removes the renderer's separate front-face reversal.
  // Retain that reversal in all complete corner records.
  for(const attribute of Object.values(geometry.attributes)){
    const {array,itemSize}=attribute
    for(let i=0;i<attribute.count;i+=3)for(let j=0;j<itemSize;j++){
      const a=(i+1)*itemSize+j,b=(i+2)*itemSize+j,value=array[a]
      array[a]=array[b];array[b]=value
    }
  }
}

function merge(root,meshes,spatial) {
  if(meshes.length<2)return
  root.updateWorldMatrix(true,true);inverse.copy(root.matrixWorld).invert()
  const groups=new Map()
  for(const mesh of meshes){
    matrix.multiplyMatrices(inverse,mesh.matrixWorld)
    const schema=Object.entries(mesh.geometry.attributes).sort(([a],[b])=>a.localeCompare(b)).map(([name,a])=>[name,a.itemSize,a.normalized,a.array.constructor.name].join('/')).join(',')
    const state=[mesh.material.uuid,mesh.userData.noShadow,mesh.userData.receiveOnly,mesh.renderOrder,mesh.layers.mask,mesh.castShadow,mesh.receiveShadow,mesh.frustumCulled,schema]
    if(spatial){
      if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox()
      bounds.copy(mesh.geometry.boundingBox).applyMatrix4(matrix);bounds.getCenter(center)
      state.push(Math.floor(center.x/128),Math.floor(center.z/128))
    }
    const key=state.join(':')
    if(!groups.has(key))groups.set(key,[])
    groups.get(key).push({mesh,transform:matrix.clone()})
  }
  for(const entries of groups.values()){
    if(entries.length<2)continue
    const parts=entries.map(({mesh,transform})=>{
      const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone()
      geometry.applyMatrix4(transform)
      if(transform.determinant()<0)reflectedWinding(geometry)
      return geometry
    })
    const geometry=mergeGeometries(parts)
    parts.forEach(part=>part.dispose())
    if(!geometry)continue
    geometry.computeBoundingBox();geometry.computeBoundingSphere()
    const first=entries[0].mesh,batch=new THREE.Mesh(geometry,first.material)
    batch.name='Static architecture batch';batch.userData={...first.userData}
    batch.renderOrder=first.renderOrder;batch.layers.mask=first.layers.mask
    batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;batch.frustumCulled=first.frustumCulled
    for(const {mesh} of entries)mesh.removeFromParent()
    root.add(batch)
  }
}

// Cross descendant boundaries only for explicitly approved static architecture.
// Unmarked scene/exhibit groups retain the existing sibling-only behavior.
export function batchStaticMeshes(root) {
  if(protectedNode(root)||!root.visible)return
  if(root.userData.staticBatchRoot){
    const meshes=[]
    const collect=node=>{
      for(const child of [...node.children]){
        if(protectedNode(child)||!child.visible||child.isInstancedMesh)continue
        if(child.isMesh){if(eligible(child))meshes.push(child);continue}
        // Do not bake geometry across animated billboard/sprite hierarchies.
        if(child.isSprite||child.isPoints||child.isLine)continue
        collect(child)
      }
    }
    collect(root);merge(root,meshes,true)
  }else{
    for(const child of [...root.children])batchStaticMeshes(child)
    merge(root,root.children.filter(eligible),false)
  }
}
