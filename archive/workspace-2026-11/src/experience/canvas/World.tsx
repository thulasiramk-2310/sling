import {Suspense,lazy,useEffect,useState,useRef,Component,memo,type ReactNode} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {PerformanceMonitor} from '@react-three/drei';
import {ACESFilmicToneMapping,PCFSoftShadowMap} from 'three';
import {useJourney} from '../../stores/journey';
import {CameraRig} from '../camera/CameraRig';
import {Lighting} from '../lighting/Lighting';
import {Ocean} from '../materials/Ocean';
import {Terrain} from '../environments/Terrain';
import {Birds} from '../effects/Birds';
import {Exhibits} from '../interactions/Exhibits';
import Chennai from '../environments/chennai/Chennai';
const Mamallapuram=lazy(()=>import('../environments/mamallapuram/Mamallapuram'));
const Thanjavur=lazy(()=>import('../environments/thanjavur/Thanjavur'));
function Destinations(){
 const p=useJourney(s=>s.progress);
 // Keep already loaded regions resident so reverse travel never causes a loading flash.
 const [shore,setShore]=useState(false),[temple,setTemple]=useState(false);
 useEffect(()=>{if(p>.28)setShore(true);if(p>.58)setTemple(true);},[p]);
 return <><Chennai/>{shore&&<Suspense fallback={null}><Mamallapuram/></Suspense>}{temple&&<Suspense fallback={null}><Thanjavur/></Suspense>}</>;
}
function Ready(){const setReady=useJourney(s=>s.setReady);const gl=useThree(s=>s.gl);useEffect(()=>{setReady(true);const onLost=(e:Event)=>{e.preventDefault();setReady(false);};const onRestored=()=>setReady(true);gl.domElement.addEventListener('webglcontextlost',onLost);gl.domElement.addEventListener('webglcontextrestored',onRestored);return()=>{gl.domElement.removeEventListener('webglcontextlost',onLost);gl.domElement.removeEventListener('webglcontextrestored',onRestored);};},[setReady,gl]);return null;}
function Metrics(){
 const frames=useRef<number[]>([]),last=useRef(0);const gl=useThree(s=>s.gl);
 useFrame(({clock},dt)=>{if(dt<.5){frames.current.push(dt);if(frames.current.length>120)frames.current.shift();}if(clock.elapsedTime-last.current>2){last.current=clock.elapsedTime;const sum=frames.current.reduce((a,b)=>a+b,0);(window as any).__journeyMetrics={fps:Math.round(frames.current.length/sum),drawCalls:gl.info.render.calls,triangles:gl.info.render.triangles,dpr:gl.getPixelRatio(),samples:frames.current.length};}});return null;
}
class RenderBoundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}componentDidCatch(){useJourney.getState().setReady(true);}render(){return this.state.failed?<div className="render-fallback"><h2>The journey needs WebGL.</h2><p>Please use a browser with hardware acceleration enabled. You can still explore the story and projects using the navigation.</p></div>:this.props.children;}}
function CanvasFallback(){useEffect(()=>useJourney.getState().setReady(true),[]);return <div className="render-fallback"><h2>Explore the story.</h2><p>3D is unavailable on this device. Use About, Work, and Contact above.</p></div>;}
function World(){
 const [dpr,setDpr]=useState(Math.min(devicePixelRatio,innerWidth<700?1.25:1.75));
 return <RenderBoundary><Canvas shadows camera={{position:[110,66,155],fov:47,near:.5,far:5000}} dpr={dpr} performance={{min:.5}} gl={{antialias:true,alpha:false,powerPreference:'high-performance',toneMapping:ACESFilmicToneMapping,toneMappingExposure:.9}} onCreated={({gl})=>{gl.shadowMap.type=PCFSoftShadowMap;}} fallback={<CanvasFallback/>}>
  <CameraRig/><Lighting/>
  <Suspense fallback={null}><Terrain/><Ocean/><Destinations/><Birds/><Exhibits/><Ready/></Suspense>
  <PerformanceMonitor onDecline={()=>setDpr(d=>Math.max(.75,d-.25))} onIncline={()=>setDpr(d=>Math.min(innerWidth<700?1.25:1.75,d+.25))} flipflops={3} onFallback={()=>setDpr(1)}/><Metrics/>
 </Canvas></RenderBoundary>;
}

export default memo(World);
