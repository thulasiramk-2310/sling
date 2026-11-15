const KEY='ram-roadtrip-consent-v1';
export function readConsent(storage){try{const value=storage.getItem(KEY);return ['accepted','rejected'].includes(value)?value:null;}catch{return null;}}
export function saveConsent(storage,value){if(!['accepted','rejected'].includes(value))throw new Error('Invalid consent choice');try{storage.setItem(KEY,value);}catch{/* Storage can be blocked; the in-memory choice still applies. */}}
export function createAnalytics(storage,{send=()=>{},listen=()=>()=>{}}={}){
 let consent=readConsent(storage),remove=()=>{};
 function apply(){remove();remove=()=>{};if(consent==='accepted')remove=listen(event=>{if(consent==='accepted')send(event);});}
 apply();return {get consent(){return consent;},choose(value){saveConsent(storage,value);consent=value;apply();},track(event){if(consent==='accepted')send(event);},dispose(){remove();}};
}
// No provider, beacon, script or identifier is loaded by default. Add a configured
// analytics transport in main.js only if desired; consent still gates every call.
