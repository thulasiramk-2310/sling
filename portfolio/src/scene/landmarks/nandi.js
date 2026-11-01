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
  // Broad recumbent torso, raised shoulder hump and a tapering bovine
  // forehead/bridge. Separate knee, folded cannon and hoof masses avoid paws.
  const forms=[[-.45,1.05,0,1.65,.85,.82],[-1.4,.7,0,.8,.65,.80],[.48,1.83,0,.61,.75,.64],[1.13,1.37,0,.48,.86,.56],[1.62,2.14,0,.47,.57,.46],[1.97,2.04,0,.40,.40,.34],[2.31,1.88,0,.39,.22,.37],[2.21,1.67,0,.40,.18,.35]]
  for(const side of [-1,1])forms.push([.55,.40,side*.64,.65,.30,.29],[-.12,.20,side*.77,.67,.16,.23],[.50,.16,side*.79,.31,.14,.24],[-1.35,.40,side*.63,.64,.36,.34],[-1.00,.19,side*.79,.48,.16,.25])
  for(let z=0;z<resolution;z++) for(let y=0;y<resolution;y++) for(let x=0;x<resolution;x++) {
    const px=(x/resolution*2-1)*3.3,py=(y/resolution*2-1)*3.3+1.4,pz=(z/resolution*2-1)*3.3
    let distance=99
    for(const [cx,cy,cz,rx,ry,rz] of forms) {
      const dx=(px-cx)/rx,dy=(py-cy)/ry,dz=(pz-cz)/rz
      const d=(Math.sqrt(dx*dx+dy*dy+dz*dz)-1)*Math.min(rx,ry,rz)
      const h=Math.max(.14-Math.abs(distance-d),0)/.14
      distance=Math.min(distance,d)-h*h*.035
    }
    // Recessed nostrils and a shallow muzzle separation are real cuts in
    // the stone volume, not dark symbols painted onto the face.
    const hollow=(cx,cy,cz,rx,ry,rz)=>(Math.hypot((px-cx)/rx,(py-cy)/ry,(pz-cz)/rz)-1)*Math.min(rx,ry,rz)
    for(const side of [-1,1])distance=Math.max(distance,-hollow(2.56,1.94,side*.22,.12,.065,.085))
    distance=Math.max(distance,-hollow(2.61,1.82,0,low?.17:.14,low?.085:.065,.32))
    volume.field[x+y*resolution+z*resolution*resolution]=-Math.max(distance,.04-py)
  }
  volume.update()
  const body=new THREE.BufferGeometry()
  for(const name of ['position','normal']) body.setAttribute(name,new THREE.BufferAttribute(volume.geometry.attributes[name].array.slice(0,volume.count*3),3))
  body.scale(3.3,3.3,3.3).translate(0,1.4,0)
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
  const uv=new Float32Array(volume.count*2),p=body.attributes.position
  for(let i=0;i<p.count;i++) {uv[i*2]=p.getX(i)/3;uv[i*2+1]=p.getY(i)/3}
  body.setAttribute('uv',new THREE.BufferAttribute(uv,2))
  volume.geometry.dispose();temporary.dispose()
  const parts=[body]
  const tube=(points,radius)=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((v)=>new THREE.Vector3(...v))),low?12:28,radius,low?6:10,false)
  for(const s of [-1,1]) {
    const curve=new THREE.CatmullRomCurve3([[1.46,2.46,s*.29],[1.35,2.66,s*.38],[1.44,2.82,s*.43],[1.58,2.90,s*.41]].map(p=>new THREE.Vector3(...p)))
    const horn=new THREE.ConeGeometry(.16,1,low?8:14,low?5:10),v=horn.attributes.position
    const up=new THREE.Vector3(0,1,0),rotation=new THREE.Quaternion(),point=new THREE.Vector3()
    for(let i=0;i<v.count;i++){
      const t=THREE.MathUtils.clamp(v.getY(i)+.5,0,1)
      rotation.setFromUnitVectors(up,curve.getTangent(t).normalize())
      point.set(v.getX(i),0,v.getZ(i)).applyQuaternion(rotation).add(curve.getPoint(t))
      v.setXYZ(i,point.x,point.y,point.z)
    }
    horn.computeVertexNormals();parts.push(horn)
    const ear=new THREE.SphereGeometry(1,low?8:16,low?5:10)
    ear.scale(.31,.075,.38).rotateX(s*.24).rotateY(-s*.3).translate(1.58,2.27,s*.57);parts.push(ear)
    // Modeled almond-shaped eye surrounds and brow ridges catch the light.
    parts.push(tube([[1.66,2.26,s*.37],[1.77,2.33,s*.405],[1.90,2.29,s*.35]],.035))
    parts.push(tube([[1.66,2.26,s*.37],[1.78,2.23,s*.405],[1.90,2.29,s*.35]],.022))
    const eye=new THREE.SphereGeometry(1,low?8:14,low?4:8)
    eye.scale(.10,.055,.03).translate(1.78,2.27,s*.41);parts.push(eye)
    parts.push(tube([[2.03,1.68,s*.28],[2.30,1.63,s*.33],[2.56,1.72,s*.23]],.025))
    parts.push(tube([[.92,.29,s*.86],[.67,.20,s*.98],[.44,.18,s*.99]],.018))
  }
  // Paired carved neck cords follow the chest instead of a horizontal ring.
  for(const offset of [0,.10,.20]){
    const points=[]
    for(let i=0;i<=24;i++){
      const angle=i/24*Math.PI*2
      points.push([1.17+Math.cos(angle)*.21+offset,1.48+Math.cos(angle)*.57,Math.sin(angle)*(.59-offset*.45)])
    }
    parts.push(tube(points,.035))
  }
  for(const row of [0,1])for(let i=0;i<11;i++){
    const angle=(i/10-.5)*Math.PI,bead=new THREE.SphereGeometry(.065,low?6:10,low?3:6)
    bead.translate(1.35+row*.09+Math.cos(angle)*.15,1.30-row*.10-Math.cos(angle)*.36,Math.sin(angle)*.53);parts.push(bead)
  }
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
