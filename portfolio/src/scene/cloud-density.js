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
const formations=[
  // Broad coastal stratus, a broken high bank and an asymmetric cumulus.
  {base:1,lobes:[[-1.55,-.13,.38],[-1.04,.02,.5],[-.35,.11,.57],[.36,-.03,.45],[1.03,-.13,.4],[1.57,-.24,.24]],flatten:.72,seed:13},
  {base:0,lobes:[[-1.55,-.15,.27],[-1.13,-.05,.35],[-.68,.06,.3],[.04,-.12,.37],[.49,-.09,.26],[1.11,.14,.33],[1.54,.06,.24]],flatten:.56,seed:47},
  {base:1,lobes:[[-1.12,-.13,.44],[-.65,.04,.55],[-.1,.29,.61],[.59,-.04,.46],[1.12,-.2,.3]],flatten:1,seed:89},
]
function density(x,y,z,formation) {
  y/=formation.flatten
  let body=formation.base?Math.max(0,1-Math.sqrt((x/1.7)**2+((y+.25)/.24)**2+(z/.53)**2)):0
  for(const [cx,cy,r] of formation.lobes)body=Math.max(body,1-Math.sqrt((x-cx)**2+(y-cy)**2+z*z*1.3)/r)
  if(body<=0)return 0
  const seed=formation.seed
  const detail=noise(x*3+seed,y*3+7,z*3)*.32+noise(x*7+31,y*7+seed,z*7)*.16+noise(x*15,y*15+47,z*15+seed)*.08+noise(x*31+seed,y*31,z*31)*.04
  const base=Math.min(1,Math.max(0,(y+.48)/.18))
  return Math.max(0,body-detail+.12)*8*base
}
export function bakeCloud(width=256,height=128,steps=24,variant=0) {
  const formation=formations[variant%formations.length]
  const data=new Uint8ClampedArray(width*height*4)
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    const px=(x+.5)/width*4.5-2.25,py=1.15-(y+.5)/height*2.3
    let alpha=0,radiance=0
    for(let step=0;step<steps && alpha<.995;step++) {
      const z=1.15-step/steps*2.3,d=density(px,py,z,formation)
      if(!d)continue
      const opacity=1-Math.exp(-d*7/steps)
      const shadow=density(px-.16,py+.23,z+.17,formation)
      const light=.57+.42*Math.exp(-shadow*.8)
      const weight=(1-alpha)*opacity
      radiance+=weight*light;alpha+=weight
    }
    const i=(y*width+x)*4,light=alpha?radiance/alpha:1
    const upper=Math.min(1,Math.max(0,(py+.25)/.9))
    data[i]=Math.round(255*light*(1+upper*.015))
    data[i+1]=Math.round(255*light)
    data[i+2]=Math.round(255*light*(1.045-upper*.07))
    data[i+3]=Math.round(255*alpha)
  }
  return data
}
