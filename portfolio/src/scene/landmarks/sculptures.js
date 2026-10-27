import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { loftGeometry } from '../character-geometry.js'
import { registerDetailLod } from '../detail-lod.js'

const cache = new Map()
// Original architectural guardian study, not a scan of a historical sculpture.
// A modeled silhouette, turned torso, bent limbs, drapery, facial relief and crown
// replace the painted circle-and-triangle figures formerly used on the towers.
export function guardianGeometry(low = false, variant = 0, polychrome = false) {
  const key = `${low}:${variant}:${polychrome}`
  if (cache.has(key)) return cache.get(key)
  const parts = []
  const segments = low ? 6 : 10
  const colors = { skin: ['#cba281','#82aabd','#80a08a'][variant%3], garment: ['#9b4945','#b79b4c','#7b607e'][variant%3], gold:'#c7a258', hair:'#353936', eye:'#333e3d', stone:'#ffffff' }
  let finish = 'stone'
  const add = (geometry, position) => {
    if (polychrome) {
      const color = new THREE.Color(colors[finish])
      const values = new Float32Array(geometry.attributes.position.count*3)
      for (let i=0;i<values.length;i+=3) { values[i]=color.r;values[i+1]=color.g;values[i+2]=color.b }
      geometry.setAttribute('color',new THREE.BufferAttribute(values,3))
    }
    if (position) geometry.translate(...position)
    parts.push(geometry)
  }
  const oval = (r, scale, position) => {
    const geometry = new THREE.SphereGeometry(r, segments, low ? 4 : 7)
    geometry.scale(...scale)
    add(geometry, position)
  }
  const limb = (a, b, r0, r1) => {
    const start = new THREE.Vector3(...a)
    const end = new THREE.Vector3(...b)
    const geometry = new THREE.CylinderGeometry(r1, r0, start.distanceTo(end), low ? 5 : 8)
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize()))
    add(geometry, start.add(end).multiplyScalar(0.5).toArray())
  }
  add(new THREE.CylinderGeometry(.22, .25, .075, segments), [0, .0375, 0])
  finish = 'skin'
  // Shaped chest, shoulder and waist sections, rather than a rotational cone.
  add(loftGeometry([[.43,.105,.07,0],[.48,.09,.065,0],[.55,.135,.082,0],[.62,.17,.083,0],[.67,.135,.07,0],[.70,.05,.043,0],[.74,.045,.04,0]],low?10:18))
  finish = 'garment'
  // Draped lower garment, with a turned hem and individual vertical folds.
  add(new THREE.LatheGeometry([[.08,.19],[.14,.20],[.17,.28],[.13,.43],[.12,.47]].map(([x,y]) => new THREE.Vector2(x,y)), segments))
  for (let i = 0; i < (low ? 5 : 9); i++) {
    const a = i * Math.PI * 2 / (low ? 5 : 9)
    limb([Math.sin(a)*.12,.43,Math.cos(a)*.12],[Math.sin(a)*.155,.23,Math.cos(a)*.155],.011,.007)
  }
  finish = 'skin'
  for (const side of [-1,1]) {
    limb([side*.075,.27,0],[side*(variant===2?.17:.085),variant===2?.2:.09,.015],.038,.026)
    oval(.045,[.8,.48,1.6],[side*.085,.09,.042])
    const elbow = [side*.23, variant===1 && side>0 ? .78 : .51, .02]
    const hand = [side*(variant===2?.05:.15), variant===1 && side>0 ? .94 : variant===2?.57:.43, .10]
    limb([side*.145,.65,0],elbow,.045,.032)
    limb(elbow,hand,.032,.022)
    oval(.032,[.7,1.15,.7],hand)
    oval(.024,[.6,1.8,.5],[side*.077,.79,0])
    if (!low) {
      finish = 'gold'
      const earring = new THREE.TorusGeometry(.025,.006,4,8)
      add(earring,[side*.079,.755,.015])
      finish = 'skin'
      for(let finger=0;finger<3;finger++) limb([hand[0]+(finger-1)*.012,hand[1]-.015,hand[2]+.01],[hand[0]+(finger-1)*.012,hand[1]-.047,hand[2]+.018],.005,.003)
    }
  }
  oval(.075,[.88,1.18,.82],[0,.79,0])
  // Nose, brow ridge, lips and chin remain the same stone as the sculpture.
  oval(.023,[.55,1.4,1.2],[0,.79,.066])
  oval(.03,[1.6,.2,.45],[0,.817,.053])
  oval(.022,[1,.2,.5],[0,.752,.06])
  oval(.025,[1,.5,.65],[0,.736,.043])
  if (!low) {
    finish = 'eye'
    for (const side of [-1,1]) oval(.010,[1,.42,.45],[side*.028,.803,.060])
  }
  finish = 'gold'
  // Layered headpiece and neck/waist ornament, all actual geometry.
  const crown = [[0,.85],[.085,.85],[.095,.875],[.07,.90],[.075,.925],[.052,.96],[.045,.995],[.015,1.045],[0,1.06]]
  add(new THREE.LatheGeometry(crown.map(([x,y]) => new THREE.Vector2(x,y)), segments))
  for (const [radius,y] of [[.09,.865],[.065,.925],[.12,.46],[.075,.707]]) {
    const ring = new THREE.TorusGeometry(radius,.012,4,segments)
    ring.rotateX(Math.PI/2)
    add(ring,[0,y,0])
  }
  const normalized = parts.map((part) => part.index ? part.toNonIndexed() : part)
  const geometry = mergeGeometries(normalized)
  normalized.forEach((part) => part.dispose())
  parts.forEach((part) => part.dispose())
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  cache.set(key, geometry)
  return geometry
}

