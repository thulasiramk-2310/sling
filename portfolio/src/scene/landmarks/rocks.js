import * as THREE from 'three'

// Position-dependent deformation keeps shared vertices coincident. The former
// per-corner random deformation ripped the rock into disconnected triangles.
export function rockGeometry(radius=3,seed=1,low=false) {
  const geometry=new THREE.SphereGeometry(1,low?16:40,low?12:28)
  const p=geometry.attributes.position
  const phase=seed*.73
  for (let i=0;i<p.count;i++) {
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i)
    const broad=Math.sin(x*3.1+phase)*Math.cos(y*2.7-z*1.8)
    const detail=Math.sin(x*11+y*7+phase)*Math.sin(z*9-y*4)
    const displacement=1+.12*broad+.018*detail
    p.setXYZ(i,x*radius*displacement,y*radius*.78*displacement,z*radius*.9*displacement)
  }
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}
