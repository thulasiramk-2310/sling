// Real normal-motion cadence on the configured WebGL renderer.
// This is environment-specific evidence, not a hardware-GPU benchmark.
// Run: node scripts/review-motion.mjs [desktop|phone]
import fs from 'node:fs/promises'
const phone=process.argv[2]==='phone',width=phone?390:1440,height=phone?844:900
const targets=await (await fetch('http://127.0.0.1:9224/json/list')).json()
const ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl)
await new Promise(r=>ws.addEventListener('open',r,{once:true}))
const pending=new Map(),errors=[];let sequence=0
ws.addEventListener('message',e=>{
  const m=JSON.parse(e.data)
  if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(m.error);else p.resolve(m.result)}
  if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails)
  if(m.method==='Runtime.consoleAPICalled' && ['error','assert'].includes(m.params.type))errors.push({console:m.params.args.map(a=>a.value||a.description).join(' ')})
  if(m.method==='Inspector.targetCrashed')for(const p of pending.values())p.reject(new Error('Renderer crashed'))
})
ws.addEventListener('close',()=>{for(const p of pending.values())p.reject(new Error('Tab closed'));pending.clear()})
const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})
const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result?.value}
const delay=ms=>new Promise(r=>setTimeout(r,ms))
const until=async(expression,timeout=20000)=>{const end=Date.now()+timeout;do{if(await evaluate(expression))return;await delay(100)}while(Date.now()<end);throw new Error('Timed out: '+expression)}
await call('Runtime.enable');await call('Page.enable');await call('Inspector.enable')
await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:phone})
await call('Emulation.setTouchEmulationEnabled',{enabled:phone,maxTouchPoints:1})
await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]})
await call('Page.addScriptToEvaluateOnNewDocument',{source:'if(location.origin==="http://127.0.0.1:5174"){localStorage.setItem("ram.lang","en");localStorage.setItem("ram.cookies","rejected")} '})
// Runtime.enable can report exceptions retained by the previously open page.
// Begin the product error audit before navigating to the document under test.
errors.length=0
const navigation=await call('Page.navigate',{url:'http://127.0.0.1:5174/?debug&quality='+(phone?'low':'high')})
if(navigation.errorText)throw new Error('Navigation failed: '+navigation.errorText)
await until('!!window.__trip?.metrics() && !document.querySelector(".loader-start").hidden',90000)

console.log('World ready');
await evaluate('document.querySelector(".loader-start").click()');await until('document.getElementById("loader").hidden',90000)
console.log('Start transition complete');
// Keep one authored pose while rendering on the browser's real frame cadence.
// Resuming the navigation ticker here would drive back toward the old scroll
// position, changing the scene and invalidating this pose-specific comparison.
await evaluate('window.__trip.inspect(.947);true');console.log('Sampling normal-motion cadence at the poet visit')
const result=await evaluate(`new Promise(resolve=>{
  const before=window.__trip.metrics(),start=performance.now(),intervals=[];let last=null,ended=false;
  const observe=()=>{if(ended)return;const now=performance.now();if(last!==null){const delta=now-last;intervals.push(delta);window.__trip.sampleFrame(delta/1000)}last=now;requestAnimationFrame(observe)};
  requestAnimationFrame(observe);
  setTimeout(()=>{ended=true;const elapsed=(performance.now()-start)/1000,after=window.__trip.metrics();
    const gl=document.getElementById('gl').getContext('webgl2'),extension=gl.getExtension('WEBGL_debug_renderer_info');
    resolve({elapsed,pose:window.__trip.u(),renderedFrames:after.frames-before.frames,renderedRate:(after.frames-before.frames)/elapsed,rafIntervals:intervals.length,observedRafRate:intervals.length/elapsed,
      maximumIntervalMs:intervals.length?Math.max(...intervals):null,
      intervalsOver1000ms:intervals.filter(v=>v>=1000).length,before,after,
      reducedMotion:matchMedia('(prefers-reduced-motion:reduce)').matches,
      renderer:extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)});
  },20000)
})`)
await evaluate('window.__trip.inspect(window.__trip.u());true')
console.log(JSON.stringify({result,errors}));await fs.writeFile(new URL('../../../review-sculpture/normal-motion-'+(phone?'phone':'desktop')+'-after.json',import.meta.url),JSON.stringify({result,errors},null,2));ws.close()
