import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export class Batch{
 constructor(materials){this.materials=materials;this.groups=new Map();this.object=new THREE.Object3D();}
 add(geometry,pos,material,rotation=[0,0,0],scale=[1,1,1]){if(geometry.index){const expanded=geometry.toNonIndexed();geometry.dispose();geometry=expanded;}this.object.position.set(...pos);this.object.rotation.set(...rotation);this.object.scale.set(...scale);this.object.updateMatrix();geometry.applyMatrix4(this.object.matrix);if(!this.groups.has(material))this.groups.set(material,[]);this.groups.get(material).push(geometry);}
 box(size,pos,m,bevel=0){const r=Math.min(...size)*.07;this.add(bevel?new RoundedBoxGeometry(...size,1,Math.min(.075,r)):new THREE.BoxGeometry(...size),pos,m);}
 cylinder(radius,height,pos,m,segments=16,top=radius){this.add(new THREE.CylinderGeometry(top,radius,height,segments),pos,m);}
 sphere(radius,pos,m,scale=[1,1,1]){this.add(new THREE.SphereGeometry(radius,12,8),pos,m,[0,0,0],scale);}
 rod(a,b,r,m){const aa=new THREE.Vector3(...a),bb=new THREE.Vector3(...b),direction=bb.clone().sub(aa);const geo=new THREE.CylinderGeometry(r,r,direction.length(),6);const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());geo.applyQuaternion(q);this.add(geo,aa.add(bb).multiplyScalar(.5).toArray(),m);}
 finish(){const group=new THREE.Group();for(const [key,list] of this.groups){const geometry=mergeGeometries(list,false);const mesh=new THREE.Mesh(geometry,this.materials[key]);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);list.forEach(g=>g.dispose());}this.groups.clear();return group;}
}
export function makeAuto(m,bike=false){
 const b=new Batch(m);
 if(bike){
 b.box([.32,.6,1.3],[0,.8,0],'auto',1);b.box([.55,.18,.9],[0,1.1,-.15],'seat',1);b.rod([0,.8,.7],[0,1.4,.55],.05,'chrome');b.rod([-.4,1.4,.5],[.4,1.4,.5],.04,'chrome');
 }else{
 b.box([1.45,.3,2.7],[0,.45,0],'black',1);b.box([1.48,.85,.9],[0,1,.93],'auto',1);b.box([1.48,.6,1.65],[0,.8,-.52],'auto',1);
 const canopy=new THREE.Shape();canopy.moveTo(-.74,1.68);canopy.quadraticCurveTo(-.78,2.12,0,2.16);canopy.quadraticCurveTo(.78,2.12,.74,1.68);canopy.lineTo(.67,1.68);canopy.quadraticCurveTo(.72,2.02,0,2.06);canopy.quadraticCurveTo(-.72,2.02,-.67,1.68);canopy.closePath();b.add(new THREE.ExtrudeGeometry(canopy,{depth:2.25,bevelEnabled:false,curveSegments:12}),[0,0,-1.2],'black');b.box([1.15,.12,.55],[0,.9,-.65],'seat',1);b.box([1.15,.5,.13],[0,1.12,-.92],'seat',1);
 for(const x of [-.67,.67]){b.rod([x,.9,.6],[x,1.85,.75],.04,'chrome');b.rod([x,.8,-1.15],[x,1.85,-1.1],.04,'black');b.box([.06,.75,1.05],[x,1.25,-.4],'black');}
 b.box([1.27,.65,.025],[0,1.48,.76],'glass');b.box([1.05,.13,.1],[0,.67,1.43],'chrome');b.add(new THREE.CylinderGeometry(.13,.13,.08,16),[0,1,1.43],'lamp',[Math.PI/2,0,0]);b.box([.4,.11,.03],[0,.48,1.47],'white');
 b.rod([-.43,1.1,.38],[.43,1.1,.38],.035,'black');
 }
 const body=b.finish(),group=new THREE.Group();group.add(body);group.userData.wheels=[];
 for(const [x,z] of (bike?[[0,.8],[0,-.8]]:[[0,1.02],[-.66,-.85],[.66,-.85]])){
  const wheel=new THREE.Mesh(new THREE.CylinderGeometry(bike?.34:.28,bike?.34:.28,bike?.11:.2,20),m.rubber);wheel.rotation.z=Math.PI/2;const pivot=new THREE.Group();pivot.position.set(x,.3,z);pivot.add(wheel);const hub=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.22,12),m.chrome);hub.rotation.z=Math.PI/2;pivot.add(hub);group.add(pivot);group.userData.wheels.push(pivot);
 }
 group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return group;
}
