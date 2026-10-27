import * as THREE from 'three'
import { combineStone } from './stonework.js'

// Original interpretation of the island's retaining terrace and pale stone
// balustrade. A real occupied platform connects the monument to its rock shelf.
export function poetIslandTerrace(granite,coping) {
  const group=new THREE.Group();group.name='Thiruvalluvar island — retaining terrace and balustrade'
  const outline=new THREE.Shape(),corners=[[-16,-12],[-14,-14],[14,-14],[16,-12],[16,12],[14,14],[-14,14],[-16,12]]
  outline.moveTo(...corners[0]);for(const point of corners.slice(1))outline.lineTo(...point);outline.closePath()
  const foundation=new THREE.ExtrudeGeometry(outline,{depth:1.8,bevelEnabled:true,bevelSegments:1,bevelSize:.12,bevelThickness:.06,steps:1})
  foundation.rotateX(-Math.PI/2);foundation.translate(0,-1.7,0)
  const masonry=[],pale=[]
  const box=(parts,w,h,d,x,y,z)=>{
    const geometry=new THREE.BoxGeometry(w,h,d);geometry.translate(x,y+h/2,z);parts.push(geometry)
  }
  masonry.push(foundation)
  // Course caps and paving give the walkway a reading scale around the plinth.
  for(const side of [-1,1]){
    box(masonry,31,.13,.45,0,-.12,side*13.85)
    box(masonry,.45,.13,24,side*15.85,-.12,0)
  }
  for(let i=0;i<17;i++)box(pale,.035,.012,26,-14.7+i*1.84,.17,0)
  // Square balusters sit on continuous rails, leaving a clear front entrance.
  const posts=new Set()
  const edge=(x0,z0,x1,z1)=>{
    const length=Math.hypot(x1-x0,z1-z0),count=Math.ceil(length/1.7)
    const angle=Math.atan2(x1-x0,z1-z0)
    for(const [y,height,width] of [[.12,.15,.35],[.97,.12,.31]]){
      const geometry=new THREE.BoxGeometry(width,height,length)
      geometry.rotateY(angle);geometry.translate((x0+x1)/2,y+height/2,(z0+z1)/2);pale.push(geometry)
    }
    for(let i=0;i<=count;i++){
      const t=i/count,x=THREE.MathUtils.lerp(x0,x1,t),z=THREE.MathUtils.lerp(z0,z1,t)
      const key=x.toFixed(4)+':'+z.toFixed(4);if(posts.has(key))continue;posts.add(key)
      box(pale,.2,.76,.2,x,.27,z)
      box(pale,.31,.1,.31,x,.89,z)
    }
  }
  edge(-14,-13.7,14,-13.7);edge(-15.7,-12,-15.7,12);edge(15.7,-12,15.7,12)
  edge(-14,13.7,-3.2,13.7);edge(3.2,13.7,14,13.7)
  edge(-14,-13.7,-15.7,-12);edge(14,-13.7,15.7,-12)
  edge(-15.7,12,-14,13.7);edge(15.7,12,14,13.7)
  for(const [geometry,material,name] of [[combineStone(masonry),granite,'Solid island retaining courses'],[combineStone(pale),coping,'Pale stone terrace rails and paving joints']]){
    const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;group.add(mesh)
  }
  return group
}
