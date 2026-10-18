// Shared clock for the movement. Everything is derived from one escapement beat count,
// so the gear train, escapement, balance and hands always agree.
export const BEATS_PER_SECOND = 8 // 28,800 vibrations per hour
export const BALANCE_AMPLITUDE = (280 * Math.PI) / 180
export const FORK_SWING = 0.12

const now = new Date()
export const sim = {
  // Seconds since local midnight, so the dial shows the real time.
  t: now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds() + now.getMilliseconds() / 1000,
  explode: 0,
  angles: null as unknown as Angles,
}

const easeOut = (x: number) => 1 - Math.pow(1 - x, 3)

export function beat(t: number) {
  const b = t * BEATS_PER_SECOND
  const index = Math.floor(b)
  // The escape wheel only moves in the first part of each beat (unlock, impulse, drop), then stays locked.
  const step = easeOut(Math.min((b - index) / 0.16, 1))
  return { index, step }
}

export interface Angles {
  barrel: number
  center: number
  third: number
  fourth: number
  escape: number
  fork: number
  balance: number
}

export function angles(t: number): Angles {
  const { index, step } = beat(t)
  // Each beat lets the escape wheel advance half a tooth (15 teeth).
  const escape = -((index + step) * Math.PI) / 15
  const fourth = (-escape * 5) / 80
  const third = (-fourth * 10) / 75
  const center = (-third * 10) / 80
  const barrel = (-center * 12) / 72
  const side = index % 2 === 0 ? 1 : -1
  return {
    barrel,
    center,
    third,
    fourth,
    escape,
    fork: FORK_SWING * side * (2 * step - 1),
    balance: BALANCE_AMPLITUDE * Math.sin(2 * Math.PI * (BEATS_PER_SECOND / 2) * t),
  }
}

sim.angles = angles(sim.t)
