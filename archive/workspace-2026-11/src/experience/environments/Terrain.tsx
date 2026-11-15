import {useTexture} from '@react-three/drei';
import {useMemo} from 'react';
import {RepeatWrapping,SRGBColorSpace,InstancedMesh,Object3D} from 'three';
import {useLayoutEffect,useRef} from 'react';
export function Terrain(){
 const [sand,normal]=useTexture(['/textures/sand-color.webp','/textures/sand-normal.webp']);
 useMemo(()=>{sand.wrapS=sand.wrapT=normal.wrapS=normal.wrapT=RepeatWrapping;sand.repeat.set(250,120);normal.repeat.set(250,120);sand.colorSpace=SRGBColorSpace;sand.anisotropy=8;},[sand,normal]);
 return <group>
  <mesh rotation={[-Math.PI/2,0,0]} position={[500,-.25,-571]} receiveShadow><planeGeometry args={[2600,1200]}/><meshStandardMaterial map={sand} normalMap={normal} color="#d7c19c" roughness={1}/></mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[500,-.19,22]} receiveShadow><planeGeometry args={[2600,12]}/><meshStandardMaterial map={sand} color="#8b8063" roughness={.35}/></mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[1030,-.15,-195]} receiveShadow><planeGeometry args={[460,340]}/><meshStandardMaterial color="#777546" roughness={1}/></mesh>
  <DistantGreenery/>
 </group>;
}
function DistantGreenery(){
 const trunks=useRef<InstancedMesh>(null),crowns=useRef<InstancedMesh>(null);
 const dummy=useMemo(()=>new Object3D(),[]);
 useLayoutEffect(()=>{
  for(let i=0;i<320;i++){
   const x=-450+(i*97.31)%2050,z=-100-((i*47.43)%500),s=.6+((i*3.7)%1)*1.1;
   dummy.position.set(x,2*s,z);dummy.scale.set(s,s,s);dummy.updateMatrix();trunks.current!.setMatrixAt(i,dummy.matrix);
   dummy.position.y=6*s;dummy.scale.set(3*s,4*s,3*s);dummy.updateMatrix();crowns.current!.setMatrixAt(i,dummy.matrix);
  }trunks.current!.instanceMatrix.needsUpdate=true;crowns.current!.instanceMatrix.needsUpdate=true;
 },[dummy]);
 return <><instancedMesh ref={trunks} args={[undefined,undefined,320]}><cylinderGeometry args={[.2,.4,4,6]}/><meshStandardMaterial color="#50452f"/></instancedMesh><instancedMesh ref={crowns} args={[undefined,undefined,320]} castShadow><icosahedronGeometry args={[1,2]}/><meshStandardMaterial color="#4d5b33" roughness={1}/></instancedMesh></>;
}
