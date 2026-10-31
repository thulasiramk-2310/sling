// Native CDP input checks against the local app. Reduced motion accelerates
// traversal; this is interaction evidence, not a motion or GPU benchmark.
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import {PROJECTS} from '../src/content.js'
import {storyAt} from '../src/scene/story.js'
import {projectRoadPosition} from '../src/scene/interactions/journey-exhibits.js'
const phone=process.argv[2]==='phone',width=phone?390:1440,height=phone?844:900
const targets=await (await fetch('http://127.0.0.1:9224/json/list')).json()
const ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl)
await new Promise(r=>ws.addEventListener('open',r,{once:true}))
const pending=new Map(),errors=[],checks=[],connection=[];let sequence=0
ws.addEventListener('message',e=>{
  const m=JSON.parse(e.data)
  if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(!p)return;if(m.error)p.reject(m.error);else p.resolve(m.result)}
  if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails)
  if(m.method==='Runtime.consoleAPICalled' && ['error','assert'].includes(m.params.type))errors.push({console:m.params.args.map(a=>a.value||a.description).join(' ')})
  if(m.method==='Inspector.targetCrashed'){errors.push({type:'Renderer crashed',details:m.params});for(const p of pending.values())p.reject(new Error('Renderer crashed'))}
})
ws.addEventListener('close',event=>{connection.push({type:'close',code:event.code,reason:event.reason});for(const p of pending.values())p.reject(new Error('Tab closed'));pending.clear()})
ws.addEventListener('error',event=>{for(const p of pending.values())p.reject(new Error('Browser connection error: '+(event.message||'unknown')));pending.clear()})
const call=(method,params={})=>new Promise((resolve,reject)=>{
  if(ws.readyState!==WebSocket.OPEN){reject(new Error('Browser connection is closed: '+method));return}
  const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(new Error('Browser command timed out: '+method))},90000)
  pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value)},reject:error=>{clearTimeout(timer);reject(error)}})
  ws.send(JSON.stringify({id,method,params}))
})
const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result?.value}
const delay=ms=>new Promise(r=>setTimeout(r,ms))
const until=async(expression,timeout=20000)=>{const end=Date.now()+timeout;do{if(await evaluate(expression))return;await delay(100)}while(Date.now()<end);throw new Error('Timed out: '+expression)}
const key=async(name,shift=false)=>{const code={Tab:9,Enter:13,Escape:27,ArrowLeft:37,ArrowRight:39}[name];await call('Input.dispatchKeyEvent',{type:'keyDown',key:name,code:name,windowsVirtualKeyCode:code,modifiers:shift?8:0,...(name==='Enter'?{text:'\r',unmodifiedText:'\r'}:{})});await call('Input.dispatchKeyEvent',{type:'keyUp',key:name,code:name,windowsVirtualKeyCode:code,modifiers:shift?8:0})}
const pass=name=>{checks.push(name);console.log('PASS '+name)}
const wheel=()=>call('Input.dispatchMouseEvent',{type:'mouseWheel',x:width*.6,y:height*.7,deltaX:0,deltaY:height*.85})
const capture=async name=>{
  const dir=new URL('../../../review-product/',import.meta.url);await fs.mkdir(dir,{recursive:true})
  const {data}=await call('Page.captureScreenshot',{format:'png'})
  await fs.writeFile(new URL((phone?'phone':'desktop')+'-'+name+'.png',dir),Buffer.from(data,'base64'))
}
async function inspectExhibits(){
  await evaluate(`(()=>{window.__modalTrace=[];const record=e=>window.__modalTrace.push({type:e.type,key:e.key,pointer:e.pointerType,open:document.querySelector('.project-detail').open,title:document.querySelector('#project-title')?.textContent,reading:document.body.classList.contains('reading-stop'),active:document.activeElement?.className,activation:navigator.userActivation?.isActive});for(const type of ['keydown','pointerdown','pointerup'])document.addEventListener(type,record,true);for(const type of ['cancel','close'])document.querySelector('.project-detail').addEventListener(type,record)})()`)
  try {
await evaluate('document.querySelector(".journey-clean").click()')
for(const [index,project] of PROJECTS.entries()){
  console.log('Inspecting native exhibit: '+project.name)
  const road=projectRoadPosition(index,PROJECTS.length)-.007
  let a=.5,b=.59
  for(let i=0;i<40;i++){const mid=(a+b)/2;if(storyAt(mid).road<road)a=mid;else b=mid}
  await evaluate('window.__trip.inspect('+((a+b)/2)+')')
  const exhibit=await evaluate('window.__trip.exhibits().find(e=>e.index==='+index+' && e.visible)')
  assert.ok(exhibit,project.name+' 3D installation must be in frame')
  if(phone){
    await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:exhibit.x,y:exhibit.y,id:1}]})
    await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
  }else{
    await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:exhibit.x,y:exhibit.y})
    await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,x:exhibit.x,y:exhibit.y})
    await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:exhibit.x,y:exhibit.y})
  }
  await until('document.querySelector(".project-detail").open')
  assert.equal(await evaluate('document.querySelector("#project-title").textContent'),project.name)
  assert.equal(await evaluate('document.querySelector(".project-source").href'),project.href)
  const pages=(await (await fetch('http://127.0.0.1:9224/json/list')).json()).filter(target=>target.type==='page')
  assert.ok(pages.every(page=>page.url.startsWith('http://127.0.0.1:5174/')),'An exhibit tap must not click through to a dialog link or open another tab')
  await key('Escape');await until('!document.querySelector(".project-detail").open && !document.body.classList.contains("reading-stop")')
  console.log('Closed native exhibit: '+project.name)
}
await evaluate('document.querySelector(".journey-clean").click()')
pass((phone?'Native touch':'Native pointer')+' raycasts all seven project installations with the correct source')
  }catch(error){
    const dir=new URL('../../../review-product/',import.meta.url);await fs.mkdir(dir,{recursive:true})
    const state=await evaluate('({trace:window.__modalTrace,open:document.querySelector(".project-detail").open,reading:document.body.className,visibility:document.visibilityState,active:{tag:document.activeElement?.tagName,class:document.activeElement?.className,href:document.activeElement?.href}})').catch(failure=>({unavailable:String(failure)}))
    const targets=await fetch('http://127.0.0.1:9224/json/list').then(response=>response.json()).then(list=>list.map(({type,url})=>({type,url}))).catch(failure=>({unavailable:String(failure)}))
    await fs.writeFile(new URL((phone?'phone':'desktop')+'-exhibit-failure.json',dir),JSON.stringify({error:String(error),state,targets,errors,connection},null,2))
    if(ws.readyState===WebSocket.OPEN)await capture('exhibit-failure').catch(()=>{})
    throw error
  }
}
const scrollTrace=[]
await call('Runtime.enable');await call('Page.enable');await call('Inspector.enable')
await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:phone})
await call('Emulation.setTouchEmulationEnabled',{enabled:phone,maxTouchPoints:1})
await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})
await call('Page.addScriptToEvaluateOnNewDocument',{source:'if(location.origin==="http://127.0.0.1:5174"){localStorage.setItem("ram.lang","en");localStorage.setItem("ram.cookies","rejected")} '})
// Runtime.enable can report exceptions retained by the previously open page.
// Begin the product error audit before navigating to the document under test.
errors.length=0
const navigation=await call('Page.navigate',{url:'http://127.0.0.1:5174/?debug&fixed&quality=low'})
if(navigation.errorText)throw new Error('Navigation failed: '+navigation.errorText)
await until('!!window.__trip?.metrics() && !document.querySelector(".loader-start").hidden',90000)
for(const shift of [false,true,false]){await key('Tab',shift);assert.equal(await evaluate('document.activeElement===document.querySelector(".loader-start")'),true)}
pass('Loader contains native Tab and Shift+Tab')
await key('Enter');await until('document.getElementById("loader").hidden')
assert.equal(await evaluate('document.querySelector(".topbar").inert'),false)
pass('Start releases background controls')
if(process.argv.includes('--exhibit-probe')){await inspectExhibits();assert.deepEqual(errors,[]);ws.close();process.exit(0)}
if(process.argv.includes('--final-band-probe')) {
  await evaluate('window.__trip.goTo(5)')
  await until('window.__trip.stop().held===5')
  await delay(750)
  const snapshot=()=>evaluate('({u:window.__trip.u(),...window.__trip.stop(),scroll:window.__trip.scrollState?.()})')
  const before=await snapshot()
  await wheel();await delay(250)
  const after=await snapshot()
  const result={mode:phone?'phone':'desktop',delta:height*.85,before,after,errors}
  const dir=new URL('../../../review-madurai/',import.meta.url);await fs.mkdir(dir,{recursive:true})
  await fs.writeFile(new URL((phone?'phone':'desktop')+'-final-band-probe.json',dir),JSON.stringify(result,null,2))
  console.log(JSON.stringify(result,null,2));const band=before.scroll.bands[5];assert.ok(band.end-band.start>=height,'Final reading band must be at least one viewport');assert.ok(before.scroll.limit-band.end>=height*.25,'Final ascent needs a separate scroll runway');assert.equal(after.held,5,'One oversized wheel must retain the final reading stop');assert.equal(after.u,.915);assert.ok(Math.abs(after.scroll.y-before.scroll.y)<=180.01,'Reduced wheel must be bounded without animation');ws.close();process.exit(0)
}
for(let index=0;index<6;index++){
  for(let attempt=0;attempt<70;attempt++){
    const state=await evaluate('({u:window.__trip.u(),y:window.__trip.y(),...window.__trip.stop(),frames:window.__trip.metrics()?.frames,scroll:window.__trip.scrollState?.()})')
    scrollTrace.push({index,attempt,...state})
    if(state.held===index)break
    await wheel();await delay(110)
  }
  const held=await evaluate('window.__trip.stop().held')
  if(held!==index){
    const dir=new URL('../../../review-madurai/',import.meta.url);await fs.mkdir(dir,{recursive:true})
    await fs.writeFile(new URL((phone?'phone':'desktop')+'-scroll-failure.json',dir),JSON.stringify({index,held,scrollTrace,errors,layout:await evaluate('({height:innerHeight,scrollHeight:document.documentElement.scrollHeight,scrollY,body:document.body.className})')},null,2))
  }
  assert.equal(held,index,'Scroll must visit each stop in order')
  await delay(750)
  const before=await evaluate('window.__trip.u()')
  await call('Input.dispatchMouseEvent',{type:'mouseWheel',x:width*.6,y:height*.7,deltaX:0,deltaY:100});await delay(150)
  assert.equal(await evaluate('window.__trip.u()'),before,'Short wheel step must remain in reading band')
  pass('Scroll arrives and holds stop '+(index+1))
  if(index===1){
    await evaluate('window.skillProbe=document.querySelector(".story-skill-list button");window.skillProbe.focus()')
    await key('Enter')
    assert.equal(await evaluate('document.activeElement===window.skillProbe'),true)
    assert.match(await evaluate('document.querySelector(".story-skill-focus").innerText'),/Python/)
    await key('Tab');assert.equal(await evaluate('document.activeElement.textContent'),'C/C++')
    pass('Skill activation retains focus and keyboard order')
  }
  if(index===2){
    await evaluate(`window.projectProbe=document.querySelector('.arrival-project[data-project="0"]');window.projectProbe.focus()`);await key('Enter')
    await until('document.querySelector(".project-detail").open')
    assert.equal(await evaluate('document.querySelector("#project-title").textContent'),'ArkaOS')
    assert.equal(await evaluate('document.querySelector(".project-detail a").href.includes("thulasiramk-2310/Arka")'),true)
    assert.ok(await evaluate('document.querySelectorAll(".project-technologies li").length>=3'))
    await capture('arka-details')
    const inspectMedia=async(expected)=>{
      assert.equal(await evaluate('document.querySelector("#project-title").textContent'),expected)
      await evaluate('document.querySelector(".project-gallery img").scrollIntoView({block:"center"})')
      await until('[...document.querySelectorAll(".project-gallery img")].every(img=>img.complete && img.naturalWidth>0)')
    }
    await inspectMedia('ArkaOS')
    for(const expected of ['TRX-AI','StudyFlow AI']){
      await evaluate('document.querySelector(".project-pagination button:last-child").focus()');await key('Enter')
      await inspectMedia(expected)
      if(expected==='StudyFlow AI')await capture('studyflow-screenshot')
    }
    for(let i=0;i<2;i++){await evaluate('document.querySelector(".project-pagination button:first-child").focus()');await key('Enter')}
    assert.equal(await evaluate('document.querySelector("#project-title").textContent'),'ArkaOS')
    pass('Real project screenshots, technical stacks and case-study navigation work')
    await key('Escape');await until('!document.querySelector(".project-detail").open && !document.body.classList.contains("reading-stop")')
    assert.equal(await evaluate('document.activeElement===window.projectProbe && window.projectProbe.isConnected'),true)
    pass('ArkaOS opens with its verified source; Escape restores project-button focus')
    await evaluate('window.readerProbe=document.querySelector(".journey-read");window.readerProbe.focus()');await key('Enter')
    await until('document.getElementById("stop-detail").open')
    assert.equal(await evaluate('new Set([...document.querySelectorAll("#stop-detail [data-open-project]")].map(button=>button.getAttribute("aria-label"))).size'),PROJECTS.length)
    await evaluate(`document.querySelector('#stop-detail [data-open-project="0"]').focus()`);await key('Enter')
    await until('document.querySelector(".project-detail").open');await delay(100)
    assert.equal(await evaluate('!document.getElementById("stop-detail").open && !document.querySelector("#stop-detail .panel") && document.body.classList.contains("reading-stop") && window.__trip.scrollState().stopped'),true)
    assert.equal(await evaluate('document.querySelector("#thanjavur .panel").inert'),true)
    assert.equal(await evaluate('document.querySelector("#project-title").textContent'),'ArkaOS')
    await key('Escape');await until('!document.querySelector(".project-detail").open && !document.body.classList.contains("reading-stop")')
    assert.equal(await evaluate('document.activeElement===window.readerProbe'),true)
    pass('Chapter-to-project handoff retains scroll lock and returns focus to the world reader')
  }
  if(index===5){
    await evaluate('window.consentProbe=document.querySelector(".journey-read");window.consentProbe.focus()');await key('Enter')
    await until('document.getElementById("stop-detail").open')
    await evaluate('document.querySelector("#stop-detail [data-cookie-settings]").focus()');await key('Enter')
    await until('!document.getElementById("stop-detail").open && !document.querySelector(".cookie").hidden')
    assert.equal(await evaluate(`document.activeElement===document.querySelector('.cookie [data-cookie="reject"]') && !document.body.classList.contains('reading-stop') && !window.__trip.scrollState().stopped`),true)
    await key('Enter');await until('document.querySelector(".cookie").hidden')
    assert.equal(await evaluate('document.activeElement===window.consentProbe && localStorage.getItem("ram.cookies")==="rejected"'),true)
    pass('Contact reader hands off to usable cookie settings and restores focus after rejecting')
  }
}
for(let i=0;i<30;i++){if(await evaluate('window.__trip.u()>.975'))break;await wheel();await delay(120)}
assert.equal(await evaluate('window.__trip.u()>.975'),true);pass('Scroll reaches final ascent without Continue clicks')
for(let index=5;index>=0;index--){
  for(let attempt=0;attempt<90;attempt++){
    if(await evaluate('window.__trip.stop().held==='+index))break
    await call('Input.dispatchMouseEvent',{type:'mouseWheel',x:width*.6,y:height*.7,deltaX:0,deltaY:-height*.85});await delay(110)
  }
  assert.equal(await evaluate('window.__trip.stop().held'),index,'Reverse scroll must stop at every destination')
  await delay(750)
}
pass('Reverse scrolling revisits all six reading stops')
await evaluate('document.getElementById("lang-btn").focus()');await key('Enter')
assert.equal(await evaluate('document.documentElement.lang'),'ta');await key('Enter')
assert.equal(await evaluate('document.documentElement.lang'),'en');pass('Keyboard language switching works')
await evaluate('document.getElementById("sound-btn").focus()');await key('Enter')
assert.equal(await evaluate('document.getElementById("sound-btn").getAttribute("aria-pressed")'),'true')
await key('Enter');assert.equal(await evaluate('document.getElementById("sound-btn").getAttribute("aria-pressed")'),'false')
pass('Sound can be enabled and muted through the keyboard')
await inspectExhibits()
await until('getComputedStyle(document.getElementById("play-btn")).visibility==="visible" && !document.querySelector(".topbar").inert')
await evaluate('document.getElementById("play-btn").focus()');assert.equal(await evaluate('document.activeElement.id'),'play-btn');await key('Enter')
await until('!document.getElementById("game").hidden')
for(let i=0;i<12;i++){await key('Tab',i>6);assert.equal(await evaluate('document.getElementById("game").contains(document.activeElement)'),true)}
pass('Game menu contains native Tab and Shift+Tab')
await evaluate('document.querySelector(".game-menu [data-game=start]").focus()');await key('Enter')
await until('document.querySelector(".game-menu").hidden')
await key('ArrowLeft');await key('ArrowRight');await key('Tab')
assert.equal(await evaluate('document.getElementById("game").contains(document.activeElement)'),true)
await key('Escape');await until('document.getElementById("game").hidden')
assert.equal(await evaluate('document.activeElement.id'),'play-btn')
assert.equal(await evaluate('document.querySelector(".topbar").inert'),false);pass('Running game closes and returns focus to Play')
await evaluate('window.__trip.inspect(.987)')
assert.equal(await evaluate('!document.querySelector(".story-connections").hidden'),true)
const loss=await evaluate('(()=>{const c=document.getElementById("gl"),gl=c.getContext("webgl2")||c.getContext("webgl");const e=gl.getExtension("WEBGL_lose_context");if(!e)return false;e.loseContext();return true})()')
assert.equal(loss,true);await until('document.body.classList.contains("no-3d")')
assert.equal(await evaluate('!document.querySelector(".no-webgl").hidden && document.querySelector(".story-connections").hidden && [...document.querySelectorAll("main section")].every(s=>!s.inert)'),true)
pass('Actual WebGL context loss exposes readable fallback content')
const layout=await evaluate('({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth})')
if(layout.width!==width)console.log(JSON.stringify(await evaluate('[...document.querySelectorAll("body *")].filter(e=>e.clientWidth>0 && e.scrollWidth>e.clientWidth+2).slice(0,12).map(e=>({tag:e.tagName,class:e.className,client:e.clientWidth,scroll:e.scrollWidth}))')))
assert.equal(layout.width,width,'Mobile fallback must keep the requested CSS viewport width')
assert.equal(layout.overflow,false);assert.deepEqual(errors,[])
const dir=new URL('../../../review-madurai/',import.meta.url);await fs.mkdir(dir,{recursive:true})
await fs.writeFile(new URL((phone?'phone':'desktop')+'-interactions.json',dir),JSON.stringify({checks,errors,layout,reducedMotion:true},null,2));ws.close()
