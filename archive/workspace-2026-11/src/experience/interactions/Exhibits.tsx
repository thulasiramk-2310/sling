import {Html} from '@react-three/drei';
import {useState} from 'react';
import {useJourney} from '../../stores/journey';
function Exhibit({position,title,number,onClick}:{position:[number,number,number];title:string;number:string;onClick:()=>void}){
 const [hover,setHover]=useState(false);
 return <group position={position} onPointerOver={(e)=>{e.stopPropagation();setHover(true);document.body.style.cursor='pointer';}} onPointerOut={()=>{setHover(false);document.body.style.cursor='';}} onClick={(e)=>{e.stopPropagation();onClick();}}>
  <mesh castShadow position={[0,1.75,0]}><boxGeometry args={[5,3.5,.4]}/><meshStandardMaterial color={hover?'#c2a36c':'#30413c'} metalness={.4} roughness={.42}/></mesh>
  <mesh position={[0,3.65,0]}><boxGeometry args={[5.3,.1,.65]}/><meshStandardMaterial color="#a98a51" metalness={.7} roughness={.3}/></mesh>
  <Html position={[0,2.1,.25]} transform distanceFactor={9} occlude style={{pointerEvents:'none',width:180,textAlign:'center'}}><div className="world-label"><small>EXHIBIT {number}</small><strong>{title}</strong><span>EXPLORE ↗</span></div></Html>
 </group>;
}
export function Exhibits(){return <>
 <Exhibit position={[9,0,-12]} title="Hello, world." number="01" onClick={()=>useJourney.getState().setPanel('about')}/>
 <Exhibit position={[493,.7,-14]} title="The things I build." number="02" onClick={()=>useJourney.getState().setPanel('work')}/>
 <Exhibit position={[1020,.7,-240]} title="The next chapter." number="03" onClick={()=>useJourney.getState().setPanel('contact')}/>
 </>;}
