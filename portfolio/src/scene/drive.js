// Bounded acceleration with a stopping-distance speed limit. No renderer dependencies.
export const DRIVE = { speed: 0.045, acceleration: 0.065 }
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

export function advanceDrive(state, target, delta, reduced = false) {
  const goal = clamp(target, 0, 1)
  if (reduced) return { u: goal, velocity: 0 }
  let { u, velocity } = state
  // Substeps make a sudden reversal behave consistently at 30 and 120 Hz.
  let remaining = clamp(delta, 0, 0.1)
  while (remaining > 1e-8) {
    const dt = Math.min(remaining, 1 / 120)
    const gap = goal - u
    const braking = Math.sqrt(2 * DRIVE.acceleration * Math.abs(gap))
    const desired = Math.sign(gap) * Math.min(DRIVE.speed, braking, Math.abs(gap) * 4)
    velocity += clamp(desired - velocity, -DRIVE.acceleration * dt, DRIVE.acceleration * dt)
    u = clamp(u + velocity * dt, 0, 1)
    if ((u === 0 && velocity < 0) || (u === 1 && velocity > 0)) velocity = 0
    if (Math.abs(goal - u) < 1e-6 && Math.abs(velocity) < 1e-5) { u = goal; velocity = 0 }
    remaining -= dt
  }
  return { u, velocity }
}

// Give each skill time to be identified instead of racing through twelve labels.
export const journeyPace=(progress)=>progress>=.18 && progress<.242?.24:progress>=.32 && progress<.49?.14:progress>=.55 && progress<.635?.12:progress>=.685 && progress<.73?.14:progress>=.92 && progress<.97?.2:1
