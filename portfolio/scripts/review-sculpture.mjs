// Run against the local Vite server and a task-owned Chrome CDP instance.
// node scripts/review-sculpture.mjs [desktop|phone|studio]
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import {sample} from '../src/scene/timeline.js'
import {storyAt} from '../src/scene/story.js'
const mode=process.argv[2]||'desktop',phone=mode==='phone',studio=mode==='studio'
const low=process.argv.includes('--low')
const candidate=process.argv.find(arg=>arg.startsWith('--candidate='))?.slice(12)
const clay=process.argv.includes('--clay'),pedestal=process.argv.includes('--pedestal'),label=mode+(candidate?'-candidate':'')+(low?'-low':'')+(pedestal?'-pedestal':'')+(clay?'-clay':'')
if(candidate && (!studio || pedestal))throw new Error('Candidate geometry requires the figure studio')
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
if(mode==='studio'){
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
  const positions=process.argv.includes('--water-audit')?[[.973,'water-default',{shadows:true,reflections:true,ao:true,bloom:true}],[.973,'water-no-shadow',{shadows:false,reflections:true,ao:true,bloom:true}],[.973,'water-no-reflection',{shadows:true,reflections:false,ao:true,bloom:true}],[.973,'water-no-ao',{shadows:true,reflections:true,ao:false,bloom:true}],[.973,'water-no-bloom',{shadows:true,reflections:true,ao:true,bloom:false}],[.973,'water-minimal',{shadows:false,reflections:false,ao:false,bloom:false}]]:process.argv.includes('--journey')?[[.02,'opening-sky'],[.172,'under-bridge'],[.245,'introduction'],[.49,'mamallapuram'],[.635,'thanjavur'],[.725,'madurai'],[.815,'rameswaram'],...ending]:visits?[[.44,'elephant-visit'],[.471,'rathas-visit'],[.612,'nandi-visit'],[.49,'mamallapuram-return'],[.635,'thanjavur-return']]:(process.argv.includes('--poet-only')||process.argv.includes('--ending'))?ending:[[.49,'mamallapuram'],[.59,'thanjavur-approach'],[.635,'thanjavur'],[.725,'madurai'],...ending]
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
