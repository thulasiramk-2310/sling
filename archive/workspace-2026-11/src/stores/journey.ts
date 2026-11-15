import { create } from 'zustand';
export type Panel = 'about'|'work'|'contact'|'journey'|null;
type JourneyState = {
 progress:number; chapter:number; panel:Panel; project:string|null; reduced:boolean; ready:boolean;
 setProgress:(p:number)=>void; setPanel:(p:Panel)=>void; selectProject:(id:string|null)=>void;
 setReduced:(r:boolean)=>void; setReady:(r:boolean)=>void;
};
export const useJourney = create<JourneyState>((set)=>({
 progress:0,chapter:0,panel:null,project:null,reduced:window.matchMedia('(prefers-reduced-motion: reduce)').matches,ready:false,
 setProgress:(progress)=>set({progress,chapter:progress<.44?0:progress<.73?1:2}),
 setPanel:(panel)=>set({panel,project:null}),selectProject:(project)=>set({project,panel:project?'work':null}),
 setReduced:(reduced)=>set({reduced}),setReady:(ready)=>set({ready}),
}));
export function travelTo(progress:number){
 const reduced=useJourney.getState().reduced;
 window.scrollTo({top:progress*(document.documentElement.scrollHeight-window.innerHeight),behavior:reduced?'instant':'smooth'});
 useJourney.getState().setPanel(null);
}
