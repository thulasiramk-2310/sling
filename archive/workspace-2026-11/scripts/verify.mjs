import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {GLTFLoader,MeshoptDecoder} from 'three-stdlib';
import {Box3,Vector3,Raycaster} from 'three';
import {cameraPath,targetPath} from '../src/experience/camera/route.ts';
const loader=new GLTFLoader();loader.setMeshoptDecoder(typeof MeshoptDecoder==='function'?MeshoptDecoder():MeshoptDecoder);
let meshCount=0,triangles=0;
for(const file of ['chennai.glb','palm.glb','shore-temple.glb','brihadisvara.glb']){
 const b=await fs.readFile('public/models/'+file);
 const model=await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const bounds=new Box3().setFromObject(model.scene);const size=bounds.getSize(new Vector3());
 assert(size.y>8,`${file}: valid scale and vertical orientation`);assert(!bounds.isEmpty());
 let modelTriangles=0;
 model.scene.traverse(o=>{if(!o.isMesh)return;meshCount++;const p=o.geometry.attributes.position;assert(p.count>0);assert(o.material.isMeshStandardMaterial);assert(o.geometry.attributes.normal);assert(o.geometry.attributes.uv);
  for(let i=0;i<p.count;i++)assert(Number.isFinite(p.getX(i))&&Number.isFinite(p.getY(i))&&Number.isFinite(p.getZ(i)),`${file}: finite vertices`);
  const index=o.geometry.index;if(index){for(let i=0;i<index.count;i++)assert(index.getX(i)<p.count,'valid index');modelTriangles+=index.count/3;}else modelTriangles+=p.count/3;
 });triangles+=modelTriangles;
 console.log(`PASS ${file}: GLTFLoader + bundled MeshoptDecoder, ${Math.round(modelTriangles)} triangles, bounds ${size.toArray().map(n=>n.toFixed(1)).join(' × ')}m`);
 if(file==='chennai.glb'){
  const ray=new Raycaster(new Vector3(30,55,-7),new Vector3(0,-1,0));model.scene.updateMatrixWorld(true);
  assert(ray.intersectObject(model.scene,true).length>0,'Lighthouse is raycastable at its expected coordinates');
 }
}
let previous,priorDirection,maxTurn=0,maxStep=0;
for(let i=0;i<=10000;i++){
 const p=cameraPath.getPoint(i/10000),target=targetPath.getPoint(i/10000),direction=target.clone().sub(p).normalize();
 assert(p.y>=9,'Camera remains above terrain');assert(p.distanceTo(target)>5,'No orientation singularities');assert(p.toArray().every(Number.isFinite));
 if(previous)maxStep=Math.max(maxStep,p.distanceTo(previous));
 if(priorDirection)maxTurn=Math.max(maxTurn,direction.angleTo(priorDirection));previous=p;priorDirection=direction;
}
assert(maxStep<1,'No camera position jumps');assert(maxTurn<.02,'No sudden orientation flips');
console.log(`PASS 10,001 route samples: max step ${maxStep.toFixed(3)}m, max orientation change ${(maxTurn*180/Math.PI).toFixed(3)}°`);
const document=await fs.readFile('index.html','utf8');assert(!document.includes('fonts.googleapis'),'Fonts do not require external network');
console.log(`PASS original models: ${meshCount} material-batched meshes, ${Math.round(triangles)} triangles before instancing`);
console.log('Browser screenshots, UI interactions and GPU performance are separate checks, not validated by this script.');
