// Page transitions: a maroon curtain with a kolam sweeps up, the page jumps behind it, then it lifts away.
import gsap from 'gsap'

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
let busy = false

// Covers the screen, runs `change` while hidden, then reveals again.
export function transition(change) {
  const curtain = document.querySelector('.curtain')
  if (busy || reduced()) {
    change()
    return Promise.resolve()
  }
  busy = true
  return new Promise((resolve) => {
    gsap
      .timeline({
        onComplete: () => {
          busy = false
          resolve()
        },
      })
      .set(curtain, { yPercent: 100, display: 'grid' })
      .to(curtain, { yPercent: 0, duration: 0.6, ease: 'power3.inOut' })
      .add(change)
      .to(curtain, { yPercent: -100, duration: 0.7, ease: 'power3.inOut', delay: 0.12 })
      .set(curtain, { display: 'none' })
  })
}
