import * as THREE from 'three'
import { surface } from './util.js'
import {arrivalDrivewayWeight,arrivalFootwayHeight} from './arrival-surface.js'
import {ROAD_DECK_HEIGHT} from './route.js'

// Continuous raised footways follow the same spline as the asphalt. The curb
// has a real vertical face; slab joints and drains are instanced above the walk.
export function createStreetEdges(route,from=.15,to=.235) {
  const group=new THREE.Group();group.name='Curved heritage street footways'
  const paving=surface({color:0xbab7a8,roughness:.94}),curb=surface({color:0xd5cdb8,roughness:.92})
  const joint=surface({color:0xaaa99a,roughness:.96}),iron=surface({color:0x424a46,roughness:.7,metalness:.35})
  const rows=Math.ceil((to-from)*route.length/1.5)+1
  for(const side of [-1,1]) {
    const positions=[],indices=[],uv=[]
    const latitudes=side<0?[-8.6,-7.5375,-6.475,-5.4125,-4.35]:[4.35,8.6]
    for(let row=0;row<rows;row++) {
      const u=from+(to-from)*row/(rows-1)
      for(const lat of latitudes) {
        const p=route.side(u,lat,side<0?arrivalFootwayHeight(u,lat):.19)
        positions.push(p.x,p.y,p.z);uv.push(lat/2,u*route.length/2)
      }
      if(row<rows-1)for(let column=0;column<latitudes.length-1;column++) {
        const a=row*latitudes.length+column,b=a+latitudes.length
        indices.push(a,a+1,b,a+1,b+1,b)
      }
    }
    const geometry=new THREE.BufferGeometry()
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals()
    const walk=new THREE.Mesh(geometry,paving);walk.userData.receiveOnly=true;group.add(walk)
  }
  const count=Math.ceil((to-from)*route.length/.75),matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3(1,1,1),up=new THREE.Vector3(0,1,0)
  const kerbs=new THREE.InstancedMesh(new THREE.BoxGeometry(.22,.22,.77),curb,count*2)
  const seams=new THREE.InstancedMesh(new THREE.BoxGeometry(4.1,.008,.018),joint,count*2)
  const drains=new THREE.InstancedMesh(new THREE.BoxGeometry(.18,.025,.42),iron,Math.ceil(count/12)*2)
  let n=0,d=0,k=0
  const rampJoints=[],rampPoint=(u,lat)=>route.side(u,lat,arrivalFootwayHeight(u,lat)+.006)
  for(let i=0;i<count;i++) {
    const u=from+(i+.5)/count*(to-from),s=route.at(u)
    rotation.setFromAxisAngle(up,Math.atan2(s.tan.x,s.tan.z))
    for(const side of [-1,1]) {
      const driveway=side<0?arrivalDrivewayWeight(u):0
      // Retain a flush stone header in the dropped drive. Removing the curb
      // exposed a 15cm gap between the asphalt and the footway's inner edge.
      const curbHeight=THREE.MathUtils.lerp(.22,ROAD_DECK_HEIGHT,driveway)
      scale.y=curbHeight/.22
      kerbs.setMatrixAt(k++,matrix.compose(route.side(u,side*4.28,curbHeight/2),rotation,scale))
      scale.y=1
      if(driveway>.001){
        // Flat instanced joints would bridge above the dropped footway.
        // Segment these few lines across the ramp with the same support curve.
        for(let column=0;column<4;column++){
          const far=-8.5+column*4.1/4,near=far+4.1/4,half=.009/route.length
          const a=rampPoint(u-half,far),b=rampPoint(u-half,near),c=rampPoint(u+half,far),d=rampPoint(u+half,near)
          for(const v of [a,b,c,b,d,c])rampJoints.push(v.x,v.y,v.z)
        }
      }else seams.setMatrixAt(n++,matrix.compose(route.side(u,side*6.45,.196),rotation,scale))
      if(i%12===0 && driveway<.05)drains.setMatrixAt(d++,matrix.compose(route.side(u,side*4.47,.205),rotation,scale))
    }
  }
  drains.count=d;kerbs.count=k;seams.count=n
  if(rampJoints.length){
    const geometry=new THREE.BufferGeometry()
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(rampJoints,3));geometry.computeVertexNormals()
    const mesh=new THREE.Mesh(geometry,joint);mesh.userData.receiveOnly=true;group.add(mesh)
  }
  group.add(kerbs,seams,drains)
  return group
}
