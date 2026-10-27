import * as THREE from 'three'
import { block, rng, surface } from '../util.js'
import { grainTexture } from '../textures.js'

// An authored pedestrian approach ties the gateway to the road. Dimensions
// are composed for the trip; this is not a survey of the real temple streets.
export function templeForecourt() {
  const group=new THREE.Group();group.name='Madurai — granite pedestrian approach'
  const stone=surface({color:0xa6a49a,map:grainTexture(),roughness:.94})
  const edge=surface({color:0x8c8c83,roughness:.96})
  const ivory=surface({color:0xc9c6b5,roughness:.96})
  const red=surface({color:0x9f5148,roughness:.96})
  const cols=84,rows=36,step=1.25
  const slabs=new THREE.InstancedMesh(new THREE.BoxGeometry(1.23,.12,1.23),stone,cols*rows)
  const matrix=new THREE.Matrix4(),random=rng(152)
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
    const index=row*cols+col,x=(col-(cols-1)/2)*step,z=54+row*step
    slabs.setMatrixAt(index,matrix.makeTranslation(x,.015,z))
    const value=.87+random()*.12
    slabs.setColorAt(index,new THREE.Color().setRGB(value,value*.995,value*.97))
  }
  slabs.receiveShadow=true;group.add(slabs)
  group.add(block(106,.2,.45,edge,0,-.05,98),block(.45,.2,46,edge,-53,-.05,75.5),block(.45,.2,46,edge,53,-.05,75.5))
  // Traditional alternating wall bands remain on the low enclosure, not on
  // the sculpted tower. They are shallow modeled layers over the granite wall.
  const stripes=[]
  for(let side of [-1,1]){
    // Match madurai.js's 44 m wall wings, centered at +/-30 m. Keeping
    // their extents identical avoids a bare strip beside the gateway.
    group.add(block(44,4.65,.08,ivory,side*30,.1,52.75))
    for(let i=0;i<22;i++)stripes.push([side*(8.7+i*2),2.425,52.81])
    group.add(block(44.8,.22,.35,edge,side*30,4.75,52.8))
  }
  const bands=new THREE.InstancedMesh(new THREE.BoxGeometry(.88,4.65,.09),red,stripes.length)
  for(const [i,p] of stripes.entries())bands.setMatrixAt(i,matrix.makeTranslation(...p))
  group.add(bands)
  // Repeated seats and supports share two draws rather than eighteen.
  // Both types retain modeled thickness and leave the gateway clear.
  const seats=new THREE.InstancedMesh(new THREE.BoxGeometry(4,.2,1.1),edge,6)
  const legs=new THREE.InstancedMesh(new THREE.BoxGeometry(.4,.63,.9),stone,12)
  seats.name='Forecourt stone seats';legs.name='Forecourt seat supports'
  let seat=0,leg=0
  for(const side of [-1,1])for(const z of [64,79,92]){
    seats.setMatrixAt(seat++,matrix.makeTranslation(side*44,.73,z))
    for(const x of [45.35,42.65])legs.setMatrixAt(leg++,matrix.makeTranslation(side*x,.315,z))
  }
  for(const mesh of [seats,legs]){mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh)}
  return group
}
