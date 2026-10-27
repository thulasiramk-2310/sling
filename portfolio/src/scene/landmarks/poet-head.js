import * as THREE from 'three'
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

const cache=new Map()
const union=(a,b,k=.14)=>{
  const h=Math.max(k-Math.abs(a-b),0)/k
  return Math.min(a,b)-h*h*k*.25
}
const ellipsoid=(x,y,z,cx,cy,cz,rx,ry,rz)=>{
  const a=(x-cx)/rx,b=(y-cy)/ry,c=(z-cz)/rz
  return (Math.sqrt(a*a+b*b+c*c)-1)*Math.min(rx,ry,rz)
}
// Unequal swept ridges deform one beard fan. They are front-surface relief,
// rather than rounded strands unioned mostly inside a flat backing.
const beardLocks=[
  [-.78,23.08,.14,.48,.12,-.045],[-.39,22.98,.17,.65,.18,.075],
  [.04,22.92,.15,.64,.145,-.05],[.43,23.02,.18,.59,.17,-.08],
  [.81,23.13,.13,.44,.13,.035],
]

// Original implicit stone study: all facial features share one sampled surface.
// The district photograph informs the pose; this is not a surveyed reproduction.
export function poetHeadGeometry(low=false) {
  if(cache.has(low))return cache.get(low)
  const resolution=low?72:112,material=new THREE.MeshBasicMaterial()
  const volume=new MarchingCubes(resolution,material,false,false,low?60000:140000)
  volume.isolation=0
  // MarchingCubes omits the outer two grid cells. Leave room above the knot
  // inside that valid extraction range, rather than clipping its final cap.
  const halfX=2.1,halfY=4,halfZ=2,centerY=24.6
  const moustacheCos=Math.cos(.48),moustacheSin=Math.sin(.48)
  for(let iz=0;iz<resolution;iz++)for(let iy=0;iy<resolution;iy++)for(let ix=0;ix<resolution;ix++) {
    const x=(ix/resolution*2-1)*halfX,y=(iy/resolution*2-1)*halfY+centerY,z=(iz/resolution*2-1)*halfZ
    // This envelope lies several samples beyond every carved surface. Empty
    // voxels outside it cannot contribute a zero crossing; skip costly face
    // and hair fields there without changing the extracted mesh.
    if(Math.abs(x)>1.85 || z< -1.4 || z>1.7 || y<21.25) {
      volume.field[ix+iy*resolution+iz*resolution*resolution]=-1
      continue
    }
    const e=(cx,cy,cz,rx,ry,rz)=>ellipsoid(x,y,z,cx,cy,cz,rx,ry,rz)
    let d=e(0,24.9,-.08,1.43,1.55,1.05)
    d=union(d,e(0,25.9,-.10,1.28,.67,1.02),.2)
    // Jaw, neck and cheek planes remain fused to the cranial volume.
    d=union(d,e(0,23.85,.04,1.08,.98,.89),.3)
    d=union(d,e(0,22.6,-.04,.82,1.04,.79),.22)
    // Broad malar planes taper into the jaw. The small supporting masses stay
    // inside the main face; clipping their outside corners avoids round cheek
    // knobs while retaining continuous stone beneath the eye sockets.
    for(const side of [-1,1])d=union(d,e(side*.78,24.35,.32,.34,.48,.45),.21)
    const cheekFade=THREE.MathUtils.smoothstep(y,23.55,24.05)
      *(1-THREE.MathUtils.smoothstep(y,24.65,25.1))
    const cheekPlane=.70*Math.abs(x)+.71*(z+.08)-1.12
    d=THREE.MathUtils.lerp(d,Math.max(d,cheekPlane),cheekFade)
    for(const side of [-1,1]) {
      d=union(d,e(side*1.4,24.38,-.04,.28,.94,.39),.17)
      d=union(d,e(side*1.39,23.58,.01,.23,.46,.3),.15)
    }
    // The beard is a short tapered stone fan, with a nearly level lower edge,
    // rather than an ellipsoid hanging beneath the mouth. Its shallow backing
    // leaves room for the lock planes to survive the actual rendered light.
    const beardWidth=.70+.40*THREE.MathUtils.smoothstep(y,22.25,23.62)
    const bx=Math.abs(x)-beardWidth+.16
    const by=Math.abs(y-22.98)-.73+.16
    let beardRelief=0
    if(y>22.25 && y<23.7 && z>.70)for(const [cx,cy,width,length,height,curve] of beardLocks) {
      const splay=.80+.20*THREE.MathUtils.smoothstep(y,22.25,23.55)
      const sweep=curve*Math.sin((y-cy)*2.5)+.025*Math.sin((y-cy)*4.1+cx*2)
      const across=(x-cx*splay-sweep)/width
      const ends=THREE.MathUtils.smoothstep(y,cy-length-.05,cy-length+.20)
        *(1-THREE.MathUtils.smoothstep(y,cy+length-.16,cy+length+.08))
      beardRelief+=height*Math.exp(-across*across)*ends
    }
    // Keep the rear volume and silhouette coherent. Only the front is pushed
    // into broad asymmetric ridges, which taper into the common lower edge.
    const edgeFade=THREE.MathUtils.smoothstep(y,22.25,22.46)
      *(1-THREE.MathUtils.smoothstep(y,23.50,23.70))
    const bz=Math.abs(z-.70)-.35+.16
      -beardRelief*edgeFade*THREE.MathUtils.smoothstep(z,.75,1.02)
    let beard=Math.hypot(Math.max(bx,0),Math.max(by,0),Math.max(bz,0))
      +Math.min(Math.max(bx,by,bz),0)-.16
    d=union(d,beard,.16)
    d=union(d,e(0,23.45,.53,.93,.31,.45),.12)
    // Hair grows into the skull; its rounded knot is swept slightly backwards.
    const hairAngle=Math.atan2(z+.14,x)
    // Closed, shallow helical coils wrap the gathered hair as one surface.
    // The integral angular turns keep the back seam continuous. Their pitch
    // spans several cells on both grids, unlike high-frequency vertex noise.
    const coilFade=THREE.MathUtils.smoothstep(y,25.7,25.98)
    const hairY=25.7+(y-25.7)/.85
    const h=(cx,cy,cz,rx,ry,rz)=>ellipsoid(x,hairY,z,cx,cy,cz,rx,ry,rz)
    const capCoil=.025*(.5+.5*Math.cos((hairY-25.72)*16+2*hairAngle))
    let hair=h(0,26.35,-.15,1.25,.66,1.03)
    hair=union(hair,h(0,26.9,-.23,.95,.45,.87),.2)
    const knot=h(-.13,27.59,-.34,.66,.69,.68)
      -.025*(.5+.5*Math.cos((hairY-26.95)*18+2*hairAngle))
    hair=union(hair-capCoil*coilFade,knot,.25)
    // Keep a small swept apex above the compressed bulk, without retaining the
    // former broad helmet stack or changing the figure's height convention.
    hair=union(hair,e(-.14,27.60,-.38,.34,.45,.40),.08)
    d=union(d,hair,.17)
    // Facial cuts and small unions cannot reach the neck or upper hair. Keep
    // their full fields around the face, skipping them outside that envelope.
    if(y>=23 && y<=26.2) {
      // A shallow continuous hairline breaks the smooth forehead/upper hair
      // transition without introducing a separate floating rim.
      const hairlineY=25.7+.06*x*x
      d+=.025*Math.exp(-(((y-hairlineY)/.11)**2))
        *THREE.MathUtils.smoothstep(z,.35,.8)*(1-THREE.MathUtils.smoothstep(Math.abs(x),1.0,1.3))
      // Fused brow and nasal masses, with restrained projecting cheek relief.
      for(const side of [-1,1])d=union(d,e(side*.59,25.13-.12*Math.abs(x),.76,.46,.12,.15),.18)
      d=union(d,e(0,24.65,.95,.17,.62,.24),.18)
      d=union(d,e(0,24.2,1.20,.23,.20,.28),.14)
      for(const side of [-1,1])d=union(d,e(side*.21,24.08,1.1,.17,.13,.2),.12)
      // Carve sockets and conchas before adding eyes rooted inside the socket floor.
      for(const side of [-1,1]) {
        const eyeX=(x-side*.59)/.34
        d=Math.max(d,-e(side*.59,24.80+.035*(1-eyeX*eyeX),.97,.34,.16,.20))
        d=Math.max(d,-e(side*1.5,24.48,.29,.13,.57,.2))
      }
      for(const side of [-1,1]) {
        // A shallow convex plane grows from the socket floor beneath the brow.
        // Its height spans both sampling grids, rather than disappearing into
        // a deep empty recess on the phone mesh.
        d=union(d,e(side*.59,24.80,.78,.25,.095,.11),.04)
        d=union(d,e(side*.59,24.93,.80,.30,.052,.10),.05)
        d=union(d,e(side*.59,24.68,.77,.285,.038,.08),.045)
      }
      // The small pupil is an open, shallow depression, not an enclosed cavity.
      // Its diameter survives both grids and the later Blender voxel union.
      for(const side of [-1,1])d=Math.max(d,-e(side*.59,24.80,.90,.085,.085,.065))
      // Connected moustache lobes merge into the upper beard and nose wings.
      // Their outer ends slope down and taper, instead of forming a straight
      // cross-face bar. Mirrored local coordinates retain one fused surface.
      for(const side of [-1,1]) {
        const mx=side*x-.40,my=y-23.66
        const along=moustacheCos*mx-moustacheSin*my
        const across=moustacheSin*mx+moustacheCos*my
        const taper=THREE.MathUtils.smoothstep(along,-.05,.40)
        const lobe=ellipsoid(along,across,z,0,0,1.1,.43,.13-.05*taper,.19-.055*taper)
        d=union(d,lobe,.13)
      }
      d=union(d,e(0,23.48,1.02,.34,.085,.21),.13)
      d=Math.max(d,-e(0,23.52,1.29,.31,.075,.09))
      // Extend each desktop nostril recess through the outer alar surface.
      // Small enclosed cutters would form invisible cavities inside the stone.
      if(!low)for(const side of [-1,1])d=Math.max(d,-e(side*.16,24.07,1.35,.055,.055,.10))
    }
    volume.field[ix+iy*resolution+iz*resolution*resolution]=-d
  }
  volume.update()
  const geometry=new THREE.BufferGeometry()
  for(const name of ['position','normal'])geometry.setAttribute(name,new THREE.BufferAttribute(volume.geometry.attributes[name].array.slice(0,volume.count*3),3))
  geometry.scale(halfX,halfY,halfZ).translate(0,centerY,0)
  let p=geometry.attributes.position,n=geometry.attributes.normal
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3()
  // An isosurface grazing a grid corner can leave almost zero-area slivers.
  // Compact complete triangles together so position and normal stay aligned.
  let kept=0
  for(let i=0;i<p.count;i+=3) {
    a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2)
    if(b.sub(a).cross(c.sub(a)).lengthSq()<1e-16)continue
    for(const attribute of [p,n])for(let j=0;j<3;j++)attribute.setXYZ(kept+j,attribute.getX(i+j),attribute.getY(i+j),attribute.getZ(i+j))
    kept+=3
  }
  if(kept!==p.count) {
    geometry.setAttribute('position',new THREE.BufferAttribute(p.array.slice(0,kept*3),3))
    geometry.setAttribute('normal',new THREE.BufferAttribute(n.array.slice(0,kept*3),3))
    p=geometry.attributes.position;n=geometry.attributes.normal
  }
  // Keep native marching-cubes winding and derive smooth lighting normals from
  // the retained surface. Area weighting prevents tiny triangles dominating
  // the shading. Weld positions alone: hashing existing corner normals would
  // preserve the very discontinuities this smoothing is meant to remove.
  const normalSource=new THREE.BufferGeometry()
  normalSource.setAttribute('position',p.clone())
  const welded=mergeVertices(normalSource,1e-6)
  welded.computeVertexNormals()
  const smooth=welded.toNonIndexed()
  geometry.setAttribute('normal',smooth.attributes.normal.clone())
  normalSource.dispose();welded.dispose();smooth.dispose()
  const uv=new Float32Array(p.count*2)
  for(let i=0;i<p.count;i++){uv[i*2]=p.getX(i)/3;uv[i*2+1]=(p.getY(i)-20.95)/3}
  geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2))
  geometry.computeBoundingBox();geometry.computeBoundingSphere()
  geometry.name='Unified implicit poet head, hair and beard'
  volume.geometry.dispose();material.dispose();cache.set(low,geometry)
  return geometry
}
