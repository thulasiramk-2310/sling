import * as THREE from 'three'
import { streetGeometry } from '../architecture.js'
import { quality } from '../quality.js'
import { grainTexture } from '../textures.js'
import { block, rng, surface } from '../util.js'

// A small authored neighborhood around the temple, not a surveyed recreation.
// Each terrace has real shutters, verandas and roof volumes. Its local parcel
// ends before the road approach and does not alter the shared coastline.
export function createMaduraiTown() {
  const group=new THREE.Group();group.name='Madurai — low terrace and shop neighborhood'
  const grain=grainTexture()
  const materials={
    plaster:surface({color:0xffffff,map:grain,roughness:.96}),
    trim:surface({color:0xc5beaa,roughness:.94}),
    wood:surface({color:0x4e6255,roughness:.87}),
    glass:surface({color:0x293c3a,roughness:.36}),
    metal:surface({color:0x5b625b,roughness:.65,metalness:.2}),
    roof:surface({color:0x8d7562,roughness:.95}),
  }
  const earth=surface({color:0xa99a7e,map:grain,roughness:1})
  const paving=surface({color:0x9c9d8f,map:grain,roughness:.97})
  const lane=surface({color:0x585c57,roughness:.96})
  group.add(block(214,.16,122,earth,-160,-.09,-5))
  group.add(block(182,.12,3,paving,-150,.07,29.3))
  group.add(block(184,.03,10,lane,-151,.08,8.5))
  // Shaded market frontages meet the outer pedestrian approach. Keep its
  // central 106 m axis clear so the gateway remains the scene's focal point.
  for(const side of [-1,1]){
    group.add(block(54,.12,15,paving,side*90,.04,82))
    group.add(block(62,.03,6,lane,side*94,.08,94))
  }

  // Two geometry archetypes on phones; a third roof silhouette on desktop.
  // Shared instances keep the complete neighborhood at 15 / 21 mesh draws.
  const modules=[streetGeometry(2,0),streetGeometry(1,2)]
  if(!quality.low)modules.push(streetGeometry(2,1))
  const placements=modules.map(()=>[]),random=rng(521)
  const palette=['#c5bba3','#aaa991','#c0a490','#b2b7a4','#bda994','#a7b2a3']
  const row=(count,start,spacing,z,back=false,direction=-1)=>{
    for(let i=0;i<count;i++){
      const kind=back?(quality.low?0:i%modules.length):(i%4===1?1:0)
      placements[kind].push({
        position:new THREE.Vector3(start+direction*i*spacing,.11,z+(random()-.5)*.6),
        scale:new THREE.Vector3(spacing/6+.02,.94+random()*.13,.96+random()*.08),
        color:palette[Math.floor(random()*palette.length)],
      })
    }
  }
  row(26,-66,6.6,24)
  row(quality.low?22:24,-72,7,-6,true)
  if(!quality.low)row(17,-84,8.8,-42,true)
  row(quality.low?4:7,-66,6.6,82)
  row(quality.low?4:7,66,6.6,82,false,1)
  const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),color=new THREE.Color()
  for(const [kind,module] of modules.entries()){
    for(const [name,geometry] of Object.entries(module.geometries)){
      const mesh=new THREE.InstancedMesh(geometry,materials[name],placements[kind].length)
      mesh.name='Madurai neighborhood '+name
      for(const [index,p] of placements[kind].entries()){
        matrix.compose(p.position,rotation,p.scale);mesh.setMatrixAt(index,matrix)
        if(name==='plaster')mesh.setColorAt(index,color.set(p.color))
      }
      mesh.castShadow=!quality.low;mesh.receiveShadow=true
      mesh.computeBoundingBox();mesh.computeBoundingSphere();group.add(mesh)
    }
  }
  group.userData.buildings=placements.reduce((total,row)=>total+row.length,0)
  return group
}
