// Cookie banner. Analytics only loads after the visitor presses Accept.
// To use analytics, set VITE_PLAUSIBLE_DOMAIN (for example "ram.example.com") when building.
import gsap from 'gsap'

const KEY = 'ram.cookies'
let loaded = false
const optedOutInURL = () => new URLSearchParams(window.location.search).get('analytics') === 'off'

const stored = () => {
  if (optedOutInURL()) return 'rejected'
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
  if (!domain) return false
  // Only an explicit Accept reaches here when the fallback opt-out is present.
  if (optedOutInURL()) {
    const url = new URL(window.location.href)
    url.searchParams.delete('analytics')
    window.history.replaceState(window.history.state, '', url)
  }
  try { localStorage.removeItem('plausible_ignore') } catch { /* Consent remains valid for this visit. */ }
  if (loaded) return false
  loaded = true
  const s = document.createElement('script')
  s.defer = true
  s.dataset.domain = domain
  s.src = 'https://plausible.io/js/script.js'
  document.head.append(s)
  return true
}

// Removing a script element cannot undo its installed event handlers. Use
// Plausible's supported event exclusion flag when consent is withdrawn.
export function stopAnalytics() {
  try {
    localStorage.setItem('plausible_ignore', 'true')
  } catch {
    // Read-only storage can retain an old acceptance. Carry the rejection in
    // the clean page's URL so that old value cannot restart the tracker.
    if (loaded) {
      const url = new URL(window.location.href)
      url.searchParams.set('analytics', 'off')
      window.location.replace(url.href)
    }
  }
}

export function initCookies({beforeSettings}={}) {
  const banner = document.querySelector('.cookie')
  let settingsReturnFocus=null
  const show = (focus=false) => {
    if(focus)settingsReturnFocus=document.activeElement
    banner.hidden = false
    gsap.fromTo(banner, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' })
    if(focus)banner.querySelector('[data-cookie="reject"]').focus({preventScroll:true})
  }
  const hide = () => gsap.to(banner, { y: 40, opacity: 0, duration: 0.5, ease: 'power3.out', onComplete: () => {
    const returnFocus=banner.contains(document.activeElement)?settingsReturnFocus:null
    banner.hidden=true
    returnFocus?.focus({preventScroll:true})
    settingsReturnFocus=null
  } })
  banner.querySelector('[data-cookie="accept"]').addEventListener('click', () => {
    store('accepted')
    loadAnalytics()
    hide()
  })
  banner.querySelector('[data-cookie="reject"]').addEventListener('click', () => {
    store('rejected')
    stopAnalytics()
    hide()
  })
  // A returning visitor who accepted before gets analytics straight away; nobody else does.
  if (stored() === 'accepted') loadAnalytics()
  document.querySelector('[data-cookie-settings]')?.addEventListener('click',async()=>{
    if(beforeSettings)await beforeSettings()
    show(true)
  })
  return { maybeShow: () => stored() === null && show() }
}
