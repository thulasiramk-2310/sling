import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// Original street frontage inspired by Tamil terrace houses: shaded verandas,
// plaster pilasters, deep shutters, balconies and flat roof parapets. No facade image.
export function streetGeometry(floors=3,variant=0) {
  const groups={ plaster:[],trim:[],wood:[],glass:[],metal:[],roof:[] }
  const box=(key,w,h,d,x,y,z,angle=0)=>{
    const geometry=new THREE.BoxGeometry(w,h,d)
    geometry.rotateY(angle)
    geometry.translate(x,y+h/2,z)
    groups[key].push(geometry)
  }
  const height=floors*3.2
  box('plaster',6,height,5.4,0,0,0)
  box('trim',6.4,.25,5.8,0,.08,0)
  for (let floor=0;floor<floors;floor++) {
    const y=floor*3.2
    box('trim',6.25,.16,5.65,0,y+3.05,0)
    for (const x of (variant===1?[-1.65,1.65]:[-2,0,2])) {
      const door=floor===0 && x===(variant===1?-1.65:0)
      box('glass',1.12,door?2.35:1.85,.1,x,y+(door?.14:.64),2.76)
      if(door) { box('wood',.10,2.4,.15,x-.61,y+.12,2.83);box('wood',.10,2.4,.15,x+.61,y+.12,2.83);box('metal',.035,.22,.08,x+.43,y+1.1,2.88) }
      box('trim',1.45,.16,.42,x,y+.48,2.8)
      box('trim',1.4,.18,.4,x,y+2.5,2.8)
      for (const s of [-1,1]) {
        box('trim',.12,1.9,.27,x+s*.64,y+.62,2.8)
        box('wood',.42,1.8,.08,x+s*.82,y+.67,2.87,s*.4)
        for (let j=0;j<7;j++) box('wood',.38,.045,.11,x+s*.82,y+.83+j*.21,2.94,s*.4)
      }
    }
    for (const x of [-2.92,2.92]) {
      box('trim',.26,2.7,.35,x,y+.23,2.8)
      box('trim',.39,.18,.46,x,y+2.8,2.8)
    }
  }
  // Open portico structure and projecting shade, with a real recessed walkway.
  box('roof',6.6,.2,1.5,0,3.03,3.4)
  for (const x of [-2.8,0,2.8]) {
    box('trim',.23,2.98,.23,x,.05,3.8)
    box('trim',.42,.15,.42,x,2.8,3.8)
  }
  if (floors>1) {
    box('trim',3.25,.18,1.05,0,3.24,3.1)
    box('metal',3.25,.055,.055,0,4.3,3.6)
    for (let j=0;j<=12;j++) box('metal',.035,1.06,.035,-1.55+j*3.1/12,3.27,3.6)
  }
  if(variant===1) {
    // A small tiled gable breaks the flat terrace skyline with a real roof volume.
    const roof=new THREE.Shape();roof.moveTo(-3.35,0);roof.lineTo(0,1.7);roof.lineTo(3.35,0);roof.closePath()
    const geometry=new THREE.ExtrudeGeometry(roof,{depth:6,bevelEnabled:false})
    geometry.translate(0,height,-3);groups.roof.push(geometry)
    for(const side of [-1,1])for(let row=0;row<7;row++) {
      const x=side*(.15+row*.46),y=height+1.7-Math.abs(x)/3.35*1.7
      box('trim',.045,.045,6.1,x,y,0)
    }
  } else {
    box('roof',6.4,.28,5.8,0,height,0)
    for (const z of [-2.65,2.65]) box('plaster',6,.6,.2,0,height+.28,z)
    for (const x of [-2.9,2.9]) box('plaster',.2,.6,5.4,x,height+.28,0)
    for (const z of [-2.65,2.65]) box('trim',6.3,.12,.34,0,height+.86,z)
  }
  if(variant===2) {
    // Ground-floor shop shutters, projecting shade and a roof tank.
    box('metal',2.8,2.25,.08,0,.3,2.88)
    for(let i=0;i<18;i++)box('wood',2.75,.045,.10,0,.36+i*.12,2.94)
    for(const x of [-1.5,1.5])box('trim',.17,2.45,.25,x,.18,2.96)
    box('roof',3.6,.12,1.8,0,2.78,3.3)
    const tank=new THREE.CylinderGeometry(.65,.65,1.4,16);tank.translate(1.8,height+1,-1.5);groups.metal.push(tank)
    box('metal',.06,2.8,.06,2.4,height-1,-1.5)
  }
  box('trim',2.4,.14,.7,0,0,3.05)
  const result={}
  for (const [name,parts] of Object.entries(groups)) {
    if(!parts.length)continue
    const normalized=parts.map(part=>part.index?part.toNonIndexed():part)
    result[name]=mergeGeometries(normalized)
    for(const part of new Set([...parts,...normalized]))part.dispose()
    result[name].computeBoundingSphere()
  }
  return { geometries:result,height }
}
