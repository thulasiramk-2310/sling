import * as THREE from 'three'
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js'
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

const cache=new Map()
const union=(a,b,k=.15)=>{
  const h=Math.max(k-Math.abs(a-b),0)/k
  return Math.min(a,b)-h*h*k*.25
}
const oval=(x,y,z,cx,cy,cz,rx,ry,rz)=>{
  const a=(x-cx)/rx,b=(y-cy)/ry,c=(z-cz)/rz
  return (Math.sqrt(a*a+b*b+c*c)-1)*Math.min(rx,ry,rz)
}
const bone=(x,y,z,a,b,r0,r1)=>{
  const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2]
  const t=THREE.MathUtils.clamp(((x-a[0])*dx+(y-a[1])*dy+(z-a[2])*dz)/(dx*dx+dy*dy+dz*dz),0,1)
  return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy,z-a[2]-t*dz)-THREE.MathUtils.lerp(r0,r1,t)
}
const roundedBox=(x,y,z,hx,hy,hz,r)=>{
  const a=Math.abs(x)-hx+r,b=Math.abs(y)-hy+r,c=Math.abs(z)-hz+r
  return Math.hypot(Math.max(a,0),Math.max(b,0),Math.max(c,0))+Math.min(Math.max(a,b,c),0)-r
}

// Spatially continuous fields keep the elbows and digits free of sphere/tube
// seams. Fine hand fields overlap the arm ends inside the palm/wrist crease;
// the assembled figure is a rendering mesh, not a watertight fabrication model.
function extract(resolution,center,half,field) {
  const material=new THREE.MeshBasicMaterial()
  const volume=new MarchingCubes(resolution,material,false,false,50000)
  volume.isolation=0
  for(let z=0;z<resolution;z++)for(let y=0;y<resolution;y++)for(let x=0;x<resolution;x++) {
    const px=center[0]+(x/resolution*2-1)*half[0]
    const py=center[1]+(y/resolution*2-1)*half[1]
    const pz=center[2]+(z/resolution*2-1)*half[2]
    volume.field[x+y*resolution+z*resolution*resolution]=-field(px,py,pz)
  }
  volume.update()
  const source=volume.geometry.attributes.position.array,positions=[]
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3()
  for(let i=0;i<volume.count;i+=3) {
    a.fromArray(source,i*3).multiply(new THREE.Vector3(...half)).add(new THREE.Vector3(...center))
    b.fromArray(source,(i+1)*3).multiply(new THREE.Vector3(...half)).add(new THREE.Vector3(...center))
    c.fromArray(source,(i+2)*3).multiply(new THREE.Vector3(...half)).add(new THREE.Vector3(...center))
    if(b.clone().sub(a).cross(c.clone().sub(a)).lengthSq()<1e-16)continue
    positions.push(...a.toArray(),...b.toArray(),...c.toArray())
  }
  const raw=new THREE.BufferGeometry()
  raw.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  const welded=mergeVertices(raw,1e-6)
  const geometry=raw.clone(),p=geometry.attributes.position,index=welded.index
  const faces=[],adjacent=Array.from({length:welded.attributes.position.count},()=>[])
  for(let i=0;i<p.count;i+=3) {
    a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2)
    faces.push(b.clone().sub(a).cross(c.clone().sub(a)))
    for(let j=0;j<3;j++)adjacent[index.getX(i+j)].push(i/3)
  }
  // Area-weighted smoothing within a 75-degree crease prevents opposite faces
  // of a narrow finger/leaf incision from pulling a normal through the surface.
  const normals=new Float32Array(p.count*3),sum=new THREE.Vector3(),direction=new THREE.Vector3(),other=new THREE.Vector3()
  for(let i=0;i<p.count;i++) {
    direction.copy(faces[Math.floor(i/3)]).normalize();sum.set(0,0,0)
    for(const face of adjacent[index.getX(i)]) {
      other.copy(faces[face]).normalize()
      if(direction.dot(other)>.259)sum.add(faces[face])
    }
    sum.normalize().toArray(normals,i*3)
  }
  geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3))
  const uv=new Float32Array(p.count*2)
  for(let i=0;i<p.count;i++){uv[i*2]=p.getX(i)/3;uv[i*2+1]=p.getY(i)/3}
  geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2))
  geometry.computeBoundingBox();geometry.computeBoundingSphere()
  raw.dispose();welded.dispose();volume.geometry.dispose();material.dispose()
  return geometry
}

