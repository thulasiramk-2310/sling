import * as THREE from 'three'
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const bodyCache = new Map()
const smoothUnion = (a,b,k) => {
  const h = Math.max(k-Math.abs(a-b),0)/k
  return Math.min(a,b)-h*h*k*.25
}

// A continuous sculpted body, not intersecting low-poly rocks or a painted animal.
// Dimensions are an original elephant study, not a reproduction of a surveyed statue.
export function elephantBodyGeometry(low = false) {
  if (bodyCache.has(low)) return bodyCache.get(low)
  const resolution = low ? 48 : 88
  const temporaryMaterial = new THREE.MeshBasicMaterial()
  const volume = new MarchingCubes(resolution,temporaryMaterial,false,false,60000)
  volume.isolation = 0
  const forms = [
    [-.35,2.35,0,2.05,1.32,.94],
    [1.05,2.55,0,1.02,1.22,.91],
    [1.75,3.03,0,.79,.99,.73],
    [2.03,3.25,0,.52,.72,.64],
    [-1.65,1.13,-.62,.39,1.17,.40],
    [-1.65,1.13,.62,.39,1.17,.40],
    [1.14,1.15,-.63,.40,1.20,.40],
    [1.14,1.15,.63,.40,1.20,.40],
    [-1.65,.22,-.62,.43,.25,.43],
    [-1.65,.22,.62,.43,.25,.43],
    [1.14,.22,-.63,.44,.25,.43],
    [1.14,.22,.63,.44,.25,.43],
  ]
  for (let z=0;z<resolution;z++) for (let y=0;y<resolution;y++) for (let x=0;x<resolution;x++) {
    const px=(x/resolution*2-1)*4
    const py=(y/resolution*2-1)*4+2.2
    const pz=(z/resolution*2-1)*4
    let d=99
    for (const [cx,cy,cz,rx,ry,rz] of forms) {
      const dx=(px-cx)/rx,dy=(py-cy)/ry,dz=(pz-cz)/rz
      const distance=(Math.sqrt(dx*dx+dy*dy+dz*dz)-1)*Math.min(rx,ry,rz)
      d=smoothUnion(d,distance,.17)
    }
    d=Math.max(d,.035-py)
    volume.field[x+y*resolution+z*resolution*resolution]=-d
  }
  volume.update()
  const geometry=new THREE.BufferGeometry()
  for (const name of ['position','normal']) {
    geometry.setAttribute(name,new THREE.BufferAttribute(volume.geometry.attributes[name].array.slice(0,volume.count*3),3))
  }
  geometry.scale(4,4,4)
  geometry.translate(0,2.2,0)
  // Spatial, continuous UVs for generated granite. No elephant image is used.
  const uv=new Float32Array(volume.count*2)
  const positions=geometry.attributes.position
  for (let i=0;i<positions.count;i++) { uv[i*2]=positions.getX(i)/3; uv[i*2+1]=positions.getY(i)/3 }
  geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2))
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  volume.geometry.dispose()
  temporaryMaterial.dispose()
  bodyCache.set(low,geometry)
  return geometry
}

function tube(points,start,end,low,wrinkled=false) {
  const curve=new THREE.CatmullRomCurve3(points.map((point)=>new THREE.Vector3(...point)),false,'centripetal')
  const steps=low?30:64
  const sides=low?8:14
  const geometry=new THREE.TubeGeometry(curve,steps,1,sides,false)
  const p=geometry.attributes.position
  for (let i=0;i<=steps;i++) {
    const t=i/steps
    const center=curve.getPointAt(t)
    const radius=(end+(start-end)*Math.pow(1-t,.8))*(wrinkled?1+.018*Math.sin(t*Math.PI*56):1)
    for (let j=0;j<=sides;j++) {
      const k=i*(sides+1)+j
      p.setXYZ(k,center.x+(p.getX(k)-center.x)*radius,center.y+(p.getY(k)-center.y)*radius,center.z+(p.getZ(k)-center.z)*radius)
    }
  }
  geometry.computeVertexNormals()
  return geometry
}

export function createStoneElephant(material,low=false) {
  const group=new THREE.Group()
  group.name='Original three-dimensional stone elephant'
  group.add(new THREE.Mesh(elephantBodyGeometry(low),material))
  const details=[]
  details.push(tube([[2.28,3.04,0],[2.67,2.58,0],[2.85,1.7,0],[2.94,.85,.02],[3.15,.35,.04],[3.5,.49,.04]],.33,.085,low,true))
  details.push(tube([[-2.15,2.45,0],[-2.48,1.9,.05],[-2.55,1,.12],[-2.64,.65,.16]],.09,.025,low))
  for (const side of [-1,1]) {
    const outline=new THREE.Shape()
    outline.moveTo(.2,.65)
    outline.bezierCurveTo(-.3,.98,-.96,.7,-.95,.16)
    outline.bezierCurveTo(-.98,-.36,-.5,-.83,-.06,-.86)
    outline.bezierCurveTo(.28,-.49,.34,.15,.2,.65)
    const ear=new THREE.ExtrudeGeometry(outline,{depth:.08,bevelEnabled:true,bevelThickness:.045,bevelSize:.055,bevelSegments:low?1:3,curveSegments:low?8:16})
    ear.rotateY(side*.2)
    ear.translate(1.47,2.98,side*.72)
    details.push(ear)
    details.push(tube([[2.17,2.48,side*.43],[2.55,2.22,side*.48],[2.96,2.15,side*.43],[3.13,2.25,side*.39]],.11,.012,low))
    const brow=tube([[1.95,3.31,side*.63],[2.10,3.36,side*.66],[2.22,3.29,side*.61]],.046,.027,low)
    details.push(brow)
    const eye=new THREE.SphereGeometry(.042,low?6:10,low?4:7)
    eye.scale(1,.6,.35)
    eye.translate(2.11,3.25,side*.681)
    details.push(eye)
  }
  const normalized=details.map((geometry)=>geometry.index?geometry.toNonIndexed():geometry.clone())
  const detailGeometry=mergeGeometries(normalized)
  normalized.forEach((geometry)=>geometry.dispose())
  details.forEach((geometry)=>geometry.dispose())
  group.add(new THREE.Mesh(detailGeometry,material))
  group.traverse((object)=>{if(object.isMesh) object.castShadow=object.receiveShadow=true})
  return group
}
