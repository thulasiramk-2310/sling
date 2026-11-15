import * as THREE from 'three';
// Authored surface maps are synthesized locally. No imagery or texture is fetched.
let seed=1729;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function surface(kind,base){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,512,512);
 for(let i=0;i<2800;i++){const x=random()*512,y=random()*512,r=1+random()*(kind==='sand'?2:13);ctx.fillStyle=`rgba(${random()>.5?'255,245,219':'41,32,19'},${random()*.065})`;ctx.beginPath();ctx.ellipse(x,y,r,r*(.3+random()),0,0,Math.PI*2);ctx.fill();}
 if(kind==='stone')for(let y=0;y<512;y+=64){ctx.strokeStyle='#20170940';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y);for(let x=-128;x<640;x+=128){const xx=x+(y%128?64:0);ctx.moveTo(xx,y);ctx.lineTo(xx,y+64);}ctx.stroke();}
 if(kind==='plaster')for(let i=0;i<24;i++){const x=random()*512;const g=ctx.createLinearGradient(x,0,x+10,512);g.addColorStop(0,'#4b372800');g.addColorStop(1,'#4b372816');ctx.fillStyle=g;ctx.fillRect(x,0,2+random()*8,512);}
 const map=new THREE.CanvasTexture(canvas);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
 const bump=new THREE.CanvasTexture(canvas);bump.wrapS=bump.wrapT=THREE.RepeatWrapping;return {map,bumpMap:bump};
}
export function createMaterials(){
 const plaster=surface('plaster','#e9e1ce'),stone=surface('stone','#bba384'),sand=surface('sand','#b8a17c'),asphalt=surface('sand','#484d47');
 const p=(color,roughness=.85,extra={})=>new THREE.MeshStandardMaterial({color,roughness,...extra});
 return {
 white:p('#eee8d8',.87,{...plaster,bumpScale:.035}),red:p('#913b2c',.8,{...plaster,bumpScale:.04}),stone:p('#9d744b',.93,{...stone,bumpScale:.065}),lightStone:p('#c9a477',.9,{...stone,bumpScale:.045}),darkStone:p('#685641',.94,{...stone,bumpScale:.05}),
 sand:p('#d0bc98',1,{...sand,bumpScale:.06}),road:p('#555c55',.96,{...asphalt,bumpScale:.025}),stripe:p('#e6dbb7'),green:p('#496544'),leaf:p('#4a6235',.9,{side:THREE.DoubleSide}),bark:p('#695441'),
 glass:new THREE.MeshPhysicalMaterial({color:'#789c99',roughness:.12,metalness:0,clearcoat:1,clearcoatRoughness:.08,envMapIntensity:1.4,transparent:true,opacity:.48,depthWrite:false}),metal:p('#666963',.35,{metalness:.75}),gold:p('#c5a36a',.36,{metalness:.7}),
 auto:p('#ce9b28',.43,{metalness:.15}),black:p('#202923',.65),rubber:p('#242422',.97),seat:p('#473c2c',.8),chrome:p('#aaa99c',.24,{metalness:.85}),blue:p('#497c8c',.5),boat:p('#42676e'),pink:p('#a87171'),cyan:p('#6e9a98'),cream:p('#c4bca5'),
 lamp:p('#ffd393',.4,{emissive:'#ffbc63',emissiveIntensity:2.1}),roof:p('#71574b'),
 };
}
