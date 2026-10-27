// Original four-loop kolam aperture. An even-odd SVG path makes a real hole
// through the loading surface, leaving the live WebGL frame underneath intact.
export function loadingAperture(progress, width, height) {
  const p = Math.max(0, Math.min(1, progress))
  if (!p) return null
  if (p === 1) return 'none'
  const radius = Math.hypot(width, height) * p * 1.7
  const points = Array.from({ length: 64 }, (_, i) => {
    const a = i / 64 * Math.PI * 2
    const r = radius * (1 + .16 * Math.cos(a * 4 + p * 2) + .045 * Math.sin(a * 7))
    return [width * .5 + Math.cos(a) * r, height * .44 + Math.sin(a) * r]
  })
  const n = v => v.toFixed(2)
  let hole = `M${points[0].map(n).join(' ')}`
  for (let i = 0; i < points.length; i++) {
    const previous = points[(i + 63) % 64], a = points[i], b = points[(i + 1) % 64], next = points[(i + 2) % 64]
    hole += `C${n(a[0] + (b[0] - previous[0]) / 6)} ${n(a[1] + (b[1] - previous[1]) / 6)} ${n(b[0] - (next[0] - a[0]) / 6)} ${n(b[1] - (next[1] - a[1]) / 6)} ${b.map(n).join(' ')}`
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><path fill="white" fill-rule="evenodd" d="M0 0H${width}V${height}H0Z${hole}Z"/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}
