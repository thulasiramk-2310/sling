// Original, deterministic cloud volume baked once to a sprite texture.
// Runtime uses the baked density/light integral, not a costly full-screen march.
const mix=(a,b,t)=>a+(b-a)*t
const ease=t=>t*t*(3-2*t)
const hash=(x,y,z)=>{
  let n=Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(z,2147483647)
  n=Math.imul(n^(n>>>13),1274126177)
  return ((n^(n>>>16))>>>0)/4294967295
}
function noise(x,y,z) {
  const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z)
  const u=ease(x-ix),v=ease(y-iy),w=ease(z-iz)
  return mix(mix(mix(hash(ix,iy,iz),hash(ix+1,iy,iz),u),mix(hash(ix,iy+1,iz),hash(ix+1,iy+1,iz),u),v),
    mix(mix(hash(ix,iy,iz+1),hash(ix+1,iy,iz+1),u),mix(hash(ix,iy+1,iz+1),hash(ix+1,iy+1,iz+1),u),v),w)
}
const lobes=[[-1.25,-.15,.55],[-.72,.15,.67],[-.05,.38,.76],[.67,.16,.66],[1.25,-.13,.47],[.22,-.28,.68]]
function density(x,y,z) {
  let body=Math.max(0,1-Math.sqrt((x/1.7)**2+((y+.25)/.38)**2+(z/.65)**2))
  for(const [cx,cy,r] of lobes)body=Math.max(body,1-Math.sqrt((x-cx)**2+(y-cy)**2+z*z*.9)/r)
  if(body<-.15)return 0
  const detail=noise(x*3+13,y*3+7,z*3)*.32+noise(x*7+31,y*7,z*7)*.16+noise(x*15,y*15+47,z*15)*.08+noise(x*31,y*31,z*31)*.04
  return Math.max(0,body-detail+.14)*8
}
export function bakeCloud(width=256,height=128,steps=24) {
  const data=new Uint8ClampedArray(width*height*4)
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    const px=(x+.5)/width*4.5-2.25,py=1.15-(y+.5)/height*2.3
    let alpha=0,radiance=0
    for(let step=0;step<steps && alpha<.995;step++) {
      const z=1.15-step/steps*2.3,d=density(px,py,z)
      if(!d)continue
      const opacity=1-Math.exp(-d*7/steps)
      const shadow=density(px-.14,py+.21,z+.17)
      const light=.65+.34*Math.exp(-shadow*.8)
      const weight=(1-alpha)*opacity
      radiance+=weight*light;alpha+=weight
    }
    const i=(y*width+x)*4,light=alpha?radiance/alpha:1
    data[i]=data[i+1]=data[i+2]=Math.round(255*light)
    data[i+3]=Math.round(255*alpha)
  }
  return data
}
