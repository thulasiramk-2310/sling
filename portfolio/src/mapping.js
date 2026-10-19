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
export const START = 0.02

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
