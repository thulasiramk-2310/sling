// Cookie banner. Analytics only loads after the visitor presses Accept.
// To use analytics, set VITE_PLAUSIBLE_DOMAIN (for example "ram.example.com") when building.
import gsap from 'gsap'

const KEY = 'ram.cookies'
let loaded = false

const stored = () => {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}
const store = (v) => {
  try {
    localStorage.setItem(KEY, v)
  } catch {
    // Private mode: the choice lasts for this visit.
  }
}

// Adds the analytics script. Does nothing without a configured domain, and never runs twice.
export function loadAnalytics() {
  const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN
  if (loaded || !domain) return false
  loaded = true
  const s = document.createElement('script')
  s.defer = true
  s.dataset.domain = domain
  s.src = 'https://plausible.io/js/script.js'
  document.head.append(s)
  return true
}

export function initCookies() {
  const banner = document.querySelector('.cookie')
  const show = () => {
    banner.hidden = false
    gsap.fromTo(banner, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' })
  }
  const hide = () => gsap.to(banner, { y: 40, opacity: 0, duration: 0.5, ease: 'power3.out', onComplete: () => (banner.hidden = true) })
  banner.querySelector('[data-cookie="accept"]').addEventListener('click', () => {
    store('accepted')
    loadAnalytics()
    hide()
  })
  banner.querySelector('[data-cookie="reject"]').addEventListener('click', () => {
    store('rejected')
    hide()
  })
  // A returning visitor who accepted before gets analytics straight away; nobody else does.
  if (stored() === 'accepted') loadAnalytics()
  document.querySelector('[data-cookie-settings]')?.addEventListener('click', show)
  return { maybeShow: () => stored() === null && show() }
}
