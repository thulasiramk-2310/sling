// Builds a gopuram: the tall tiered gateway tower of a South Indian temple.
// Used for Kanchipuram, Madurai and the far temple at Rameswaram.
import * as THREE from 'three'
import { quality } from '../quality.js'
import { stuccoTexture, stoneTexture, withRelief } from '../textures.js'
import { block, lambert, surface, uvScale } from '../util.js'
import { kutaGeometry, salaGeometry } from './shrines.js'
import { createSculptureInstances } from './sculptures.js'
import { createTierReliefs } from './temple-relief.js'
import { barrelVaultGeometry, carvedPillarGeometry, gatewayGeometry, kuduGeometry, taperedStoneCourse } from './stonework.js'
import {registerDetailLod} from '../detail-lod.js'
import {maduraiCrown} from './madurai-crown.js'
import {createGopuramScrolls} from './gopuram-scrolls.js'

export const PALETTES = {
  madurai: { wall: '#938e7d', figures: ['#ad5348', '#557d75', '#507f96', '#c59b4e', '#866b84', '#d2c5a5'], gold: '#c9961a' },
  rameswaram: { wall: '#d4cdb5', figures: ['#c1b9a2', '#d1c8b0', '#9d9b8d'], gold: '#ba995b' },
  kanchi: { wall: '#d9b488', figures: ['#b5543a', '#4a7a5a', '#3f6a9a', '#d3a03a', '#f0e8d8'], gold: '#b88a22' },
  // Thanjavur's gateways are bare granite, not painted.
  thanjavur: { wall: '#b49a76', figures: ['#9c8466', '#a8906f', '#8e765a', '#c2ab88'], gold: '#a08462' },
}

// Gilded copper finials: real metal on desktop (it reflects the sky), a warm glossy colour on phones.
export const goldMaterial = () =>
  quality.low
    ? new THREE.MeshPhongMaterial({ color: 0xd9a21b, specular: 0xffe9a0, shininess: 70, emissive: 0x2a1c02 })
    : new THREE.MeshStandardMaterial({ color: 0xe0ac2c, metalness: 1, roughness: 0.28 })