// At less than eight CSS pixels, preserve crown, shoulders and articulated
// pose with 138 original triangles instead of thousands of invisible details.
export function guardianProxyGeometry(variant=0,polychrome=false,medium=false) {
  const key=`proxy:${variant}:${polychrome}:${medium}`
  if(cache.has(key))return cache.get(key)
  const parts=[],colors={stone:'#ffffff',skin:['#cba281','#82aabd','#80a08a'][variant%3],garment:['#9b4945','#b79b4c','#7b607e'][variant%3],gold:'#c7a258'}
  const add=(geometry,position,finish='skin')=>{
    geometry.translate(...position)
    if(polychrome){
      const tint=new THREE.Color(colors[finish]),values=new Float32Array(geometry.attributes.position.count*3)
      for(let i=0;i<values.length;i+=3)tint.toArray(values,i)
      geometry.setAttribute('color',new THREE.BufferAttribute(values,3))
    }
    parts.push(geometry)
  }
  const limb=(a,b,r0,r1)=>{
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b)
    const geometry=new THREE.CylinderGeometry(r1,r0,start.distanceTo(end),medium?4:3,1,true)
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),end.clone().sub(start).normalize()))
    add(geometry,start.add(end).multiplyScalar(.5).toArray())
  }
  add(new THREE.CylinderGeometry(.22,.25,.075,medium?6:4),[0,.0375,0],'stone')
  add(medium?loftGeometry([[.43,.105,.07,0],[.48,.09,.065,0],[.55,.135,.082,0],[.62,.17,.083,0],[.67,.135,.07,0],[.70,.05,.043,0]],6):new THREE.CylinderGeometry(.16,.105,.23,4),medium?[0,0,0]:[0,.555,0])
  add(new THREE.CylinderGeometry(.045,.05,.065,3,1,true),[0,.695,0])
  add(medium?new THREE.LatheGeometry([[.08,.19],[.14,.20],[.17,.28],[.13,.43],[.12,.47]].map(([x,y])=>new THREE.Vector2(x,y)),6):new THREE.ConeGeometry(.18,.28,4),medium?[0,0,0]:[0,.33,0],'garment')
  const head=medium?new THREE.SphereGeometry(1,6,4):new THREE.OctahedronGeometry(1);head.scale(.066,.09,.062)
  add(head,[0,.79,0])
  add(medium?new THREE.LatheGeometry([[0,.85],[.085,.85],[.095,.875],[.07,.90],[.075,.925],[.052,.96],[.045,.995],[.015,1.045],[0,1.06]].map(([x,y])=>new THREE.Vector2(x,y)),6):new THREE.ConeGeometry(.085,.21,4),medium?[0,0,0]:[0,.955,0],'gold')
  if(medium)for(const [radius,y] of [[.12,.46],[.075,.707]]){
    const ring=new THREE.TorusGeometry(radius,.01,3,6);ring.rotateX(Math.PI/2);add(ring,[0,y,0],'gold')
  }
  for(const side of [-1,1]){
    limb([side*.075,.27,0],[side*(variant===2?.17:.085),variant===2?.2:.09,.015],.038,.026)
    const foot=new THREE.BoxGeometry(.072,.043,.144);add(foot,[side*.085,.09,.042])
    const elbow=[side*.23,variant===1&&side>0?.78:.51,.02]
    const hand=[side*(variant===2?.05:.15),variant===1&&side>0?.94:variant===2?.57:.43,.10]
    limb([side*.145,.65,0],elbow,.045,.032);limb(elbow,hand,.032,.022)
    const palm=medium?new THREE.SphereGeometry(.032,6,3):new THREE.OctahedronGeometry(.032);palm.scale(.7,1.15,.7);add(palm,hand)
  }
  const normalized=parts.map(part=>part.index?part.toNonIndexed():part.clone()),geometry=mergeGeometries(normalized)
  for(const part of [...parts,...normalized])part.dispose()
  geometry.computeBoundingBox();geometry.computeBoundingSphere()
  cache.set(key,geometry);return geometry
}

