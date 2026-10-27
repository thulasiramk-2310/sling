// Exact critically damped spring update. Explicit Euler became unstable when
// software WebGL delivered 100 ms frames, lifting the vehicle off the road.
export function stepSuspension(position, velocity, target, dt) {
  const omega = 14
  const offset = position - target
  const decay = Math.exp(-omega * dt)
  const impulse = (velocity + omega * offset) * dt
  return {
    position: target + (offset + impulse) * decay,
    velocity: (velocity - omega * impulse) * decay,
  }
}
