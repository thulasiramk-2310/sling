import * as THREE from 'three'
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js'
import { combineStone } from './stonework.js'

const cache=new Map()
export function nandiGeometry(low=false) {
  if(cache.has(low)) return cache.get(low)
  const resolution=low?36:68
  const temporary=new THREE.MeshBasicMaterial()
  const volume=new MarchingCubes(resolution,temporary,false,false,50000)
  volume.isolation=0
  const forms=[[-.45,1.05,0,1.65,.85,.82],[-1.4,.7,0,.8,.65,.80],[.55,1.8,0,.60,.72,.64],[1.20,1.45,0,.55,.9,.58],[1.75,2.08,0,.57,.54,.46],[2.16,1.90,0,.54,.30,.39]]
  for(const s of [-1,1]) forms.push([.75,.27,s*.68,1.0,.25,.29],[-1.35,.33,s*.64,.69,.30,.32])
  for(let z=0;z<resolution;z++) for(let y=0;y<resolution;y++) for(let x=0;x<resolution;x++) {
    const px=(x/resolution*2-1)*3.3,py=(y/resolution*2-1)*3.3+1.4,pz=(z/resolution*2-1)*3.3
    let distance=99
    for(const [cx,cy,cz,rx,ry,rz] of forms) {
      const dx=(px-cx)/rx,dy=(py-cy)/ry,dz=(pz-cz)/rz
      const d=(Math.sqrt(dx*dx+dy*dy+dz*dz)-1)*Math.min(rx,ry,rz)
      const h=Math.max(.14-Math.abs(distance-d),0)/.14
      distance=Math.min(distance,d)-h*h*.035
    }
    volume.field[x+y*resolution+z*resolution*resolution]=-Math.max(distance,.04-py)
  }
  volume.update()
  const body=new THREE.BufferGeometry()
  for(const name of ['position','normal']) body.setAttribute(name,new THREE.BufferAttribute(volume.geometry.attributes[name].array.slice(0,volume.count*3),3))
  // Smooth-union saddle cells can produce a triangle facing against the field
  // gradient. Keep winding consistent with its averaged outward normal.
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),normal=new THREE.Vector3(),corner=new THREE.Vector3()
  const positions=body.attributes.position,normals=body.attributes.normal
  for(let i=0;i<positions.count;i+=3) {
    a.fromBufferAttribute(positions,i)
    b.fromBufferAttribute(positions,i+1)
    c.fromBufferAttribute(positions,i+2)
    normal.fromBufferAttribute(normals,i).add(corner.fromBufferAttribute(normals,i+1)).add(corner.fromBufferAttribute(normals,i+2))
    if(b.sub(a).cross(c.sub(a)).dot(normal)<0) {
      for(const attribute of [positions,normals]) {
        corner.fromBufferAttribute(attribute,i+1)
        attribute.setXYZ(i+1,attribute.getX(i+2),attribute.getY(i+2),attribute.getZ(i+2))
        attribute.setXYZ(i+2,corner.x,corner.y,corner.z)
      }
    }
  }
  body.scale(3.3,3.3,3.3).translate(0,1.4,0)
  const uv=new Float32Array(volume.count*2),p=body.attributes.position
  for(let i=0;i<p.count;i++) {uv[i*2]=p.getX(i)/3;uv[i*2+1]=p.getY(i)/3}
  body.setAttribute('uv',new THREE.BufferAttribute(uv,2))
  volume.geometry.dispose();temporary.dispose()
  const parts=[body]
  const tube=(points,radius)=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((v)=>new THREE.Vector3(...v))),low?12:28,radius,low?6:10,false)
  for(const s of [-1,1]) {
    const horn=new THREE.ConeGeometry(.12,.7,low?6:12)
    horn.rotateX(s*.38).rotateZ(-.2).translate(1.58,2.70,s*.32)
    parts.push(horn)
    const ear=new THREE.SphereGeometry(.28,low?8:16,low?5:10)
    ear.scale(1,.35,1.8).rotateX(s*.18).translate(1.7,2.15,s*.57)
    parts.push(ear)
    parts.push(tube([[1.85,2.25,s*.41],[1.98,2.27,s*.42],[2.06,2.2,s*.4]],.035))
  }
  const collar=new THREE.TorusGeometry(.56,.055,6,low?16:32)
  collar.rotateX(Math.PI/2).translate(1.3,1.55,0)
  parts.push(collar)
  const bell=new THREE.ConeGeometry(.14,.25,10)
  bell.translate(1.89,1.2,0)
  parts.push(bell,tube([[-1.9,1,-.55],[-2.05,.55,-.65],[-1.8,.3,-.83],[-1.2,.23,-.85]],.06))
  const plinth=new THREE.BoxGeometry(5.8,.3,2.55)
  plinth.translate(0,-.11,0)
  parts.push(plinth)
  const geometry=combineStone(parts)
  cache.set(low,geometry)
  return geometry
}

export function createNandi(material,low=false) {
  const mesh=new THREE.Mesh(nandiGeometry(low),material)
  mesh.name='Original recumbent Nandi sculpture'
  mesh.castShadow=mesh.receiveShadow=true
  return mesh
}
