export function newGame(vehicle='auto'){return {vehicle,lane:1,distance:0,score:0,lives:3,items:[],spawn:0,running:true,cooldown:0};}
export function moveLane(state,delta){return {...state,lane:Math.max(0,Math.min(2,state.lane+delta))};}
export function tickGame(state,dt,random=Math.random){
 if(!state.running)return state;dt=Math.max(0,Math.min(.05,dt));const speed=state.vehicle==='bike'?28:23;
 let next={...state,items:state.items.map(item=>({...item,z:item.z+dt*speed})),distance:state.distance+dt*speed,spawn:state.spawn+dt,cooldown:Math.max(0,state.cooldown-dt)};
 if(next.spawn>.9){next.spawn=0;next.items.push({id:Math.floor(random()*1e9),lane:Math.floor(random()*3),z:-65,type:random()<.6?'coffee':'barrier'});}
 next.items=next.items.filter(item=>{if(item.z>=-1&&item.z<3&&item.lane===next.lane){if(item.type==='coffee')next.score+=10;else if(next.cooldown===0){next.lives--;next.cooldown=1;}return false;}return item.z<6;});
 if(next.lives<=0)next.running=false;return next;
}
