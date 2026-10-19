// Rules of the mini game "Auto Dash". No drawing here, so it is easy to test.
// The road has three lanes. Things start at the top (y = 0) and move down to the player (near y = 0.82).

export const LANES = 3
export const PLAYER_Y = 0.82

// width in lanes, length as a share of the road height
export const KINDS = {
  bus: { w: 0.8, h: 0.24 },
  lorry: { w: 0.78, h: 0.21 },
  car: { w: 0.62, h: 0.13 },
  taxi: { w: 0.62, h: 0.13 },
  auto: { w: 0.6, h: 0.12 },
  cow: { w: 0.5, h: 0.09 },
  cup: { w: 0.5, h: 0.07 },
}
const OBSTACLES = ['bus', 'lorry', 'car', 'taxi', 'auto', 'cow']

// The two rides: the bike is narrower and changes lane faster.
export const VEHICLES = {
  auto: { w: 0.62, h: 0.13, turn: 9 },
  bike: { w: 0.34, h: 0.13, turn: 15 },
}

export function newGame(vehicle = 'auto') {
  return { vehicle, laneX: 1, target: 1, time: 0, speed: 0.55, distance: 0, coffee: 0, over: false, entities: [], spawnIn: 0.6, id: 0 }
}

export const score = (s) => Math.floor(s.distance) + s.coffee * 25

export function moveLane(s, dir) {
  if (!s.over) s.target = Math.max(0, Math.min(LANES - 1, s.target + dir))
}

// A new obstacle must never block all three lanes in the same stretch of road.
export function canSpawnObstacle(s, lane) {
  const blocked = new Set([lane])
  for (const e of s.entities) if (e.kind !== 'cup' && e.y < 0.3) blocked.add(e.lane)
  return blocked.size < LANES
}

// Moves the game on by dt seconds. Returns the things that happened: [{type: 'coffee' | 'crash'}].
export function step(s, dt, rand = Math.random) {
  const events = []
  if (s.over) return events
  s.time += dt
  s.speed = Math.min(1.7, 0.55 + s.time * 0.014)
  s.distance += s.speed * dt * 24
  const v = VEHICLES[s.vehicle]
  s.laneX += (s.target - s.laneX) * Math.min(1, v.turn * dt)

  s.spawnIn -= dt
  if (s.spawnIn <= 0) {
    const lane = Math.floor(rand() * LANES)
    if (rand() < 0.36) s.entities.push({ id: s.id++, kind: 'cup', lane, y: -0.05 })
    else if (canSpawnObstacle(s, lane)) s.entities.push({ id: s.id++, kind: OBSTACLES[Math.floor(rand() * OBSTACLES.length)], lane, y: -0.2 })
    s.spawnIn = (0.95 - Math.min(0.5, s.time * 0.008)) * (0.75 + rand() * 0.5) / s.speed
  }

  for (const e of s.entities) e.y += s.speed * dt * 0.5
  for (const e of s.entities) {
    const k = KINDS[e.kind]
    const hitLane = Math.abs(e.lane - s.laneX) < (k.w + v.w) / 2
    const hitY = Math.abs(e.y - PLAYER_Y) < (k.h + v.h) / 2
    if (!hitLane || !hitY) continue
    if (e.kind === 'cup') {
      s.coffee++
      e.dead = true
      events.push({ type: 'coffee' })
    } else {
      s.over = true
      events.push({ type: 'crash' })
      break
    }
  }
  s.entities = s.entities.filter((e) => !e.dead && e.y < 1.3)
  return events
}
