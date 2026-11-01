// Run against the local Vite server and a task-owned Chrome CDP instance.
// node scripts/review-sculpture.mjs [desktop|phone|studio|temple]
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import {sample} from '../src/scene/timeline.js'
import {storyAt} from '../src/scene/story.js'
const mode=process.argv[2]||'desktop',phone=mode==='phone',temple=mode==='temple',studio=mode==='studio'||temple
const low=process.argv.includes('--low')
const candidate=process.argv.find(arg=>arg.startsWith('--candidate='))?.slice(12)
const clay=process.argv.includes('--clay'),pedestal=process.argv.includes('--pedestal'),intro=process.argv.includes('--intro'),madurai=process.argv.includes('--madurai'),all=intro&&process.argv.includes('--journey'),label=mode+(madurai?'-madurai':all?'-product':intro?'-intro':'')+(candidate?'-candidate':'')+(low?'-low':'')+(pedestal?'-pedestal':'')+(clay?'-clay':'')
if(candidate && (!studio || pedestal))throw new Error('Candidate geometry requires the figure studio')
const skills=process.argv.includes('--skills')
const visits=process.argv.includes('--visits')
const targets=await (await fetch('http://127.0.0.1:9224/json/list')).json()
const target=targets.find(t=>t.type==='page')
if(!target) throw new Error('No browser tab on CDP port 9224')
const ws=new WebSocket(target.webSocketDebuggerUrl)
await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}))
let sequence=0
const pending=new Map(),errors=[],assets=new Map(),posesRendered=[]
ws.addEventListener('message',e=>{
  const message=JSON.parse(e.data)
  if(message.id){const p=pending.get(message.id);pending.delete(message.id);if(message.error)p.reject(message.error);else p.resolve(message.result)}
  if(message.method==='Network.responseReceived' && message.params.response.url.includes('/models/')) {const {url,status}=message.params.response;assets.set(url,{url,status})}
  if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails)
  if(message.method==='Runtime.consoleAPICalled' && ['error','assert'].includes(message.params.type))errors.push({console:message.params.args.map(a=>a.value||a.description).join(' ')})
  if(message.method==='Inspector.targetCrashed'){for(const p of pending.values())p.reject(new Error('Browser renderer crashed'));pending.clear()}
})
ws.addEventListener('close',()=>{for(const p of pending.values())p.reject(new Error('Browser tab closed'));pending.clear()})
const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})
const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text+JSON.stringify(r.exceptionDetails.exception));return r.result?.value}
const dir=new URL('../../../review-sculpture/',import.meta.url)
await fs.mkdir(dir,{recursive:true})
await call('Runtime.enable');await call('Page.enable');await call('Inspector.enable');await call('Network.enable')
await call('Emulation.setDeviceMetricsOverride',{width:phone?390:1440,height:phone?844:900,deviceScaleFactor:1,mobile:phone})
await call('Page.addScriptToEvaluateOnNewDocument',{source:'if(location.origin==="http://127.0.0.1:5174"){localStorage.setItem("ram.lang","en");localStorage.setItem("ram.cookies","rejected")} '})
errors.length=0
const navigation=await call('Page.navigate',{url:studio?'http://127.0.0.1:5174/scripts/poet-studio.html':'http://127.0.0.1:5174/?debug&fixed&quality='+(phone?'low':'high')})
if(navigation.errorText)throw new Error('Navigation failed: '+navigation.errorText)
let ready=false
for(let i=0;i<180;i++){
  ready=await evaluate(studio?'document.title==="Poet sculpture review" && document.readyState==="complete"':'!!window.__trip?.metrics() && !document.querySelector(".loader-start").hidden')
  if(ready)break
  await new Promise(r=>setTimeout(r,500))
}
if(!ready)throw new Error('World did not become ready')
console.log(mode+' world loaded')
const capture=async name=>{assert.deepEqual(errors,[],'Browser must remain free of exceptions and shader errors');const r=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile(new URL(label+'-'+name+'.png',dir),Buffer.from(r.data,'base64'));console.log('Captured '+label+' '+name)}
if(!studio) {
  await new Promise(resolve=>setTimeout(resolve,900));await capture('loader-ready')
  await evaluate('document.querySelector(".loader-start").click()')
  for(let i=0;i<100;i++){if(await evaluate('document.getElementById("loader").hidden'))break;await new Promise(r=>setTimeout(r,100))}
}
if(temple){
  const result=await evaluate(`(async()=>{
    const THREE=await import('/node_modules/.vite/deps/three.js');
    const {quality}=await import('/src/scene/quality.js');quality.low=${low};quality.tex=${low}?.5:1;
    const {makeGopuram}=await import('/src/scene/landmarks/gopuram.js');
    const {updateDetailLods}=await import('/src/scene/detail-lod.js');
    const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(1440,900);renderer.setPixelRatio(1);renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
    renderer.domElement.style.cssText='position:fixed;inset:0;z-index:999999';document.body.append(renderer.domElement);document.title='Madurai neutral geometry review';
    const scene=new THREE.Scene();scene.background=new THREE.Color('#ced2cc');scene.add(new THREE.HemisphereLight(0xeaf0f5,0x5e6559,1.1));
    const light=new THREE.DirectionalLight(0xfff4e4,3);light.position.set(-60,100,90);light.target.position.set(0,25,0);light.castShadow=true;
    light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-48,right:48,top:48,bottom:-48,near:1,far:220});light.shadow.normalBias=.01;
    scene.add(light,light.target);light.target.updateMatrixWorld();
    const room=new THREE.Scene();room.background=new THREE.Color('#c0c5c4');const generator=new THREE.PMREMGenerator(renderer),environment=generator.fromScene(room,0,.1,10,{size:64});generator.dispose();scene.environment=environment.texture;scene.environmentIntensity=.35;
    const figure=makeGopuram({tiers:9,baseW:30,baseD:18,tierH:5.4,palette:'madurai',seed:2,podiumH:7});figure.scale.setScalar(52/figure.userData.height);scene.add(figure);
    if(${clay})figure.traverse(object=>{if(object.isMesh){object.material=new THREE.MeshStandardMaterial({color:0xa5a79b,roughness:.93});object.instanceColor=null;}});
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.MeshStandardMaterial({color:0xaeb4aa,roughness:.96}));floor.rotation.x=-Math.PI/2;floor.position.y=-.1;floor.receiveShadow=true;scene.add(floor);
    scene.traverse(object=>{if(object.isMesh){object.castShadow=object!==floor;object.receiveShadow=true;}});
    const camera=new THREE.PerspectiveCamera(35,1440/900,.1,500);camera.position.set(54,30,110);camera.lookAt(0,25,0);updateDetailLods(scene,camera,900);renderer.render(scene,camera);
    window.__templeStudio={renderer,scene,camera,updateDetailLods};return {calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
  })()`)
  console.log(JSON.stringify(result));await capture('neutral')
  for(const [name,eye,look] of [['front',[0,30,122],[0,25,0]],['crown',[30,47,35],[0,47,0]],['register',[12,11,32],[0,10,8]]]){
    await evaluate(`(()=>{const {renderer,scene,camera,updateDetailLods}=window.__templeStudio;camera.position.set(${eye.join(',')});camera.lookAt(${look.join(',')});updateDetailLods(scene,camera,900);renderer.render(scene,camera)})()`)
    await capture('neutral-'+name)
  }
}else if(mode==='studio'){
  const result=await evaluate(`(async()=>{
    const THREE=await import('/node_modules/.vite/deps/three.js');
    const {poetStatue}=await import('/src/scene/landmarks/poet-statue.js');
    const {poetPedestal}=await import('/src/scene/landmarks/poet-pedestal.js');
    const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(1440,900);renderer.setPixelRatio(1);renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.domElement.style.cssText='position:fixed;inset:0;z-index:999999';document.body.append(renderer.domElement);
    const scene=new THREE.Scene();scene.background=new THREE.Color('#d9ddd9');scene.add(new THREE.HemisphereLight(0xe6f2ff,0x51483b,2));
    const light=new THREE.DirectionalLight(0xffedd8,3);light.position.set(-15,35,30);scene.add(light);
    const stone=${low}?new THREE.MeshLambertMaterial({color:0x797b72}):new THREE.MeshStandardMaterial({color:0x797b72,roughness:.93});
    const figure=${pedestal}?poetPedestal(stone,new THREE.MeshStandardMaterial({color:0x393d3b,roughness:1}),${low}):poetStatue(stone,${low});
    if(${!!candidate}) {
      const {GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
      const gltf=await new GLTFLoader().loadAsync(${JSON.stringify(candidate||'')});
      gltf.scene.updateMatrixWorld(true);
      const meshes=[];gltf.scene.traverse(object=>{if(object.isMesh)meshes.push(object)});
      if(meshes.length!==1)throw new Error('Expected one finished figure mesh');
      const geometry=meshes[0].geometry.clone().applyMatrix4(meshes[0].matrixWorld);
      figure.children[0].geometry.dispose();figure.children[0].geometry=geometry;
    }
    if(${clay}){figure.children[0].material.onBeforeCompile=()=>{};figure.children[0].material.customProgramCacheKey=()=> 'clay-review';}
    scene.add(figure);
    const camera=new THREE.PerspectiveCamera(33,1440/900,.1,200);camera.position.set(...(${pedestal}?[12,9,29]:[12,19,61]));camera.lookAt(0,${pedestal?6:14},0);renderer.render(scene,camera);
    window.__poetStudio={renderer,scene,camera};
    return {calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
  })()`)
  console.log(JSON.stringify(result));await capture('statue')
  const poses=pedestal?[['front',[0,8,32],[0,6,0]],['left',[18,9,27],[0,6,0]],['side',[32,8,4],[0,6,0]]]:[['front',[0,18,64],[0,14,0]],['left',[32,18,53],[0,14,0]],['right',[-32,18,53],[0,14,0]],['side',[61,18,8],[0,14,0]],['face',[0,24.5,13],[0,24.5,0]],['raised-hand',[-3,19.8,10.5],[-3,19.8,1.9]],['manuscript',[1.4,18,10.5],[1.4,17.6,1.9]]]
  for(const [name,eye,target] of poses) {
    await evaluate(`(()=>{const {renderer,scene,camera}=window.__poetStudio;camera.position.set(${eye.join(',')});camera.lookAt(${target.join(',')});renderer.render(scene,camera)})()`)
    await capture('statue-'+name)
  }
}else{
  const ending=[[.915,'kanyakumari'],[.947,'poet-visit'],...((process.argv.includes('--ending')||process.argv.includes('--journey'))?[[.973,'poet-exit'],[.987,'sky-farewell']]:[])]
  const introduction=[[.205,'arrival-start'],[.225,'arrival-walk'],[.237,'arrival-turn'],[.245,'introduction'],[.292,'boarding-start'],[.315,'boarding-seat'],[.33,'departure'],[.342,'driveway-crossing'],[.3705,'road-merge'],[.38,'riding-start']]
  const journey=[[.02,'opening-sky'],[.172,'under-bridge'],[.245,'introduction'],[.414,'elephant-entry'],[.44,'elephant-visit'],[.457,'rathas-entry'],[.471,'rathas-visit'],[.49,'mamallapuram'],[.589,'nandi-entry'],[.612,'nandi-visit'],[.635,'thanjavur'],[.700,'madurai-approach'],[.715,'madurai-detail'],[.725,'madurai'],[.815,'rameswaram'],[.935,'poet-entry'],...ending]
  const positions=process.argv.includes('--opening')?[[.02,'opening-sky'],[.09,'coastal-establishing'],[.13,'bridge-approach'],[.172,'arch-frame'],[.18,'arch-threshold'],[.19,'bridge-exit'],[.213,'arrival-start']]:process.argv.includes('--nandi')?[[.589,'nandi-entry'],[.600,'nandi-approach'],[.612,'nandi-detail'],[.625,'nandi-exit']]:skills?[[.37,'skills-start'],[.414,'skills-sign-overlap'],[.49,'skills-reading']]:madurai?[[.700,'approach'],[.715,'detail'],[.725,'reading'],[.735,'return']]:all?[...journey,...introduction].sort((a,b)=>a[0]-b[0]).filter((value,index,list)=>index===0||value[0]!==list[index-1][0]):intro?introduction:process.argv.includes('--water-audit')?[[.973,'water-default',{shadows:true,reflections:true,ao:true,bloom:true}],[.973,'water-no-shadow',{shadows:false,reflections:true,ao:true,bloom:true}],[.973,'water-no-reflection',{shadows:true,reflections:false,ao:true,bloom:true}],[.973,'water-no-ao',{shadows:true,reflections:true,ao:false,bloom:true}],[.973,'water-no-bloom',{shadows:true,reflections:true,ao:true,bloom:false}],[.973,'water-minimal',{shadows:false,reflections:false,ao:false,bloom:false}]]:process.argv.includes('--journey')?journey:visits?[[.44,'elephant-visit'],[.471,'rathas-visit'],[.612,'nandi-visit'],[.49,'mamallapuram-return'],[.635,'thanjavur-return']]:(process.argv.includes('--poet-only')||process.argv.includes('--ending'))?ending:[[.49,'mamallapuram'],[.59,'thanjavur-approach'],[.635,'thanjavur'],[.715,'madurai-detail'],[.725,'madurai'],...ending]
  for(const [u,name,effects] of positions){
    if(effects)await evaluate('window.__trip.effects('+JSON.stringify(effects)+')')
    const metrics=await evaluate('window.__trip.inspect('+u+')');posesRendered.push({progress:u,name,metrics,...(process.argv.includes('--profile')?{profile:await evaluate('window.__trip.profile()')}:{})});
    if(!phone) {
      const road=storyAt(u).road,expected=sample(road).top
      assert.ok(Math.abs(metrics.environment.road-road)<1e-8,'Lighting map must follow the inspected destination')
      assert.ok(metrics.environment.top.every((value,i)=>Math.abs(value-expected[i])<1e-8),'Lighting map must use the current sky on its first frame')
    }
    // Let the chapter rail's CSS transitions settle at the inspected position.
    await new Promise(resolve=>setTimeout(resolve,500));await capture(name)
  }
}
const credits=studio?null:await evaluate('document.getElementById("credits").textContent')
if(!studio) {
  const manifest=JSON.parse(await fs.readFile(new URL('../public/models/models.json',import.meta.url)))
  const entry=manifest['poet-figure'],file=phone&&entry.lowFile?entry.lowFile:entry.file
  assert.ok([...assets.values()].some(asset=>asset.status===200 && asset.url.endsWith('/'+file)),'Configured original poet GLB must load successfully')
  assert.ok(credits.includes(entry.credit),'The model loader must accept the configured poet GLB rather than use its fallback')
}
const result={mode,errors,credits,assets:[...assets.values()],poses:posesRendered,layout:await evaluate('({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth})')}
console.log(JSON.stringify({mode,errors,layout:result.layout,assets:result.assets,poses:posesRendered.map(pose=>({name:pose.name,drawCalls:pose.metrics.drawCalls,triangles:pose.metrics.triangles,primaryPassTriangles:pose.profile?.primaryPassTriangles}))}));await fs.writeFile(new URL(label+(process.argv.includes('--water-audit')?'-water-audit':'')+'-results.json',dir),JSON.stringify(result,null,2));ws.close()
