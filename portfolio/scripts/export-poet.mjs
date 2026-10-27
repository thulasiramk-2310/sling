// Original-only source snapshots and post-Blender validation. No production
// model is overwritten. Run: node scripts/export-poet.mjs [--out-dir /tmp/...]
// Validate: node scripts/export-poet.mjs --verify /tmp/.../poet-finished.glb
import { mkdir,readFile,writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import * as THREE from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { poetStatue } from '../src/scene/landmarks/poet-statue.js'

globalThis.FileReader??=class {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(buffer=>{this.result=buffer;this.onloadend?.()})}
  readAsDataURL(blob){blob.arrayBuffer().then(buffer=>{this.result=`data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`;this.onloadend?.()})}
}
const args=process.argv.slice(2),option=(name,fallback)=>{const at=args.indexOf(name);return at<0?fallback:args[at+1]}
const outputDirectory=resolve(option('--out-dir','/tmp/ram-poet-pipeline'))
await mkdir(outputDirectory,{recursive:true})

function handSilhouette(model){
  // Crop only a temporary raycast mesh, preserving the candidate/source data.
  // This makes a dense multi-height audit practical without changing assets.
  const positions=[],a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3()
  model.updateMatrixWorld(true)
  model.traverse(object=>{
    if(!object.isMesh)return
    const g=object.geometry,p=g.attributes.position,count=g.index?.count??p.count
    for(let i=0;i<count;i+=3){
      const ids=[0,1,2].map(j=>g.index?g.index.getX(i+j):i+j)
      a.fromBufferAttribute(p,ids[0]).applyMatrix4(object.matrixWorld)
      b.fromBufferAttribute(p,ids[1]).applyMatrix4(object.matrixWorld)
      c.fromBufferAttribute(p,ids[2]).applyMatrix4(object.matrixWorld)
      if(Math.max(a.x,b.x,c.x)<-3.6||Math.min(a.x,b.x,c.x)>-2.25||Math.max(a.y,b.y,c.y)<20.25||Math.min(a.y,b.y,c.y)>21.1||Math.max(a.z,b.z,c.z)<1.7)continue
      positions.push(...a.toArray(),...b.toArray(),...c.toArray())
    }
  })
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  const material=new THREE.MeshBasicMaterial(),mesh=new THREE.Mesh(geometry,material)
  mesh.updateMatrixWorld(true)
  const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,0,-1),0,3.3),rows=[]
  const step=1.35/200
  for(let row=0;row<=17;row++){
    const y=20.25+row*.05,occupied=[]
    for(let i=0;i<=200;i++){
      ray.ray.origin.set(-3.6+i*step,y,5)
      occupied.push(ray.intersectObject(mesh).length>0)
    }
    let bands=0,previous=false
    for(const hit of occupied){if(hit&&!previous)bands++;previous=hit}
    const gaps=[]
    for(let i=occupied.indexOf(true);i>=0&&i<occupied.lastIndexOf(true);i++){
      if(occupied[i])continue
      const start=i
      while(!occupied[i]&&i<occupied.length)i++
      gaps.push({start,end:i-1,width:(i-start)*step})
    }
    rows.push({y:Number(y.toFixed(2)),bands,gaps,occupied})
  }
  geometry.dispose();material.dispose()
  return {passed:rows.every(row=>row.bands===3),minimumBands:Math.min(...rows.map(row=>row.bands)),rows}
}

function inspect(model,low){
  let triangles=0,nonfinite=0,collapsed=0,reversed=0
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),face=new THREE.Vector3(),normal=new THREE.Vector3(),v=new THREE.Vector3()
  model.updateMatrixWorld(true)
  model.traverse(object=>{
    if(!object.isMesh)return
    const g=object.geometry,p=g.attributes.position,n=g.attributes.normal,count=g.index?.count??p.count
    triangles+=count/3
    for(const attribute of [p,n])for(const value of attribute.array)if(!Number.isFinite(value))nonfinite++
    for(let i=0;i<count;i+=3){
      const ids=[0,1,2].map(j=>g.index?g.index.getX(i+j):i+j)
      a.fromBufferAttribute(p,ids[0]);b.fromBufferAttribute(p,ids[1]);c.fromBufferAttribute(p,ids[2])
      face.copy(b).sub(a).cross(v.copy(c).sub(a))
      if(face.lengthSq()<1e-16)collapsed++
      normal.set(0,0,0);for(const id of ids)normal.add(v.fromBufferAttribute(n,id))
      if(face.dot(normal)<-1e-10)reversed++
    }
  })
  const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3())
  const hand=handSilhouette(model),fingerBands=hand.rows.find(row=>row.y===20.95).bands
  // Three bands at one high slice prove only separated fingertips. Require
  // open gaps throughout the shaft interval to reject knuckle webs/holes.
  const geometryPassed=nonfinite===0&&collapsed===0&&reversed===0&&size.y>28&&size.y<29&&size.x>7&&size.x<9&&triangles<(low?80000:130000)
  return {passed:geometryPassed&&hand.passed,geometryPassed,low,triangles,nonfinite,collapsed,reversed,fingerBands,hand,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},size:size.toArray()}
}

