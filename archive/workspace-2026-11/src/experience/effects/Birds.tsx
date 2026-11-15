import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {BufferGeometry,Float32BufferAttribute,Group} from 'three';
import {useJourney} from '../../stores/journey';
export function Birds(){
 const group=useRef<Group>(null);
 const geometry=useMemo(()=>{const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute([0,0,0,-1,.15,.15,-.3,0,-.15,0,0,0,.3,0,-.15,1,.15,.15],3));g.computeVertexNormals();return g;},[]);
 useFrame(({camera,clock})=>{if(group.current){group.current.position.set(camera.position.x-35,0,-28);if(!useJourney.getState().reduced)group.current.children.forEach((b,i)=>{b.position.x=Math.sin(clock.elapsedTime*.06+i)*40;b.position.y=38+Math.sin(clock.elapsedTime*.3+i)*4+i*1.3;b.rotation.z=Math.sin(clock.elapsedTime*3+i)*.2;});}});
 return <group ref={group}>{Array.from({length:12},(_,i)=><mesh key={i} geometry={geometry} position={[i*4,40+i,-i*7]}><meshBasicMaterial color="#514f41" side={2}/></mesh>)}</group>;
}
