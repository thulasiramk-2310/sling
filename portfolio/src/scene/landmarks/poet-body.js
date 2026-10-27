import * as THREE from 'three'
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js'

const cache=new Map()
const bell=(x,width)=>Math.exp(-((x/width)**2))
const torsoProfile=[
  [10.5,2.8,.45,0,-.10],[11.3,3.05,.78,0,-.09],
  [12,3.1,1.08,0,-.08],[13,3.25,1.18,0,-.09],
  [14,3.02,1.18,.22,-.10],[15.5,3.06,1.24,.26,-.06],
  [17,3.12,1.32,.18,-.05],[18.5,3.38,1.4,.08,-.06],
  [20.2,3.7,1.38,0,-.1],[21.2,3.72,1.15,0,-.12],
  [21.65,3.45,1,0,-.1],[22,2.8,.85,0,-.05],
  [22.35,1.55,.76,0,0],[22.6,.94,.72,0,0],
]

// [height, half-width, half-depth, centerX, centerZ]. Authored sections keep
// the waist, shoulder and weight-bearing posture independent of surface detail.
function sectionAt(profile,y) {
  let k=1
  while(k<profile.length-1 && profile[k][0]<y)k++
  const a=profile[k-1],b=profile[k]
  const t=THREE.MathUtils.clamp((y-a[0])/(b[0]-a[0]),0,1)
  return [y,...[1,2,3,4].map(j=>THREE.MathUtils.lerp(a[j],b[j],t))]
}

function finish(geometry,rows=0,segments=0) {
  geometry.computeVertexNormals()
  if(rows) {
    const normal=geometry.attributes.normal,a=new THREE.Vector3(),b=new THREE.Vector3()
    for(let row=0;row<rows;row++) {
      const first=row*(segments+1),last=first+segments
      a.fromBufferAttribute(normal,first).add(b.fromBufferAttribute(normal,last)).normalize()
      normal.setXYZ(first,a.x,a.y,a.z);normal.setXYZ(last,a.x,a.y,a.z)
    }
  }
  geometry.computeBoundingBox();geometry.computeBoundingSphere()
  return geometry
}

function loft(profile,rows,segments,deform=()=>{}) {
  const positions=[],uv=[],indices=[]
  const firstY=profile[0][0],lastY=profile.at(-1)[0]
  const point=new THREE.Vector3()
  for(let row=0;row<rows;row++) {
    const [y,rx,rz,cx,cz]=sectionAt(profile,THREE.MathUtils.lerp(firstY,lastY,row/(rows-1)))
    for(let i=0;i<=segments;i++) {
      const angle=i/segments*Math.PI*2
      point.set(cx+Math.cos(angle)*rx,y,cz+Math.sin(angle)*rz)
      deform(point,angle,cx,cz)
      positions.push(point.x,point.y,point.z);uv.push(i/segments,(y-firstY)/3)
    }
  }
  for(let row=0;row<rows-1;row++)for(let i=0;i<segments;i++) {
    const a=row*(segments+1)+i,b=a+1,c=a+segments+1,d=c+1
    indices.push(a,c,b,b,c,d)
  }
  for(const row of [0,rows-1]) {
    const y=row?lastY:firstY,[,,,cx,cz]=sectionAt(profile,y)
    point.set(cx,y,cz);deform(point,0,cx,cz)
    const center=positions.length/3
    positions.push(point.x,point.y,point.z);uv.push(.5,.5)
    for(let i=0;i<segments;i++) {
      const a=row*(segments+1)+i,b=a+1
      indices.push(...(row===0?[center,a,b]:[center,b,a]))
    }
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices)
  return finish(geometry,rows,segments)
}

function chestRelief(x,y) {
  const left=.37*bell(x+1.55,1.04)*bell(y-20.12,.86)
  const right=.30*bell(x-1.52,.98)*bell(y-19.94,.78)
  const pectoralEdge=y-(19.27+.12*(Math.abs(x)-1.55)**2)
  const clavicle=y-(21.92-.08*x*x)
  return left+right
    -.12*bell(pectoralEdge,.20)*bell(Math.abs(x)-1.55,1.05)
    -.16*bell(x,.32)*bell(y-20.05,1.2)
    -.20*bell(x,.9)*bell(y-21.15,.75)
    +.075*bell(clavicle,.18)*bell(x,2.75)
    +.09*bell(Math.abs(x)-2.65,.65)*bell(y-20.55,.7)
}

