// Kolam: the white rice-flour patterns drawn at Tamil doorsteps. Here a chain of curved
// diamonds with dots (pulli), drawn as SVG for the loading line and the section dividers.
const STEP = 52

// Path for a row of `units` diamonds whose points touch, like a border kolam.
export function kolamPath(units, y = 26) {
  let d = ''
  for (let i = 0; i < units; i++) {
    const cx = 26 + i * STEP
    d += `M${cx - 26},${y} Q${cx - 6},${y - 6} ${cx},${y - 22} Q${cx + 6},${y - 6} ${cx + 26},${y} Q${cx + 6},${y + 6} ${cx},${y + 22} Q${cx - 6},${y + 6} ${cx - 26},${y}Z `
  }
  return d.trim()
}

export const kolamWidth = (units) => units * STEP

// Full SVG markup. pathLength="1" lets CSS and GSAP draw it with a simple dash offset.
export function kolamSvg(units = 8, className = 'kolam') {
  const w = kolamWidth(units)
  let dots = ''
  for (let i = 0; i <= units; i++) dots += `<circle cx="${i * STEP}" cy="26" r="2.4"/>`
  for (let i = 0; i < units; i++) dots += `<circle cx="${26 + i * STEP}" cy="26" r="2.4"/>`
  return `<svg class="${className}" viewBox="0 0 ${w} 52" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"><path class="kolam-line" pathLength="1" d="${kolamPath(units)}"/><g class="kolam-dots">${dots}</g></svg>`
}
