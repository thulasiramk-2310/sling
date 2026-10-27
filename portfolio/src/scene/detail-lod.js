import * as THREE from 'three'

// Updated explicitly by the main camera. Reflection/shadow renders never
// change the chosen geometry. Weak registries avoid retaining discarded worlds.
const registry=new WeakMap(),roots=new WeakMap()
let version=0
const centerWorld=new THREE.Vector3(),centerView=new THREE.Vector3()

export function registerDetailLod(mesh,{levels,center,height,thresholds=[32,8],hysteresis=.15}) {
  if(levels.length!==3||!(height>0)||thresholds[0]<=thresholds[1]||thresholds[1]<=0)throw new Error('Detail LOD requires three levels, a positive height and descending thresholds')
  const detail={mesh,levels,center:center.clone(),height,thresholds,hysteresis:THREE.MathUtils.clamp(hysteresis,0,.4),level:null}
  registry.set(mesh,detail);version++
  mesh.userData.preserveAssembly=true
  return detail
}

function visibleUnder(mesh,root) {
  for(let node=mesh;node;node=node.parent){
    if(!node.visible)return false
    if(node===root)return true
  }
  return false
}

export function updateDetailLods(root,camera,cssHeight) {
  const counts={full:0,low:0,proxy:0,switched:0}
  if(!(cssHeight>0))return counts
  let cache=roots.get(root)
  if(!cache||cache.version!==version){
    const entries=[]
    root.traverse(object=>{const detail=registry.get(object);if(detail)entries.push(detail)})
    cache={version,entries};roots.set(root,cache)
  }
  camera.updateWorldMatrix(true,false)
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert()
  for(const detail of cache.entries){
    const {mesh,levels,center,height,thresholds:[near,far],hysteresis:h}=detail
    if(!visibleUnder(mesh,root))continue
    mesh.updateWorldMatrix(true,false)
    centerWorld.copy(center).applyMatrix4(mesh.matrixWorld)
    centerView.copy(centerWorld).applyMatrix4(camera.matrixWorldInverse)
    const scale=mesh.matrixWorld.getMaxScaleOnAxis()
    const depth=camera.isOrthographicCamera?1:-centerView.z
    const pixels=depth>0?height*scale*Math.abs(camera.projectionMatrix.elements[5])*cssHeight/(2*depth):0
    let level=detail.level
    if(level===null)level=pixels>=near?0:pixels>=far?1:2
    else if(level===0){if(pixels<far*(1-h))level=2;else if(pixels<near*(1-h))level=1}
    else if(level===1){if(pixels>=near)level=0;else if(pixels<far*(1-h))level=2}
    else if(pixels>=near)level=0
    else if(pixels>=far)level=1
    if(level!==detail.level){
      mesh.geometry=levels[level]
      mesh.boundingSphere=null;mesh.boundingBox=null
      mesh.computeBoundingSphere?.();mesh.computeBoundingBox?.()
      detail.level=level;counts.switched++
    }
    mesh.userData.detailLodLevel=level
    mesh.userData.detailLodPixels=pixels
    counts[['full','low','proxy'][level]]++
  }
  return counts
}
