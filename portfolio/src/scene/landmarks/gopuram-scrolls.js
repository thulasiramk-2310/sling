import * as THREE from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {registerDetailLod} from '../detail-lod.js'

// Original foliate architectural study, without a deity or historical identity.
// Its upright XY silhouette faces +Z; all three levels are closed 3D volumes.
const cache=new Map()
const paint={blue:'#63828a',oxide:'#a46e5d',lime:'#c9bea3'}

function solid(positions,indices) {
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  // Keep authored closed components outward facing, including mirrored leaves.
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3()
  let volume=0
  for(let i=0;i<indices.length;i+=3){
    a.fromArray(positions,indices[i]*3);b.fromArray(positions,indices[i+1]*3);c.fromArray(positions,indices[i+2]*3)
    volume+=a.dot(b.cross(c))/6
  }
  if(volume<0)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]]
  geometry.setIndex(indices);geometry.computeVertexNormals();return geometry
}

function tetra(corners) {
  return solid(corners.flat(),[0,1,2,0,3,1,0,2,3,1,3,2])
}

function ornamentGeometry(detail) {
  if(cache.has(detail))return cache.get(detail)
  const parts=[]
  const add=(geometry,color)=>{
    geometry.deleteAttribute('uv')
    const tint=new THREE.Color(paint[color]),colors=new Float32Array(geometry.attributes.position.count*3)
    for(let i=0;i<colors.length;i+=3)tint.toArray(colors,i)
    geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));parts.push(geometry)
  }
  const leaf=(side,outer=false)=>{
    const base=new THREE.Vector3(side*(outer?.075:.025),outer?.28:.34,.105)
    const control=new THREE.Vector3(side*(outer?.34:.13),outer?.45:.66,.13)
    const tip=new THREE.Vector3(side*(outer?.35:.21),outer?.76:.91,.10)
    if(side===0){control.set(-.025,.70,.13);tip.set(0,1,.10)}
    const path=new THREE.QuadraticBezierCurve3(base,control,tip)
    const positions=[...base.toArray()],indices=[],rings=detail===0?3:1
    for(let row=0;row<rings;row++){
      const t=rings===1?.52:.2+row*.3,center=path.getPoint(t),tangent=path.getTangent(t)
      const across=new THREE.Vector3(tangent.y,-tangent.x,0).normalize()
      const width=(side===0?.085:outer?.065:.058)*Math.sin(Math.PI*t)
      const thickness=.055*Math.sin(Math.PI*t)
      for(const [lateral,depth] of [[width,0],[0,thickness],[-width,0],[0,-thickness]]){
        const p=center.clone().addScaledVector(across,lateral);p.z+=depth;positions.push(p.x,p.y,p.z)
      }
      if(row===0)for(let edge=0;edge<4;edge++)indices.push(0,1+edge,1+(edge+1)%4)
      if(row>0)for(let edge=0;edge<4;edge++){
        const a=1+(row-1)*4+edge,b=1+(row-1)*4+(edge+1)%4,c=1+row*4+edge,d=1+row*4+(edge+1)%4
        indices.push(a,c,b,b,c,d)
      }
    }
    const end=positions.length/3;positions.push(...tip.toArray())
    for(let edge=0;edge<4;edge++)indices.push(end,1+(rings-1)*4+(edge+1)%4,1+(rings-1)*4+edge)
    add(solid(positions,indices),side===0||outer?'blue':'oxide')
  }
  const scroll=side=>{
    const path=new THREE.CurvePath()
    path.add(new THREE.CubicBezierCurve3(new THREE.Vector3(side*.04,.12,.10),new THREE.Vector3(side*.34,.18,.10),new THREE.Vector3(side*.34,.46,.10),new THREE.Vector3(side*.17,.48,.10)))
    path.add(new THREE.CubicBezierCurve3(new THREE.Vector3(side*.17,.48,.10),new THREE.Vector3(side*.04,.49,.10),new THREE.Vector3(side*.11,.33,.10),new THREE.Vector3(side*.21,.36,.10)))
    const segments=detail===0?6:3,positions=[],indices=[]
    for(let row=0;row<=segments;row++){
      const t=row/segments,center=path.getPoint(t),tangent=path.getTangent(t)
      const across=new THREE.Vector3(tangent.y,-tangent.x,0).normalize(),radius=.028*(1-.42*t)
      for(let edge=0;edge<3;edge++){
        const angle=edge/3*Math.PI*2,p=center.clone().addScaledVector(across,Math.cos(angle)*radius)
        p.z+=Math.sin(angle)*radius;positions.push(p.x,p.y,p.z)
      }
      if(row>0)for(let edge=0;edge<3;edge++){
        const a=(row-1)*3+edge,b=(row-1)*3+(edge+1)%3,c=row*3+edge,d=row*3+(edge+1)%3
        indices.push(a,c,b,b,c,d)
      }
    }
    indices.push(0,1,2,segments*3,segments*3+2,segments*3+1)
    add(solid(positions,indices),'lime')
  }
  if(detail===2){
    // Three pointed leaves and a raised flower survive at less than six pixels.
    add(tetra([[0,.31,.04],[0,1,.10],[-.075,.58,.10],[.075,.58,.23]]),'blue')
    for(const side of [-1,1])add(tetra([[side*.04,.28,.04],[side*.35,.76,.12],[side*.14,.47,.045],[side*.24,.50,.24]]),'oxide')
    const flower=new THREE.OctahedronGeometry(1);flower.scale(.12,.12,.09);flower.translate(0,.28,.185);add(flower,'lime')
    add(tetra([[-.12,0,0],[.12,0,.02],[0,.11,.09],[0,0,.14]]),'lime')
  }else{
    leaf(0)
    for(const side of [-1,1]){
      leaf(side,true)
      if(detail===0)leaf(side)
      scroll(side)
    }
    if(detail===0){
      const positions=[0,.28,.23,0,.28,.08],indices=[]
      for(let petal=0;petal<12;petal++){
        const angle=petal/12*Math.PI*2,radius=petal%2?.10:.14
        positions.push(Math.sin(angle)*radius,.28+Math.cos(angle)*radius,.15)
      }
      for(let petal=0;petal<12;petal++)indices.push(0,2+petal,2+(petal+1)%12,1,2+(petal+1)%12,2+petal)
      add(solid(positions,indices),'oxide')
      const boss=new THREE.OctahedronGeometry(1);boss.scale(.055,.055,.025);boss.translate(0,.28,.25);add(boss,'lime')
      const base=new THREE.BoxGeometry(.24,.08,.14);base.translate(0,.04,.07);add(base,'lime')
    }else{
      const flower=new THREE.OctahedronGeometry(1);flower.scale(.12,.12,.07);flower.translate(0,.28,.205);add(flower,'oxide')
      add(solid([-.12,0,0,.12,0,0,0,.11,0,-.12,0,.14,.12,0,.14,0,.11,.14],[0,2,1,3,4,5,0,1,3,1,4,3,1,2,4,2,5,4,2,0,5,0,3,5]),'lime')
    }
  }
  const normalized=parts.map(part=>part.index?part.toNonIndexed():part),geometry=mergeGeometries(normalized)
  for(const part of new Set([...parts,...normalized]))part.dispose()
  geometry.computeBoundingBox()
  // Every level shares the same physical envelope and placement elevation.
  const box=geometry.boundingBox,size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3())
  geometry.translate(-center.x,-box.min.y,-box.min.z)
  geometry.scale(.7/size.x,1/size.y,.275/size.z)
  geometry.computeBoundingBox();geometry.computeBoundingSphere();cache.set(detail,geometry)
  return geometry
}

