import * as THREE from 'three'

// Original pressed apron profile. Broad front faces and wheel clearance avoid
// the old spherical scooter-nose silhouette; no manufacturer mesh is copied.
const NOSE=[[.46,.43,.18,.84],[.58,.52,.20,.83],[.78,.56,.21,.82],[1.00,.55,.19,.79],[1.13,.54,.17,.75],[1.20,.52,.16,.73],[1.23,.49,.15,.72]]
function noseAt(y) {
  let row=1
  while(row<NOSE.length-1 && NOSE[row][0]<y)row++
  const a=NOSE[row-1],b=NOSE[row],t=THREE.MathUtils.clamp((y-a[0])/(b[0]-a[0]),0,1)
  return [1,2,3].map(i=>THREE.MathUtils.lerp(a[i],b[i],t))
}

export function roundedNoseGeometry() {
  const profile=NOSE
  const positions=[],uv=[],indices=[],segments=48
  for(let row=0;row<profile.length;row++) {
    const[y,rx,rz,z]=profile[row]
    for(let i=0;i<=segments;i++) {
      const a=i/segments*Math.PI*2
      const c=Math.cos(a),s=Math.sin(a),x=Math.sign(c)*Math.abs(c)**.6*rx
      const clearance=.21*(1-THREE.MathUtils.smoothstep(row,0,2))*Math.exp(-((x/.20)**4))*Math.max(0,s)**4
      positions.push(x,y+clearance,z+Math.sign(s)*Math.abs(s)**.65*rz)
      uv.push(i/segments,row/(profile.length-1))
    }
  }
  for(let j=0;j<profile.length-1;j++)for(let i=0;i<segments;i++){
    const a=j*(segments+1)+i,b=a+1,c=a+segments+1,d=c+1
    indices.push(a,c,b,b,c,d)
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox()
  return geometry
}

export function frontFasciaGeometry() {
  const positions=[],uv=[],indices=[],across=24,rows=8
  for(let row=0;row<=rows;row++)for(let i=0;i<=across;i++){
    const y=.86+row/rows*.34,x=(i/across*2-1)*(.49-row/rows*.015),[rx,rz,cz]=noseAt(y)
    const z=cz+rz*Math.max(0,1-Math.abs(x/rx)**(2/.6))**(.65/2)+.008
    positions.push(x,y,z);uv.push(i/across,row/rows)
  }
  for(let row=0;row<rows;row++)for(let i=0;i<across;i++){
    const a=row*(across+1)+i,b=a+1,c=a+across+1,d=c+1
    indices.push(a,b,c,b,d,c)
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices)
  geometry.computeVertexNormals();geometry.computeBoundingBox();return geometry
}

export function passengerShellGeometry() {
  const s=new THREE.Shape()
  s.moveTo(-.65,.3);s.lineTo(-.65,.95);s.quadraticCurveTo(-.65,1.25,-.35,1.25)
  s.lineTo(.35,1.25);s.quadraticCurveTo(.65,1.25,.65,.95);s.lineTo(.65,.3)
  s.lineTo(.59,.3);s.lineTo(.59,.95);s.quadraticCurveTo(.59,1.19,.35,1.19)
  s.lineTo(-.35,1.19);s.quadraticCurveTo(-.59,1.19,-.59,.95);s.lineTo(-.59,.3);s.closePath()
  const geometry=new THREE.ExtrudeGeometry(s,{depth:.55,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:4,curveSegments:16})
  geometry.rotateX(-Math.PI/2);geometry.translate(0,.52,0);geometry.computeBoundingBox()
  return geometry
}

export function windshieldGeometry() {
  const geometry=new THREE.PlaneGeometry(1.12,.57,20,8),p=geometry.attributes.position
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i),y=p.getY(i)
    p.setXYZ(i,x,y+1.47,.76+.13*(1-(x/.56)**2)-y*.18)
  }
  geometry.computeVertexNormals();return geometry
}

// Crowned roof with a longitudinal roll: a continuous cloth surface, not a box.
export function canopyRoofGeometry(low=false) {
  const across=low?12:28,along=low?16:36,positions=[],uv=[],indices=[]
  for(let j=0;j<=along;j++)for(let i=0;i<=across;i++) {
    const t=j/along,x=(i/across*2-1)*.70,z=-1.2+t*2.04
    const y=1.76+.105*(1-(x/.7)**2)+.025*Math.sin(t*Math.PI)-.004*t**6
    positions.push(x,y,z);uv.push(i/across,t)
  }
  for(let j=0;j<along;j++)for(let i=0;i<across;i++){
    const a=j*(across+1)+i,b=a+1,c=a+across+1,d=c+1
    indices.push(a,c,b,b,c,d)
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices)
  geometry.computeVertexNormals();geometry.computeBoundingBox();return geometry
}

export function canopyValanceGeometry() {
  const positions=[],indices=[]
  for(let i=0;i<=28;i++){
    const x=(i/28*2-1)*.7,top=1.756+.105*(1-(x/.7)**2)
    positions.push(x,1.745,.843,x,top,.843)
    if(i){const a=(i-1)*2,b=i*2;indices.push(a,b,a+1,b,b+1,a+1)}
  }
  const geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(positions,3)).setIndex(indices)
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(Array.from({length:58},(_,i)=>[Math.floor(i/2)/28,i%2]).flat(),2))
  geometry.computeVertexNormals();geometry.computeBoundingBox();return geometry
}

export function roundedPanelShape(width,height,radius,x=0,y=0) {
  const shape=new THREE.Shape(),l=x-width/2,r=x+width/2,b=y-height/2,t=y+height/2,q=radius
  shape.moveTo(l+q,b);shape.lineTo(r-q,b);shape.quadraticCurveTo(r,b,r,b+q)
  shape.lineTo(r,t-q);shape.quadraticCurveTo(r,t,r-q,t);shape.lineTo(l+q,t)
  shape.quadraticCurveTo(l,t,l,t-q);shape.lineTo(l,b+q);shape.quadraticCurveTo(l,b,l+q,b)
  return shape
}

export function rearCurtainGeometry() {
  const shape=roundedPanelShape(1.34,.70,.12,0,1.43)
  const opening=roundedPanelShape(.86,.37,.075,0,1.48)
  shape.holes.push(new THREE.Path(opening.getPoints(20)))
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:false,curveSegments:12})
  geometry.translate(0,0,-1.21);geometry.computeBoundingBox();return geometry
}
