import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import {store} from './store';
import {nearestStop,stopProgress} from './journey';
gsap.registerPlugin(ScrollTrigger);
export function createScroll(){
 const lenis=new Lenis({lerp:.065,smoothWheel:true,wheelMultiplier:.48,touchMultiplier:.85,syncTouch:false,autoRaf:false});
 const tick=time=>lenis.raf(time*1000);gsap.ticker.add(tick);lenis.on('scroll',ScrollTrigger.update);
 const trigger=ScrollTrigger.create({trigger:document.querySelector('.road-distance'),start:'top top',end:'bottom bottom',onUpdate:self=>store.set({target:self.progress}),snap:{snapTo:p=>{if(store.get().game||store.get().dialog||store.get().reduced)return p;const stop=stopProgress[nearestStop(p)];return Math.abs(stop-p)<.026?stop:p;},delay:.8,duration:{min:.45,max:1},inertia:false,ease:'power2.out'}});
 const unsubscribe=store.subscribe(state=>{if(state.game||state.dialog)lenis.stop();else lenis.start();lenis.options.smoothWheel=!state.reduced;});
 function go(index){const target=stopProgress[index]*(document.documentElement.scrollHeight-innerHeight);lenis.scrollTo(target,{duration:store.get().reduced?0:1.6,immediate:store.get().reduced,easing:t=>1-(1-t)**3});}
 const key=e=>{if(store.get().dialog||store.get().game||e.target.closest('button,a,input,select'))return;if(e.key==='Home'){e.preventDefault();go(0);}if(e.key==='End'){e.preventDefault();go(4);}};window.addEventListener('keydown',key);
 const mm=matchMedia('(prefers-reduced-motion: reduce)'),change=()=>store.set({reduced:mm.matches});mm.addEventListener('change',change);
 return {go,dispose(){unsubscribe();trigger.kill();lenis.destroy();gsap.ticker.remove(tick);window.removeEventListener('keydown',key);mm.removeEventListener('change',change);}};
}
