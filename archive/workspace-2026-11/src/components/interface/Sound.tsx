import {useRef,useState,useEffect} from 'react';
export function Sound(){const [on,setOn]=useState(false);const ref=useRef<AudioContext|null>(null);
 async function toggle(){if(ref.current){await ref.current.close();ref.current=null;setOn(false);return;}
 try{const ctx=new AudioContext();await ctx.resume();const length=ctx.sampleRate*4;const buffer=ctx.createBuffer(1,length,ctx.sampleRate);const a=buffer.getChannelData(0);let last=0;for(let i=0;i<length;i++){last=(last+.02*(Math.random()*2-1))/1.02;a[i]=last*4;}
 const noise=ctx.createBufferSource();noise.buffer=buffer;noise.loop=true;const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=700;const gain=ctx.createGain();gain.gain.value=.13;noise.connect(filter).connect(gain).connect(ctx.destination);noise.start();ref.current=ctx;setOn(true);}catch{setOn(false);}}
 useEffect(()=>()=>{ref.current?.close();},[]);
 return <button className="sound-control" onClick={toggle} aria-pressed={on} aria-label={on?'Mute ocean ambience':'Enable ocean ambience'}><span className={`sound-bars ${on?'playing':''}`}>{[1,2,3,4,5].map(i=><i key={i}/>)}</span><span>SOUND {on?'ON':'OFF'}</span></button>;
}
