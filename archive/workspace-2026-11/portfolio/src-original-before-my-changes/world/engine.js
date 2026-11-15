import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {createMaterials} from './materials';
import {createLandmarks} from './landmarks';
import {createEnvironment} from './environment';
import {makeAuto} from './geometry';
import {route} from './route';
import {store} from '../core/store';
import {stepDrive,daylight,nearestStop,qualityBudget,degradeQuality} from '../core/journey';
export function createWorld(container,onStatus){
 const mobile=matchMedia('(max-width: 700px)').matches;let quality=qualityBudget({mobile,reduced:store.get().reduced});
 let renderer;
 try{renderer=new THREE.WebGLRenderer({antialias:!mobile,alpha:false,powerPreference:'high-performance'});}catch{return {dispose(){}};}
 const scene=new THREE.Scene();scene.background=new THREE.Color('#ccb894');scene.fog=new THREE.FogExp2('#ccb894',.0034);
 const camera=new THREE.PerspectiveCamera(mobile?62:48,1,.15,2400);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.enabled=quality.shadows;container.append(renderer.domElement);
 const m=createMaterials();onStatus(.15);const env=createEnvironment(scene,renderer,m,quality);onStatus(.4);scene.add(createLandmarks(m,p=>onStatus(.4+p*.55)));
 const auto=makeAuto(m);scene.add(auto);const bike=makeAuto(m,true);bike.visible=false;scene.add(bike);
 const headlight=new THREE.SpotLight(0xffdeb0,0,32,.6,.8,1.5);headlight.position.set(0,1.1,1.45);headlight.target.position.set(0,.1,15);auto.add(headlight,headlight.target);
 const templeLights=[];for(const x of [1230,1625]){const light=new THREE.PointLight(0xffb86e,0,85,2);light.position.set(x,12,-38);scene.add(light);templeLights.push(light);}
 let composer,ao,bloom;
 if(!mobile){composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));ao=new SSAOPass(scene,camera,1,1);ao.kernelRadius=8;ao.minDistance=.002;ao.maxDistance=.12;composer.addPass(ao);bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.17,.55,1.4);composer.addPass(bloom);composer.addPass(new OutputPass());}
 const clock=new THREE.Clock(),look=new THREE.Vector3(),desiredCamera=new THREE.Vector3();let frame=0,drive={position:store.get().target,velocity:0},samples=[],elapsed=0,sinceQuality=0,lastStop=-1,disposed=false;
 const reflected=env.waters.map(w=>w.onBeforeRender.bind(w));let reflectionsPrimed=false,lastReflectionPhase=-1;
 const resize=()=>{const w=innerWidth,h=innerHeight;renderer.setPixelRatio(Math.min(devicePixelRatio,quality.pixelRatio));renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();composer?.setSize(w,h);ao?.setSize(Math.floor(w*.75),Math.floor(h*.75));};resize();window.addEventListener('resize',resize);
 const lost=e=>{e.preventDefault();cancelAnimationFrame(frame);container.dispatchEvent(new CustomEvent('world-error',{detail:'The graphics context was lost. The readable portfolio remains available.'}));};renderer.domElement.addEventListener('webglcontextlost',lost);
 function render(){if(disposed)return;frame=requestAnimationFrame(render);const rawDt=clock.getDelta(),dt=Math.min(rawDt,.05),state=store.get();elapsed+=dt;
  if(document.hidden||state.game)return;
  if(!state.game&&!state.dialog)drive=stepDrive(drive,state.target,dt,state.reduced);
  const p=drive.position,point=route.getPointAt(p),tangent=route.getTangentAt(p);auto.position.copy(point);bike.position.copy(point);const yaw=Math.atan2(tangent.x,tangent.z);auto.rotation.y=yaw;bike.rotation.y=yaw;
  auto.position.y+=Math.sin(elapsed*17)*Math.abs(drive.velocity)*.16;auto.rotation.z=-drive.velocity*.035;for(const vehicle of [auto,bike])vehicle.userData.wheels.forEach(w=>w.rotation.x-=drive.velocity*dt*1600/.3);
  desiredCamera.copy(point).add(new THREE.Vector3(mobile?17:20,mobile?10:9,mobile?31:29));
  const targetLook=point.clone().add(new THREE.Vector3(mobile?8:10,8,-21));const blend=state.reduced||elapsed<.1?1:1-Math.exp(-dt*5);camera.position.lerp(desiredCamera,blend);look.lerp(targetLook,blend);camera.lookAt(look);
  const day=daylight(p);const sky=new THREE.Color(day.a.sky).lerp(new THREE.Color(day.b.sky),day.blend);scene.background.copy(sky);scene.fog.color.set(day.a.fog).lerp(new THREE.Color(day.b.fog),day.blend);env.sun.color.set(day.a.sun).lerp(new THREE.Color(day.b.sun),day.blend);env.sun.intensity=THREE.MathUtils.lerp(day.a.power,day.b.power,day.blend);env.hemisphere.intensity=THREE.MathUtils.lerp(day.a.ambient,day.b.ambient,day.blend);
  const elevation=THREE.MathUtils.lerp(day.a.elevation,day.b.elevation,day.blend);env.sky.material.uniforms.sunPosition.value.set(-.8,elevation,-.5);scene.environmentIntensity=p>.83?.12:.4;
  env.sun.position.copy(point).add(new THREE.Vector3(-95,p>.86?45:Math.max(12,elevation*150),-60));env.sun.target.position.copy(point).add(new THREE.Vector3(0,0,-25));env.sun.target.updateMatrixWorld();
  const night=THREE.MathUtils.smoothstep(p,.65,.95);headlight.intensity=night*24;templeLights.forEach(l=>l.intensity=night*110);m.lamp.emissiveIntensity=.3+night*2;
  for(let i=0;i<env.waters.length;i++){const water=env.waters[i];if(!state.reduced)water.material.uniforms.time.value+=dt*.55;water.material.uniforms.sunDirection.value.copy(env.sky.material.uniforms.sunPosition.value).normalize();water.material.uniforms.sunColor.value.copy(env.sun.color);water.material.uniforms.eye.value.copy(camera.position);
   water.onBeforeRender=(quality.reflection||!reflectionsPrimed||Math.floor(p*8)!==lastReflectionPhase)?reflected[i]:()=>{};
  }
  if(composer){ao.enabled=quality.ao;bloom.enabled=quality.bloom&&!state.reduced;composer.render();}else renderer.render(scene,camera);reflectionsPrimed=true;lastReflectionPhase=Math.floor(p*8);
  if(rawDt<1)samples.push(rawDt);if(samples.length>120)samples.shift();sinceQuality+=dt;
  if(sinceQuality>4&&samples.length>=90){const fps=samples.length/samples.reduce((a,b)=>a+b,0);if(fps<33){quality=degradeQuality(quality);env.sun.castShadow=quality.shadows;renderer.shadowMap.enabled=quality.shadows;resize();}window.__roadtripMetrics={fps:Math.round(fps),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,quality:{...quality}};sinceQuality=0;}
  const stop=nearestStop(p);if(stop!==lastStop||Math.abs(store.get().progress-p)>.0003){store.set({progress:p,stop});lastStop=stop;}
 }
 renderer.compile(scene,camera);onStatus(1);store.set({ready:true});render();
 return {scene,camera,renderer,setVehicle(type){auto.visible=type!=='bike';bike.visible=type==='bike';},dispose(){disposed=true;cancelAnimationFrame(frame);window.removeEventListener('resize',resize);renderer.domElement.removeEventListener('webglcontextlost',lost);composer?.dispose();ao?.dispose();bloom?.dispose();env.dispose();scene.traverse(o=>o.geometry?.dispose());Object.values(m).forEach(material=>{material.map?.dispose();material.bumpMap?.dispose();material.dispose();});renderer.dispose();renderer.domElement.remove();}};
}
