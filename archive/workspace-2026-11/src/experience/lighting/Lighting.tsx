import {useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Sky} from '@react-three/drei';
import {DirectionalLight} from 'three';
export function Lighting(){
 const light=useRef<DirectionalLight>(null);
 useFrame(({camera})=>{if(light.current){const x=camera.position.x;light.current.position.set(x-110,100,40);light.current.target.position.set(x,0,-40);light.current.target.updateMatrixWorld();}});
 return <>
  <color attach="background" args={['#c7b69b']}/><fogExp2 attach="fog" args={['#c7b69b',.0024]}/>
  <Sky distance={45000} sunPosition={[-600,140,-700]} turbidity={8} rayleigh={2.5} mieCoefficient={.009} mieDirectionalG={.88}/>
  <hemisphereLight args={['#c1d8d7','#796143',1.65]}/>
  <directionalLight ref={light} castShadow color="#ffe1ab" intensity={3.2} position={[-110,100,40]} shadow-mapSize={[2048,2048]} shadow-camera-left={-120} shadow-camera-right={120} shadow-camera-top={100} shadow-camera-bottom={-100} shadow-camera-near={1} shadow-camera-far={350} shadow-bias={-.00015} shadow-normalBias={.15}/>
 </>;
}
