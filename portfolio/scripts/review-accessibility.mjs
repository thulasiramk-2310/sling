// Checks the shipped readable states, independent of WebGL and JavaScript availability.
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
const targets=await(await fetch('http://127.0.0.1:9224/json/list')).json()
const ws=new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl)
await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}))
let sequence=0;const pending=new Map(),checks=[],errors=[]
ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);if(!p)return;pending.delete(m.id);if(m.error)p.reject(m.error);else p.resolve(m.result)}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args.map(arg=>arg.value??arg.description))})
const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(new Error(method+' timed out'))},30000);pending.set(id,{resolve:r=>{clearTimeout(timer);resolve(r)},reject:e=>{clearTimeout(timer);reject(e)}});ws.send(JSON.stringify({id,method,params}))})
const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result?.value}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))
const until=async expression=>{for(let i=0;i<150;i++){if(await evaluate(expression))return;await wait(100)}throw new Error(expression+' did not become true')}
const pass=text=>{checks.push(text);console.log('PASS '+text)}
const dir=new URL('../../../review-product/',import.meta.url);await fs.mkdir(dir,{recursive:true})
const capture=async name=>{const r=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile(new URL(name+'.png',dir),Buffer.from(r.data,'base64'))}
await call('Runtime.enable');await call('Page.enable')
await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})
for(const width of [1440,390]){
 await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<700})
 await call('Emulation.setScriptExecutionDisabled',{value:true})
 await call('Page.navigate',{url:'http://127.0.0.1:5174/?no-script-check='+width})
 await wait(500)
 const {root}=await call('DOM.getDocument')
 const {nodeIds}=await call('DOM.querySelectorAll',{nodeId:root.nodeId,selector:'.script-free-profile a'})
 assert.equal(nodeIds.length,7)
 const {nodeId}=await call('DOM.querySelector',{nodeId:root.nodeId,selector:'.script-free-profile'})
 const {model}=await call('DOM.getBoxModel',{nodeId})
 assert.ok(model.width>100 && model.width<=width)
 assert.ok(Math.min(...model.border.filter((_,i)=>i%2===0))>=0)
 await capture('no-javascript-'+width)
 pass('No-JavaScript profile and real links are visible at '+width+'px')
}
await call('Emulation.setScriptExecutionDisabled',{value:false})
await call('Page.addScriptToEvaluateOnNewDocument',{source:`if(location.origin==='http://127.0.0.1:5174'){localStorage.setItem('ram.cookies','rejected');localStorage.setItem('ram.lang','en');const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'||type==='webgl2'?null:get.call(this,type,...args)}}`})
for(const width of [1440,390]){
 await call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<700})
 await call('Page.navigate',{url:'http://127.0.0.1:5174/?no-webgl-check='+width})
 await until('!!document.querySelector(".loader-start") && !document.querySelector(".loader-start").hidden')
 await evaluate('document.querySelector(".loader-start").click()')
 await until('document.getElementById("loader").hidden')
 assert.equal(await evaluate('document.body.classList.contains("no-3d") && !document.querySelector(".no-webgl").hidden'),true)
 assert.equal(await evaluate('document.querySelectorAll("#projects .card").length'),7)
 assert.equal(await evaluate('[...document.querySelectorAll("main section")].every(section=>!section.inert)'),true)
 assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true)
 await evaluate('scrollTo(0,0)');await capture('no-webgl-'+width)
 await evaluate(`document.querySelector('[data-open-project="0"]').click()`)
 await until('document.querySelector(".project-detail").open')
 assert.equal(await evaluate('document.querySelector("#project-title").textContent'),'ArkaOS')
 await evaluate('document.querySelector(".project-detail .detail-close").click()')
 await until('!document.querySelector(".project-detail").open && !document.body.classList.contains("reading-stop")')
 pass('WebGL-free content, project reader and layout work at '+width+'px')
}
assert.deepEqual(errors,[])
await fs.writeFile(new URL('readable-fallback-results.json',dir),JSON.stringify({checks,errors},null,2));ws.close()