export function makeGopuram({ tiers, baseW, baseD, tierH, palette = 'madurai', seed = 1, podiumH = 6 }) {
  const group = new THREE.Group()
  group.userData.staticBatchRoot = true
  const pal = PALETTES[palette]
  const painted=palette==='madurai'
  const relief = withRelief('gopuram-' + palette, painted ? stuccoTexture : () => stoneTexture(pal.wall, seed), painted?.16:1.4)
  const tierMat = surface({ color:painted?pal.wall:0xffffff, map: relief.map, normalMap: quality.low ? null : relief.normalMap, roughness: .93 })
  const stone = painted?lambert(0xffffff,{map:stoneTexture('#93958d'),roughness:.96}):lambert(0xb6a58c, { map: stoneTexture('#b3a28a') })
  const trim = lambert(palette === 'madurai' ? 0xa9b3a4 : palette === 'rameswaram' ? 0xb4ae99 : 0x8a785f)
  const gold = goldMaterial()

  // Stone gateway with an actual passage through the base, framed by pilasters.
  const width=baseW*1.06, depth=baseD*1.06
  const podiumGeometry=gatewayGeometry(width,depth,podiumH)
  if(painted){
    const positions=podiumGeometry.attributes.position,normals=podiumGeometry.attributes.normal,uv=podiumGeometry.attributes.uv
    for(let i=0;i<positions.count;i++)uv.setXY(i,(Math.abs(normals.getX(i))>.5?positions.getZ(i):positions.getX(i))/4.8,positions.getY(i)/3.2)
  }
  const doorW=baseW*.26
  const podium=new THREE.Mesh(podiumGeometry,stone)
  podium.name='Gateway with open passage'
  group.add(podium)
  for(const x of [-doorW*.7,doorW*.7]) for(const z of [-depth*.51,depth*.51]) {
    const pillar=new THREE.Mesh(carvedPillarGeometry(podiumH,.95),stone)
    pillar.position.set(x,0,z)
    group.add(pillar)
  }

  // Tiers: each a little narrower and shorter, with a projecting cornice crowned by a row of
  // miniature shrines (a domed one at each corner, barrel-roofed ones between).
  let y = podiumH
  let w = baseW
  let d = baseD
  const kutas = new THREE.InstancedMesh(kutaGeometry(), trim, tiers * 4)
  const salas = new THREE.InstancedMesh(salaGeometry(), trim, tiers * 24)
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  let k = 0
  let n = 0
  const sculptures = createSculptureInstances(quality.low,{polychrome:painted})
  const nichePlacements=[]
  const nicheBack=painted?surface({color:0x344d51,roughness:.96}):null
  const smallReliefs=painted?createTierReliefs(quality.low):null
  const scrolls=painted?createGopuramScrolls(quality.low):null
  const bands=painted?[surface({color:0x9f6659,roughness:.95}),surface({color:0xc4b493,roughness:.95}),surface({color:0x557f8b,roughness:.95})]:null
  const widthProfile=[1,.925,.85,.78,.71,.645,.585,.53,.48],depthProfile=[1,.94,.88,.82,.76,.70,.64,.585,.53]
  const profileAt=(profile,index)=>{
    const point=index/Math.max(1,tiers-1)*8,at=Math.min(7,Math.floor(point))
    return THREE.MathUtils.lerp(profile[at],profile[at+1],point-at)
  }
  for (let i = 0; i < tiers; i++) {
    if(painted){w=baseW*profileAt(widthProfile,i);d=baseD*profileAt(depthProfile,i)}
    const h = tierH * (1 - 0.05 * i)
    const tier = new THREE.Mesh(taperedStoneCourse(w,d,h,.94),tierMat)
    tier.position.y=y
    uvScale(tier.geometry, w / 9, 1)
    group.add(tier)
    group.add(block(w * (painted?1.055:1.08), painted?.24:.5, d * (painted?1.065:1.1), trim, 0, y + h))
    if(painted)for(let band=0;band<3;band++)group.add(block(w*(1.045+band*.006),.09,d*(1.05+band*.008),bands[band],0,y+h+.24+band*.09))
    // Space real three-dimensional figures along each facade, rather than
    // repeating painted human symbols across the flat tier texture.
    for (let face = 0; face < 4; face++) {
      const angle = face * Math.PI / 2
      const span = face % 2 ? d : w
      const depth = (face % 2 ? w : d) / 2
      const count = painted?Math.max(3,Math.floor(span/2.3)|1):Math.max(2,Math.floor(span/(quality.low?5:2.6)))
      for (let j = 0; j < count; j++) {
        const along = (j - (count - 1) / 2) * (span - 2) / count
        const position = new THREE.Vector3(along,y + .08,depth + .3).applyAxisAngle(new THREE.Vector3(0,1,0),angle)
        const color = new THREE.Color(pal.figures[(j + i + seed) % pal.figures.length]).lerp(new THREE.Color(pal.wall), palette === 'madurai' ? .18 : .45)
        const central=painted && j===(count-1)/2
        const figureHeight=h*(painted?(central?.81:j%2?.66:.60):.82)
        sculptures.place(position.x,position.y+.08,position.z+.02,angle,figureHeight,color)
        if(!painted || central || j%4===1)nichePlacements.push({position,angle,height:h*(painted?(central?1:.86):1),color:painted?(central?'#c4b493':j%3===0?'#66929c':'#b89b81'):null})
        if(painted){
          const upper=new THREE.Vector3(along+(span-2)/count*.25,y+h*.69,depth*.96+.25).applyAxisAngle(new THREE.Vector3(0,1,0),angle)
          if(!central)smallReliefs.place(upper,angle,h*(j%2?.25:.31),color)
          if(j<count-1){
            const between=along+(span-2)/count*.5
            const leaf=new THREE.Vector3(between,y+h*(j%2?.19:.34),depth+.20).applyAxisAngle(new THREE.Vector3(0,1,0),angle)
            scrolls.place(leaf,angle,h*.21,color)
          }
        }
      }
    }
    const top = y + h + 0.5
    // Painted gopuram friezes fit below the following register. The generic
    // miniature-shrine scale formerly put blank cells in front of its legs.
    const s = painted?Math.max(.28,h*.065):Math.min(1.4, Math.max(0.7, h * 0.22))
    for (const [cx, cz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      m.compose(new THREE.Vector3((cx * (w * 1.04 - s)) / 2, top, (cz * (d * 1.06 - s)) / 2), q.identity(), new THREE.Vector3(s, s, s))
      kutas.setMatrixAt(k++, m)
    }
    const count = Math.min(12, Math.floor((w - 2 * s) / (2.3 * s)))
    for (let j = 0; j < count && n < tiers * 24 - 1; j++) {
      const spacing=painted?(w-2*s)/(count+1):2.3*s
      const x = (j-(count-1)/2)*spacing
      for (const z of [-1, 1]) {
        m.compose(new THREE.Vector3(x, top, (z * (d * 1.06 - s)) / 2), q.identity(), new THREE.Vector3(s, s, s))
        salas.setMatrixAt(n++, m)
      }
    }
    y += h + 0.5 + s * 0.6
    w *= painted?.94:1-.095
    d *= painted?.94:1-.075
  }
  kutas.count = k
  salas.count = n
  group.add(kutas, salas, sculptures.build())
  if(painted)group.add(smallReliefs.build(),scrolls.build())

  const nicheMaterial=painted?surface({color:0xffffff,roughness:.94}):trim
  const partitions=new Map()
  for(const p of nichePlacements){if(!partitions.has(p.angle))partitions.set(p.angle,[]);partitions.get(p.angle).push(p)}
  const inner=new THREE.Shape();inner.moveTo(-.25,0);inner.lineTo(-.25,.55)
  inner.bezierCurveTo(-.26,.8,-.13,.92,0,.96);inner.bezierCurveTo(.13,.92,.26,.8,.25,.55);inner.lineTo(.25,0);inner.closePath()
  const backGeometry=painted?new THREE.ShapeGeometry(inner,quality.low?4:8):null
  for(const [angle,placements] of partitions){
    const levels=[kuduGeometry(),kuduGeometry(1),kuduGeometry(2)]
    const niches=new THREE.InstancedMesh(levels[0],nicheMaterial,placements.length)
    niches.name='Molded deep niche frames'
    const backs=painted?new THREE.InstancedMesh(backGeometry,nicheBack,placements.length):null
    for(const [i,p] of placements.entries()) {
      q.setFromAxisAngle(new THREE.Vector3(0,1,0),angle)
      m.compose(p.position,q,new THREE.Vector3(p.height*.62,p.height*.82,p.height*.7))
      niches.setMatrixAt(i,m)
      if(painted){
        niches.setColorAt(i,new THREE.Color(p.color))
        backs.setMatrixAt(i,m.clone().multiply(new THREE.Matrix4().makeTranslation(0,0,-.07)))
      }
    }
    niches.computeBoundingSphere();group.add(niches)
    registerDetailLod(niches,{levels,center:niches.boundingSphere.center,height:Math.max(...placements.map(p=>p.height*.902)),thresholds:[quality.low?56:38,10]})
    if(backs){backs.userData.receiveOnly=true;backs.name='Recessed niche interiors';backs.computeBoundingSphere();group.add(backs)}
  }

  // Hollow barrel-vault crown with golden finials.
  if(painted){
    const crest=maduraiCrown(w,d,gold);crest.position.y=y;group.add(crest)
    group.userData.height=y+crest.userData.height
    return group
  }
  const crown = new THREE.Mesh(barrelVaultGeometry(w*1.15,d*1.1,d*.55),painted?trim:stone)
  crown.rotation.y=Math.PI/2
  crown.position.y = y
  group.add(crown)
  const count = painted?7:3
  for (let i = 0; i < count; i++) {
    const k = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.6, 10), gold)
    k.position.set((i - (count - 1) / 2) * w * (painted?.14:.4), y + d * 0.55 + 1.2, 0)
    group.add(k)
  }
  group.userData.height = y + d * 0.55 + 2.5
  return group
}
