// One Euro filter: steady at rest, responsive in fast motion.
export class OneEuro {
  private prev: number | null = null
  private dPrev = 0
  private tPrev = 0
  minCutoff: number
  beta: number

  constructor(minCutoff = 1, beta = 6) {
    this.minCutoff = minCutoff
    this.beta = beta
  }

  private alpha(cutoff: number, dt: number) {
    const tau = 1 / (2 * Math.PI * cutoff)
    return 1 / (1 + tau / dt)
  }

  filter(x: number, tMs: number) {
    if (this.prev === null) {
      this.prev = x
      this.tPrev = tMs
      return x
    }
    const dt = Math.max((tMs - this.tPrev) / 1000, 1e-3)
    this.tPrev = tMs
    const ad = this.alpha(1, dt)
    this.dPrev = ad * ((x - this.prev) / dt) + (1 - ad) * this.dPrev
    const a = this.alpha(this.minCutoff + this.beta * Math.abs(this.dPrev), dt)
    this.prev = a * x + (1 - a) * this.prev
    return this.prev
  }

  reset() {
    this.prev = null
    this.dPrev = 0
  }
}
