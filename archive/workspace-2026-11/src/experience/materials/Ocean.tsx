import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {ShaderMaterial,Color} from 'three';
import {useJourney} from '../../stores/journey';
const vert=`varying vec3 vWorld; varying vec3 vNormalW; uniform float uTime;
float wave(vec2 p){return sin(p.x*.08+uTime*.7)*.27+sin(p.y*.12+uTime*.55)*.3+sin(p.x*.21+p.y*.16+uTime)*.11;}
void main(){vec3 p=position;vec4 world=modelMatrix*vec4(p,1.);world.y+=wave(world.xz);vWorld=world.xyz;
float e=.3;vNormalW=normalize(vec3(wave(world.xz-vec2(e,0.))-wave(world.xz+vec2(e,0.)),2.*e,wave(world.xz-vec2(0.,e))-wave(world.xz+vec2(0.,e))));gl_Position=projectionMatrix*viewMatrix*world;}`;
const frag=`varying vec3 vWorld;varying vec3 vNormalW;uniform float uTime;uniform vec3 uFog;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){vec3 V=normalize(cameraPosition-vWorld);vec3 n=normalize(vNormalW+vec3(sin(vWorld.z*2.3+uTime)*.025,0.,sin(vWorld.x*1.8)*.025));float fres=pow(1.-max(dot(n,V),0.),3.);
vec3 deep=vec3(.047,.16,.17);vec3 shallow=vec3(.23,.39,.34);float shore=1.-smoothstep(28.,90.,vWorld.z);
vec3 col=mix(deep,shallow,shore);col=mix(col,vec3(.57,.56,.43),fres*.55);
vec3 L=normalize(vec3(-.65,.23,-.7));vec3 H=normalize(V+L);float spec=pow(max(dot(n,H),0.),240.);col+=vec3(1.,.74,.39)*spec*1.8;
float ribbons=sin(vWorld.z*1.15+sin(vWorld.x*.032)*2.5-uTime*.65);float foam=smoothstep(.82,1.,ribbons)*(1.-smoothstep(25.,43.,vWorld.z))*smoothstep(24.,27.,vWorld.z);
col=mix(col,vec3(.79,.80,.67),foam*.65);float dist=length(cameraPosition-vWorld);col=mix(col,uFog,1.-exp(-dist*.0018));gl_FragColor=vec4(col,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
export function Ocean(){
 const mat=useRef<ShaderMaterial>(null);const uniforms=useMemo(()=>({uTime:{value:0},uFog:{value:new Color('#c7b69b')}}),[]);
 useFrame((_,dt)=>{if(mat.current&&!useJourney.getState().reduced)mat.current.uniforms.uTime.value+=Math.min(dt,.05);});
 return <mesh rotation={[-Math.PI/2,0,0]} position={[500,-.1,1028]} frustumCulled={false}><planeGeometry args={[6000,2000,256,96]}/><shaderMaterial ref={mat} vertexShader={vert} fragmentShader={frag} uniforms={uniforms}/></mesh>;
}