async function loadModel(path){
  const bytes=await readFile(path)
  return (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene
}

function faceComparison(source,candidate){
  const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,0,-1),0,8)
  source.updateMatrixWorld(true);candidate.updateMatrixWorld(true)
  const regions={leftEye:[-.95,-.23,24.59,25.05],rightEye:[.23,.95,24.59,25.05],moustacheMouth:[-.85,.85,23.35,24.0]}
  const result={}
  for(const [name,[x0,x1,y0,y1]] of Object.entries(regions)){
    let samples=0,missing=0,maximumDisplacement=0,sum=0
    for(let row=0;row<=8;row++)for(let column=0;column<=12;column++){
      ray.ray.origin.set(THREE.MathUtils.lerp(x0,x1,column/12),THREE.MathUtils.lerp(y0,y1,row/8),5)
      const before=ray.intersectObject(source,true)[0],after=ray.intersectObject(candidate,true)[0]
      if(!before||!after){missing++;continue}
      const displacement=Math.abs(before.point.z-after.point.z)
      maximumDisplacement=Math.max(maximumDisplacement,displacement);sum+=displacement;samples++
    }
    result[name]={samples,missing,maximumDisplacement,meanDisplacement:sum/samples}
  }
  return result
}

function handComparison(source,candidate){
  const baseline=handSilhouette(source),result=handSilhouette(candidate)
  const rows=baseline.rows.map((before,i)=>{
    const after=result.rows[i]
    const bridgedGaps=before.gaps.filter(gap=>gap.width>=.02&&
      !after.occupied.slice(gap.start,gap.end+1).some(hit=>!hit)).length
    return {y:before.y,sourceBands:before.bands,candidateBands:after.bands,bridgedGaps}
  })
  return {passed:rows.every(row=>row.candidateBands>=row.sourceBands&&row.bridgedGaps===0),rows}
}

const verify=option('--verify',null)
if(verify){
  const path=resolve(verify),model=await loadModel(path)
  const result=inspect(model,args.includes('--low')||path.includes('-low'))
  const reference=option('--reference',null)
  if(reference){
    const source=await loadModel(resolve(reference))
    result.faceComparison=faceComparison(source,model)
    result.handComparison=handComparison(source,model)
    result.passed&&=result.handComparison.passed
  }
  await writeFile(path+'.validation.json',JSON.stringify(result,null,2)+'\n')
  const {hand,...summary}=result
  console.log(JSON.stringify({file:path,...summary,hand:{passed:hand.passed,minimumBands:hand.minimumBands,rows:hand.rows.map(({y,bands,gaps})=>({y,bands,gaps}))}}))
  if(!result.passed)process.exitCode=1
}else{
  const sourceNames=['poet-statue.js','poet-body.js','poet-head.js','poet-limbs.js']
  const source={}
  for(const name of sourceNames)source[name]=createHash('sha256').update(await readFile(new URL('../src/scene/landmarks/'+name,import.meta.url))).digest('hex')
  const models=[]
  for(const low of [false,true]){
    const material=new THREE.MeshStandardMaterial({color:0x8c8b7e,roughness:.95})
    const model=poetStatue(material,low)
    // Runtime mineral shader is intentionally omitted from GLB. The studio can
    // apply the same original shader for a fair A/B geometry comparison.
    model.traverse(object=>{if(object.isMesh)object.material=material})
    const inspection=inspect(model,low)
    if(!inspection.passed)throw new Error('Source geometry failed: '+JSON.stringify(inspection))
    const bytes=await new GLTFExporter().parseAsync(model,{binary:true})
    const file=resolve(outputDirectory,low?'poet-source-low.glb':'poet-source.glb')
    await writeFile(file,new Uint8Array(bytes));models.push({file,bytes:bytes.byteLength,...inspection})
    const {hand,...summary}=models.at(-1)
    console.log(JSON.stringify({...summary,hand:{passed:hand.passed,minimumBands:hand.minimumBands}}))
  }
  await writeFile(resolve(outputDirectory,'source-manifest.json'),JSON.stringify({source,models,license:'Original project geometry; no third-party assets',visualApproval:false},null,2)+'\n')
}
