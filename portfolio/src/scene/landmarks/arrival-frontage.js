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
  const placements=[]
  for(const side of [-1,1])for(let bay=0;bay<6;bay++)placements.push({
    x:side*43+(side<0?3:0),z:-27.6+bay*6.4+(side<0?6.4:0),
    angle:bay===5?0:-side*Math.PI/2,
  })
  // A short return encloses the left garden edge without crossing the station
  // axis. It faces the arrival, rather than extending an invisible side wing.
  const returns=[-33.6,-27.2].map(x=>({x,z:10.8,angle:0}))
  const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion()
  const position=new THREE.Vector3(),scale=new THREE.Vector3(1,.94,1)
  const up=new THREE.Vector3(0,1,0)

  // At 6.4 m centres the parapets meet, while the supporting walls retain
  // their small construction joint. Faces point toward x=0 on both sides.
  for(const [floors,bays,label] of [[2,placements,'frontage'],[1,returns,'garden return']]) {
    for(const [name,geometry] of Object.entries(streetGeometry(floors,0).geometries)) {
      geometry.computeBoundingBox()
      const mesh=new THREE.InstancedMesh(geometry,materials[name],bays.length)
      mesh.name='Forecourt '+label+' '+name
      let index=0
      for(const {x,z,angle} of bays) {
        rotation.setFromAxisAngle(up,angle)
        position.set(x,.16,z)
        matrix.compose(position,rotation,scale)
        mesh.setMatrixAt(index++,matrix)
      }
      mesh.instanceMatrix.needsUpdate=true
      mesh.castShadow=!quality.low
      mesh.receiveShadow=true
      mesh.computeBoundingBox();mesh.computeBoundingSphere()
      group.add(mesh)
    }
  }

  const finishing={stone:[],roof:[],trim:[]}
  const box=(key,w,h,d,x,y,z)=>{
    const geometry=new THREE.BoxGeometry(w,h,d)
    geometry.translate(x,y+h/2,z)
    finishing[key].push(geometry)
  }
  for(const side of [-1,1]) {
    const offset=side<0?3:0,forward=side<0?6.4:0
    // Continuous thresholds sit inside the existing square. No extra paving
    // crosses its pedestrian axis or the vehicle approach at z > 30.
    box('stone',2.1,.08,39.1,side*39.45+offset,.12,-11.6+forward)
    // An oxide fascia ties the shaded portico into one quiet horizontal wing.
    // Its shallow projection casts a real shadow over the recessed walkway.
    box('roof',.18,.24,38.6,side*38.83+offset,2.95,-11.6+forward)
    // Solid end piers terminate the verandah without adding generic street props.
    for(const z of [-30.85,7.65]) {
      box('trim',.38,2.9,.38,side*39.2+offset,.16,z+forward)
      box('trim',.53,.13,.53,side*39.2+offset,2.92,z+forward)
    }
  }
  box('stone',12.8,.08,2.1,-30.4,.12,15.4)
  box('roof',12.8,.24,.18,-30.4,2.95,14.65)
  box('trim',.38,2.9,.38,-24.1,.16,14.4)
  box('trim',.53,.13,.53,-24.1,2.92,14.4)
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
