import * as THREE from 'three'
import { surface } from './util.js'
import { batchStaticMeshes } from './batch.js'
import { quality } from './quality.js'
import { loftGeometry,CHARACTER_SECTIONS as sections } from './character-geometry.js'

function shirtPattern() {
  const size=64,data=new Uint8Array(size*size*4)
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const i=(y*size+x)*4,check=(Math.floor(x/8)+Math.floor(y/8))%2
    const value=check?245:216
    data.set([value,value,value,255],i)
  }
  const map=new THREE.DataTexture(data,size,size);map.colorSpace=THREE.SRGBColorSpace
  map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(1,1.5)
  map.generateMipmaps=true;map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;map.needsUpdate=true
  return map
}

// Original sculpted interpretation, using Ram's supplied portrait for the outfit.
// Not a scanned likeness. The same articulated assembly is used beside / in the auto.
export function createRamAvatar({seated=false}={}) {
  const root=new THREE.Group(),hips=new THREE.Group(),torsoRoot=new THREE.Group()
  root.name=seated?'Ram — seated driver':'Ram — articulated journey character'
  root.add(hips);hips.add(torsoRoot)
  const cloth=surface({color:0x502040,map:shirtPattern(),roughness:.92})
  const trim=surface({color:0x211c29,roughness:.85}),pants=surface({color:0xc8c1ad,roughness:.94})
  const skin=surface({color:0x9c6649,roughness:.74}),hair=surface({color:0x141719,roughness:.93})
  const leather=surface({color:0x292a2b,roughness:.65}),sole=surface({color:0x1d1e20,roughness:.9})
  const metal=surface({color:0x979fa0,roughness:.32,metalness:.8}),eye=surface({color:0x2a211d,roughness:.45})
  const mesh=(geometry,material,position,parent=hips)=>{
    const object=new THREE.Mesh(geometry,material);object.position.set(...position);parent.add(object);object.castShadow=object.receiveShadow=true;return object
  }
  const segments=quality.low?16:28
  const part=(name,material,position,parent=hips)=>mesh(loftGeometry(sections[name],segments),material,position,parent)
  part('pelvis',pants,[0,0,0]);part('shirt',cloth,[0,0,0],torsoRoot)
  mesh(new THREE.CylinderGeometry(.056,.061,.12,16),skin,[0,.665,0],torsoRoot)
  // Collar points and placket are raised garment geometry, not painted marks.
  for(const side of [-1,1]) {
    const collar=new THREE.Shape();collar.moveTo(side*.065,.658);collar.lineTo(side*.135,.603);collar.lineTo(side*.045,.543);collar.lineTo(side*.025,.625);collar.closePath()
    mesh(new THREE.ExtrudeGeometry(collar,{depth:.009,bevelEnabled:false}),trim,[0,0,.103],torsoRoot)
  }
  mesh(new THREE.BoxGeometry(.016,.40,.012),cloth,[0,.349,.119],torsoRoot)
  for(const y of [.18,.27,.36,.45,.53])mesh(new THREE.SphereGeometry(.0065,8,6),trim,[0,y,.131],torsoRoot)
  const head=new THREE.Group();head.position.set(0,seated?.70:.78,0);torsoRoot.add(head)
  part('head',skin,[0,0,0],head)
  const hairCap=mesh(new THREE.SphereGeometry(1,segments,14,0,Math.PI*2,0,Math.PI*.59),hair,[0,.086,-.012],head)
  hairCap.scale.set(.131,.135,.114);hairCap.rotation.z=-.08
  const locks=quality.low?4:9
  for(let i=0;i<locks;i++) {
    const x=-.095+i/(locks-1)*.185
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(x,.10,.083),new THREE.Vector3(x-.013,.20,-.005),new THREE.Vector3(x+.025,.12,-.10)])
    mesh(new THREE.TubeGeometry(curve,12,.008,5,false),hair,[0,0,0],head)
  }
  // A tapered bridge / nostril volume, eyelids, brows, mouth and ear forms.
  mesh(new THREE.SphereGeometry(.025,12,10),skin,[0,-.012,.111],head).scale.set(.7,1.4,1.2)
  mesh(new THREE.SphereGeometry(.018,12,8),skin,[0,-.029,.132],head).scale.set(1.3,.6,.6)
  mesh(new THREE.CapsuleGeometry(.0035,.037,4,10),trim,[0,-.086,.093],head).rotation.z=Math.PI/2
  for(const side of [-1,1]) {
    mesh(new THREE.SphereGeometry(.032,12,10),skin,[side*.123,-.014,-.008],head).scale.set(.48,1,.66)
    mesh(new THREE.SphereGeometry(.014,12,8),eye,[side*.049,.013,.102],head).scale.set(1,.47,.36)
    const brow=mesh(new THREE.CapsuleGeometry(.0045,.034,4,10),hair,[side*.05,.047,.100],head)
    brow.rotation.z=Math.PI/2+side*.12
    const lid=mesh(new THREE.CapsuleGeometry(.003,.03,4,10),skin,[side*.049,.020,.107],head);lid.rotation.z=Math.PI/2
  }
  const legs=[],arms=[]
  for(const side of [-1,1]) {
    const thigh=new THREE.Group();thigh.position.set(side*.096,-.01,0);hips.add(thigh)
    part('thigh',pants,[0,0,0],thigh)
    const knee=new THREE.Group();knee.position.y=-.4;thigh.add(knee)
    part('shin',pants,[0,0,0],knee)
    const foot=new THREE.Group();foot.position.y=-.36;knee.add(foot)
    part('shoe',leather,[0,0,0],foot)
    const base=loftGeometry([[-.11,.081,.16,.055],[-.085,.087,.167,.06]],segments)
    mesh(base,sole,[0,0,0],foot)
    for(let i=0;i<3;i++) {
      const lace=mesh(new THREE.CapsuleGeometry(.002,.065,3,6),trim,[0,-.005,.03+i*.025],foot);lace.rotation.z=Math.PI/2
    }
    legs.push({thigh,knee})
    const shoulder=new THREE.Group();shoulder.position.set(side*.226,.565,-.005);torsoRoot.add(shoulder)
    part('sleeve',cloth,[0,0,0],shoulder)
    const cuff=mesh(new THREE.CylinderGeometry(.057,.057,.036,segments),trim,[0,-.275,0],shoulder)
    cuff.scale.z=1.02
    const elbow=new THREE.Group();elbow.position.y=-.29;shoulder.add(elbow)
    part('forearm',skin,[0,0,0],elbow)
    const hand=new THREE.Group();hand.position.set(0,-.26,.008);elbow.add(hand)
    mesh(new THREE.SphereGeometry(.039,14,10),skin,[0,-.037,0],hand).scale.set(.75,1.25,.43)
    for(let finger=0;finger<4;finger++) {
      const object=mesh(new THREE.CapsuleGeometry(.0075,.035+(finger===1?.009:0),4,8),skin,[-.022+finger*.014,-.080,.006],hand)
      object.rotation.x=-.12
    }
    mesh(new THREE.CapsuleGeometry(.010,.033,4,8),skin,[side*.035,-.027,.008],hand).rotation.z=side*.6
    if(side===-1) {
      const strap=mesh(new THREE.TorusGeometry(.035,.010,6,20),trim,[0,-.222,0],elbow);strap.rotation.x=Math.PI/2
      const watch=mesh(new THREE.CylinderGeometry(.027,.027,.009,20),metal,[0,-.222,.038],elbow);watch.rotation.x=Math.PI/2
      const face=mesh(new THREE.CircleGeometry(.022,20),trim,[0,-.222,.044],elbow)
      face.rotation.z=.15
    }
    arms.push({shoulder,elbow,hand,side})
  }
  function update(time,boarding=0,reduced=false) {
    hips.position.y=seated?.94:.9-boarding*.15
    hips.position.x=seated?0:.025*(1-boarding)
    hips.rotation.z=seated?0:.025*(1-boarding)
    torsoRoot.rotation.x=seated?.10:0
    torsoRoot.rotation.z=seated?0:-.035*(1-boarding)
    head.rotation.y=reduced?0:Math.sin(time*.45)*.075
    for(const [index,{thigh,knee}] of legs.entries()) {
      thigh.rotation.x=seated?-1.67:boarding*.32
      thigh.rotation.z=seated?0:(index?-.018:.018)*(1-boarding)
      knee.rotation.x=seated?1.67:Math.max(0,Math.sin(boarding*24))*boarding*.35
    }
    for(const {shoulder,elbow,hand,side} of arms) {
      shoulder.rotation.z=seated?side*.06:side*.08
      shoulder.rotation.x=seated?-1.06:-.04-boarding*.65+(reduced?0:Math.sin(time*.7+side)*.025)
      elbow.rotation.x=seated?-.35:-.18-boarding*.2
      hand.rotation.x=seated?-.45:0
      hand.rotation.z=seated?0:side*.08
    }
  }
  update(0,0,true)
  batchStaticMeshes(root)
  return {root,update}
}
