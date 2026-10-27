import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// Small original seated architectural figures for the upper register of each
// painted tier. Low polygon count preserves the silhouette on phone renderers.
// These are decorative studies, not claims of exact historical iconography.
export function reliefFigureGeometry() {
  const parts=[]
  const add=(geometry,position,color,scale=[1,1,1])=>{
    geometry.scale(...scale);geometry.translate(...position)
    const tint=new THREE.Color(color),count=geometry.attributes.position.count,colors=new Float32Array(count*3)
    for(let i=0;i<count;i++)colors.set(tint.toArray(),i*3)
    geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));parts.push(geometry)
  }
  const skin='#bda185',cloth='#889f99',gold='#bd9b60'
  add(new THREE.CylinderGeometry(.2,.26,.09,6),[0,.045,0],gold)
  add(new THREE.SphereGeometry(1,6,4),[0,.17,.02],cloth,[.28,.12,.14])
  add(new THREE.CylinderGeometry(.18,.12,.28,6),[0,.39,0],skin)
  add(new THREE.CylinderGeometry(.151,.139,.045,6),[0,.345,0],gold)
  add(new THREE.SphereGeometry(1,6,4),[0,.64,0],skin,[.115,.145,.1])
  add(new THREE.ConeGeometry(.12,.23,6),[0,.87,0],gold)
  for(const side of [-1,1]){
    const arm=new THREE.CylinderGeometry(.035,.045,.3,5);arm.rotateZ(side*.55)
    add(arm,[side*.21,.34,.025],skin)
    add(new THREE.SphereGeometry(.04,5,3),[side*.26,.21,.08],skin)
  }
  // ConeGeometry points along +Y. Turn the nose toward the facade (+Z),
  // otherwise its tip runs vertically up the face like a second crown.
  const nose=new THREE.ConeGeometry(.025,.075,5)
  nose.rotateX(Math.PI/2)
  add(nose,[0,.635,.105],skin)
  for(const side of [-1,1])add(new THREE.SphereGeometry(1,4,2),[side*.041,.669,.087],'#514a41',[.014,.01,.012])
  const normalized=parts.map(g=>g.index?g.toNonIndexed():g),geometry=mergeGeometries(normalized)
  for(const part of normalized)part.dispose()
  for(const part of parts)part.dispose()
  geometry.computeBoundingSphere();return geometry
}

export function createTierReliefs(low) {
  const placements=[]
  return {
    place(position,angle,height,color){placements.push({position,angle,height,color})},
    build(){
      const material=low?new THREE.MeshLambertMaterial({vertexColors:true}):new THREE.MeshStandardMaterial({vertexColors:true,roughness:.93})
      const mesh=new THREE.InstancedMesh(reliefFigureGeometry(),material,placements.length)
      mesh.name='Small seated stucco reliefs'
      const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3()
      for(const [i,p] of placements.entries()){
        rotation.setFromAxisAngle(new THREE.Vector3(0,1,0),p.angle)
        matrix.compose(p.position,rotation,scale.setScalar(p.height))
        mesh.setMatrixAt(i,matrix)
        mesh.setColorAt(i,new THREE.Color(p.color).lerp(new THREE.Color('#ffffff'),.65))
      }
      mesh.castShadow=mesh.receiveShadow=!low;mesh.computeBoundingSphere();return mesh
    },
  }
}
