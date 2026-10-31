import * as THREE from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {rng,surface} from '../util.js'
import {quality} from '../quality.js'

// Original small coastal shade trees. Crowns are open arrangements of actual
// ridged leaves; no opaque spheres or billboard foliage enclose the branches.
export function createArrivalTrees() {
  const root=new THREE.Group();root.name='Station forecourt shade trees'
  const random=rng(731),up=new THREE.Vector3(0,1,0),rotation=new THREE.Quaternion()
  const matrix=new THREE.Matrix4(),color=new THREE.Color(),parts=[]
  const low=quality.low,leavesPerCluster=low?18:46,clustersPerTree=low?40:64
  const vertices=[],colors=[]
  const leafPoints=[[0,0,0],[-.055,0,.10],[0,.016,.13],[.055,0,.10],[0,-.005,.26]]
  const corners=[0,1,2,0,2,3,2,1,4,2,4,3]
  for(let leaf=0;leaf<leavesPerCluster;leaf++) {
    const yaw=random()*Math.PI*2,tilt=(random()-.5)*1.2,roll=(random()-.5)*1.2
    const pose=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(tilt,yaw,roll))
    const position=new THREE.Vector3((random()-.5)*1.35,(random()-.5)*.8,(random()-.5)*1.35)
    const scale=.75+random()*.55
    color.setHSL(.22+random()*.045,.24+random()*.15,.17+random()*.12)
    for(const corner of corners){
      const point=new THREE.Vector3(...leafPoints[corner]).multiplyScalar(scale).applyMatrix4(pose).add(position)
      vertices.push(point.x,point.y,point.z);colors.push(color.r,color.g,color.b)
    }
  }
  const leafGeometry=new THREE.BufferGeometry()
  leafGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3))
  leafGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  leafGeometry.computeVertexNormals();leafGeometry.computeBoundingSphere()
  const foliage=new THREE.InstancedMesh(leafGeometry,surface({color:0xffffff,vertexColors:true,roughness:.87,side:THREE.DoubleSide}),clustersPerTree*6)
  foliage.name='Individual pointed leaves in open branching crowns'
  const branch=(a,b,base,tip)=>{
    const direction=b.clone().sub(a),geometry=new THREE.CylinderGeometry(tip,base,direction.length(),low?6:8)
    rotation.setFromUnitVectors(up,direction.clone().normalize())
    geometry.applyMatrix4(matrix.compose(a.clone().add(b).multiplyScalar(.5),rotation,new THREE.Vector3(1,1,1)))
    parts.push(geometry)
  }
  let instance=0
  for(const side of [-1,1])for(const z of [-22,0,22]) {
    const center=new THREE.Vector3(side*29,.83,z),lean=(random()-.5)*.55
    const stems=[new THREE.Vector3(0,0,0),new THREE.Vector3(.10,.85,.03),new THREE.Vector3(lean,1.9,.12),new THREE.Vector3(lean+.18,3.15,.04),new THREE.Vector3(lean-.08,4.7,.15)]
    for(let i=0;i<stems.length-1;i++)branch(stems[i].clone().add(center),stems[i+1].clone().add(center),.20-i*.037,.165-i*.038)
    const limbs=low?5:7
    for(let limb=0;limb<limbs;limb++){
      const angle=limb/limbs*Math.PI*2+random()*.5,radius=1.5+random()*.7
      const from=stems[2+limb%2].clone().add(center)
      const elbow=new THREE.Vector3(Math.cos(angle)*radius*.62,4.7+random()*.5,Math.sin(angle)*radius*.62).add(center)
      const tip=new THREE.Vector3(Math.cos(angle)*radius,5.5+random()*.8,Math.sin(angle)*radius).add(center)
      branch(from,elbow,.075,.043);branch(elbow,tip,.043,.012)
      if(!low){
        const fork=tip.clone().add(new THREE.Vector3(Math.cos(angle+.7)*.65,.25,Math.sin(angle+.7)*.65))
        branch(elbow,fork,.027,.007)
      }
    }
    for(let cluster=0;cluster<clustersPerTree;cluster++){
      const angle=random()*Math.PI*2,radius=Math.sqrt(random()),azimuth=random()*Math.PI*2
      const position=new THREE.Vector3(Math.cos(angle)*radius*2.55,5.55+Math.sin(azimuth)*Math.sqrt(1-radius*radius)*1.55,Math.sin(angle)*radius*2.55).add(center)
      rotation.setFromEuler(new THREE.Euler((random()-.5)*.45,random()*Math.PI*2,(random()-.5)*.45))
      const scale=.85+random()*.45
      foliage.setMatrixAt(instance,matrix.compose(position,rotation,new THREE.Vector3(scale,scale,scale)))
      color.setRGB(.85+random()*.22,.90+random()*.17,.78+random()*.25)
      foliage.setColorAt(instance++,color)
    }
  }
  const expanded=parts.map(part=>part.toNonIndexed()),barkGeometry=mergeGeometries(expanded)
  for(const part of [...parts,...expanded])part.dispose()
  const bark=new THREE.Mesh(barkGeometry,surface({color:0x706c54,roughness:.98}))
  bark.name='Tapered trunks and open forked branches'
  foliage.computeBoundingSphere();root.add(bark,foliage)
  return root
}
