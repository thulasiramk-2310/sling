import * as THREE from 'three'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'
import { PROJECTS } from '../../content.js'
import { introFrame } from '../landmarks/intro-bridge.js'
import { faceRoad } from '../route.js'
import { createSkillCollection, SKILL_MARKERS } from './skills.js'
import { block, surface } from '../util.js'

export const projectRoadPosition=(index,count)=>.335+index*.055/Math.max(1,count-1)

function lettering(text,font,size,material) {
  const geometry=new TextGeometry(text,{font,size,depth:size*.045,curveSegments:5,bevelEnabled:true,bevelSize:size*.008,bevelThickness:size*.008,bevelSegments:1})
  geometry.computeBoundingBox()
  geometry.translate(-(geometry.boundingBox.max.x+geometry.boundingBox.min.x)/2,0,0)
  return new THREE.Mesh(geometry,material)
}
function label(text,width=8,ink='#f4e6c4') {
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128
  const ctx=canvas.getContext('2d')
  ctx.fillStyle=ink;ctx.font='500 46px "DM Sans Variable", sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,64,990)
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,width/8),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide}))
  mesh.userData.noShadow=true
  return mesh
}

function skillLabel(name) {
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d')
  ctx.font='600 90px "DM Sans Variable", sans-serif'
  canvas.width=Math.max(220,Math.ceil(ctx.measureText(name).width+90));canvas.height=128
  ctx.font='600 90px "DM Sans Variable", sans-serif';ctx.fillStyle='#f8efd9'
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(name,canvas.width/2,66)
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace
  return new THREE.Mesh(new THREE.PlaneGeometry(canvas.width/128*1.25,1.25),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide}))
}

