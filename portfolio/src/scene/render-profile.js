import * as THREE from 'three'

// Explicit debug query only. Estimates visible primary-pass geometry; renderer
// counters separately include reflection, shadow and post-processing passes.
export function renderProfile(scene,camera) {
  const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse))
  const rows=[]
  scene.traverseVisible(object=>{
    if(!object.isMesh || !object.geometry || !camera.layers.test(object.layers))return
    const materials=Array.isArray(object.material)?object.material:[object.material]
    if(materials.every(material=>!material.visible))return
    if(object.frustumCulled && !frustum.intersectsObject(object))return
    const geometry=object.geometry
    const count=Math.min(geometry.index?.count??geometry.attributes.position.count,geometry.drawRange.count)
    const instances=object.isInstancedMesh?object.count:1,triangles=count/3*instances
    if(!triangles)return
    const names=[];let parent=object
    while(parent && names.length<5){if(parent.name)names.unshift(parent.name);parent=parent.parent}
    rows.push({name:names.join(' / ')||object.type,geometry:geometry.name||geometry.type,instances,geometryTriangles:count/3,triangles,
      ...(Number.isInteger(object.userData.detailLodLevel)?{detailLevel:object.userData.detailLodLevel,pixels:object.userData.detailLodPixels}:{})})
  })
  const detail=rows.filter(row=>Number.isInteger(row.detailLevel))
  return {primaryPassTriangles:rows.reduce((sum,row)=>sum+row.triangles,0),meshes:rows.length,
    detailLevels:[0,1,2].map(level=>({level,meshes:detail.filter(row=>row.detailLevel===level).length,instances:detail.filter(row=>row.detailLevel===level).reduce((sum,row)=>sum+row.instances,0)})),
    largest:rows.sort((a,b)=>b.triangles-a.triangles).slice(0,20)}
}
