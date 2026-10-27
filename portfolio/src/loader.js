// Loading screen: a big 000 to 100 counter, a small auto-rickshaw, a kolam that draws as things load,
// and a Start button (pressing it unlocks sound).
import gsap from 'gsap'
import { loadingAperture } from './loading-reveal.js'

export function createLoader() {
  const root = document.getElementById('loader')
  const counter = root.querySelector('.loader-count')
  const line = root.querySelector('.kolam-line')
  const label = root.querySelector('.loader-label')
  const start = root.querySelector('.loader-start')
  const duration = (seconds) => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : seconds
  // aria-modal on a div does not contain keyboard focus by itself.
  const previousFocus = document.activeElement
  const background = new Map()
  const containBackground = () => {
    for (const element of document.body.children) {
      if (element === root || background.has(element)) continue
      background.set(element, element.inert)
      element.inert = true
    }
  }
  root.tabIndex = -1
  containBackground()
  const additions = new MutationObserver(containBackground)
  additions.observe(document.body, { childList: true })
  const containFocus = (event) => {
    if (root.hidden) return
    if (event.key === 'Tab') {
      event.preventDefault()
      ;(start.hidden || start.disabled ? root : start).focus({ preventScroll: true })
    }
  }
  document.addEventListener('keydown', containFocus, true)
  root.focus({ preventScroll: true })
  const state = { value: 0 }
  let target = 0
  let preview = null
  let previewStep = -1
  let leaving = false

  const draw = () => {
    const v = Math.round(state.value)
    counter.textContent = String(v).padStart(3, '0')
    line.style.strokeDashoffset = String(1 - state.value / 100)
    if (preview && v !== previewStep) { preview.draw(v / 100); previewStep = v }
    root.style.setProperty('--p', String(state.value / 100))
  }
  draw()

  return {
    async preparePreview() {
      if (leaving) return
      try {
        const { createLoadingAuto } = await import('./scene/loading-auto.js')
        if (!leaving) { preview = createLoadingAuto(root.querySelector('canvas')); draw() }
      } catch { root.classList.add('preview-unavailable') }
    },
    // fraction 0..1 of the real work done; the counter eases toward it.
    progress(fraction, text) {
      target = Math.max(target, Math.min(1, fraction) * 100)
      if (text) label.textContent = text
      gsap.to(state, { value: target, duration: duration(0.9), ease: 'power3.out', onUpdate: draw, overwrite: true })
    },
    // Fills to 100, shows the Start button, and resolves when it is pressed.
    ready(readyText) {
      target = 100
      return new Promise((resolve) => {
        gsap.to(state, {
          value: 100,
          duration: duration(0.8),
          ease: 'power3.out',
          onUpdate: draw,
          onComplete: () => {
            label.textContent = readyText
            start.hidden = false
            gsap.fromTo(start, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: duration(0.8), ease: 'power3.out' })
            start.focus({ preventScroll: true })
          },
        })
        start.addEventListener('click', () => resolve(), { once: true })
      })
    },
    // Reveal the already rendered world through a growing, original kolam aperture.
    hide() {
      leaving = true
      start.disabled = true
      root.setAttribute('aria-busy', 'true')
      return new Promise((resolve) => {
        const finish = () => {
          additions.disconnect()
          document.removeEventListener('keydown', containFocus, true)
          for (const [element, inert] of background) element.inert = inert
          background.clear()
          root.hidden = true
          if (previousFocus instanceof HTMLElement && previousFocus !== document.body && previousFocus.isConnected) previousFocus.focus({ preventScroll: true })
          root.style.maskImage = ''
          preview?.dispose()
          preview = null
          resolve()
        }
        if (!duration(1)) { finish(); return }
        const reveal = { value: .001 }
        gsap.timeline({ onComplete: finish })
          .to('.loader-inner, .loader-signature', { opacity: 0, y: -8, duration: .28 })
          .to(reveal, { value: 1, duration: 1.55, ease: 'power2.inOut', onUpdate() {
            root.style.maskImage = loadingAperture(reveal.value, innerWidth, innerHeight)
          } }, '-=.06')
      })
    },
  }
}
