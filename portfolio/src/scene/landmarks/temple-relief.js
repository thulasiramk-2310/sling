import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { registerDetailLod } from '../detail-lod.js'

const figureCache=new Map()

// Small original seated architectural figures for the upper register of each
// painted tier. Low polygon count preserves the silhouette on phone renderers.
// These are decorative studies, not claims of exact historical iconography.
export function reliefFigureGeometry(detail=0,low=false) {
  const key=detail===0?`near:${low}`:`detail:${detail}`
  if(figureCache.has(key))return figureCache.get(key)
  const parts=[]
  const add=(geometry,position,color,scale=[1,1,1])=>{
    geometry.scale(...scale);geometry.translate(...position)
    const tint=new THREE.Color(color),count=geometry.attributes.position.count,colors=new Float32Array(count*3)
    for(let i=0;i<count;i++)colors.set(tint.toArray(),i*3)
    geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));parts.push(geometry)
  }
  const skin='#bda185',cloth='#889f99',gold='#bd9b60'
  if(detail===2){
    // Below eight CSS pixels retain six separate volumes: plinth, folded
    // legs, tapered chest, head, crown and two descending arms. No billboard.
    add(new THREE.BoxGeometry(.52,.09,.52),[0,.045,0],gold)
    add(new THREE.OctahedronGeometry(1),[0,.17,.02],cloth,[.28,.12,.14])
    const torso=new THREE.BoxGeometry(1,1,1),vertices=torso.attributes.position
    for(let i=0;i<vertices.count;i++){
      const top=vertices.getY(i)>0
      vertices.setXYZ(i,vertices.getX(i)*(top?.36:.24),vertices.getY(i)*.28,vertices.getZ(i)*(top?.30:.22))
    }
    torso.computeVertexNormals();add(torso,[0,.39,0],skin)
    add(new THREE.OctahedronGeometry(1),[0,.64,0],skin,[.115,.145,.1])
    add(new THREE.ConeGeometry(.12,.23,3),[0,.87,0],gold)
    for(const side of [-1,1]){
      const corners=[new THREE.Vector3(side*.17,.49,-.045),new THREE.Vector3(side*.324889,.22,0),new THREE.Vector3(side*.26,.21,.08),new THREE.Vector3(side*.19,.45,.075)]
      const positions=[],center=corners.reduce((sum,p)=>sum.add(p),new THREE.Vector3()).multiplyScalar(.25)
      for(const face of [[0,1,2],[0,3,1],[0,2,3],[1,3,2]]){
        const [a,b,c]=face.map(index=>corners[index])
        const normal=new THREE.Vector3().subVectors(b,a).cross(new THREE.Vector3().subVectors(c,a))
        for(const p of normal.dot(a.clone().sub(center))>0?[a,b,c]:[a,c,b])positions.push(p.x,p.y,p.z)
      }
      const arm=new THREE.BufferGeometry();arm.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
      arm.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(positions.length/3*2),2));arm.computeVertexNormals()
      add(arm,[0,0,0],skin)
    }
  }else{
    const medium=detail===1,segments=medium?4:6,rows=medium||low?3:4
    add(new THREE.CylinderGeometry(.2,.26,.09,segments),[0,.045,0],gold)
    add(new THREE.SphereGeometry(1,segments,rows),[0,.17,.02],cloth,[.28,.12,.14])
    add(new THREE.CylinderGeometry(.18,.12,.28,segments),[0,.39,0],skin)
    add(new THREE.CylinderGeometry(.151,.139,.045,segments),[0,.345,0],gold)
    add(new THREE.SphereGeometry(1,segments,rows),[0,.64,0],skin,[.115,.145,.1])
    add(new THREE.ConeGeometry(.12,.23,segments),[0,.87,0],gold)
    for(const side of [-1,1]){
      const arm=new THREE.CylinderGeometry(.035,.045,.3,medium?3:low?4:5);arm.rotateZ(side*.55)
      add(arm,[side*.21,.34,.025],skin)
      add(medium?new THREE.OctahedronGeometry(.04):new THREE.SphereGeometry(.04,5,3),[side*.26,.21,.08],skin)
    }
    if(!medium){
      // ConeGeometry points along +Y. Turn the nose toward the facade (+Z).
      const nose=new THREE.ConeGeometry(.025,.075,5);nose.rotateX(Math.PI/2)
      add(nose,[0,.635,.105],skin)
      if(!low)for(const side of [-1,1])add(new THREE.SphereGeometry(1,4,2),[side*.041,.669,.087],'#514a41',[.014,.01,.012])
    }
  }
  const normalized=parts.map(g=>g.index?g.toNonIndexed():g),geometry=mergeGeometries(normalized)
  for(const part of new Set([...parts,...normalized]))part.dispose()
  geometry.computeBoundingBox()
  if(detail!==0||low){
    // Preserve the original ornament envelope and its foot/crown elevations.
    // Coarser angular sampling otherwise shortens the head and seated legs.
    const target=reliefFigureGeometry().boundingBox,size=geometry.boundingBox.getSize(new THREE.Vector3()),targetSize=target.getSize(new THREE.Vector3())
    const center=geometry.boundingBox.getCenter(new THREE.Vector3()),targetCenter=target.getCenter(new THREE.Vector3())
    geometry.translate(-center.x,-center.y,-center.z)
    geometry.scale(targetSize.x/size.x,targetSize.y/size.y,targetSize.z/size.z)
    geometry.translate(targetCenter.x,targetCenter.y,targetCenter.z)
    geometry.computeBoundingBox()
  }
  geometry.computeBoundingSphere();figureCache.set(key,geometry);return geometry
}

export function createTierReliefs(low) {
  const placements=[]
  return {
    place(position,angle,height,color){placements.push({position,angle,height,color})},
    build(){
      const group=new THREE.Group();group.name='Small seated stucco reliefs'
      group.userData.preserveAssembly=true
      if(!placements.length)return group
      const material=low?new THREE.MeshLambertMaterial({vertexColors:true}):new THREE.MeshStandardMaterial({vertexColors:true,roughness:.93})
      const levels=[reliefFigureGeometry(0,low),reliefFigureGeometry(1),reliefFigureGeometry(2)]
      const facades=new Map()
      for(const p of placements){
        const face=((Math.round(p.angle/(Math.PI/2))%4)+4)%4
        if(!facades.has(face))facades.set(face,[])
        facades.get(face).push(p)
      }
      const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3()
      for(const [face,subset] of facades){
        const mesh=new THREE.InstancedMesh(levels[0],material,subset.length)
        mesh.name='Small seated stucco reliefs — facade '+face
        for(const [i,p] of subset.entries()){
          rotation.setFromAxisAngle(new THREE.Vector3(0,1,0),p.angle)
          matrix.compose(p.position,rotation,scale.setScalar(p.height))
          mesh.setMatrixAt(i,matrix)
          mesh.setColorAt(i,new THREE.Color(p.color).lerp(new THREE.Color('#ffffff'),.65))
        }
        mesh.castShadow=mesh.receiveShadow=!low
        mesh.computeBoundingBox();mesh.computeBoundingSphere();group.add(mesh)
        const height=Math.max(...subset.map(p=>p.height))*(levels[0].boundingBox.max.y-levels[0].boundingBox.min.y)
        registerDetailLod(mesh,{levels,center:mesh.boundingSphere.center,height,thresholds:[28,8]})
      }
      return group
    },
  }
}
