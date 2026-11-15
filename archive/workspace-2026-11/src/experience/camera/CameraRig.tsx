import {useRef,useMemo} from 'react';
import {useFrame} from '@react-three/fiber';
import {MathUtils,Vector3,PerspectiveCamera} from 'three';
import {useJourney} from '../../stores/journey';
import {cameraPath,targetPath} from './route';
export function CameraRig(){
 const t=useRef(useJourney.getState().progress);const target=useMemo(()=>new Vector3(),[]);
 useFrame(({camera,size},dt)=>{
  const {progress,reduced}=useJourney.getState();
  t.current=reduced?progress:MathUtils.damp(t.current,progress,4.5,Math.min(dt,.05));
  cameraPath.getPoint(t.current,camera.position);targetPath.getPoint(t.current,target);
  if(size.width<650)camera.position.y+=9;
  camera.lookAt(target);
  const cam=camera as PerspectiveCamera;const fov=size.width<650?62:47;
  if(cam.fov!==fov){cam.fov=fov;cam.updateProjectionMatrix();}
 });return null;
}
