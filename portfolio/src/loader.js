// Loading screen: a big 000 to 100 counter, a small auto-rickshaw, a kolam that draws as things load,
// and a Start button (pressing it unlocks sound).
import gsap from 'gsap'

export function createLoader() {
  const root = document.getElementById('loader')
  const counter = root.querySelector('.loader-count')
  const line = root.querySelector('.kolam-line')
  const label = root.querySelector('.loader-label')
  const start = root.querySelector('.loader-start')
  const state = { value: 0 }
  let target = 0

  const draw = () => {
    const v = Math.round(state.value)
    counter.textContent = String(v).padStart(3, '0')
    line.style.strokeDashoffset = String(1 - state.value / 100)
    root.style.setProperty('--p', String(state.value / 100))
  }
  draw()

  return {
    // fraction 0..1 of the real work done; the counter eases toward it.
    progress(fraction, text) {
      target = Math.max(target, Math.min(1, fraction) * 100)
      if (text) label.textContent = text
      gsap.to(state, { value: target, duration: 0.9, ease: 'power3.out', onUpdate: draw, overwrite: true })
    },
    // Fills to 100, shows the Start button, and resolves when it is pressed.
    ready(readyText) {
      target = 100
      return new Promise((resolve) => {
        gsap.to(state, {
          value: 100,
          duration: 0.8,
          ease: 'power3.out',
          onUpdate: draw,
          onComplete: () => {
            label.textContent = readyText
            start.hidden = false
            gsap.fromTo(start, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' })
            start.focus({ preventScroll: true })
          },
        })
        start.addEventListener('click', () => resolve(), { once: true })
      })
    },
    // Slides the loader away.
    hide() {
      return new Promise((resolve) => {
        gsap.to(root, {
          yPercent: -100,
          duration: 1.1,
          ease: 'power3.inOut',
          onComplete: () => {
            root.hidden = true
            resolve()
          },
        })
      })
    },
  }
}
