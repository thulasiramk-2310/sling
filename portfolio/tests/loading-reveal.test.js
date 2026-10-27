import { describe, expect, it } from 'vitest'
import { loadingAperture } from '../src/loading-reveal.js'

describe('loading reveal coverage', () => {
  it('starts covered and finishes fully revealed without invalid SVG coordinates', () => {
    expect(loadingAperture(0, 1440, 900)).toBeNull()
    expect(loadingAperture(1, 1440, 900)).toBe('none')
    for (const [width, height] of [[1440, 900], [390, 844]]) {
      for (const p of [.001, .1, .5, .999]) {
        const svg = decodeURIComponent(loadingAperture(p, width, height))
        expect(svg).toContain('fill-rule="evenodd"')
        expect(svg).not.toMatch(/NaN|Infinity/)
        // Outer cover plus a closed cubic aperture, never a translated page.
        expect(svg).toContain(`M0 0H${width}V${height}H0Z`)
        expect((svg.match(/C/g) || []).length).toBe(64)
      }
    }
  })
})
