// Custom cursor (a dot and a ring that grows on links and buttons) plus button and card hover motion.
import gsap from 'gsap'

const HOVER = 'a, button, [data-hover], .card, .nav-dot, input[type="range"]'

export function initCursor() {
  const fine = window.matchMedia('(pointer: fine)').matches
  if (!fine) return
  document.documentElement.classList.add('has-cursor')
  const dot = document.querySelector('.cursor-dot')
  const ring = document.querySelector('.cursor-ring')
  const label = document.querySelector('.cursor-label')
  const dx = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power3.out' })
  const dy = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power3.out' })
  const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3.out' })
  const ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3.out' })
  window.addEventListener('pointermove', (e) => {
    dx(e.clientX)
    dy(e.clientY)
    rx(e.clientX)
    ry(e.clientY)
    gsap.to([dot, ring], { opacity: 1, duration: 0.3, overwrite: 'auto' })
  })
  document.addEventListener('pointerleave', () => gsap.to([dot, ring], { opacity: 0, duration: 0.3 }))
  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest?.(HOVER)
    gsap.to(ring, { scale: el ? 2.3 : 1, backgroundColor: el ? 'rgba(224,178,58,.22)' : 'rgba(224,178,58,0)', duration: 0.4, ease: 'power3.out' })
    gsap.to(dot, { scale: el ? 0.4 : 1, duration: 0.3, ease: 'power3.out' })
    const text = el?.dataset?.cursor
    label.textContent = text || ''
    gsap.to(label, { opacity: text ? 1 : 0, duration: 0.25 })
  })
  document.addEventListener('pointerdown', () => gsap.to(ring, { scale: 0.8, duration: 0.2, ease: 'power3.out' }))
  document.addEventListener('pointerup', () => gsap.to(ring, { scale: 1.6, duration: 0.3, ease: 'power3.out' }))
}

// Buttons lift and lean toward the pointer; cards lift and tilt a little.
export function initHover() {
  const fine = window.matchMedia('(pointer: fine)').matches
  const lift = (el, y, scale) => gsap.to(el, { y, scale, duration: 0.45, ease: 'power3.out', overwrite: 'auto' })
  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest?.('.btn, .card, .icon-btn, .pill, .ctl')
    if (!el || el.contains(e.relatedTarget)) return
    lift(el, el.classList.contains('card') ? -8 : -3, el.classList.contains('card') ? 1.02 : 1.04)
  })
  document.addEventListener('pointerout', (e) => {
    const el = e.target.closest?.('.btn, .card, .icon-btn, .pill, .ctl')
    if (!el || el.contains(e.relatedTarget)) return
    gsap.to(el, { y: 0, x: 0, scale: 1, rotationX: 0, rotationY: 0, duration: 0.6, ease: 'power3.out', overwrite: 'auto' })
  })
  if (!fine) return
  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest?.('.card, .btn')
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    if (el.classList.contains('card')) gsap.to(el, { rotationY: px * 7, rotationX: -py * 7, transformPerspective: 800, duration: 0.5, ease: 'power3.out', overwrite: 'auto' })
    else gsap.to(el, { x: px * 8, duration: 0.4, ease: 'power3.out', overwrite: 'auto' })
  })
}
