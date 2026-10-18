import { describe, expect, it } from 'vitest'
import { GestureEngine } from '../src/engine/engine'
import { analyzeHand } from '../src/engine/hand'
import { DEFAULT_SETTINGS } from '../src/engine/settings'
import type { GestureEvent } from '../src/engine/types'
import { fakeHand, type FakePose } from '../src/engine/fakeHand'

const FRAME = 33

function makeEngine(active = false) {
  const e = new GestureEngine()
  e.setSettings(DEFAULT_SETTINGS)
  e.setActive(active)
  return e
}

// Feeds frames and collects every event; `at` returns the hand for a given frame index.
function run(e: GestureEngine, frames: number, at: (i: number) => ReturnType<typeof fakeHand>[], t0 = 0) {
  const events: GestureEvent[] = []
  let last = e.update([], t0)
  for (let i = 0; i < frames; i++) {
    last = e.update(at(i), t0 + (i + 1) * FRAME)
    events.push(...last.events)
  }
  return { events, last, t: t0 + frames * FRAME }
}

const hold = (pose: FakePose, x = 0.5, y = 0.5) => () => [fakeHand(pose, x, y)]

describe('hand analysis', () => {
  it.each([
    ['open', { index: true, middle: true, ring: true, pinky: true, thumbOut: true }],
    ['point', { index: true, middle: false, ring: false, pinky: false }],
    ['fist', { index: false, middle: false, ring: false, pinky: false, thumbUp: false }],
    ['thumbsUp', { index: false, middle: false, ring: false, pinky: false, thumbUp: true }],
    ['rock', { index: true, middle: false, ring: false, pinky: true }],
  ] as const)('reads %s', (pose, expected) => {
    expect(analyzeHand(fakeHand(pose))).toMatchObject(expected)
  })

  it('tells scroll (fingers together) from peace sign (spread)', () => {
    expect(analyzeHand(fakeHand('scroll')).spread).toBeLessThan(0.38)
    expect(analyzeHand(fakeHand('victory')).spread).toBeGreaterThan(0.38)
  })

  it('detects a pinch', () => {
    expect(analyzeHand(fakeHand('pinch')).pinchRatio).toBeLessThan(0.3)
    expect(analyzeHand(fakeHand('open')).pinchRatio).toBeGreaterThan(0.6)
  })
})

describe('activation', () => {
  it('activates after holding an open palm still', () => {
    const e = makeEngine()
    const { events, last } = run(e, 40, hold('open'))
    expect(events).toContainEqual({ type: 'activate' })
    expect(last.active).toBe(true)
  })

  it('does not activate while the palm keeps moving', () => {
    const e = makeEngine()
    const { events } = run(e, 40, (i) => [fakeHand('open', 0.3 + (i % 2) * 0.1, 0.5)])
    expect(events).not.toContainEqual({ type: 'activate' })
  })

  it('ignores clicks until activated', () => {
    const e = makeEngine()
    const { events } = run(e, 12, (i) => [fakeHand(i >= 5 && i < 8 ? 'pinch' : 'point')])
    expect(events.find((ev) => ev.type === 'click')).toBeUndefined()
  })

  it('pauses after holding a fist', () => {
    const e = makeEngine(true)
    const { events, last } = run(e, 40, hold('fist'))
    expect(events).toContainEqual({ type: 'deactivate' })
    expect(last.active).toBe(false)
  })
})

describe('pointing and clicking', () => {
  it('moves the cursor with the hand, mirrored like a mirror', () => {
    const e = makeEngine(true)
    const left = run(e, 20, hold('point', 0.7, 0.5)).last.cursor!
    const right = run(e, 20, hold('point', 0.3, 0.5), 2000).last.cursor!
    expect(right.x).toBeGreaterThan(left.x)
  })

  it('a quick pinch clicks where the pinch started', () => {
    const e = makeEngine(true)
    const { events } = run(e, 20, (i) => [fakeHand(i >= 10 && i < 14 ? 'pinch' : 'point')])
    const clicks = events.filter((ev) => ev.type === 'click')
    expect(clicks).toHaveLength(1)
    expect(events.find((ev) => ev.type === 'dragStart')).toBeUndefined()
  })

  it('pinch and move drags instead of clicking', () => {
    const e = makeEngine(true)
    const { events } = run(e, 30, (i) => {
      if (i < 8) return [fakeHand('point', 0.5, 0.5)]
      if (i < 24) return [fakeHand('pinch', 0.5 - (i - 8) * 0.012, 0.5)]
      return [fakeHand('point', 0.3, 0.5)]
    })
    const types = events.map((ev) => ev.type)
    expect(types).toContain('dragStart')
    expect(types).toContain('dragEnd')
    expect(types).not.toContain('click')
  })

  it('losing the hand mid-pinch does not click', () => {
    const e = makeEngine(true)
    const { events } = run(e, 14, (i) => (i < 8 ? [fakeHand('point')] : i < 10 ? [fakeHand('pinch')] : []))
    expect(events.find((ev) => ev.type === 'click')).toBeUndefined()
  })
})

describe('scroll, swipe, zoom, macros', () => {
  it('two fingers moving up scrolls the page down', () => {
    const e = makeEngine(true)
    const { events } = run(e, 24, (i) => [fakeHand('scroll', 0.5, 0.65 - i * 0.01)])
    const total = events.filter((ev) => ev.type === 'scroll').reduce((s, ev) => s + (ev as { dy: number }).dy, 0)
    expect(total).toBeGreaterThan(0)
  })

  it('a fast open-hand sweep to the user’s right is a right swipe', () => {
    const e = makeEngine(true)
    // Camera x decreases when the user moves their hand to their right.
    const { events } = run(e, 14, (i) => [fakeHand('open', i < 4 ? 0.7 : 0.7 - (i - 4) * 0.06, 0.5)])
    expect(events).toContainEqual({ type: 'swipe', dir: 'right' })
  })

  it('two pinching hands moving apart zoom in', () => {
    const e = makeEngine(true)
    const { events } = run(e, 20, (i) => {
      const gap = 0.12 + i * 0.012
      return [fakeHand('pinch', 0.5 - gap, 0.5), fakeHand('pinch', 0.5 + gap, 0.5)]
    })
    const zooms = events.filter((ev) => ev.type === 'zoom') as { factor: number }[]
    expect(zooms.length).toBeGreaterThan(0)
    expect(zooms.every((z) => z.factor > 1)).toBe(true)
    expect(events.find((ev) => ev.type === 'click')).toBeUndefined()
  })

  it.each(['thumbsUp', 'victory', 'rock'] as const)('holding %s fires its macro once', (pose) => {
    const e = makeEngine(true)
    const { events } = run(e, 60, hold(pose))
    expect(events.filter((ev) => ev.type === 'macro')).toEqual([{ type: 'macro', pose }])
  })
})