export function createSculptureInstances(low = false, { polychrome = false } = {}) {
  const placements = []
  return {
    place(x,y,z,rotation,height,color) { placements.push({x,y,z,rotation,height,color,variant:placements.length%3}) },
    build() {
      const group = new THREE.Group()
      group.name = 'Original modeled architectural figures — three poses'
      group.userData.preserveAssembly=true
      const material = low ? new THREE.MeshLambertMaterial({color:0xffffff,vertexColors:polychrome}) : new THREE.MeshStandardMaterial({color:0xffffff,roughness:.88,vertexColors:polychrome})
      const partitions=new Map()
      for(const p of placements){
        // One batch per facade and pose keeps opposite faces independently
        // culled without multiplying draw calls across every spatial cell.
        const angle=Math.atan2(Math.sin(p.rotation),Math.cos(p.rotation))
        const key=[Math.round(angle*1e4),p.variant].join(':')
        if(!partitions.has(key))partitions.set(key,[])
        partitions.get(key).push(p)
      }
      for(const [partition,subset] of partitions) {
        const variant=subset[0].variant
        const levels=[guardianGeometry(low,variant,polychrome),low?guardianProxyGeometry(variant,polychrome,true):guardianGeometry(true,variant,polychrome),guardianProxyGeometry(variant,polychrome)]
        const mesh=new THREE.InstancedMesh(levels[0],material,subset.length)
        mesh.name='Guardian facade '+partition
        mesh.userData.guardianVariant=variant
        const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),scale=new THREE.Vector3()
        for(const [i,p] of subset.entries()) {
          const k=p.height/1.06
          q.setFromAxisAngle(new THREE.Vector3(0,1,0),p.rotation)
          matrix.compose(new THREE.Vector3(p.x,p.y,p.z),q,scale.set(k,k,k*.95))
          mesh.setMatrixAt(i,matrix)
          mesh.setColorAt(i,polychrome?new THREE.Color(p.color).lerp(new THREE.Color(0xffffff),.94):new THREE.Color(p.color))
        }
        mesh.castShadow=mesh.receiveShadow=!low
        mesh.computeBoundingSphere()
        group.add(mesh)
        registerDetailLod(mesh,{levels,center:mesh.boundingSphere.center,height:Math.max(...subset.map(p=>p.height))})
      }
      return group
    },
  }
}
