import * as THREE from 'three';
import {Sky} from 'three/addons/objects/Sky.js';
import {Water} from 'three/addons/objects/Water.js';
import {Batch} from './geometry';
import {route,roadGeometry} from './route';
export function createEnvironment(scene,renderer,m,quality){
 const sky=new Sky();sky.scale.setScalar(4500);const u=sky.material.uniforms;u.turbidity.value=5;u.rayleigh.value=1.7;u.mieCoefficient.value=.006;u.mieDirectionalG.value=.8;scene.add(sky);
 const sunVector=new THREE.Vector3(-.8,.25,-.5).normalize();u.sunPosition.value.copy(sunVector);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(3000,1300),m.sand);ground.rotation.x=-Math.PI/2;ground.position.set(700,-.3,-600);ground.receiveShadow=true;scene.add(ground);const island=new THREE.Mesh(new THREE.SphereGeometry(65,32,16),m.sand);island.scale.set(1,.07,.8);island.position.set(1660,0,-70);island.receiveShadow=true;scene.add(island);
 const road=new THREE.Mesh(roadGeometry(),m.road);road.receiveShadow=true;scene.add(road);
 const batch=new Batch(m);
 for(let i=0;i<470;i++){const p=route.getPoint(i/470);if(i%3===0)batch.box([1.9,.025,.12],[p.x,p.y+.1,p.z],'stripe');if(i%14===0)for(const side of [-1,1]){batch.cylinder(.055,6,[p.x,p.y+3,p.z+side*5.5],'metal',6);batch.rod([p.x,p.y+6,p.z+side*5.5],[p.x,p.y+6,p.z+side*4.4],.05,'metal');batch.box([.55,.12,1.1],[p.x,p.y+6,p.z+side*4.4],'lamp');}}
 // Irregular urban silhouettes, restrained to the Chennai neighborhood.
 for(let i=0;i<70;i++){const x=-180+(i*37.13)%450,z=-85-((i*21.8)%130),height=5+(i*7.81)%20,w=9+(i*3.2)%10;batch.box([w,height,10],[x,height/2,z],['cream','white','pink'][i%3],1);batch.box([w+.5,.3,10.5],[x,height+.2,z],'white');for(let y=2;y<height;y+=3.1)for(let dx=-w/2+1.5;dx<w/2;dx+=2.7)batch.box([1,1.4,.07],[x+dx,y,z+5.04],'glass');batch.cylinder(.9,1.6,[x+2,height+1,z],'black',12);}
 scene.add(batch.finish());
 // Shore water and ocean around Pamban are separate physical surfaces.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');const image=ctx.createImageData(128,128);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4,dx=Math.sin(x*.42+y*.19)*.15+Math.sin(x*.15-y*.37)*.12,dz=Math.cos(x*.42+y*.19)*.15-Math.cos(x*.15-y*.37)*.12;image.data.set([128+dx*110,128+dz*110,247,255],i);}ctx.putImageData(image,0,0);const normals=new THREE.CanvasTexture(canvas);normals.wrapS=normals.wrapT=THREE.RepeatWrapping;
 const waters=[];
 for(const [size,pos] of [[[1100,1600],[390,-.12,850]],[[470,700],[1580,-.12,-40]]]){
 const water=new Water(new THREE.PlaneGeometry(...size),{textureWidth:quality.reflection?512:128,textureHeight:quality.reflection?512:128,waterNormals:normals,sunDirection:sunVector,sunColor:0xffe2b5,waterColor:0x1f5b61,distortionScale:2.7,fog:true});water.rotation.x=-Math.PI/2;water.position.set(...pos);scene.add(water);waters.push(water);
 }
 const hemisphere=new THREE.HemisphereLight(0xcddae1,0x7c6b4c,.8);scene.add(hemisphere);
 const sun=new THREE.DirectionalLight(0xffdfb6,3);sun.castShadow=quality.shadows;sun.shadow.mapSize.setScalar(quality.shadowSize);Object.assign(sun.shadow.camera,{left:-80,right:80,top:80,bottom:-80,near:1,far:350});sun.shadow.bias=-.00015;sun.shadow.normalBias=.08;scene.add(sun,sun.target);
 const pmrem=new THREE.PMREMGenerator(renderer);const envScene=new THREE.Scene(),envSky=sky.clone();envScene.add(envSky);const envTarget=pmrem.fromScene(envScene,.02,.1,6000);scene.environment=envTarget.texture;scene.environmentIntensity=.4;pmrem.dispose();
 // Original pinnate palms with curved tapered leaves, merged by material.
 const trees=new Batch(m);
 for(let i=0;i<quality.treeCount;i++){
 const x=-170+(i*31.71)%1800,z=-24-((i*13.33)%18),h=6+(i*7.31)%4;
 for(let k=0;k<8;k++)trees.cylinder(.22-k*.012,h/8,[x+.02*k*k,(k+.5)*h/8,z],'bark',7,.2-k*.012);
 for(let j=0;j<8;j++){const a=j*Math.PI/4+i,L=3.3+(i%3)*.3;const vertices=[];for(let k=0;k<8;k++){const t=k/7,cx=x+1+Math.cos(a)*L*t,cz=z+Math.sin(a)*L*t,cy=h+Math.sin(t*Math.PI)*1.2-t*1.3,w=Math.sin(t*Math.PI)*.42;vertices.push(cx+Math.sin(a)*w,cy,cz-Math.cos(a)*w,cx-Math.sin(a)*w,cy,cz+Math.cos(a)*w);}const indices=[];for(let k=0;k<7;k++){const o=k*2;indices.push(o,o+1,o+2,o+1,o+3,o+2);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();geo.setAttribute('uv',new THREE.Float32BufferAttribute(Array.from({length:16},(_,k)=>[k%2,Math.floor(k/2)/7]).flat(),2));trees.add(geo,[0,0,0],'leaf');}
 }scene.add(trees.finish());
 // Original boats around the bridge: curved hull, rim and thwart seats.
 const boats=new Batch(m);for(let i=0;i<13;i++){const x=1440+i*16,z=32+Math.sin(i*2.3)*58;boats.add(new THREE.SphereGeometry(1,16,8,0,Math.PI*2,Math.PI/2,Math.PI/2),[x,.5,z],'boat',[0,i*.7,0],[1.1,.65,3.5]);for(let k=-1;k<=1;k++)boats.box([1.5,.12,.3],[x,.55,z+k*1.1],'roof');boats.rod([x,0,z],[x,4,z],.045,'bark');}scene.add(boats.finish());
 return {sky,sun,hemisphere,waters,envTarget,dispose(){envTarget.dispose();normals.dispose();waters.forEach(w=>w.dispose());}};
}
