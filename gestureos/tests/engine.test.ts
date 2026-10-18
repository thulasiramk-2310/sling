import { describe, expect, it } from 'vitest'
import { GestureEngine } from '../src/engine/engine'
import { FaceEngine } from '../src/engine/faceEngine'
import { analyzeHand } from '../src/engine/hand'
import { DEFAULT_SETTINGS, safeUrl } from '../src/engine/settings'
import { computeCalibration } from '../src/ui/calibration'
import { buildTemplate, featureDistance, handFeatures } from '../src/engine/features'
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

describe('custom gestures', () => {
  const record = (pose: FakePose) => buildTemplate(Array.from({ length: 20 }, (_, i) => handFeatures(fakeHand(pose, 0.4 + i * 0.01, 0.5, 0.15 + i * 0.002))))

  it('recognises a recorded pose regardless of position and size', () => {
    const t = record('rock')
    expect(featureDistance(handFeatures(fakeHand('rock', 0.7, 0.3, 0.22)), t.template)).toBeLessThan(t.radius)
  })

  it('keeps different poses apart', () => {
    const t = record('rock')
    for (const other of ['open', 'fist', 'point', 'scroll'] as const) {
      expect(featureDistance(handFeatures(fakeHand(other)), t.template)).toBeGreaterThan(t.radius)
    }
  })

  it('matches the mirrored (other) hand too', () => {
    const t = record('victory')
    const mirrored = fakeHand('victory').map((p) => ({ ...p, x: 1 - p.x }))
    expect(featureDistance(handFeatures(mirrored), t.template)).toBeLessThan(t.radius)
  })

  it('fires the custom event when the recorded pose is held', () => {
    const e = makeEngine(true)
    const { template, radius } = record('rock')
    e.setSettings({ ...DEFAULT_SETTINGS, customGestures: [{ id: 'g1', name: 'Rock on', template, radius, action: 'reload' }] })
    const { events } = run(e, 50, hold('rock'))
    expect(events).toContainEqual({ type: 'custom', id: 'g1' })
    expect(events.find((ev) => ev.type === 'macro')).toBeUndefined()
  })
})

describe('right click and calibration', () => {
  it('thumb to middle finger right-clicks once', () => {
    const e = makeEngine(true)
    const { events } = run(e, 20, (i) => {
      const h = fakeHand('open')
      if (i >= 8 && i < 14) {
        // The middle finger curls down to meet the thumb while the index stays up.
        h[11] = { x: 0.5 - 0.2 * 0.16, y: 0.5 - 0.5 * 0.16 }
        h[12] = { x: 0.5 - 0.3 * 0.16, y: 0.5 - 0.35 * 0.16 }
        h[4] = { x: 0.5 - 0.32 * 0.16, y: 0.5 - 0.33 * 0.16 }
      }
      return [h]
    })
    expect(events.filter((ev) => ev.type === 'rightClick')).toHaveLength(1)
    expect(events.find((ev) => ev.type === 'click')).toBeUndefined()
  })

  it('a calibrated comfort zone maps its corners to the screen corners', () => {
    const e = makeEngine(true)
    e.setSettings({ ...DEFAULT_SETTINGS, calibration: { ...DEFAULT_SETTINGS.calibration, box: { x0: 0.3, y0: 0.3, x1: 0.7, y1: 0.7 } } })
    // Knuckle anchor sits near the middle knuckle; camera x is mirrored.
    const c = run(e, 30, hold('point', 0.5 + 0.0225 * 0.16 / 0.16, 0.5)).last.cursor!
    expect(c.x).toBeGreaterThan(0.3)
    expect(c.x).toBeLessThan(0.7)
    const far = run(e, 30, hold('point', 0.1, 0.9), 3000).last.cursor!
    expect(far.x).toBeCloseTo(1, 1)
    expect(far.y).toBeCloseTo(1, 1)
  })

  it('a calibrated pinch threshold changes what counts as a pinch', () => {
    const loose = makeEngine(true)
    loose.setSettings({ ...DEFAULT_SETTINGS, calibration: { box: null, pinchOn: 0.01, pinchOff: 0.02 } })
    const { events } = run(loose, 20, (i) => [fakeHand(i >= 10 && i < 14 ? 'pinch' : 'point')])
    // The fake pinch leaves a small gap, wider than this very strict threshold.
    expect(events.find((ev) => ev.type === 'click')).toBeUndefined()
  })
})