function torsoFront(x,y) {
  const [,rx,rz,cx,cz]=sectionAt(torsoProfile,y)
  const sine=Math.sqrt(Math.max(0,1-((x-cx)/rx)**2))
  return cz+rz*sine+chestRelief(x,y)*sine*sine
}

// Closed front/back ribbon with rolled edges. Its back sits inside the torso;
// this is a cloth mass crossing the chest, not a line painted on the surface.
function chestBand(along,across,layer=0) {
  const positions=[],uv=[],indices=[],stride=across+1,sideCount=(along+1)*stride
  for(const front of [true,false])for(let i=0;i<=along;i++)for(let j=0;j<=across;j++) {
    const extent=layer?3.26:3.35,x=-extent+i/along*extent*2,s=j/across*2-1
    const y=layer?18.20+.48*x+.14*Math.sin((x+.4)*.9)+s*(.42-.05*x/extent)
      :19.30+.52*x+.21*Math.sin((x+.3)*.75)+s*(1.05-.1*x/extent)
    // Edges sink into the underlying carving; only the soft cloth crest rises.
    const roll=Math.cos(s*Math.PI/2)**2
    const endFade=1-THREE.MathUtils.smoothstep(Math.abs(x),2.8,extent)
    const rolled=.005+((layer?.105:.17)+.015*Math.sin(s*Math.PI*3+x*.4))*roll*endFade
    positions.push(x,y,torsoFront(x,y)+(front?rolled:-.035))
    uv.push(i/along,j/across)
  }
  for(let i=0;i<along;i++)for(let j=0;j<across;j++) {
    const a=i*stride+j,b=a+stride,c=a+1,d=b+1
    indices.push(a,b,c,b,d,c,a+sideCount,c+sideCount,b+sideCount,b+sideCount,c+sideCount,d+sideCount)
  }
  const edge=[]
  for(let i=0;i<along;i++)edge.push(i*stride)
  for(let j=0;j<across;j++)edge.push(along*stride+j)
  for(let i=along;i>0;i--)edge.push(i*stride+across)
  for(let j=across;j>0;j--)edge.push(j)
  for(let i=0;i<edge.length;i++) {
    const a=edge[i],b=edge[(i+1)%edge.length],c=a+sideCount,d=b+sideCount
    indices.push(a,c,b,b,c,d)
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices)
  finish(geometry)
  // The ribbon's thin closure meets its front/back at a hard edge. Sharing
  // normals there can turn the closure's lighting normal inward on phone LOD.
  const creased=toCreasedNormals(geometry,Math.PI/3)
  geometry.dispose()
  creased.computeBoundingBox();creased.computeBoundingSphere()
  return creased
}

// Unequal curved gathers span the shared wrap and its overlapping front fall.
// Their common field keeps the drapery continuous across both cloth masses.
function lowerClothRelief(x,y) {
  const folds=[
    [1.7,.40,.22,.14,.14,0,3.4],[3.9,.48,.28,.21,.10,-.8,2.5],
    [6.2,.50,.32,.34,.13,.8,2.5],[8.7,.50,.30,.29,.10,1.1,2.2],
    [11.3,.54,.26,.35,.08,.4,2.7],[13.7,.50,.22,.36,.12,-.2,2.8],
  ]
  let relief=0
  for(const [height,width,amplitude,slope,bowl,center,spread] of folds) {
    const local=x-center,seam=height+slope*local+bowl*local*local
    relief+=(amplitude*bell(y-seam,width)-amplitude*.35*bell(y-seam+width*1.4,width))
      *bell(local,spread)
  }
  return relief
}

function lowerGarment(low) {
  // One wrapped cloth mass bridges the thighs. Anatomy emerges through its
  // depth rather than two separate tubes decorated with circumferential rings.
  const profile=[
    [.65,3.3,1.40,0,.24],[2.8,3.2,1.37,-.08,.18],
    [5.5,3.05,1.30,-.12,.12],[9,3.05,1.46,-.06,.28],
    [12,2.85,1.34,.12,.15],[14.3,2.8,1.16,.12,.04],
    [16.2,2.75,.65,0,.02],
  ]
  return loft(profile,low?88:112,low?40:52,(v,angle)=>{
    const front=Math.max(0,Math.sin(angle))**2
    const relief=lowerClothRelief(v.x,v.y)
    const knee=.45*bell(v.x-1.25,.95)*bell(v.y-9.1,2.1)
    const supportingThigh=-.18*bell(v.x+1.25,.9)*bell(v.y-7,3)
    const crease=-.10*bell(v.x-(.25+.025*v.y),.26)*bell(v.y-7,6)
    v.z+=(relief+knee+supportingThigh+crease)*front*(1-THREE.MathUtils.smoothstep(v.y,14,16.2))
  })
}

