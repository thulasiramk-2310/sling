import gsap from 'gsap';
import {store} from '../core/store';

// One theme per stop, taken from that stop's sky. The page blends between them
// as the rickshaw drives, so the type and the grade always match the light.
const themes=[
 {accent:'#ff9a6b',shade:'34,20,26',scrim:.5},   // Chennai, dawn
 {accent:'#46d4c4',shade:'8,34,42',scrim:.74},     // Mamallapuram, by the sea
 {accent:'#f4b53a',shade:'40,27,8',scrim:.58},     // Thanjavur, golden light
 {accent:'#e8669a',shade:'31,18,48',scrim:.5},    // Madurai, blue hour
 {accent:'#86aaff',shade:'8,16,42',scrim:.36}      // Rameswaram, night
];
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
const segment=(typeof Intl!=='undefined'&&Intl.Segmenter)?new Intl.Segmenter(undefined,{granularity:'grapheme'}):null;
const graphemes=word=>segment?[...segment.segment(word)].map(s=>s.segment):[...word];
const escapeHtml=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');

export function createMotion(root){
 const silk=document.createElement('div');silk.className='silk';silk.setAttribute('aria-hidden','true');root.append(silk);
 const reduced=()=>store.get().reduced;
 let ready=false,pending=null,busy=null;

 // A line becomes words, a word becomes characters. Tamil is split by grapheme
 // so vowel signs stay attached to their letters.
 function lineMarkup(text,cls){
  const words=text.split(' ').map(w=>`<span class="w">${graphemes(w).map(c=>`<span class="ch">${escapeHtml(c)}</span>`).join('')}</span>`).join(' ');
  return `<span class="hl ${cls}"><span class="hl-in">${words}</span></span>`;
 }
 function setHeadline(el,first,second){
  el.setAttribute('aria-label',`${first} ${second}`);
  el.innerHTML=lineMarkup(first,'hl1')+lineMarkup(second,'hl2');
  el.querySelectorAll('.hl-in').forEach(n=>n.setAttribute('aria-hidden','true'));
  if(!ready&&!reduced())gsap.set(el.querySelectorAll('.ch'),{yPercent:115,opacity:0});
 }

 // The pieces around the headline arrive after it, in reading order.
 function reveal(delay=0){
  if(reduced()){gsap.set('.story-copy .ch,.story-copy>*',{clearProps:'all'});return;}
  const chars=gsap.utils.toArray('#hero-title .hl1 .ch'),chars2=gsap.utils.toArray('#hero-title .hl2 .ch');
  const tl=gsap.timeline({delay,defaults:{ease:'expo.out'}});
  tl.fromTo('#chapter-label,.hero-intro',{opacity:0,x:-14},{opacity:1,x:0,duration:.7,stagger:.08},0)
    .fromTo(chars,{yPercent:115,opacity:0,'--wd':60,'--wg':100},{yPercent:0,opacity:1,'--wd':125,'--wg':220,duration:1.1,stagger:.022},.05)
    .fromTo(chars2,{yPercent:115,opacity:0,'--wd':125,'--wg':300},{yPercent:0,opacity:1,'--wd':78,'--wg':700,duration:1.1,stagger:.022},.2)
    .fromTo('#hero-description,.journey-cta,.micro-caption',{opacity:0,y:16},{opacity:1,y:0,duration:.8,stagger:.09},.55)
    .fromTo('.place-label,.time-badge',{opacity:0},{opacity:1,duration:.9,stagger:.12},.7);
  return tl;
 }

 function leave(){
  const chars=gsap.utils.toArray('#hero-title .ch');
  return gsap.timeline().to(chars,{yPercent:-90,opacity:0,duration:.32,ease:'power3.in',stagger:{each:.008,from:'start'}},0)
   .to('#chapter-label,.hero-intro,#hero-description,.journey-cta,.micro-caption,.place-label,.time-badge',{opacity:0,duration:.25,ease:'power2.in'},0);
 }

 // The silk border is the one big moment: a woven band crosses the screen and
 // the next stop's headline builds itself behind it.
 function sweep(direction){
  const width=silk.offsetWidth||innerWidth*.26,from=direction>0?innerWidth+40:-width-40,to=direction>0?-width-40:innerWidth+40;
  return gsap.fromTo(silk,{x:from,opacity:1},{x:to,duration:1.25,ease:'power3.inOut',onComplete:()=>{gsap.set(silk,{opacity:0});}});
 }

 // change(): called by the UI whenever the chapter or language changes.
 function change({stopChanged,direction,apply}){
  if(!ready&&pending===null&&!stopChanged){apply();return;}
  if(reduced()||!stopChanged){apply();if(ready)reveal(0);return;}
  busy?.kill();
  sweep(direction);
  busy=gsap.timeline();
  busy.add(leave(),0).add(()=>{apply();},.34).add(()=>reveal(0),.38);
 }

 function whenReady(){
  ready=true;
  reveal(.35);
 }

 // Blend the stop themes by drive progress, and stretch the headline with speed.
 const rootStyle=document.documentElement.style;
 let velocity=0;
 const tick=()=>{
  const s=store.get(),t=Math.min(3.999,Math.max(0,s.progress*4)),i=Math.floor(t),k=t-i,eased=k*k*(3-2*k);
  const a=themes[i],b=themes[i+1];
  const accent=mix(rgb(a.accent),rgb(b.accent),eased),shade=mix(a.shade.split(',').map(Number),b.shade.split(',').map(Number),eased);
  rootStyle.setProperty('--accent',`rgb(${accent})`);rootStyle.setProperty('--accent-rgb',accent.join(','));rootStyle.setProperty('--shade',shade.join(','));rootStyle.setProperty('--scrim',(a.scrim+(b.scrim-a.scrim)*eased).toFixed(3));
  const target=Math.min(1,Math.abs(s.target-s.progress)*38);velocity+=(target-velocity)*.08;
  rootStyle.setProperty('--vel',velocity.toFixed(3));
 };
 gsap.ticker.add(tick);tick();

 return {setHeadline,change,whenReady,dispose(){gsap.ticker.remove(tick);busy?.kill();silk.remove();}};
}
