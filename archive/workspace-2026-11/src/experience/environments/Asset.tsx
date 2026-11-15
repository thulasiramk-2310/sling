import {useGLTF,useTexture} from '@react-three/drei';
import {useMemo} from 'react';
import {Mesh,MeshStandardMaterial,RepeatWrapping,SRGBColorSpace,Vector2} from 'three';
export function Asset({url,position=[0,0,0]}:{url:string;position?:[number,number,number]}){
 const {scene}=useGLTF(url);
 const [stone,normal]=useTexture(['/textures/granite-color.webp','/textures/granite-normal.webp']);
 const model=useMemo(()=>{
  stone.wrapS=stone.wrapT=normal.wrapS=normal.wrapT=RepeatWrapping;stone.colorSpace=SRGBColorSpace;stone.anisotropy=4;
  const copy=scene.clone(true);const materials=new Map();
  copy.traverse(obj=>{if(obj instanceof Mesh){obj.castShadow=true;obj.receiveShadow=true;obj.frustumCulled=true;
   const orig=obj.material as MeshStandardMaterial;
   if(!materials.has(orig.uuid)){
    const m=orig.clone();if(/stone|ivory|white|sandstone|ochre/.test(m.name)){m.map=stone;m.normalMap=normal;m.normalScale=new Vector2(.24,.24);m.roughness=.88;}
    materials.set(orig.uuid,m);
   }obj.material=materials.get(orig.uuid);
  }});return copy;
 },[scene,stone,normal]);
 return <primitive object={model} position={position}/>;
}
