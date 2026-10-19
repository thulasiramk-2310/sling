import { describe, expect, it } from 'vitest'
import { AWARDS, JOBS, PROJECTS, ROLES, STATS, STOP_IDS, STRINGS } from '../src/content.js'
import { canSpawnObstacle, moveLane, newGame, score, step } from '../src/gameLogic.js'
import { kolamPath, kolamWidth } from '../src/kolam.js'
import { mapScroll } from '../src/mapping.js'
import { STOPS } from '../src/scene/stops.js'
import { phaseAt, sample } from '../src/scene/timeline.js'

describe('scroll to road mapping', () => {
  const anchors = [
    [0, 0.02],
    [500, 0.07],
    [1500, 0.27],
    [3000, 1],
  ]
  it('pins each section middle to its stop and blends between', () => {
    expect(mapScroll(0, anchors)).toBe(0.02)
    expect(mapScroll(500, anchors)).toBe(0.07)
    expect(mapScroll(1000, anchors)).toBeCloseTo(0.17)
    expect(mapScroll(99999, anchors)).toBe(1)
    expect(mapScroll(-50, anchors)).toBe(0.02)
  })
})

describe('time of day', () => {
  it('runs sunrise, noon, sunset, night along the trip', () => {
    expect(STOPS.map(phaseAt)).toEqual(['sunrise', 'noon', 'noon', 'sunset', 'night'])
  })
  it('is dark at the end and bright at noon', () => {
    expect(sample(0.95).night).toBe(1)
    expect(sample(0.47).night).toBe(0)
    expect(sample(0.47).elev).toBeGreaterThan(50)
    expect(sample(0.68).elev).toBeLessThan(5)
  })
  it('blends colours smoothly', () => {
    const a = sample(0.3).top
    const b = sample(0.31).top
    expect(Math.abs(a[0] - b[0])).toBeLessThan(0.05)
  })
})

describe('kolam', () => {
  it('draws one closed diamond per unit, touching at the points', () => {
    expect(kolamPath(5).match(/M/g)).toHaveLength(5)
    expect(kolamPath(5).match(/Z/g)).toHaveLength(5)
    expect(kolamWidth(5)).toBe(260)
  })
})

describe('Auto Dash rules', () => {
  const seq = (values) => {
    let i = 0
    return () => values[i++ % values.length]
  }
  it('keeps the player inside the three lanes', () => {
    const s = newGame()
    moveLane(s, -1)
    moveLane(s, -1)
    expect(s.target).toBe(0)
    moveLane(s, 5)
    expect(s.target).toBe(2)
  })
  it('collects coffee and scores it', () => {
    const s = newGame()
    s.spawnIn = 99
    s.entities.push({ id: 1, kind: 'cup', lane: 1, y: 0.8 })
    const events = step(s, 0.016)
    expect(events).toEqual([{ type: 'coffee' }])
    expect(s.coffee).toBe(1)
    expect(score(s)).toBeGreaterThanOrEqual(25)
  })
  it('ends the game on a crash', () => {
    const s = newGame('bike')
    s.spawnIn = 99
    s.entities.push({ id: 1, kind: 'bus', lane: 1, y: 0.8 })
    expect(step(s, 0.016)).toEqual([{ type: 'crash' }])
    expect(s.over).toBe(true)
    expect(step(s, 0.016)).toEqual([])
  })
  it('never blocks all three lanes at once', () => {
    const s = newGame()
    s.entities.push({ id: 1, kind: 'car', lane: 0, y: 0.1 }, { id: 2, kind: 'cow', lane: 1, y: 0.05 })
    expect(canSpawnObstacle(s, 2)).toBe(false)
    expect(canSpawnObstacle(s, 0)).toBe(true)
  })
  it('stays fair over a long run', () => {
    const s = newGame()
    const rand = seq([0.1, 0.5, 0.9, 0.3, 0.7, 0.2, 0.8, 0.6, 0.4])
    for (let i = 0; i < 4000 && !s.over; i++) {
      s.target = s.laneX = 1
      step(s, 0.016, rand)
      const near = new Set(s.entities.filter((e) => e.kind !== 'cup' && e.y < 0.3 && e.y > -0.25).map((e) => e.lane))
      expect(near.size).toBeLessThan(3)
    }
  })
})

describe('content', () => {
  it('has every string in both languages', () => {
    expect(Object.keys(STRINGS.ta).sort()).toEqual(Object.keys(STRINGS.en).sort())
    expect(ROLES.ta).toHaveLength(ROLES.en.length)
  })
  it('lists the projects (without Pahara) with Tamil lines and GitHub links', () => {
    const names = PROJECTS.map((p) => p.name)
    expect(names).toEqual(['ArkaOS', 'TRX-AI', 'StudyFlow AI', 'VARA', 'CreditGuard AI', 'RECALL X'])
    expect(names).not.toContain('Pahara')
    for (const p of PROJECTS) {
      expect(p.line.ta.length).toBeGreaterThan(5)
      expect(p.href.startsWith('https://github.com/thulasiramk-2310')).toBe(true)
    }
  })
  it('has the personal sections in both languages', () => {
    for (const j of JOBS) expect(j.role.ta && j.body.ta && j.dates.ta).toBeTruthy()
    for (const st of STATS) expect(st.ta).toBeTruthy()
    expect(AWARDS.ta).toHaveLength(AWARDS.en.length)
    expect(STOP_IDS[2]).toBe('thanjavur')
  })
  it('has one stop per section, in road order', () => {
    expect(STOP_IDS).toHaveLength(STOPS.length)
    expect([...STOPS].sort((a, b) => a - b)).toEqual(STOPS)
  })
})
