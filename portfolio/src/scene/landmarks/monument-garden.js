import * as THREE from 'three'
import { faceRoad } from '../route.js'

// A pedestrian approach, composed for this compressed landscape rather than a
// surveyed reconstruction. Narrow granite walks leave the sand and shrine
// silhouettes exposed; the elephant's separate parcel is entirely untouched.
export function createMonumentGarden(route,u,stone,ground) {
  const group=new THREE.Group()
  group.name='Mamallapuram — granite monument garden approach'
  group.position.copy(route.at(u).pos)
  faceRoad(group,route,u)
  group.updateMatrixWorld(true)
  ground?.updateWorldMatrix(true,false)

  const pieces=[],ray=new THREE.Raycaster(),point=new THREE.Vector3()
  const down=new THREE.Vector3(0,-1,0)
  const groundHeight=(x,lateral)=>{
    point.set(x,0,-lateral).applyMatrix4(group.matrixWorld)
    ray.set(new THREE.Vector3(point.x,200,point.z),down)
    return ground?ray.intersectObject(ground,false)[0]?.point.y??0:0
  }
  const add=(x,lateral,width,length,kerb=false)=>{
    // Foundations reach the actual terrain. At the seaward end this becomes a
    // narrow raised stone approach rather than an unsupported floating plane.
    const bottom=groundHeight(x,lateral)-.08
    const surface=Math.max(.14,bottom+.17)
    const top=surface+(kerb ? .19 : 0)
    pieces.push({x,lateral,width,length,bottom,height:top-bottom,kerb})
  }
  const paving=(x0,x1,l0,l1)=>{
    const cols=Math.ceil((x1-x0)/1.15),rows=Math.ceil((l1-l0)/1.15)
    const width=(x1-x0)/cols,length=(l1-l0)/rows
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++)
      add(x0+(col+.5)*width,l0+(row+.5)*length,width-.018,length-.018)
  }
  // The first walk meets the asphalt edge. A clear cross-path distributes
  // visitors along the rathas; its outer branch approaches the Shore Temple.
  paving(-1.6,1.6,4.35,38.7)
  paving(-30,29,38.7,41.3)
  paving(-16.2,-13.8,41.3,47.5)
  paving(13.8,16.2,41.3,45.5)
  paving(26.6,29,41.3,73.7)
  paving(17.5,26.6,71.3,73.7)

  const edge=(x0,l0,x1,l1)=>{
    const length=Math.hypot(x1-x0,l1-l0),count=Math.ceil(length/1.4)
    for(let i=0;i<count;i++){
      const t=(i+.5)/count
      add(x0+(x1-x0)*t,l0+(l1-l0)*t,
        Math.abs(x1-x0)>.01?length/count-.025:.24,
        Math.abs(l1-l0)>.01?length/count-.025:.24,true)
    }
  }
  // A low, open-entry perimeter reads as a cared-for monument garden. The
  // right rear remains open for the narrow seaward branch of the approach.
  edge(-32,34.5,-1.9,34.5);edge(1.9,34.5,30.2,34.5)
  edge(-32,34.5,-32,70);edge(30.2,34.5,30.2,70)
  edge(-32,70,23,70)

  const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),stone,pieces.length)
  mesh.name='Granite paving and low garden kerbs'
  mesh.userData.receiveOnly=true
  mesh.receiveShadow=true
  const matrix=new THREE.Matrix4(),color=new THREE.Color()
  for(const [i,piece] of pieces.entries()){
    matrix.makeScale(piece.width,piece.height,piece.length)
    matrix.setPosition(piece.x,piece.bottom+piece.height/2,-piece.lateral)
    mesh.setMatrixAt(i,matrix)
    const tone=piece.kerb ? .89 : .97+(i%7)*.008
    mesh.setColorAt(i,color.setRGB(tone,tone*.985,tone*.955))
  }
  mesh.computeBoundingBox();mesh.computeBoundingSphere()
  group.add(mesh)
  group.userData.gardenMetrics={instances:pieces.length,triangles:pieces.length*12,draws:1}
  return group
}