describe('head pointer', () => {
  const face = (nx: number, ny: number, blend: Record<string, number> = {}) => {
    const landmarks = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }))
    landmarks[1] = { x: nx, y: ny }
    return { landmarks, blend }
  }
  const runFace = (e: FaceEngine, n: number, at: (i: number) => ReturnType<typeof face> | null) => {
    const events: GestureEvent[] = []
    let last = e.update(null, 0)
    for (let i = 0; i < n; i++) {
      last = e.update(at(i), (i + 1) * FRAME)
      events.push(...last.events)
    }
    return { events, last }
  }
  const make = () => {
    const e = new FaceEngine()
    e.setSettings(DEFAULT_SETTINGS)
    return e
  }

  it('turning the head right moves the cursor right (mirror view)', () => {
    const e = make()
    const { last } = runFace(e, 30, (i) => face(i < 5 ? 0.5 : 0.46, 0.5))
    expect(last.cursor!.x).toBeGreaterThan(0.6)
  })

  it('a short mouth open clicks; a long one drags', () => {
    const e = make()
    const short = runFace(e, 30, (i) => face(0.5, 0.5, { jawOpen: i >= 10 && i < 15 ? 0.7 : 0 }))
    expect(short.events.filter((ev) => ev.type === 'click')).toHaveLength(1)
    const long = runFace(make(), 60, (i) => face(0.5, 0.5, { jawOpen: i >= 10 && i < 50 ? 0.7 : 0 }))
    const types = long.events.map((ev) => ev.type)
    expect(types).toContain('dragStart')
    expect(types).toContain('dragEnd')
    expect(types).not.toContain('click')
  })

  it('a held smile right-clicks once', () => {
    const { events } = runFace(make(), 40, () => face(0.5, 0.5, { mouthSmileLeft: 0.8, mouthSmileRight: 0.8 }))
    expect(events.filter((ev) => ev.type === 'rightClick')).toHaveLength(1)
  })

  it('raised eyebrows plus a head tilt scroll', () => {
    const { events } = runFace(make(), 30, (i) => face(0.5, i < 3 ? 0.5 : 0.56, { browInnerUp: i < 3 ? 0 : 0.8 }))
    const total = events.filter((ev) => ev.type === 'scroll').reduce((s, ev) => s + (ev as { dy: number }).dy, 0)
    expect(total).toBeGreaterThan(0)
  })

  it('closing both eyes for a moment pauses, and again resumes', () => {
    const e = make()
    const closed = { eyeBlinkLeft: 0.9, eyeBlinkRight: 0.9 }
    const { events } = runFace(e, 120, (i) => face(0.5, 0.5, (i >= 5 && i < 50) || (i >= 60 && i < 105) ? closed : {}))
    expect(events.filter((ev) => ev.type === 'deactivate' || ev.type === 'activate').map((ev) => ev.type)).toEqual(['deactivate', 'activate'])
  })
})

describe('calibration and safety helpers', () => {
  it('builds a comfort zone and pinch thresholds from samples', () => {
    const anchors = Array.from({ length: 120 }, (_, i) => ({ x: 0.35 + 0.3 * ((i % 20) / 19), y: 0.3 + 0.25 * (Math.floor(i / 20) / 5) }))
    const c = computeCalibration(anchors, Array(40).fill(0.9), Array(40).fill(0.12))
    if ('error' in c) throw new Error(c.error)
    expect(c.box!.x0).toBeGreaterThan(0.35)
    expect(c.box!.x1).toBeLessThan(0.65)
    expect(c.pinchOn).toBeGreaterThan(0.12)
    expect(c.pinchOff).toBeGreaterThan(c.pinchOn)
  })

  it('rejects a calibration where open and pinch look the same', () => {
    const anchors = Array.from({ length: 60 }, (_, i) => ({ x: 0.3 + (i % 10) * 0.04, y: 0.3 + Math.floor(i / 10) * 0.05 }))
    expect('error' in computeCalibration(anchors, Array(40).fill(0.4), Array(40).fill(0.35))).toBe(true)
  })

  it('only opens http(s) addresses', () => {
    expect(safeUrl('youtube.com')).toBe('https://youtube.com/')
    expect(safeUrl('http://example.org/a')).toBe('http://example.org/a')
    expect(safeUrl('javascript:alert(1)')).toBeNull()
    expect(safeUrl('data:text/html,hi')).toBeNull()
  })
})
