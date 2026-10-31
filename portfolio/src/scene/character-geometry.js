import * as THREE from 'three'

// Hand-authored anatomical / garment section profiles. All dimensions in metres.
// Each section is [height, half-width, half-depth, forward offset].
export function loftGeometry(sections,segments=24) {
  // Shape-preserving Hermite slopes keep the authored shoulders, jaw, calves
  // and cuffs while replacing the straight cone bands between sparse sections.
  // Harmonic interior tangents stop at extrema instead of inflating the profile.
  // Interpolate front/back extents rather than depth and offset independently:
  // otherwise two bounded channels can sum to a small physical overshoot.
  const profile=sections.map(([y,rx,rz,z=0])=>[y,rx,z-rz,z+rz])
  const step=(a,b,axis)=>profile[b][axis]-profile[a][axis]
  const slopes=sections.map((_,i)=>[1,2,3].map(axis=>{
    if(sections.length===2)return step(0,1,axis)/(sections[1][0]-sections[0][0])
    if(i===0||i===sections.length-1)return 0
    const h0=sections[i][0]-sections[i-1][0],h1=sections[i+1][0]-sections[i][0]
    const d0=step(i-1,i,axis)/h0,d1=step(i,i+1,axis)/h1
    if(d0*d1<=0)return 0
    const w0=2*h1+h0,w1=h1+2*h0
    return (w0+w1)/(w0/d0+w1/d1)
  }))
  const rings=[],spacing=segments<=16?.046:.032
  for(let i=0;i<sections.length-1;i++){
    const a=profile[i],b=profile[i+1],height=b[0]-a[0]
    const count=Math.max(sections.length>2?2:1,Math.ceil(height/spacing))
    for(let j=0;j<count;j++){
      const t=j/count,t2=t*t,t3=t2*t
      const [rx,back,front]=[1,2,3].map((axis,k)=>
        (2*t3-3*t2+1)*(a[axis]??0)+(t3-2*t2+t)*height*slopes[i][k]
        +(-2*t3+3*t2)*(b[axis]??0)+(t3-t2)*height*slopes[i+1][k])
      rings.push([a[0]+height*t,rx,(front-back)/2,(front+back)/2])
    }
  }
  rings.push([...sections.at(-1)])
  const positions=[],uv=[],indices=[]
  const y0=sections[0][0],height=sections.at(-1)[0]-y0
  const shirt=sections===CHARACTER_SECTIONS.shirt
  const bell=(value,width)=>Math.exp(-((value/width)**2))
  for(let row=0;row<rings.length;row++) {
    const [y,rx,rz,z=0]=rings[row],v=(y-y0)/height
    for(let i=0;i<=segments;i++) {
      const angle=i/segments*Math.PI*2,x=Math.cos(angle)*rx,front=Math.max(0,Math.sin(angle))
      // Millimetre-scale cloth gathers grow from the shirt's continuous volume;
      // the neck, hem and side silhouette retain their exact authored sections.
      const fold=shirt?Math.sin(v*Math.PI)**2*front*front*(
        .005*bell(y-(.265+.23*x+.14*x*x),.026)
        -.0025*bell(y-(.292+.23*x+.14*x*x),.025)
        +.0035*bell(y-(.43-.27*x),.025)):0
      positions.push(x,y,z+Math.sin(angle)*rz+fold)
      uv.push(i/segments,v)
    }
  }
  for(let row=0;row<rings.length-1;row++)for(let i=0;i<segments;i++) {
    const a=row*(segments+1)+i,b=a+1,c=a+segments+1,d=c+1
    indices.push(a,c,b,b,c,d)
  }
  // Independent cap vertices keep the flat ends flat: sharing their normals
  // with the curved side gave ankles, wrists and the jaw an artificial rim.
  for(const row of [0,rings.length-1]) {
    const center=positions.length/3,[y,,,z=0]=rings[row]
    positions.push(0,y,z);uv.push(.5,.5)
    const start=positions.length/3
    for(let i=0;i<=segments;i++){
      const at=(row*(segments+1)+i)*3
      positions.push(positions[at],positions[at+1],positions[at+2])
      const angle=i/segments*Math.PI*2;uv.push(.5+Math.cos(angle)*.5,.5+Math.sin(angle)*.5)
    }
    for(let i=0;i<segments;i++) {
      const a=start+i,b=a+1
      indices.push(...(row===0?[center,a,b]:[center,b,a]))
    }
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices)
  geometry.computeVertexNormals()
  const normals=geometry.attributes.normal,normal=new THREE.Vector3()
  for(let row=0;row<rings.length;row++) {
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
