import * as THREE from 'three';
import {Batch} from './geometry';
import {modelManifest} from '../content/models';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
function ornament(b,x,y,z,s){b.box([s*.5,s*.12,s*.35],[x,y-s*.4,z],'darkStone');b.sphere(s*.12,[x,y+s*.3,z],'lightStone',[.8,1,.7]);b.cylinder(s*.16,s*.46,[x,y,z],'lightStone',7,s*.2);for(const side of [-1,1])b.rod([x+side*s*.1,y+s*.16,z],[x+side*s*.28,y-s*.09,z],s*.035,'lightStone');}
function vimana(b,x,z,width,height,tiers){
 for(let i=0;i<5;i++)b.box([width+2-i*.25,.28,width+2-i*.25],[x,.2+i*.28,z],i%2?'stone':'lightStone');
 const base=height*.22;b.box([width,base,width],[x,base/2+1.6,z],'stone',1);
 for(let k=0;k<6;k++)for(const side of [-1,1]){const d=(k-2.5)*width/6;b.box([.3,base,.35],[x+d,base/2+1.6,z+side*width*.505],'lightStone');b.box([.35,base,.3],[x+side*width*.505,base/2+1.6,z+d],'lightStone');}
 b.box([width*.2,base*.7,.05],[x,base*.4+1.4,z+width*.501],'darkStone');
 const step=(height-base-4)/tiers,start=base+1.7;
 for(let i=0;i<tiers;i++){
 const w=width*(1-i/(tiers+1)*.84),y=start+i*step;
 b.box([w,step*.8,w],[x,y+step*.4,z],'stone');b.box([w+.7,.2,w+.7],[x,y+step*.86,z],'darkStone');b.box([w+1,.16,w+1],[x,y+step*.99,z],'lightStone');
 const count=Math.max(2,Math.floor(w/2));for(const side of [-1,1])for(let j=0;j<count;j++){
 const d=-w*.42+j*w*.84/(count-1);ornament(b,x+d,y+step*.4,z+side*w*.51,Math.min(1.2,step*.65));ornament(b,x+side*w*.51,y+step*.4,z+d,Math.min(1.2,step*.65));
 }
 for(const xx of [-1,1])for(const zz of [-1,1])b.cylinder(.36,.5,[x+xx*w*.46,y+step+.2,z+zz*w*.46],'lightStone',8,.08);
 }
 const top=start+tiers*step;b.cylinder(width*.22,.6,[x,top+.25,z],'lightStone',8);b.sphere(width*.22,[x,top+width*.12+.5,z],'lightStone',[1,.75,1]);b.cylinder(.15,1,[x,top+width*.3+1,z],'gold',12,.04);
}
function gopuram(b,x,z,height=27,width=15,colored=false){
 const stone=colored?'cream':'stone';for(const side of [-1,1])b.box([width*.3,height*.22,6],[x+side*width*.35,height*.11,z],stone,1);
 const colors=colored?['cyan','pink','cream','blue','green']:['stone','lightStone'];
 for(let i=0;i<8;i++){const w=width*(1-i*.085),y=height*.22+i*height*.085;b.box([w,height*.07,6-i*.4],[x,y,z],colors[i%colors.length]);b.box([w+.7,.22,6.6-i*.4],[x,y+height*.04,z],'lightStone');for(let j=0;j<Math.floor(w/1.4);j++){const xx=x-w/2+.8+j*1.4;ornament(b,xx,y, z+(6-i*.4)/2+.13,1);}}
 for(let i=-2;i<=2;i++)b.cylinder(.15,1.2,[x+i*1.4,height*.94,z],'gold',8,.06);
}
function central(b){
 b.box([66,12,15],[0,6,0],'red',1);b.box([68,.5,17],[0,12.3,0],'white');
 for(let x=-29;x<=29;x+=4){b.box([1.7,5,.12],[x,5,7.6],'glass');b.box([2.3,.25,1],[x,7.7,7.9],'white');b.cylinder(.24,10,[x-1.3,5,8.1],'white',10);}
 for(const x of [-29,29]){b.box([7,18,9],[x,9,0],'red',1);b.add(new THREE.ConeGeometry(5,7,4),[x,21,0],'roof',[0,Math.PI/4,0]);}
 b.box([9,26,10],[0,13,0],'red',1);b.box([10,.5,11],[0,26.3,0],'white');b.add(new THREE.ConeGeometry(6,8,4),[0,30.5,0],'roof',[0,Math.PI/4,0]);
 const clock=new THREE.CircleGeometry(1.8,32);b.add(clock,[0,21,5.03],'white');b.rod([0,21,5.08],[0,22.2,5.08],.05,'black');b.rod([0,21,5.08],[.8,20.7,5.08],.05,'black');
}
function lighthouse(b){
 for(let i=0;i<6;i++)b.add(new THREE.CylinderGeometry(3.9,3.9,6.2,3),[0,3.1+i*6.2,0],i%2?'white':'red',[0,Math.PI/6,0]);
 for(let y=3;y<36;y+=3.2){b.box([.6,1.2,.1],[-.4,y,1.97],'glass');b.box([1,.12,.3],[-.4,y-.66,2.02],'white');}
 for(const y of [37.5,40.5]){b.cylinder(4.8,.28,[0,y,0],'white',32);for(let i=0;i<32;i++){const a=i*Math.PI*2/32,c=(i+1)*Math.PI*2/32;b.rod([Math.cos(a)*4.5,y,Math.sin(a)*4.5],[Math.cos(a)*4.5,y+1.1,Math.sin(a)*4.5],.04,'metal');b.rod([Math.cos(a)*4.5,y+1.1,Math.sin(a)*4.5],[Math.cos(c)*4.5,y+1.1,Math.sin(c)*4.5],.05,'metal');}}
 b.cylinder(2.8,3.2,[0,39,0],'glass',24);for(let i=0;i<12;i++){const a=i*Math.PI*2/12;b.rod([Math.cos(a)*2.85,37.6,Math.sin(a)*2.85],[Math.cos(a)*2.85,40.4,Math.sin(a)*2.85],.06,'white');}
 b.cylinder(3.5,.4,[0,40.9,0],'red',24);b.cylinder(3.5,1.6,[0,41.8,0],'red',24,.5);b.cylinder(.12,2,[0,43.5,0],'metal');b.cylinder(.6,1.4,[0,39,0],'lamp');b.box([16,4,11],[0,2,-7],'white',1);
}
function shore(b){b.box([46,.6,65],[0,.3,0],'lightStone');vimana(b,0,-10,10,22,7);vimana(b,0,11,7,15,5);for(const side of [-1,1]){b.box([.8,1.5,65],[side*22,1,0],'stone');for(let z=-29;z<=29;z+=3){b.box([1.6,.4,1.8],[side*22,2,z],'lightStone');b.sphere(.45,[side*22,2.55,z],'darkStone',[1,.65,1.4]);}}}
function rathas(b){for(let i=0;i<5;i++){const x=(i%3)*11-11,z=Math.floor(i/3)*15;b.box([8,1,10],[x,.5,z],'stone');if(i<3)vimana(b,x,z,6,10+i*2,3+i);else{b.box([7,5,10],[x,3,z],'stone');b.add(new THREE.CylinderGeometry(3,3,10,12,1,false,0,Math.PI),[x,5,z],'stone',[Math.PI/2,0,0]);}}b.sphere(2.6,[21,2.6,14],'darkStone',[1,.8,1.8]);}
function brihadisvara(b){
 b.box([106,.4,148],[0,.2,0],'lightStone');vimana(b,0,-18,23,61,13);
 b.box([20,3,40],[0,1.9,14],'stone');for(const side of [-1,1])for(let z=-3;z<33;z+=3)b.box([.65,6,.65],[side*9,6,z],'lightStone');b.box([22,.7,42],[0,9,14],'lightStone');
 for(const side of [-1,1]){b.box([9,.6,145],[side*48,6,0],'stone');for(let z=-68;z<71;z+=4)b.box([.45,5.5,.45],[side*44,3,z],'lightStone');}
 for(const side of [-1,1])for(const z of [46,54])b.cylinder(.4,6,[side*5,4,z],'lightStone',10);b.box([13,.7,12],[0,7.5,50],'lightStone');b.box([12,1.6,11],[0,.8,50],'stone');b.sphere(2.1,[0,3,50],'darkStone',[.85,.7,1.5]);b.sphere(1,[0,4,53],'darkStone');for(const x of [-.65,.65])b.cylinder(.15,1.3,[x,5,53],'darkStone',8,.02);
 gopuram(b,0,70,22,17);gopuram(b,0,84,14,13);
}
function madurai(b){b.box([96,1,90],[0,.5,0],'darkStone');for(const [x,z,h] of [[0,42,43],[0,-42,37],[-43,0,32],[43,0,35]])gopuram(b,x,z,h,19,true);for(const side of [-1,1])b.box([80,7,5],[0,3.5,side*35],'cream');b.box([34,.5,23],[0,.3,5],'blue');for(let i=0;i<4;i++)vimana(b,(i%2)*20-10,-10-Math.floor(i/2)*18,6,13,4);}
function bridge(b){for(let x=-90;x<110;x+=18){b.box([16,.8,8],[x,5,0],'cream');for(const z of [-3.8,3.8]){b.rod([x-8,7,z],[x+8,7,z],.07,'white');for(let dx=-7;dx<=7;dx+=3.5)b.rod([x+dx,5.5,z],[x+dx,7,z],.06,'white');}b.cylinder(.8,10,[x,-.2,0],'darkStone',12);}
 for(const x of [-22,22]){b.box([2.4,18,2.4],[x,13,-7],'cream',1);b.box([2.4,18,2.4],[x,13,-17],'cream',1);b.rod([x,21,-7],[x,21,-17],.6,'cream');}
 for(let x=-20;x<20;x+=5){b.rod([x,9,-7],[x+5,14,-7],.18,'metal');b.rod([x,14,-7],[x+5,9,-7],.18,'metal');b.rod([x,9,-17],[x+5,14,-17],.18,'metal');b.rod([x,14,-17],[x+5,9,-17],.18,'metal');}
}
const definitions={lighthouse,central,shore,rathas,brihadisvara,madurai,pamban:bridge,islandTemple:b=>gopuram(b,0,0,25,17,true)};
const placements=[['lighthouse',[28,0,-33]],['central',[-42,0,-105]],['shore',[425,0,-39]],['rathas',[373,0,-74]],['brihadisvara',[830,0,-66]],['madurai',[1230,0,-65]],['pamban',[1510,0,0]],['islandTemple',[1638,4,-61]]];
export function createLandmarks(materials,onProgress=()=>{}){
 const group=new THREE.Group();let complete=0;
 for(const [key,position] of placements){const batch=new Batch(materials);definitions[key](batch);const procedural=batch.finish();procedural.position.set(...position);group.add(procedural);const override=modelManifest[key];
  if(override?.url)new GLTFLoader().load(override.url,gltf=>{gltf.scene.position.set(...position);gltf.scene.scale.setScalar(override.scale??1);gltf.scene.rotation.set(...(override.rotation??[0,0,0]));gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});group.remove(procedural);procedural.traverse(o=>o.geometry?.dispose());group.add(gltf.scene);onProgress(++complete/placements.length);},undefined,()=>onProgress(++complete/placements.length));else onProgress(++complete/placements.length);
 }return group;
}
