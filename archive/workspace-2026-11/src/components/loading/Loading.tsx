import {useProgress} from '@react-three/drei';
import {useJourney} from '../../stores/journey';
import {useEffect,useState} from 'react';
export function Loading(){
 const {progress,errors}=useProgress();const ready=useJourney(s=>s.ready);const [gone,setGone]=useState(false);const [slow,setSlow]=useState(false);
 useEffect(()=>{if(ready){const t=setTimeout(()=>setGone(true),700);return()=>clearTimeout(t);}},[ready]);
 useEffect(()=>{const t=setTimeout(()=>setSlow(true),18000);return()=>clearTimeout(t);},[]);
 if(gone)return null;
 return <div className={`loader ${ready?'loaded':''}`} role="status" aria-live="polite"><span className="loader-symbol">த</span><p>A LITTLE CLOSER TO HOME</p><div className="loading-line"><i style={{width:`${ready?100:progress}%`}}/></div><small>{errors.length?'A world asset could not be loaded. Please refresh.':slow?'Still preparing the world. You can continue to the story.':`${Math.round(progress)}% · PREPARING TAMIL NADU`}</small>{(slow||errors.length>0)&&<button onClick={()=>setGone(true)}>Continue to the story ↗</button>}</div>;
}