export function poetBodyGeometry(low=false) {
  if(cache.has(low))return cache.get(low)
  const parts=[]
  const torso=loft(torsoProfile,low?52:68,low?32:40,(v,angle)=>{
    if(v.z>0)v.z+=chestRelief(v.x,v.y)*Math.sin(angle)**2
  })
  parts.push(torso,lowerGarment(low))
  // The lower wrap overlaps the garment on a sloping hem. A soft, broad mass
  // connects the waist rather than ending the torso on a horizontal cut.
  parts.push(loft([
    // The closed lower ring turns behind the leg surfaces. The visible hem
    // rolls forward above it rather than exposing a flat diagonal underside.
    [12.35,2.95,.60,0,-.15],[12.75,3.31,.92,0,-.06],
    [13.2,3.24,1.32,.18,.04],[14.8,3.14,1.40,.26,.02],
    [16.6,3.15,1.35,.18,-.02],[18.4,3.24,1.08,.08,-.07],
  ],low?42:54,low?28:36,(v,angle)=>{
    const y=v.y,front=Math.max(0,Math.sin(angle))**2
    const hemFade=1-THREE.MathUtils.smoothstep(y,13.2,18.4)
    v.y+=(.50*v.x+.22*Math.sin(v.x*.7)+.10*Math.sin(v.x*1.3))*hemFade
    const crest=.17*bell(y-(14.05+.08*v.x),.65)+.075*bell(y-(15.2+.12*v.x),.48)
    v.z+=crest*front*(1-THREE.MathUtils.smoothstep(y,17,18.4))
  }))
  // A shallow rear drape meets the outer robe while the shared front surface
  // preserves the knee and supporting-thigh depth without an open leg valley.
  parts.push(loft([
    [.65,3.72,.73,0,-.64],[2,3.68,.75,0,-.65],[8,3.38,.74,-.04,-.64],
    [13.2,3.35,.76,0,-.59],[16.1,3.42,.85,0,-.40],
  ],low?36:48,low?20:24,(v,angle)=>{
    if(Math.sin(angle)<0)v.z-=.09*Math.cos(angle*7+v.y*.12)*Math.sin(angle)**2
  }))
  for(const side of [-1,1])parts.push(loft(side<0?[
    [.65,.65,1.15,-3.65,-.22],[3,.60,1.13,-3.50,-.25],
    [7.5,.52,1.06,-3.00,-.35],[11.5,.56,1.10,-3.10,-.31],
    [15.8,.48,1.00,-3.25,-.29],[18.5,.34,.80,-3.22,-.20],[21.4,.15,.28,-3.15,-.10],
  ]:[
    [.65,.65,1.15,3.60,-.22],[4,.57,1.12,3.40,-.24],
    [9.2,.60,1.08,3.15,-.28],[13,.50,1.02,3.35,-.30],
    [17,.38,.91,3.30,-.22],[21.4,.15,.28,3.15,-.10],
  ],low?36:48,low?12:16,(v,angle)=>{
    const fold=(.07*Math.sin(angle*3+v.y*.13)+.035*Math.sin(angle*7-v.y*.09))
      *(1-THREE.MathUtils.smoothstep(v.y,20,21.4))
    v.x+=Math.cos(angle)*fold;v.z+=Math.sin(angle)*fold
  }))
  parts.push(chestBand(low?48:64,low?6:8))
  parts.push(chestBand(low?36:48,low?4:6,1))
  parts.push(loft([
    // A continuous overlapping cloth fall crosses the supporting leg and
    // gathers onto the projecting knee; it is not a thin vertical seam.
    [1.0,.44,.28,.26,1.19],[2.6,.58,.34,.30,1.29],[6,.72,.39,.40,1.44],
    [9,.83,.42,.66,1.65],[12.2,1.00,.36,1.00,1.39],[15.6,.74,.27,.54,1.27],
  ],low?60:76,low?10:12,(v,angle)=>{
    if(Math.sin(angle)>0) {
      v.z+=lowerClothRelief(v.x,v.y)*Math.sin(angle)**2
    }
  }))
  const geometry=mergeGeometries(parts.map(part=>part.index?part.toNonIndexed():part.clone()))
  geometry.computeBoundingBox();geometry.computeBoundingSphere()
  geometry.name='Original wrapped poet garment, asymmetric knee and chest cloth'
  for(const part of parts)part.dispose()
  cache.set(low,geometry)
  return geometry
}
