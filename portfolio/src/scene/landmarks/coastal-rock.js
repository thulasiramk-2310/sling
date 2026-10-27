import * as THREE from 'three'
import { rng, smooth, surface } from '../util.js'

// Original granite shelf interpretation. A shared radial surface keeps the
// ledges joined; fractures change the rock shape, not independent triangle copies.
const WATER=-1.4
const washMasks=new Map()
const hash=(x,y,seed)=>{const value=Math.sin(x*127.1+y*311.7+seed*74.7)*43758.5453;return value-Math.floor(value)}
const noise=(x,y,seed)=>{
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy
  const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy)
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix,iy,seed),hash(ix+1,iy,seed),u),THREE.MathUtils.lerp(hash(ix,iy+1,seed),hash(ix+1,iy+1,seed),u),v)
}

// A small original alpha atlas keeps the wash connected at the rock and lets
// it dissolve into aerated, irregular water at its outer edge. Mip filtering is
// deliberately used instead of high-frequency fragment noise on phones.
function washMask(low) {
  if(washMasks.has(low))return washMasks.get(low)
  const tileWidth=low?32:64,height=low?64:128,tiles=8,width=tileWidth*tiles,data=new Uint8Array(width*height*4)
  for(let tile=0;tile<tiles;tile++)for(let y=0;y<height;y++)for(let x=0;x<tileWidth;x++) {
    const u=x/(tileWidth-1),v=y/(height-1)
    const broad=noise(u*5.1,v*3.4,tile*13+17),fine=noise(u*17.3,v*11.7,tile*29+41)
    const ends=smooth(0,.1,u)*(1-smooth(.86,1,u))
    const outer=1-smooth(.12+.16*broad,.68+.14*broad,v)
    const breakup=smooth(.21,.57,broad*.75+fine*.25)
    const connected=THREE.MathUtils.lerp(.68,breakup,smooth(.05,.25,v))
    const alpha=ends*outer*connected*(.55+.45*fine),i=(y*width+tile*tileWidth+x)*4,mask=Math.round(255*alpha)
    data[i]=data[i+1]=data[i+2]=mask;data[i+3]=255
  }
  const texture=new THREE.DataTexture(data,width,height,THREE.RGBAFormat)
  texture.name='Original filtered shoreline wash alpha atlas'
  texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping
  texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true
  washMasks.set(low,texture);return texture
}

const shoreFactor=(angle,seed,kind)=>{
  const facingChannel=kind==='memorial'?Math.max(0,-Math.cos(angle)):Math.max(0,Math.cos(angle))
  const channelCut=1-(kind==='memorial'?.30:.16)*Math.pow(facingChannel,10)
  return (1+.065*Math.sin(angle*3+seed*.31)+.045*Math.cos(angle*5-seed*.17)+.023*Math.sin(angle*11+.4))*channelCut
}

function heightAt(x,z,r,kind,top,seed) {
  if(r>=1)return THREE.MathUtils.lerp(WATER,-4.3,Math.min(1,(r-1)/.11))
  const outside=smooth(.55,.86,r)
  let h=THREE.MathUtils.lerp(top,WATER,smooth(.59,1,r))
  const shelf=Math.floor((h+2.1)/.72)*.72-2.1
  h=THREE.MathUtils.lerp(h,shelf,outside*.62)
  const crack=Math.exp(-Math.pow(Math.sin(x*.22+z*.13+seed*.17)/.13,2))
  h+=outside*(.16*Math.sin(x*.29-z*.19)-.26*crack)
  if(kind==='memorial') {
    // The original assembly has a high central foundation and a lower side hall.
    // Shape their supporting rock independently instead of burying the side hall.
    const upper=1-smooth(.86,1.12,Math.max(Math.abs(x)/18,Math.abs(z+3)/24))
    h=THREE.MathUtils.lerp(h,4.94,upper)
    const lower=1-smooth(.8,1.1,Math.max(Math.abs(x+18)/8.5,Math.abs(z-12)/7.5))
    h=THREE.MathUtils.lerp(h,3.12,lower)
    const stair=(1-smooth(4.2,6.3,Math.abs(x)))*smooth(13,16,z)*(1-smooth(29,31,z))
    h=Math.max(h,THREE.MathUtils.lerp(h,THREE.MathUtils.clamp((29-z)*.54-.17,-.2,7.1),stair))
  } else {
    const platform=1-smooth(.58,.78,Math.max(Math.abs(x)/18,Math.abs(z)/17))
    h=THREE.MathUtils.lerp(h,-.04,platform)
  }
  // Meet the actual water plane exactly, keeping the foam on this same boundary.
  return THREE.MathUtils.lerp(h,WATER,smooth(.96,1,r))
}

