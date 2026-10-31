import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { streetGeometry } from '../architecture.js'
import { quality } from '../quality.js'
import { surface } from '../util.js'

// Authored forecourt edges, rather than a surveyed addition to Central Station.
// The shared street module supplies actual recessed verandahs and shutters.
// Both wings face the square; their narrow parcel leaves the station axis open.
export function createArrivalFrontage() {
  const group=new THREE.Group()
  group.name='Chennai forecourt — shaded heritage frontage wings'
  group.userData.staticBatchRoot=true

  const materials={
    plaster:surface({color:0xc9bca0,roughness:.97}),
    trim:surface({color:0xded2b8,roughness:.95}),
    wood:surface({color:0x635445,roughness:.94}),
    glass:surface({color:0x35423d,roughness:.78}),
    metal:surface({color:0x4c5249,roughness:.83,metalness:.12}),
    roof:surface({color:0x91634f,roughness:.98}),
  }
  const stone=surface({color:0xb4a995,roughness:.98})
  const module=streetGeometry(2,0),count=12
  const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion()
  const position=new THREE.Vector3(),scale=new THREE.Vector3(1,.94,1)
  const up=new THREE.Vector3(0,1,0)

  // At 6.4 m centres the parapets meet, while the supporting walls retain
  // their small construction joint. Faces point toward x=0 on both sides.
  for(const [name,geometry] of Object.entries(module.geometries)) {
    geometry.computeBoundingBox()
    const mesh=new THREE.InstancedMesh(geometry,materials[name],count)
    mesh.name='Forecourt frontage '+name
    let index=0
    for(const side of [-1,1]) {
      const offset=side<0?3:0
      for(let bay=0;bay<6;bay++) {
        // Turn the approach-end bay toward the arriving visitor. An unbroken
        // party wall at this corner made the near wing look unfinished.
        rotation.setFromAxisAngle(up,bay===5?0:-side*Math.PI/2)
        position.set(side*43+offset,.16,-27.6+bay*6.4)
        matrix.compose(position,rotation,scale)
        mesh.setMatrixAt(index++,matrix)
      }
    }
    mesh.instanceMatrix.needsUpdate=true
    mesh.castShadow=!quality.low
    mesh.receiveShadow=true
    mesh.computeBoundingBox();mesh.computeBoundingSphere()
    group.add(mesh)
  }

  const finishing={stone:[],roof:[],trim:[]}
  const box=(key,w,h,d,x,y,z)=>{
    const geometry=new THREE.BoxGeometry(w,h,d)
    geometry.translate(x,y+h/2,z)
    finishing[key].push(geometry)
  }
  for(const side of [-1,1]) {
    const offset=side<0?3:0
    // Continuous thresholds sit inside the existing square. No extra paving
    // crosses its pedestrian axis or its broad near approach at z > 15.
    box('stone',2.1,.08,39.1,side*39.45+offset,.12,-11.6)
    // An oxide fascia ties the shaded portico into one quiet horizontal wing.
    // Its shallow projection casts a real shadow over the recessed walkway.
    box('roof',.18,.24,38.6,side*38.83+offset,2.95,-11.6)
    // Solid end piers terminate the verandah without adding generic street props.
    for(const z of [-30.85,7.65]) {
      box('trim',.38,2.9,.38,side*39.2+offset,.16,z)
      box('trim',.53,.13,.53,side*39.2+offset,2.92,z)
    }
  }
  for(const [name,parts] of Object.entries(finishing)) {
    const geometry=mergeGeometries(parts)
    for(const part of parts)part.dispose()
    geometry.computeBoundingBox();geometry.computeBoundingSphere()
    const mesh=new THREE.Mesh(geometry,name==='stone'?stone:materials[name])
    mesh.name='Forecourt verandah '+name
    mesh.castShadow=name!=='stone'&&!quality.low
    mesh.receiveShadow=true
    if(name==='stone')mesh.userData.receiveOnly=true
    group.add(mesh)
  }
  return group
}
