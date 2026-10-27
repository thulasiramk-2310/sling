import * as THREE from 'three'
import { combineStone, carvedPillarGeometry } from './stonework.js'

// Original architectural study from the district's frontal/oblique photographs.
// The monument has a solid, recessed pedestal rather than an open colonnade.
export function poetPedestal(stone, recess, low=false) {
  const group=new THREE.Group();group.name='Thiruvalluvar — solid carved pedestal'
  const parts=[],backs=[]
  const add=(geometry,x=0,y=0,z=0,angle=0)=>{
    geometry.translate(x,y,z);geometry.rotateY(angle);parts.push(geometry)
  }
  const box=(w,h,d,x,y,z=0,angle=0)=>add(new THREE.BoxGeometry(w,h,d),x,y+h/2,z,angle)
  // Beveled square mouldings give the upper/lower cornices a continuous profile.
  const course=(width,depth,y,height,bevel)=>{
    const outline=new THREE.Shape()
    outline.moveTo(-width/2+bevel,-depth/2)
    outline.lineTo(width/2-bevel,-depth/2);outline.lineTo(width/2,-depth/2+bevel)
    outline.lineTo(width/2,depth/2-bevel);outline.lineTo(width/2-bevel,depth/2)
    outline.lineTo(-width/2+bevel,depth/2);outline.lineTo(-width/2,depth/2-bevel)
    outline.lineTo(-width/2,-depth/2+bevel);outline.closePath()
    const geometry=new THREE.ExtrudeGeometry(outline,{depth:height,bevelEnabled:true,bevelSize:bevel*.35,bevelThickness:Math.min(.06,height*.2),bevelSegments:low?1:2,steps:1})
    geometry.rotateX(-Math.PI/2);geometry.translate(0,y,0);parts.push(geometry)
  }
  for(let i=0;i<4;i++)course(16-i*.65,15-i*.65,i*.45,.45,.1)
  box(11.4,7,11.4,0,1.8)

  // Corner piers own their outside faces; adjacent walls end at their inside
  // edges, so no coincident endcaps flicker along the facade corners.
  for(const x of [-6,6])for(const z of [-6,6])box(.6,7,.6,x,1.8,z)
  for(let side=0;side<4;side++) {
    const angle=side*Math.PI/2
    const holes=[[-4.65,-3.95,5.05,6.6],[3.95,4.65,5.05,6.6],[-.72,.72,6.15,7.65]]
    // One extruded wall avoids coplanar T-junction cracks between grid cells.
    // The entrance is an outline notch; the upper windows are enclosed holes.
    const wall=new THREE.Shape();wall.moveTo(-5.7,1.8)
    if(side===0){wall.lineTo(-.8,1.8);wall.lineTo(-.8,4.05);wall.lineTo(.8,4.05);wall.lineTo(.8,1.8)}
    wall.lineTo(5.7,1.8);wall.lineTo(5.7,8.8);wall.lineTo(-5.7,8.8);wall.closePath()
    for(const [a,b,c,d] of holes) {
      const opening=new THREE.Path();opening.moveTo(a,c);opening.lineTo(a,d)
      opening.lineTo(b,d);opening.lineTo(b,c);opening.closePath();wall.holes.push(opening)
    }
    add(new THREE.ExtrudeGeometry(wall,{depth:.6,bevelEnabled:false,steps:1}),0,0,5.7,angle)
    if(side===0)holes.push([-.8,.8,1.8,4.05])
    for(const [a,b,c,d] of holes) {
      const back=new THREE.BoxGeometry(b-a,d-c,.025)
      back.translate((a+b)/2,(c+d)/2,5.72);back.rotateY(angle);backs.push(back)
      // Small projecting jambs and lintels leave the dark inset inside stone.
      for(const x of [a-.105,b+.105])box(.21,d-c+.38,.24,x,c-.12,6.37,angle)
      box(b-a+.58,.22,.42,(a+b)/2,d+.08,6.37,angle)
      if(c>2)box(b-a+.48,.16,.32,(a+b)/2,c-.2,6.37,angle)
    }
    // A central projecting bay and restrained paired pilasters frame the panel.
    for(const x of [-2.35,2.35]) {
      box(.72,6.5,.42,x,2.1,6.4,angle)
      add(carvedPillarGeometry(5.9,.42),x,2.4,6.72,angle)
      box(1.05,.2,.72,x,2.0,6.45,angle)
      box(1.12,.22,.8,x,8.45,6.45,angle)
    }
    for(const [y,w,h] of [[4.2,5.2,.23],[4.52,4.8,.16],[8.55,5.7,.27]])box(w,h,.52,0,y,6.46,angle)
    // The upper terrace has a low solid parapet with repeated pierced slots.
    for(let i=0;i<20;i++)box(.4,.48,.24,-6.3+i*.66,10.02,6.58,angle)
    box(13.35,.14,.4,0,10.5,6.58,angle)
  }
  for(const [y,w,d,h] of [[8.8,13.1,13.1,.2],[9,13.75,13.75,.2],[9.2,14.1,14.1,.25],[9.45,13.65,13.65,.25],[9.7,13.2,13.2,.3]])course(w,d,y,h,.12)
  // A low, chamfered foot plinth supports the figure at exactly y=12.
  course(10.6,9.6,10,1.8,.15);course(11,10,11.8,.2,.12)

  for(const [geometry,material,name] of [[combineStone(parts),stone,'Carved pedestal masonry'],[combineStone(backs),recess,'Recessed window and doorway backs']]) {
    const mesh=new THREE.Mesh(geometry,material);mesh.name=name
    mesh.castShadow=mesh.receiveShadow=true;group.add(mesh)
  }
  return group
}
