import { describe, expect, it } from 'vitest'
import { AirControls } from '../src/airControls'
import { BodyTracker, coverMap } from '../src/body'
import { catalog, completeTheLook } from '../src/catalog'
import { mannequinPose } from '../src/mannequin'

const map = coverMap(1000, 750, 960, 720)

describe('body tracking', () => {
  it('maps the mannequin pose to sensible stage positions', () => {
    const body = new BodyTracker().update(mannequinPose(0), map, 0)!
    expect(body).not.toBeNull()
    // Unmirrored camera image: the subject's left shoulder appears on the right.
    expect(body.shoulderL.x).toBeGreaterThan(body.shoulderR.x)
    expect(body.hipL.y).toBeGreaterThan(body.shoulderL.y)
    expect(body.hipsEstimated).toBe(false)
  })

  it('estimates hips below the shoulders when the camera cannot see them', () => {
    const lm = mannequinPose(0)
    lm[23].visibility = 0.1
    lm[24].visibility = 0.1
    const body = new BodyTracker().update(lm, map, 0)!
    expect(body.hipsEstimated).toBe(true)
    const sw = Math.abs(body.shoulderL.x - body.shoulderR.x)
    expect(body.hipL.y - body.shoulderL.y).toBeGreaterThan(sw)
  })

  it('returns nothing when shoulders are not visible', () => {
    const lm = mannequinPose(0)
    lm[11].visibility = 0.2
    expect(new BodyTracker().update(lm, map, 0)).toBeNull()
  })
})

describe('air controls', () => {
  const buttons = [{ id: 'save', rect: { left: 20, top: 200, right: 100, bottom: 280 } }]

  it('presses a button after the hand hovers for the dwell time, once', () => {
    const air = new AirControls()
    const pressed: string[] = []
    for (let t = 0; t <= 1500; t += 33) {
      const s = air.update([{ x: 60, y: 240 }, null], buttons, 1000, t)
      if (s.pressed) pressed.push(s.pressed)
    }
    expect(pressed).toEqual(['save'])
  })

  it('detects a fast sideways sweep as a swipe', () => {
    const air = new AirControls()
    let swipe: string | null = null
    for (let i = 0; i < 12; i++) {
      const s = air.update([{ x: 300 + i * 40, y: 400 }, null], buttons, 1000, i * 33)
      swipe = s.swipe ?? swipe
    }
    expect(swipe).toBe('right')
  })

  it('ignores slow drifting hands', () => {
    const air = new AirControls()
    let swipe: string | null = null
    for (let i = 0; i < 60; i++) swipe = air.update([{ x: 300 + i * 2, y: 400 }, null], buttons, 1000, i * 33).swipe ?? swipe
    expect(swipe).toBeNull()
  })
})

describe('catalog', () => {
  it('every item has three colourways with valid hex colours', () => {
    for (const item of catalog) {
      expect(item.variants).toHaveLength(3)
      for (const v of item.variants) expect(v.base).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('pairs light tops with dark bottoms and dark tops with light bottoms', () => {
    expect(completeTheLook({ id: 'w', name: 'White', base: '#f5f5f5', accent: '#000000' })[0].name).toMatch(/Indigo|Charcoal/)
    expect(completeTheLook({ id: 'b', name: 'Black', base: '#151515', accent: '#000000' })[0].name).toMatch(/Stone|Light/)
  })
})
