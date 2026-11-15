import {useGLTF,Merged} from '@react-three/drei';
import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Group,Mesh} from 'three';
import {Asset} from '../Asset';
import {useJourney} from '../../../stores/journey';
function Palms(){
 const {scene}=useGLTF('/models/palm.glb');const group=useRef<Group>(null);
 const meshes=useMemo(()=>{const list:Record<string,Mesh>={};scene.traverse(o=>{if(o instanceof Mesh)list[o.name]=o;});return list;},[scene]);
 const positions=useMemo(()=>Array.from({length:48},(_,i)=>[-350+i*15,0,i%2?-15:-35] as [number,number,number]),[]);
 useFrame(({clock})=>{if(group.current&&!useJourney.getState().reduced)group.current.rotation.z=Math.sin(clock.elapsedTime*.6)*.003;});
 return <group ref={group}><Merged meshes={meshes} castShadow receiveShadow>{(parts:any)=>positions.map((p,i)=><group key={i} position={p} rotation={[0,i*2.4,0]} scale={.8+(i%4)*.1}>{Object.values(parts).map((Part:any,j)=><Part key={j}/>)}</group>)}</Merged></group>;
}
function Traffic(){
 const group=useRef<Group>(null);
 useFrame((_,dt)=>{if(group.current&&!useJourney.getState().reduced){group.current.children.forEach((o,i)=>{o.position.x+=dt*(i%2?3:-3);if(o.position.x>330)o.position.x=-330;if(o.position.x< -330)o.position.x=330;});}});
 return <group ref={group}>{Array.from({length:18},(_,i)=><group key={i} position={[-300+i*36,.5,i%2?-23:-29]}>
  <mesh castShadow position={[0,.55,0]}><boxGeometry args={[i%5?3.6:8,1.15,1.7]}/><meshStandardMaterial color={['#dad5bd','#a68a57','#6b7f7a','#b06440'][i%4]} roughness={.4}/></mesh>
  <mesh position={[0,1.25,0]}><boxGeometry args={[i%5?1.8:6.5,.7,1.5]}/><meshStandardMaterial color="#233b3d" roughness={.25}/></mesh>
  {[-1.1,1.1].flatMap(x=>[-.85,.85].map(z=><mesh key={`${x}${z}`} rotation={[Math.PI/2,0,0]} position={[x,.2,z]}><cylinderGeometry args={[.33,.33,.16,8]}/><meshStandardMaterial color="#1c1c19"/></mesh>))}
 </group>)}</group>;
}
export default function Chennai(){return <group><Asset url="/models/chennai.glb"/><Palms/><Traffic/></group>;}
