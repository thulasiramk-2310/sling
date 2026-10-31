import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { brickTexture,clockTexture,withRelief } from '../textures.js'
import { glow,lambert,surface } from '../util.js'
import { quality } from '../quality.js'

// Original compressed architectural interpretation. The Corporation's historic
// photographs inform the paired arcades, projecting towers and profiled caps.
// No reference photograph or third-party mesh is used as a render asset.
export function createCentralStation() {
  const root=new THREE.Group();root.name='Chennai Central — arched verandahs and clock tower'
  root.userData.staticBatchRoot=true
  const relief=withRelief('central-brick',brickTexture,1.2)
  const brick=lambert(0xffffff,{map:relief.map,normalMap:quality.low?null:relief.normalMap,roughness:.91})
  const trim=lambert(0xe9e1cf),roof=surface({color:0x414749,roughness:.84})
  const shade=glow(surface({color:0x263c38,roughness:.4,emissive:0xffbd70,emissiveIntensity:0}),.45)
  const curveSegments=quality.low?4:8,frames=new Map(),solids=new Map(),matrix=new THREE.Matrix4()
  const up=new THREE.Vector3(0,1,0),quaternion=new THREE.Quaternion(),position=new THREE.Vector3()
  const scaling=new THREE.Vector3(1,1,1)
  const arch=(radius,spring,bottom=0)=>{
    const shape=new THREE.Shape();shape.moveTo(-radius,bottom);shape.lineTo(-radius,spring)
    shape.absarc(0,spring,radius,Math.PI,0,true);shape.lineTo(radius,bottom);shape.closePath();return shape
  }
  // Use the same physical brick course size on front, side and extruded reveals.
  // Box UV stretching made the old shaft's bricks a different scale to its wings.
  const brickUV=geometry=>{
    const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv
    for(let i=0;i<p.count;i++){
      const x=Math.abs(n.getX(i)),y=Math.abs(n.getY(i)),z=Math.abs(n.getZ(i))
      uv.setXY(i,(x>z?p.getZ(i):p.getX(i))/2,(y>.75?p.getZ(i):p.getY(i))/2)
    }
    return geometry
  }
  const add=(geometry,material,transform=null)=>{
    if(transform)geometry.applyMatrix4(transform)
    if(material===brick)brickUV(geometry)
    if(!solids.has(material))solids.set(material,[])
    solids.get(material).push(geometry);return geometry
  }
  const mass=(w,h,d,material,x=0,y=0,z=0)=>{
    return add(new THREE.BoxGeometry(w,h,d).translate(x,y+h/2,z),material)
  }
  const faceTransform=(x,y,z,angle)=>{
    quaternion.setFromAxisAngle(up,angle);position.set(x,y,z)
    return new THREE.Matrix4().compose(position,quaternion,scaling)
  }
  const window=(radius,spring,transform,back=-.8,border=.18)=>{
    const key=[radius,spring,border].join(':')
    if(!frames.has(key)){
      const outline=arch(radius+border,spring,-border)
      outline.holes.push(new THREE.Path(arch(radius,spring).getPoints(curveSegments)))
      frames.set(key,{frame:new THREE.ExtrudeGeometry(outline,{depth:.18,bevelEnabled:false,curveSegments,steps:1}),pane:new THREE.ShapeGeometry(arch(radius,spring),curveSegments),transforms:[],backs:[]})
    }
    const set=frames.get(key);set.transforms.push(transform.clone())
    set.backs.push(transform.clone().multiply(new THREE.Matrix4().makeTranslation(0,0,back)))
  }
  const panel=(width,height,holes,x,y,z,angle=0)=>{
    const outline=new THREE.Shape();outline.moveTo(-width/2,0);outline.lineTo(width/2,0)
    outline.lineTo(width/2,height);outline.lineTo(-width/2,height);outline.closePath()
    for(const [wx,wy,r,s] of holes){
      const hole=arch(r,s).getPoints(curveSegments).map(p=>new THREE.Vector2(p.x+wx,p.y+wy))
      outline.holes.push(new THREE.Path(hole))
    }
    const transform=faceTransform(x,y,z,angle)
    add(new THREE.ExtrudeGeometry(outline,{depth:.55,bevelEnabled:false,curveSegments,steps:1}),brick,transform)
    return (wx,wy)=>transform.clone().multiply(new THREE.Matrix4().makeTranslation(wx,wy,.57))
  }

  // Real open arcades stand ahead of the recessed wall and upper walkway.
  mass(52,13,7.6,brick,0,0,-1.7)
  const wingOpenings=[]
  for(const y of [.95,7.4])for(let bay=0;bay<10;bay++){
    const cx=-22.5+bay*5
    if(y<2 && Math.abs(cx)<3)continue
    for(const offset of [-.86,.86])wingOpenings.push([cx+offset,y,.68,2.05])
  }
  wingOpenings.push([0,.18,2.55,3.05])
  const front=panel(52,13,wingOpenings,0,0,4.95)
  for(const [x,y,r,s] of wingOpenings)window(r,s,front(x,y),-3.35,r>2?.26:.17)
  mass(51,.25,3.2,trim,0,6.15,3.5)
  mass(52.5,.27,11.8,trim,0,.12,0)
  mass(52.5,.32,11.9,trim,0,6.45,0)
  mass(52.7,.32,12.0,trim,0,12.95,0)
  mass(52.3,.18,11.7,trim,0,13.42,0)

  // An eaved, shallow hipped roof joins the end towers instead of ending in a
  // flat slab. Profile rings also model the curled lips on the taller caps.
  const cap=(halfWidth,halfDepth,profile,x,y,z)=>{
    const footprint=[[-1,-.78],[-.78,-1],[.78,-1],[1,-.78],[1,.78],[.78,1],[-.78,1],[-1,.78]]
    const vertices=[],indices=[]
    for(const [height,scale,depthScale=scale] of profile)for(const [a,b] of footprint)vertices.push(a*halfWidth*scale+x,height+y,b*halfDepth*depthScale+z)
    for(let row=0;row<profile.length-1;row++)for(let side=0;side<8;side++){
      const a=row*8+side,b=row*8+(side+1)%8,c=a+8,d=b+8;indices.push(a,c,b,b,c,d)
    }
    const bottom=vertices.length/3;vertices.push(x,y+profile[0][0],z)
    const top=vertices.length/3;vertices.push(x,y+profile.at(-1)[0],z)
    for(let i=0;i<8;i++){
      indices.push(bottom,i,(i+1)%8)
      indices.push(top,(profile.length-1)*8+(i+1)%8,(profile.length-1)*8+i)
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices)
    const expanded=geometry.toNonIndexed();geometry.dispose();expanded.computeVertexNormals();add(expanded,roof).name='Profiled station roof'
  }
  cap(25.8,5.9,[[0,1,1],[.15,1.02,1.02],[1.75,.88,.06]],0,13.65,0)
  const finialGeometry=new THREE.LatheGeometry([[.12,0],[.21,.10],[.18,.2],[.09,.27],[.065,.63],[0,.82]].map(p=>new THREE.Vector2(...p)),quality.low?8:12)
  const finial=(x,y,z,scale=1)=>{
    const geometry=finialGeometry.clone();geometry.scale(scale,scale,scale).translate(x,y,z);add(geometry,trim)
  }

  // All four square towers project beyond the wing face. Their open paired
  // bays, corner piers and high caps are distinct from the former hidden tubes.
  for(const x of [-22.8,22.8])for(const z of [-3.6,3.6]){
    mass(4.6,19.4,5.6,brick,x,0,z)
    for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
      const side=Math.abs(Math.sin(angle))>.5,width=side?7.2:6.2,depth=side?3.1:3.6
      const holes=[]
      for(const y of [1.1,7.6,14.0])for(const wx of [-1.34,1.34])holes.push([wx,y,.65,1.75])
      const transform=panel(width,19.4,holes,x+Math.sin(angle)*(depth-.55),0,z+Math.cos(angle)*(depth-.55),angle)
      for(const [wx,wy,r,s] of holes)window(r,s,transform(wx,wy),-.75)
    }
    for(const sx of [-1,1])for(const sz of [-1,1])mass(.32,19.3,.32,trim,x+sx*2.96,.1,z+sz*3.46)
    for(const y of [.18,6.45,12.95,19.3])mass(6.55,.25,7.55,trim,x,y,z)
    mass(6.9,.3,7.9,trim,x,19.65,z)
    cap(3.7,4.15,[[0,1],[.25,1.02],[.7,.89],[4.65,.20],[4.8,.13]],x,19.95,z)
    finial(x,24.75,z,.8)
  }

  // Slender pilasters and paired louvres articulate the shaft below its clocks.
  mass(6,24.5,6,brick,0,13,-.05)
  for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
    const holes=[[-1.7,6.5,.82,3.6],[1.7,6.5,.82,3.6]]
    const transform=panel(9,24.5,holes,Math.sin(angle)*3.95,13,Math.cos(angle)*3.95,angle)
    for(const [wx,wy,r,s] of holes)window(r,s,transform(wx,wy),-1.3,.20)
  }
  for(const x of [-4.35,4.35])for(const z of [-4.35,4.35])mass(.32,24.6,.32,trim,x,13,z)
  for(const [y,w,h] of [[13.4,9.6,.3],[18.8,9.5,.25],[25.2,9.5,.32],[36.5,9.75,.28],[37.15,10.1,.45]])mass(w,h,w,trim,0,y)
  cap(5.35,5.35,[[0,1],[.3,1.03],[.7,.88],[6.9,.18],[7.58,.12]],0,37.6,0)
  finial(0,45.18,0)

  // Circular geometry clips the generated dial exactly; no square clock image
  // or dark rectangular backing hangs on the masonry.
  const dialMaterial=lambert(0xffffff,{map:clockTexture(),roughness:.84})
  const dials=new THREE.InstancedMesh(new THREE.CircleGeometry(2.33,quality.low?24:40),dialMaterial,4)
  const rims=new THREE.InstancedMesh(new THREE.TorusGeometry(2.48,.13,6,quality.low?24:36),trim,4)
  for(let i=0;i<4;i++){
    const angle=i*Math.PI/2,transform=faceTransform(Math.sin(angle)*4.61,32.3,Math.cos(angle)*4.61,angle)
    dials.setMatrixAt(i,transform);rims.setMatrixAt(i,transform.clone().multiply(matrix.makeTranslation(0,0,.04)))
    const hood=new THREE.TorusGeometry(2.68,.11,5,quality.low?12:20,Math.PI)
    add(hood,trim,transform.clone().multiply(matrix.makeTranslation(0,.06,-.035)))
  }
  root.add(dials,rims)
  // Repeated brackets break the long cornice into a masonry rhythm in one draw.
  const brackets=new THREE.InstancedMesh(new THREE.BoxGeometry(.24,.32,.40),trim,44)
  for(let i=0;i<44;i++)brackets.setMatrixAt(i,matrix.makeTranslation(-25.3+i*50.6/43,12.81,5.80))
  root.add(brackets)
  for(const set of frames.values()){
    const arches=new THREE.InstancedMesh(set.frame,trim,set.transforms.length)
    const panes=new THREE.InstancedMesh(set.pane,shade,set.backs.length)
    set.transforms.forEach((transform,i)=>arches.setMatrixAt(i,transform));set.backs.forEach((transform,i)=>panes.setMatrixAt(i,transform))
    root.add(arches,panes)
  }
  // This 53m assembly is one culling unit. Merge its three opaque finishes
  // here so centroid roundoff at local zero cannot split it into spatial bins.
  for(const [material,parts] of solids){
    const normalized=parts.map(geometry=>geometry.index?geometry.toNonIndexed():geometry)
    const mesh=new THREE.Mesh(mergeGeometries(normalized),material)
    mesh.name=material===brick?'Station masonry and recessed arcade walls':material===trim?'Station pale stone mouldings':'Profiled station roof caps'
    mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();root.add(mesh)
    for(const geometry of new Set([...parts,...normalized]))geometry.dispose()
  }
  finialGeometry.dispose()
  return root
}
