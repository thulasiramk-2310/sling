import { useEffect } from 'react';
import { useJourney,travelTo } from '../stores/journey';
// Native-scroll timeline: one continuous physical route, no snapping or section switching.
// Browser scroll handles touch, keyboard and restoration without global wheel interception.
export function useJourneyScroll(){
 useEffect(()=>{
  let raf=0;
  const update=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>useJourney.getState().setProgress(Math.min(1,Math.max(0,window.scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight)))));};
  const keyboard=(e:KeyboardEvent)=>{
   if(useJourney.getState().panel || (e.target as HTMLElement).closest('input,textarea,button,a'))return;
   if(e.key==='Home'){e.preventDefault();travelTo(0);}
   if(e.key==='End'){e.preventDefault();travelTo(1);}
  };
  update();window.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);window.addEventListener('keydown',keyboard);
  return()=>{cancelAnimationFrame(raf);window.removeEventListener('scroll',update);window.removeEventListener('resize',update);window.removeEventListener('keydown',keyboard);};
 },[]);
}
