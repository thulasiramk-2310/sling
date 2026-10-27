import * as THREE from 'three'
import { block } from '../util.js'
import { barrelVaultGeometry, carvedPillarGeometry, kuduGeometry } from './stonework.js'
import { dravidaTower } from './shrines.js'

// Original interpretations of the five distinct Pallava roof forms. No scans,
// photographs or facade images are used as model geometry.
function pillaredHall(width,depth,height,stone) {
  const group=new THREE.Group()
  group.add(block(width+.8,.6,depth+.8,stone))
  const count=Math.max(3,Math.round(depth/2.8))
  const columns=new THREE.InstancedMesh(carvedPillarGeometry(height,.8),stone,count*2)
  const m=new THREE.Matrix4()
  let i=0
  for(const x of [-width/2+.6,width/2-.6]) for(let j=0;j<count;j++) {
    m.makeTranslation(x,.6,-depth/2+.7+j*(depth-1.4)/(count-1))
    columns.setMatrixAt(i++,m)
  }
  group.add(columns,block(width+.5,.4,depth+.5,stone,0,height+.6))
  return group
}

function curvedHutRoof(width,depth,height) {
  const positions=[],indices=[]
  const rings=14
  for(let row=0;row<=rings;row++) {
    const t=row/rings
    const radius=.05+.95*Math.pow(1-t,.7)
    for(const [x,z] of [[-1,-1],[1,-1],[1,1],[-1,1]]) positions.push(x*width*.5*radius,height*t,z*depth*.5*radius)
  }
  for(let row=0;row<rings;row++) for(let side=0;side<4;side++) {
    const a=row*4+side,b=row*4+(side+1)%4,c=(row+1)*4+side,d=(row+1)*4+(side+1)%4
    indices.push(a,c,b,b,c,d)
  }
  indices.push(rings*4,rings*4+2,rings*4+1,rings*4,rings*4+3,rings*4+2)
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(positions.flatMap((_,i)=>i%3===0?[positions[i]/width,positions[i+1]/height]:[]),2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

export function createRathas(stone,wall=stone) {
  const group=new THREE.Group()
  group.userData.staticBatchRoot=true
  const draupadi=new THREE.Group()
  draupadi.name='Draupadi — curved hut roof'
  draupadi.add(block(5.7,.8,5.7,stone),block(5,3.1,5,wall,0,.8))
  const hut=new THREE.Mesh(curvedHutRoof(6.1,6.1,3.1),stone)
  hut.position.y=3.9
  draupadi.add(hut)
  const doorway=new THREE.Mesh(kuduGeometry(),stone)
  doorway.scale.set(2,2.5,2)
  doorway.position.set(0,1,2.55)
  draupadi.add(doorway)
  const arjuna=dravidaTower({base:6.5,tiers:2,wallH:3.2,tierH:1.8,mat:stone,wallMat:wall})
  arjuna.name='Arjuna — two-storey square shrine'
  const bhima=pillaredHall(6.5,12.8,3.8,stone)
  bhima.name='Bhima — long barrel-vaulted hall'
  const vault=new THREE.Mesh(barrelVaultGeometry(13.2,7.4,3.2),stone)
  vault.position.y=4.8
  bhima.add(vault)
  for(const z of [-6.5,6.5]) {
    const frame=new THREE.Mesh(kuduGeometry(),stone)
    frame.scale.set(3.2,2.4,1)
    frame.position.set(0,4.9,z)
    if(z<0) frame.rotation.y=Math.PI
    bhima.add(frame)
  }
  const dharmaraja=dravidaTower({base:8.8,tiers:3,wallH:4.1,tierH:2.1,mat:stone,wallMat:wall})
  dharmaraja.name='Dharmaraja — three-storey vimana'
  const apsidal=new THREE.Group()
  apsidal.name='Nakula–Sahadeva — apsidal shrine'
  const footprint=new THREE.Shape()
  footprint.moveTo(-2.9,3)
  footprint.lineTo(2.9,3)
  footprint.lineTo(2.9,-1.8)
  footprint.absarc(0,-1.8,2.9,0,Math.PI,true)
  footprint.lineTo(-2.9,3)
  const base=new THREE.ExtrudeGeometry(footprint,{depth:3.1,bevelEnabled:false,curveSegments:24})
  base.rotateX(-Math.PI/2)
  base.translate(0,.6,0)
  apsidal.add(new THREE.Mesh(base,wall),block(6.6,.6,9,stone))
  for(let tier=0;tier<2;tier++) {
    const roof=new THREE.Mesh(barrelVaultGeometry(7.6-tier*1.2,6.4-tier*.8,2.1-tier*.3),stone)
    roof.position.y=3.7+tier*1.7
    apsidal.add(roof)
  }
  const layouts=[[draupadi,-25,1],[arjuna,-15,1],[bhima,-2,0],[dharmaraja,15,0],[apsidal,-8,-13]]
  for(const [model,x,z] of layouts) {model.position.set(x,0,z);group.add(model)}
  group.name='Pancha Rathas — five distinct architectural studies'
  return group
}