// Weathered granite has rounded crowns and irregular fracture faces, not an
// extruded flat roof. This original closed radial profile keeps those features
// joined while two oblique, softened cuts interrupt its otherwise curved mass.
function outcropGeometry(low,seed) {
  const segments=low?10:12,profile=low?[[.72,0],[1.02,.16],[.94,.58],[.48,.94]]:[[.72,0],[1.02,.14],[1,.46],[.76,.80],[.34,.99]]
  const positions=[],indices=[],phase=seed*.73
  for(const [radius,height] of profile)for(let i=0;i<segments;i++) {
    const a=i/segments*Math.PI*2,shape=1+.12*Math.sin(a*3+phase)+.07*Math.cos(a*5-phase)
    let x=Math.cos(a)*radius*shape,z=Math.sin(a)*radius*shape
    const cutA=x*.8+z*.6-(.79+.08*height)
    if(cutA>0){x-=cutA*.8*.87;z-=cutA*.6*.87}
    const cutB=-x*.3+z*.954-(.83-.06*height)
    if(cutB>0){x+=cutB*.3*.82;z-=cutB*.954*.82}
    const y=height+.055*Math.sin(a*2+phase)*Math.sin(Math.PI*height)
    positions.push(x+.16*height,y,z-.11*height)
  }
  for(let row=0;row<profile.length-1;row++)for(let i=0;i<segments;i++) {
    const a=row*segments+i,b=row*segments+(i+1)%segments,c=a+segments,d=b+segments
    indices.push(a,c,b,b,c,d)
  }
  const top=positions.length/3;positions.push(.16,1.045,-.11)
  for(let i=0;i<segments;i++)indices.push(top,(profile.length-1)*segments+(i+1)%segments,(profile.length-1)*segments+i)
  const floor=positions.length/3
  for(let i=0;i<segments;i++)positions.push(positions[i*3],positions[i*3+1],positions[i*3+2])
  const bottom=positions.length/3;positions.push(0,0,0)
  for(let i=0;i<segments;i++)indices.push(bottom,floor+i,floor+(i+1)%segments)
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals()
  const expanded=geometry.toNonIndexed();geometry.dispose();return expanded
}

