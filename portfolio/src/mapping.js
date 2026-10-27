// Turns how far you have scrolled into how far along the road you are.
// Each section's middle is pinned to its stop, so the landmark appears exactly when its text does.

// anchors: [[scrollY, u], ...] sorted by scrollY. Values between anchors are blended in a straight line.
export function mapScroll(y, anchors) {
  if (!anchors.length) return 0
  if (y <= anchors[0][0]) return anchors[0][1]
  for (let i = 1; i < anchors.length; i++) {
    const [y1, u1] = anchors[i]
    if (y <= y1) {
      const [y0, u0] = anchors[i - 1]
      return y1 === y0 ? u1 : u0 + ((y - y0) / (y1 - y0)) * (u1 - u0)
    }
  }
  return anchors[anchors.length - 1][1]
}

// Where the road begins on screen: a little way in, so the camera can sit behind the auto.
export const START = 0

// Builds the anchors from the page: start of page = start of road, each section middle = its stop, bottom = end.
export function buildAnchors(sections, stops, maxScroll) {
  const anchors = [[0, START]]
  sections.forEach((el, i) => {
    const mid = el.offsetTop + el.offsetHeight / 2 - window.innerHeight / 2
    const last = anchors[anchors.length - 1][0]
    anchors.push([Math.max(mid, last + 1), stops[i]])
  })
  anchors.push([Math.max(maxScroll, anchors[anchors.length - 1][0] + 1), 1])
  return anchors
}

// A destination occupies scroll distance, not a timed or click-only pause.
export function buildStopLayout(sections,stops,maxScroll,viewport) {
  const centers=sections.map(el=>el.offsetTop+el.offsetHeight/2-viewport/2)
  const anchors=[[0,START]],bands=[]
  for(let i=0;i<stops.length;i++) {
    const before=centers[i]-(centers[i-1]??0)
    const after=(centers[i+1]??maxScroll)-centers[i]
    const half=Math.max(1,Math.min(viewport*.7,before*(i===0?.85:.45),after*(i===stops.length-1?.85:.45)))
    const start=Math.max(anchors.at(-1)[0]+1,centers[i]-half)
    const end=Math.max(start+1,Math.min(maxScroll-1,centers[i]+half))
    bands.push({start,end,center:(start+end)/2,progress:stops[i]})
    anchors.push([start,stops[i]],[end,stops[i]])
  }
  anchors.push([Math.max(maxScroll,anchors.at(-1)[0]+1),1])
  return {anchors,bands}
}

// Leave enough scroll after the final chapter centre for a full reading band
// and the authored ascent. The runway is excluded from maxScroll by the caller.
export function journeyRunwayHeight(sections,maxScroll,viewport) {
  const last=sections.at(-1)
  if(!last)return 0
  const center=last.offsetTop+last.offsetHeight/2-viewport/2
  return Math.max(0,viewport-(maxScroll-center))
}
