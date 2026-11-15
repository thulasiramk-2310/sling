import './style.css';
import {mountUI} from './ui/app';
import {createScroll} from './core/scroll';
import {createWorld} from './world/engine';
import {store} from './core/store';
let scroll,world;
const ui=mountUI(document.querySelector('#app'),{onGo:index=>{scroll?.go(index);if(!world?.renderer)store.set({stop:index,progress:index/4});}});
scroll=createScroll();
const host=document.querySelector('#world');host.addEventListener('world-error',e=>ui.fallback(e.detail));
try{world=createWorld(host,p=>ui.status(p));if(!world.renderer)ui.fallback('WebGL is unavailable on this device. About, Projects, Experience and Contact remain readable from the menu.');}catch(error){console.error('Road trip rendering failed',error);ui.fallback('The 3D world could not start. You can still explore Ram’s complete portfolio from the menu.');}
if(import.meta.hot)import.meta.hot.dispose(()=>{world?.dispose();scroll.dispose();ui.dispose();});