function armField(side) {
  const raised=side<0
  const shoulder=[side*3.55,21.25,0],elbow=[side*3.85,raised?16.8:17.1,raised?.8:.9]
  const wrist=raised?[-3,18.65,2.1]:[1.2,17.25,2.1]
  const inside=raised?[-3,19.08,2.12]:[1.14,17.3,2.15]
  const midway=raised?[-3.49,17.55,1.43]:[2.6,17.1,1.65]
  return (x,y,z)=>{
    let d=bone(x,y,z,shoulder,elbow,.68,.53)
    d=union(d,bone(x,y,z,elbow,midway,.53,.56),.25)
    d=union(d,bone(x,y,z,midway,wrist,.56,.29),.2)
    d=union(d,bone(x,y,z,wrist,inside,.29,.20),.13)
    // Broad deltoid/biceps relief is fused into the shaft, not a joint ball.
    d=union(d,oval(x,y,z,side*3.63,20.53,.1,.66,.92,.62),.12)
    return d
  }
}

function raisedHand(x,y,z) {
  const px=x+3,pz=z-2.13
  let d=oval(px,y,pz,0,19.25,0,.54,.77,.30)
  d=union(d,oval(px,y,pz,.37,19.25,.08,.25,.4,.24),.11)
  for(let i=0;i<3;i++) {
    // Modest spacing and restrained joint blends preserve a continuous air gap
    // above the palm, including through the middle knuckles after remeshing.
    const fx=-.38+i*.38,tip=21.45-Math.abs(i-1)*.16,bend=(i-1)*.01
    d=union(d,bone(px,y,pz,[fx,19.77,.015],[fx+bend*.5,20.63,.02],.132,.115),.055)
    d=union(d,bone(px,y,pz,[fx+bend*.5,20.63,.02],[fx+bend,tip,0],.115,.100),.045)
  }
  // Thumb and folded fourth digit turn into one another in front of the palm.
  d=union(d,bone(px,y,pz,[.43,19.19,.11],[.27,19.56,.30],.14,.12),.1)
  d=union(d,bone(px,y,pz,[.27,19.56,.30],[-.05,19.57,.30],.12,.10),.08)
  d=union(d,bone(px,y,pz,[-.44,19.13,.15],[-.18,18.99,.32],.13,.12),.08)
  d=union(d,bone(px,y,pz,[-.18,18.99,.32],[.01,19.24,.31],.12,.1),.08)
  return d
}

function manuscriptHand(x,y,z) {
  const px=x-1.15,py=y-17.3,pz=z-2.15
  let d=oval(px,py,pz,0,0,0,.71,.32,.48)
  d=union(d,oval(px,py,pz,.52,-.015,-.08,.38,.28,.32),.13)
  const book=roundedBox(px-.4,py-.55,pz+.10,1.45,.25,.425,.065)
  d=union(d,book,.055)
  for(let i=0;i<4;i++) {
    const fx=-.48+i*.29
    d=union(d,bone(px,py,pz,[fx,.12,.24],[fx+.02,-.25,.48],.10,.095),.075)
    d=union(d,bone(px,py,pz,[fx+.02,-.25,.48],[fx+.10,-.38,.25],.095,.075),.065)
  }
  d=union(d,bone(px,py,pz,[-.51,.07,-.01],[-.42,.49,.17],.15,.12),.11)
  d=union(d,bone(px,py,pz,[-.42,.49,.17],[-.08,.47,.30],.12,.105),.075)
  // Shallow leaf courses carve the front edge; they are not floating plates.
  if(pz>.29 && px>-.9 && px<1.7)for(const height of [.41,.53,.65]) {
    const groove=roundedBox(px-.4,py-height,pz-.335,1.3,.018,.033,.012)
    d=Math.max(d,-groove)
  }
  return d
}

export function poetLimbsGeometry(low=false) {
  if(cache.has(low))return cache.get(low)
  const armRes=low?24:30
  const parts=[
    extract(armRes,[-3.45,19.1,1.0],[1.25,3.5,2.2],armField(-1)),
    extract(armRes,[2.55,19.2,1.0],[2.4,3.5,2.2],armField(1)),
    extract(low?32:42,[-3,19.95,2.2],[.92,1.9,.67],raisedHand),
    extract(low?26:34,[1.55,17.53,2.08],[1.75,1.16,.86],manuscriptHand),
  ]
  const geometry=mergeGeometries(parts)
  geometry.computeBoundingBox();geometry.computeBoundingSphere()
  geometry.name='Original continuous carved arms, gesture and manuscript'
  for(const part of parts)part.dispose()
  cache.set(low,geometry)
  return geometry
}