export function createGopuramScrolls(low=false) {
  const placements=[]
  return {
    place(position,angle,height,color){placements.push({position,angle,height,color})},
    build(){
      const group=new THREE.Group();group.name='Original foliate stucco palmettes'
      group.userData.preserveAssembly=true
      if(!placements.length)return group
      const material=low?new THREE.MeshLambertMaterial({vertexColors:true}):new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94})
      const levels=[0,1,2].map(ornamentGeometry),facades=new Map()
      for(const p of placements){
        const face=((Math.round(p.angle/(Math.PI/2))%4)+4)%4
        if(!facades.has(face))facades.set(face,[])
        facades.get(face).push(p)
      }
      const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3(),up=new THREE.Vector3(0,1,0)
      for(const [face,subset] of facades){
        const mesh=new THREE.InstancedMesh(levels[0],material,subset.length)
        mesh.name='Foliate stucco palmettes — facade '+face
        for(const [i,p] of subset.entries()){
          matrix.compose(p.position,rotation.setFromAxisAngle(up,p.angle),scale.setScalar(p.height));mesh.setMatrixAt(i,matrix)
          mesh.setColorAt(i,new THREE.Color(p.color).lerp(new THREE.Color(0xffffff),.90))
        }
        mesh.castShadow=mesh.receiveShadow=!low
        mesh.computeBoundingBox();mesh.computeBoundingSphere();group.add(mesh)
        registerDetailLod(mesh,{levels,center:mesh.boundingSphere.center,height:Math.max(...subset.map(p=>p.height)),thresholds:[18,6]})
      }
      return group
    },
  }
}
