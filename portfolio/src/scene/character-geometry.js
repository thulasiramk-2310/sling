import * as THREE from 'three'

// Hand-authored anatomical / garment section profiles. All dimensions in metres.
// Each section is [height, half-width, half-depth, forward offset].
export function loftGeometry(sections,segments=24) {
  const positions=[],uv=[],indices=[]
  for(let row=0;row<sections.length;row++) {
    const [y,rx,rz,z=0]=sections[row]
    for(let i=0;i<=segments;i++) {
      const angle=i/segments*Math.PI*2
      positions.push(Math.cos(angle)*rx,y,z+Math.sin(angle)*rz)
      uv.push(i/segments,row/(sections.length-1))
    }
  }
  for(let row=0;row<sections.length-1;row++)for(let i=0;i<segments;i++) {
    const a=row*(segments+1)+i,b=a+1,c=a+segments+1,d=c+1
    indices.push(a,c,b,b,c,d)
  }
  for(const row of [0,sections.length-1]) {
    const center=positions.length/3,[y,,,z=0]=sections[row]
    positions.push(0,y,z);uv.push(.5,.5)
    for(let i=0;i<segments;i++) {
      const a=row*(segments+1)+i,b=a+1
      indices.push(...(row===0?[center,a,b]:[center,b,a]))
    }
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices)
  geometry.computeVertexNormals()
  const normals=geometry.attributes.normal,normal=new THREE.Vector3()
  for(let row=0;row<sections.length;row++) {
    const first=row*(segments+1),last=first+segments
    normal.fromBufferAttribute(normals,first).add(new THREE.Vector3().fromBufferAttribute(normals,last)).normalize()
    normals.setXYZ(first,...normal.toArray());normals.setXYZ(last,...normal.toArray())
  }
  geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry
}

export const CHARACTER_SECTIONS={
  shirt:[[.10,.157,.098,0],[.13,.173,.105,0],[.29,.166,.104,0],[.43,.195,.12,0],[.54,.231,.119,-.005],[.59,.217,.108,-.008],[.65,.083,.071,0]],
  pelvis:[[-.095,.13,.092,0],[-.04,.176,.107,0],[.07,.17,.105,0],[.12,.16,.1,0]],
  head:[[-.145,.045,.056,.025],[-.12,.082,.077,.012],[-.065,.114,.096,0],[.01,.127,.109,-.003],[.085,.126,.105,-.009],[.145,.085,.075,-.012],[.166,.035,.035,-.012]],
  thigh:[[-.40,.059,.068,0],[-.34,.068,.071,0],[-.16,.083,.087,0],[0,.082,.088,0]],
  shin:[[-.36,.040,.044,0],[-.29,.045,.049,0],[-.14,.060,.066,-.008],[0,.059,.065,0]],
  sleeve:[[-.29,.052,.055,0],[-.24,.063,.065,0],[-.08,.072,.079,0],[0,.076,.077,0]],
  forearm:[[-.26,.031,.035,0],[-.20,.036,.04,.003],[-.09,.049,.052,0],[0,.052,.055,0]],
  shoe:[[-.095,.081,.16,.055],[-.06,.09,.17,.065],[.015,.072,.135,.045],[.04,.044,.063,-.025]],
}
