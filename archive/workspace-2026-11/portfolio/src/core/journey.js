export const clamp=(x,min=0,max=1)=>Math.min(max,Math.max(min,x));
export const stopProgress=[0,.25,.5,.75,1];
export function nearestStop(p){return stopProgress.reduce((best,s,i)=>Math.abs(s-p)<Math.abs(stopProgress[best]-p)?i:best,0);}
// A finite acceleration/braking model. Integrating real elapsed time makes this
// consistent at 30/60/120Hz; scroll target changes never teleport the vehicle.
export function stepDrive(state,target,dt,reduced=false){
 target=clamp(target);dt=clamp(dt,0,.05);
 if(reduced)return {position:target,velocity:0};
 const delta=target-state.position;
 const desired=clamp(delta*4,-.17,.17);
 const acceleration=clamp((desired-state.velocity)*8,-.42,.42);
 const velocity=state.velocity+acceleration*dt;
 const position=clamp(state.position+velocity*dt);
 if(Math.abs(delta)<.00008&&Math.abs(velocity)<.0004)return {position:target,velocity:0};
 return {position,velocity};
}
export function daylight(p){
 const stops=[{sky:0xd9b690,fog:0xd3b595,sun:0xffd6a2,power:3.1,ambient:.75,elevation:.14},
 {sky:0xa8c8cd,fog:0xc5d0c4,sun:0xfff2dc,power:3.4,ambient:.8,elevation:.85},
 {sky:0xc4b59c,fog:0xc7b49a,sun:0xffd5a1,power:3.0,ambient:.65,elevation:.42},
 {sky:0x6e6b88,fog:0x877e8a,sun:0xf4ad78,power:1.3,ambient:.45,elevation:.06},
 {sky:0x101f35,fog:0x24384c,sun:0xa4c6ec,power:.65,ambient:.35,elevation:-.18}];
 const t=clamp(p)*4,i=Math.min(3,Math.floor(t)),blend=t-i;return {a:stops[i],b:stops[i+1],blend};
}
export function qualityBudget({mobile=false,reduced=false}={}){return {pixelRatio:mobile?1:1.6,shadows:!mobile,reflection:!mobile,ao:!mobile,bloom:!mobile&&!reduced,treeCount:mobile?90:240,shadowSize:mobile?512:2048};}
export function degradeQuality(q){if(q.ao)return {...q,ao:false};if(q.reflection)return {...q,reflection:false,bloom:false};if(q.shadows)return {...q,shadows:false};return {...q,pixelRatio:Math.max(.75,q.pixelRatio-.2)};}