export async function buildJourneyExhibits(scene,route) {
  const font=await new FontLoader().loadAsync(import.meta.env.BASE_URL+'fonts/optimer_regular.typeface.json')
  const cream=surface({color:0xf5e7cb,roughness:.58,emissive:0x262015,emissiveIntensity:.3}),gold=surface({color:0xd5aa52,metalness:.65,roughness:.32})
  const stone=surface({color:0x9b947e,roughness:.93}),dark=surface({color:0x203c3e,roughness:.7})
  const greeting=new THREE.Group();greeting.name='Hello in the sky — real extruded letters'
  const hello=lettering('Hello, world.',font,7.8,new THREE.MeshBasicMaterial({color:0x304743,fog:false,toneMapped:false}))
  greeting.add(hello)
  const subtitle=label('FROM TAMIL NADU TO THE WORLD',45,'#304743');subtitle.position.y=-4;subtitle.material.fog=false;subtitle.material.toneMapped=false;greeting.add(subtitle)
  const greetingWidth=new THREE.Box3().setFromObject(greeting).getSize(new THREE.Vector3()).x
  greeting.position.copy(introFrame(route).point(6,66,30))
  const greetingOrigin=greeting.position.clone(),titleRay=new THREE.Vector3()
  let portraitTitleAspect=null
  scene.add(greeting)
  const finale=new THREE.Group()
  finale.name='Connections above Kanyakumari'
  const end=route.at(.96)
  finale.position.copy(end.pos).addScaledVector(end.right,30);finale.position.y=145
  const farewellInk=new THREE.MeshBasicMaterial({color:0x203b3e,fog:false,toneMapped:false})
  finale.add(lettering('The journey continues.',font,2.6,farewellInk))
  const endSubtitle=label('CHENNAI  /  TAMIL NADU  /  THE WORLD',28);endSubtitle.material.color.setHex(0x203b3e);endSubtitle.position.y=-4;finale.add(endSubtitle)
  scene.add(finale)
  const collection=createSkillCollection()
  const skills=SKILL_MARKERS.map(({name,u})=>{
    const group=new THREE.Group()
    group.name='Skill marker: '+name;group.position.copy(route.at(u).pos)
    group.rotation.y=Math.atan2(route.at(u).tan.x,route.at(u).tan.z)
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.85,.10,8,32),gold)
    ring.position.y=1.6
    // A compact verge sign keeps the lane and the left reading column clear.
    // In this forward-facing frame local -X is the road's right-hand verge.
    const sign=new THREE.Group();sign.position.set(-6.2,3.05,0)
    const text=skillLabel(name);text.geometry.computeBoundingBox()
    const width=text.geometry.boundingBox.getSize(new THREE.Vector3()).x
    text.scale.setScalar(Math.min(.55,3.25/width));text.position.z=.09
    sign.add(block(3.6,.95,.14,dark,0,-.475),text)
    group.add(ring,sign,block(.12,3.55,.12,dark,-6.2));scene.add(group)
    return {u,group,ring,name,collected:false}
  })
  const targets=[]
  const projects=PROJECTS.map((project,index)=>{
    // Complete the roadside gallery before the Nandi visit turns into the
    // temple courtyard; each installation stays physically separated.
    const u=projectRoadPosition(index,PROJECTS.length),group=new THREE.Group()
    group.name='Project installation: '+project.name
    if(project.featured)group.scale.setScalar(1.25)
    group.position.copy(route.side(u,8.5));faceRoad(group,route,u)
    group.add(block(5.8,.55,3.5,stone))
    group.add(block(5,.25,3,gold,0,.55))
    for(const x of [-2.35,2.35]) group.add(block(.16,3.6,.16,gold,x,.8))
    group.add(block(5,3.1,.38,dark,0,1.25,-.2),block(5.15,.15,.6,gold,0,4.3))
    const name=lettering(project.name,font,project.name.length>10?.47:.65,cream)
    name.position.set(0,2.8,.08);group.add(name)
    const tag=label((project.draft?'CONCEPT · ':'')+project.tag,4.5);tag.position.set(0,2,.1);group.add(tag)
    const detail=label('EXPLORE PROJECT  ↗',3.7);detail.position.set(0,1.5,.1);group.add(detail)
    const hitbox=new THREE.Mesh(new THREE.BoxGeometry(5.4,4.5,1.4),new THREE.MeshBasicMaterial({visible:false}))
    hitbox.position.y=2.5;hitbox.userData.noShadow=true;hitbox.userData.project=index;group.add(hitbox)
    targets.push(hitbox);scene.add(group)
    return group
  })
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2()
  let down=null
  return {
    targets,
    seek:road=>collection.seek(road),
    skill:road=>collection.next(road),
    point(event,camera,canvas) {
      const bounds=canvas.getBoundingClientRect()
      pointer.set((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1)
      raycaster.setFromCamera(pointer,camera)
      return raycaster.intersectObjects(targets,false)[0]?.object.userData.project ?? null
    },
    pointerDown(event){down={x:event.clientX,y:event.clientY}},
    cancelPointer(){down=null},
    tapped(event){const result=down && Math.hypot(event.clientX-down.x,event.clientY-down.y)<8;down=null;return result},
    update(story,time,camera) {
      greeting.visible=story.progress<.115
      greeting.quaternion.copy(camera.quaternion)
      if(camera.aspect<.8){
        if(portraitTitleAspect===null || Math.abs(portraitTitleAspect-camera.aspect)>.001){
          camera.updateMatrixWorld(true)
          titleRay.set(0,.31,.5).unproject(camera).sub(camera.position).normalize()
          greeting.position.copy(camera.position).addScaledVector(titleRay,100)
          const depth=-greeting.position.clone().applyMatrix4(camera.matrixWorldInverse).z
          greeting.scale.setScalar(2*depth*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect*.84/greetingWidth)
          portraitTitleAspect=camera.aspect
        }
      }else{
        greeting.position.copy(greetingOrigin);greeting.scale.setScalar(1);portraitTitleAspect=null
      }
      finale.visible=story.progress>.94
      finale.quaternion.copy(camera.quaternion)
      finale.scale.setScalar(camera.aspect<.8?.9:1)
      const discovered=collection.update(story.road)
      for(const marker of skills) {
        marker.collected=collection.has(marker.name)
        marker.group.visible=!marker.collected && story.progress>.295 && story.progress<.54
        marker.group.children[1].lookAt(camera.position)
        marker.ring.rotation.y=Math.sin(time*.8)*.15
        marker.ring.position.y=1.6+Math.sin(time*1.1+marker.u*40)*.08
      }
      projects.forEach(group=>{group.visible=story.progress>.46 && story.progress<.69})
      return discovered
    },
  }
}