export function coastalRock({rx,rz,kind='statue',seed=1,low=false}) {
  const group=new THREE.Group();group.name='Original fractured coastal granite — '+kind
  // Spend phone vertices on the visible shoreline, rather than hidden radial rows.
  const segments=low?80:112,rings=low?18:36,top=kind==='memorial'?4.9:.08
  const positions=[0,top,0],indices=[]
  for(let row=1;row<=rings;row++) {
    const r=row/rings*1.11
    for(let i=0;i<segments;i++) {
      const a=i/segments*Math.PI*2,factor=shoreFactor(a,seed,kind)
      const x=Math.cos(a)*rx*factor*r,z=Math.sin(a)*rz*factor*r
      positions.push(x,heightAt(x,z,r,kind,top,seed),z)
    }
  }
  for(let i=0;i<segments;i++)indices.push(0,1+(i+1)%segments,1+i)
  for(let row=0;row<rings-1;row++)for(let i=0;i<segments;i++) {
    const a=1+row*segments+i,b=1+row*segments+(i+1)%segments,c=a+segments,d=b+segments
    indices.push(a,b,c,c,b,d)
  }
  // Keep the underwater closure's flat normals separate from the cliff wall.
  const floorStart=positions.length/3
  for(let i=0;i<segments;i++){const v=(1+(rings-1)*segments+i)*3;positions.push(positions[v],positions[v+1],positions[v+2])}
  const bottom=positions.length/3;positions.push(0,-4.3,0)
  for(let i=0;i<segments;i++)indices.push(bottom,floorStart+i,floorStart+(i+1)%segments)
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals()
  const colors=[],dry=new THREE.Color(low?'#9b988a':'#858274'),shade=new THREE.Color(low?'#737b6c':'#5d625a'),wet=new THREE.Color(low?'#4d5e58':'#303c38'),color=new THREE.Color()
  const tintAt=(x,y,z)=>{
    color.copy(dry).lerp(shade,.18+.16*Math.sin(x*.19+z*.12+seed))
    color.multiplyScalar(.94+.07*Math.cos(x*.49-z*.37)+.025*Math.sin(x*2.3+z*1.7))
    // Lambert phones lack the desktop's reflected sky in wet granite. Keep a
    // readable cool-grey albedo and a narrower dark tidal band, without glow.
    color.lerp(wet,1-smooth(low?-1.32:-1.0,low?-.48:.4,y))
    return color
  }
  const p=geometry.attributes.position
  for(let i=0;i<p.count;i++) {
    tintAt(p.getX(i),p.getY(i),p.getZ(i))
    colors.push(color.r,color.g,color.b)
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  // Wet tidal faces use a separate PBR response, with a cheap Lambert counterpart
  // on phones. Both materials retain the coherent vertex-colour weathering.
  const parts=[[],[]],normals=geometry.attributes.normal,index=geometry.index
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),face=new THREE.Vector3(),corner=new THREE.Vector3()
  for(let i=0;i<index.count;i+=3) {
    const vertices=[index.getX(i),index.getX(i+1),index.getX(i+2)]
    const wetFace=vertices.reduce((total,v)=>total+p.getY(v),0)/3<-.45?1:0
    a.fromBufferAttribute(p,vertices[0]);b.fromBufferAttribute(p,vertices[1]);c.fromBufferAttribute(p,vertices[2]);face.copy(b).sub(a).cross(c.sub(a)).normalize()
    // A steep cut in the terrace keeps its own face normal rather than blending
    // the lighting across opposing cliff/ledge slopes.
    const cut=vertices.some(v=>corner.fromBufferAttribute(normals,v).dot(face)<.2)
    for(const v of vertices) {
      parts[wetFace].push(p.getX(v),p.getY(v),p.getZ(v))
      if(cut)parts[wetFace].push(face.x,face.y,face.z)
      else parts[wetFace].push(normals.getX(v),normals.getY(v),normals.getZ(v))
      parts[wetFace].push(geometry.attributes.color.getX(v),geometry.attributes.color.getY(v),geometry.attributes.color.getZ(v))
    }
  }
  // Rounded, asymmetric outcrops are rooted below the supporting shelf and share
  // its existing wet/dry draws. Architecture footprints remain clear.
  let outcrops=0
  for(let i=0;i<8;i++) {
    if(low && i%2)continue
    const angle=(i+.25)/8*Math.PI*2+.14*Math.sin(seed),radius=.73+.08*hash(i,seed,81),factor=shoreFactor(angle,seed,kind)
    const x=Math.cos(angle)*rx*factor*radius,z=Math.sin(angle)*rz*factor*radius
    const sx=1.65+.8*hash(i,seed,47),sz=1.15+.55*hash(i,seed,61),outcrop=outcropGeometry(low,seed+i*7)
    outcrop.scale(sx,1,sz);outcrop.rotateY(-.35+.25*hash(i,seed,73));outcrop.translate(x,0,z);outcrop.computeBoundingBox()
    const box=outcrop.boundingBox
    const touches=(x0,x1,z0,z1)=>box.max.x>x0 && box.min.x<x1 && box.max.z>z0 && box.min.z<z1
    const protectedFootprint=kind==='memorial'?(touches(-15.5,15.5,-23,18)||touches(-25.5,-10.5,6,18)||touches(-6,6,13,31)):touches(-9.2,9.2,-8.5,8.5)
    if(protectedFootprint){outcrop.dispose();continue}
    const ground=(px,pz)=>{
      const a=Math.atan2(pz/rz,px/rx),r=Math.hypot(px/rx,pz/rz)/shoreFactor(a,seed,kind)
      return heightAt(px,pz,r,kind,top,seed)
    }
    const base=Math.min(ground(x,z),ground(box.min.x,box.min.z),ground(box.min.x,box.max.z),ground(box.max.x,box.min.z),ground(box.max.x,box.max.z))-.16
    const outcropHeight=ground(x,z)+.65+.24*hash(i,seed,91)-base,q=outcrop.attributes.position
    for(let v=0;v<q.count;v++) {
      const y=q.getY(v)/1.045
      q.setY(v,base+y*outcropHeight)
    }
    // The profile already has smooth crown normals and separate floor normals;
    // inverse-transpose them for this final vertical placement scale.
    const n=outcrop.attributes.normal,normalScale=1.045/outcropHeight
    for(let v=0;v<n.count;v++) {
      corner.fromBufferAttribute(n,v);corner.y*=normalScale;corner.normalize();n.setXYZ(v,corner.x,corner.y,corner.z)
    }
    for(let v=0;v<q.count;v+=3) {
      const wetFace=(q.getY(v)+q.getY(v+1)+q.getY(v+2))/3<-.45?1:0
      for(let j=0;j<3;j++) {
        const k=v+j;tintAt(q.getX(k),q.getY(k),q.getZ(k))
        parts[wetFace].push(q.getX(k),q.getY(k),q.getZ(k),n.getX(k),n.getY(k),n.getZ(k),color.r,color.g,color.b)
      }
    }
    outcrops++;outcrop.dispose()
  }
  for(let part=0;part<2;part++) {
    const source=parts[part],pos=[],normal=[],tint=[]
    for(let i=0;i<source.length;i+=9){pos.push(...source.slice(i,i+3));normal.push(...source.slice(i+3,i+6));tint.push(...source.slice(i+6,i+9))}
    const meshGeometry=new THREE.BufferGeometry()
    meshGeometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));meshGeometry.setAttribute('normal',new THREE.Float32BufferAttribute(normal,3));meshGeometry.setAttribute('color',new THREE.Float32BufferAttribute(tint,3))
    meshGeometry.computeBoundingBox();meshGeometry.computeBoundingSphere()
    const mesh=new THREE.Mesh(meshGeometry,surface({color:0xffffff,vertexColors:true,roughness:part?.34:.93}))
    mesh.name=part?'Wet intertidal granite':'Dry granite shelves';mesh.castShadow=mesh.receiveShadow=true;group.add(mesh)
  }
  geometry.dispose()
  group.userData.fractureOutcrops=outcrops

  // Interrupted wash patches use the very same irregular shoreline. Their
  // tapered widths and gaps replace the former complete concentric line loops.
  const random=rng(seed+114),foamPositions=[],foamColors=[],foamUvs=[],foamIndices=[]
  const patches=low?18:28,steps=low?8:10
  for(let patch=0;patch<patches;patch++) {
    if(random()<.22)continue
    const start=patch/patches*Math.PI*2+.018+random()*.025,span=(.48+random()*.42)*Math.PI*2/patches
    const width=.38+random()*.82,offset=-.1+random()*.13,base=foamPositions.length/3,tile=Math.floor(hash(patch,seed,47)*8)
    for(let j=0;j<=steps;j++) {
      const t=j/steps,a=start+span*t,factor=shoreFactor(a,seed,kind),taper=.03+.97*Math.pow(Math.sin(Math.PI*t),.5)
      for(const side of [0,1]) {
        const distance=offset+side*width*taper+.06*Math.sin(a*53+seed)
        foamPositions.push(Math.cos(a)*(rx*factor+distance),WATER+.024,Math.sin(a)*(rz*factor+distance))
        foamUvs.push((tile+t)/8,side)
        const tone=.73+.2*Math.sin(Math.PI*t);foamColors.push(tone,tone*.99,tone*.9)
      }
    }
    for(let j=0;j<steps;j++){const a=base+j*2;foamIndices.push(a,a+2,a+1,a+1,a+2,a+3)}
  }
  const foamGeometry=new THREE.BufferGeometry()
  foamGeometry.setAttribute('position',new THREE.Float32BufferAttribute(foamPositions,3));foamGeometry.setAttribute('color',new THREE.Float32BufferAttribute(foamColors,3));foamGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(foamUvs,2));foamGeometry.setIndex(foamIndices);foamGeometry.computeVertexNormals();foamGeometry.computeBoundingSphere()
  const foamMaterial=new THREE.MeshBasicMaterial({color:0xe7e9d8,vertexColors:true,alphaMap:washMask(low),transparent:true,opacity:low?.3:.4,depthWrite:false,side:THREE.DoubleSide})
  const foam=new THREE.Mesh(foamGeometry,foamMaterial);foam.name='Broken shoreline wash';foam.userData.noShadow=true;foam.renderOrder=1;group.add(foam)
  group.userData.updateFoam=time=>{foamMaterial.opacity=(low?.27:.35)+(low?.035:.045)*Math.sin(time*.68+seed)}
  return group
}
