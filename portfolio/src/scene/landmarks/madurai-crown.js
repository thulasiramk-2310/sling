import * as THREE from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {barrelVaultGeometry} from './stonework.js'
import {surface} from '../util.js'
import {quality} from '../quality.js'
import {createGopuramScrolls} from './gopuram-scrolls.js'

// Original sala-crest study informed by the district's South Tower photograph.
// Molded panels, foliate end crests and turned kalashas, not a traced deity or
// copied surface. Every component has thickness and receives the scene lighting.
export function maduraiCrown(width,depth,gold) {
  const root=new THREE.Group();root.name='Madurai — molded sala crest and kalashas'
  const low=quality.low,groups=new Map()
  const blue=surface({color:0x547c86,roughness:.91})
  const oxide=surface({color:0xa76d5d,roughness:.94})
  const lime=surface({color:0xc3b9a0,roughness:.92})
  const shade=surface({color:0x405e61,roughness:.96})
  const length=width*1.15,span=depth*1.1,rise=depth*.55
  const add=(geometry,material,transform=null)=>{
    if(transform)geometry.applyMatrix4(transform)
    if(!groups.has(material))groups.set(material,[])
    groups.get(material).push(geometry)
  }
  const box=(w,h,d,material,x,y,z)=>add(new THREE.BoxGeometry(w,h,d).translate(x,y+h/2,z),material)
  const shape=new THREE.Shape();shape.moveTo(-span/2,0)
  shape.bezierCurveTo(-span/2,rise*.8,-span*.2,rise,0,rise)
  shape.bezierCurveTo(span*.2,rise,span/2,rise*.8,span/2,0);shape.closePath()
  const arc=new THREE.CurvePath()
  arc.add(new THREE.CubicBezierCurve3(new THREE.Vector3(0,0,span/2),new THREE.Vector3(0,rise*.8,span/2),new THREE.Vector3(0,rise,span*.2),new THREE.Vector3(0,rise,0)))
  arc.add(new THREE.CubicBezierCurve3(new THREE.Vector3(0,rise,0),new THREE.Vector3(0,rise,-span*.2),new THREE.Vector3(0,rise*.8,-span/2),new THREE.Vector3(0,0,-span/2)))
  const vault=barrelVaultGeometry(length,span,rise);vault.rotateY(Math.PI/2);add(vault,oxide)
  box(length+.6,.22,span+.4,lime,0,-.24,0)
  box(length+.35,.18,span+.22,shade,0,-.02,0)
  for(let rib=0;rib<=Math.ceil(length/.55);rib++) {
    const x=-length/2+rib/Math.ceil(length/.55)*length
    const geometry=new THREE.TubeGeometry(arc,low?12:24,.035,low?4:6,false)
    geometry.translate(x,.025,0);add(geometry,blue)
  }
  // A raised central frieze carries a strong horizontal crest silhouette.
  for(const side of [-1,1]){
    box(length*.8,.32,.25,blue,0,.18,side*(span/2+.09))
    box(length*.82,.09,.3,lime,0,.48,side*(span/2+.1))
  }
  const leaf=new THREE.Shape();leaf.moveTo(0,0)
  leaf.bezierCurveTo(-.5,.35,-.48,1.12,0,1.52)
  leaf.bezierCurveTo(.48,1.12,.5,.35,0,0);leaf.closePath()
  const leafGeometry=new THREE.ExtrudeGeometry(leaf,{depth:.14,bevelEnabled:true,bevelSegments:1,bevelSize:.035,bevelThickness:.04,curveSegments:low?3:6})
  for(const side of [-1,1]){
    const frame=new THREE.Matrix4().makeRotationY(side*Math.PI/2)
    frame.setPosition(side*(length/2+.02),0,0)
    const panel=new THREE.ExtrudeGeometry(shape,{depth:.2,bevelEnabled:true,bevelSize:.06,bevelThickness:.06,bevelSegments:1,curveSegments:low?6:12})
    add(panel,blue,frame)
    const border=new THREE.TubeGeometry(arc,low?14:28,.13,low?5:8,false)
    border.translate(side*(length/2+.23),.02,0);add(border,lime)
    // A layered foliate medallion on each closed end replaces the bare hole.
    const centerY=rise*.44,radius=Math.min(span*.22,rise*.36)
    const ring=new THREE.TorusGeometry(radius,.11,low?5:8,low?16:32)
    ring.scale(1,1.13,1);ring.translate(0,centerY,.28);add(ring,lime,frame)
    const inner=new THREE.TorusGeometry(radius*.72,.075,low?4:6,low?14:28)
    inner.scale(1,1.13,1);inner.translate(0,centerY,.32);add(inner,oxide,frame)
    for(let petal=0;petal<8;petal++){
      const angle=petal/8*Math.PI*2
      const geometry=leafGeometry.clone();geometry.scale(radius*.44,radius*.6,1)
      geometry.rotateZ(angle);geometry.translate(-Math.sin(angle)*radius*.68,centerY+Math.cos(angle)*radius*.68,.24)
      add(geometry,petal%2?oxide:lime,frame)
    }
    const boss=new THREE.SphereGeometry(1,low?10:18,low?6:10)
    boss.scale(radius*.34,radius*.41,.23);boss.translate(0,centerY,.49);add(boss,lime,frame)
    for(const sign of [-1,1]){
      const geometry=leafGeometry.clone();geometry.scale(span*.13,rise*.29,1)
      geometry.rotateZ(-sign*.5);geometry.translate(sign*span*.32,rise*.53,.15);add(geometry,oxide,frame)
    }
  }
  leafGeometry.dispose()
  const potProfile=[[0,0],[.29,0],[.31,.09],[.20,.15],[.18,.27],[.33,.42],[.31,.63],[.17,.77],[.11,.9],[.19,.98],[.11,1.11],[0,1.34]]
  const pot=new THREE.LatheGeometry(potProfile.map(p=>new THREE.Vector2(...p)),low?8:16)
  for(let i=0;i<9;i++){
    const geometry=pot.clone();geometry.scale(1,1.1,1);geometry.translate((i-4)*length*.105,rise+.04,0);add(geometry,gold)
    box(.75,.11,.75,lime,(i-4)*length*.105,rise-.04,0)
  }
  pot.dispose()
  for(const [material,parts] of groups){
    const normalized=parts.map(geometry=>geometry.index?geometry.toNonIndexed():geometry)
    const geometry=mergeGeometries(normalized)
    for(const part of new Set([...parts,...normalized]))part.dispose()
    geometry.computeBoundingBox();geometry.computeBoundingSphere()
    const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh)
  }
  // The long front, seen from the street, carries its own projecting stucco
  // compositions rather than leaving the modeled work only on the end panels.
  const frontReliefs=createGopuramScrolls(low)
  for(const side of [-1,1])for(const along of [-.32,0,.32]){
    const angle=side>0?0:Math.PI
    const position=new THREE.Vector3(along*length,rise*.10,side*(span/2+.10))
    // Local +Z remains the outward face on both sides of the sala.
    frontReliefs.place(position,angle,rise*(along===0?.73:.62),new THREE.Color(0xffffff))
  }
  root.add(frontReliefs.build())
  // Include the modeled crest/finials in the authored overall tower height.
  root.userData.height=new THREE.Box3().setFromObject(root).max.y
  return root
}
