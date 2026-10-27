import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { poetBodyGeometry } from './poet-body.js'
import { poetHeadGeometry } from './poet-head.js'
import { poetLimbsGeometry } from './poet-limbs.js'

// Original carved study. District photograph informs silhouette and posture;
// no photographic texture or downloaded mesh is used.
export function poetStatue(stone,low=false) {
  const group = new THREE.Group()
  group.name = 'Thiruvalluvar — original carved figure study'
  const parts = []
  const add = (geometry, position = [0,0,0], scale = [1,1,1]) => {
    geometry.scale(...scale); geometry.translate(...position); parts.push(geometry)
  }
  const oval = (position, scale) => add(new THREE.SphereGeometry(1,20,14),position,scale)
  add(poetBodyGeometry(low).clone())
  // Facial planes, ears, hair and beard are one continuous implicit carving.
  add(poetHeadGeometry(low).clone())
  // Continuous carved elbows and fused hand details replace separate joint balls.
  add(poetLimbsGeometry(low).clone())
  // Feet and toes emerge beneath the continuous draped body.
  for(const side of [-1,1]) {
    oval([side*1.55,.45,1.28],[.8,.42,1.3])
    for(let i=0;i<5;i++) oval([side*(.96+i*.29),.35,2.25-i*.07],[.17,.24,.36])
  }
  const geometry=mergeGeometries(parts.map(g=>g.index?g.toNonIndexed():g))
  const mesh=new THREE.Mesh(geometry,poetStoneMaterial(stone,low));mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh)
  for(const part of parts) part.dispose()
  return group
}

// Reused by prebuilt original GLBs; constructing a material does not run any
// sculpture fields or allocate the procedural fallback geometry.
export function poetStoneMaterial(stone,low=false) {
  // Original object-space granite courses: coherent across all carved parts,
  // without photographic textures or noise displacing individual vertices.
  const carvedStone=stone.clone()
  carvedStone.color.lerp(new THREE.Color(0x68706b),.22)
  carvedStone.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vPoetPosition;\nvarying vec3 vPoetNormal;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvPoetPosition=position;vPoetNormal=normal;')
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 vPoetPosition;
      varying vec3 vPoetNormal;
      float poetMineralHash(vec3 cell){return fract(sin(dot(cell,vec3(127.1,311.7,74.7)))*43758.5453);}
      float poetMineralNoise(vec3 p){
        vec3 cell=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        return mix(mix(mix(poetMineralHash(cell),poetMineralHash(cell+vec3(1,0,0)),f.x),
          mix(poetMineralHash(cell+vec3(0,1,0)),poetMineralHash(cell+vec3(1,1,0)),f.x),f.y),
          mix(mix(poetMineralHash(cell+vec3(0,0,1)),poetMineralHash(cell+vec3(1,0,1)),f.x),
          mix(poetMineralHash(cell+vec3(0,1,1)),poetMineralHash(cell+vec3(1,1,1)),f.x),f.y),f.z);
      }
    `)
      .replace('#include <color_fragment>',`#include <color_fragment>
        float course=floor(vPoetPosition.y/1.4);
        vec3 stoneNormal=abs(normalize(vPoetNormal));
        float along=mix(vPoetPosition.z,vPoetPosition.x,smoothstep(.35,.65,stoneNormal.z));
        float rowOffset=poetMineralHash(vec3(course,3.0,7.0))*1.7;
        float stoneEdge=.012*(poetMineralNoise(vPoetPosition*3.0)-.5);
        vec2 tile=vec2((along+rowOffset+stoneEdge)/1.8,(vPoetPosition.y+stoneEdge)/1.4);
        vec2 seam=min(fract(tile),1.0-fract(tile))*vec2(1.8,1.4);
        vec2 pixel=fwidth(tile)*vec2(1.8,1.4);
        float footprint=max(pixel.x,pixel.y);
        float joint=(1.0-smoothstep(.008,.027+footprint,min(seam.x,seam.y)))*(1.0-smoothstep(.04,.2,footprint));
        float blockTone=fract(sin(dot(floor(tile),vec2(127.1,311.7)))*43758.5453);
        float grain=sin(dot(vPoetPosition,vec3(173.1,217.3,143.7)))*sin(vPoetPosition.y*193.7);
        float grainVisibility=1.0/(1.0+pow(length(fwidth(vPoetPosition))*190.0,2.0));
        float weathering=poetMineralNoise(vPoetPosition*.7);
        float jointStrength=mix(.10,.045,smoothstep(21.8,22.6,vPoetPosition.y));
        diffuseColor.rgb*=mix(.94,1.025,blockTone)*mix(.96,1.025,weathering)
          *(1.0-joint*jointStrength)*(1.0+grain*.018*grainVisibility);
      `)
    if(!low)shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      roughnessFactor=clamp(roughnessFactor+.10*(blockTone-.5)
        +.04*(poetMineralNoise(vPoetPosition*4.0)-.5),.72,1.0);
    `)
    if(!low)shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      // Small mineral relief, filtered by its projected footprint. The carved
      // silhouette remains geometry; this only changes close surface lighting.
      float mineralFootprint=length(fwidth(vPoetPosition))*24.0;
      float mineralHeight=.0015*(poetMineralNoise(vPoetPosition*24.0)-.5)
        /(1.0+mineralFootprint*mineralFootprint);
      vec3 mineralDx=dFdx(-vViewPosition),mineralDy=dFdy(-vViewPosition);
      vec3 mineralR1=cross(mineralDy,normal),mineralR2=cross(normal,mineralDx);
      float mineralDet=dot(mineralDx,mineralR1)*faceDirection;
      if(abs(mineralDet)>1.e-9)normal=normalize(abs(mineralDet)*normal-sign(mineralDet)
        *(dFdx(mineralHeight)*mineralR1+dFdy(mineralHeight)*mineralR2));
    `)
  }
  carvedStone.customProgramCacheKey=()=> 'original-poet-granite-6-'+low
  return carvedStone
}
