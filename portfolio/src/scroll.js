// Smooth scrolling (Lenis) wired into GSAP ScrollTrigger. Also turns scroll position into a place on the road.
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { STOP_IDS } from './content.js'
import { buildAnchors, mapScroll } from './mapping.js'
import { STOPS } from './scene/stops.js'

gsap.registerPlugin(ScrollTrigger)

export function createScroll() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // Gentle wheel steps and heavy smoothing, so a flick of the wheel is a short drive, not a jump.
  const lenis = new Lenis({ lerp: 0.06, wheelMultiplier: 0.55, touchMultiplier: 1.0, smoothWheel: !reduced })
  lenis.on('scroll', ScrollTrigger.update)
  lenis.stop() // locked until the visitor presses Start

  const sections = STOP_IDS.map((id) => document.getElementById(id))
  let anchors = [[0, 0]]
  const measure = () => {
    anchors = buildAnchors(sections, STOPS, document.documentElement.scrollHeight - window.innerHeight)
    ScrollTrigger.refresh()
  }
  measure()
  window.addEventListener('resize', measure)
  window.addEventListener('load', measure)

  // When scrolling stops close to a stop, glide the rest of the way so each landmark settles in frame.
  let idle = 0
  let snapping = false
  lenis.on('scroll', () => {
    clearTimeout(idle)
    if (snapping || lenis.isStopped) return
    idle = window.setTimeout(() => {
      const y = lenis.scroll
      let best = null
      for (let i = 1; i <= STOPS.length; i++) {
        const d = Math.abs(anchors[i][0] - y)
        if (d > 4 && d < window.innerHeight * 0.4 && (!best || d < Math.abs(best - y))) best = anchors[i][0]
      }
      if (best === null) return
      snapping = true
      lenis.scrollTo(best, { duration: 1.6, easing: (x) => 1 - Math.pow(1 - x, 3), onComplete: () => (snapping = false) })
      setTimeout(() => (snapping = false), 1800)
    }, 260)
  })

  return {
    lenis,
    measure,
    // Call every frame with the time from gsap.ticker.
    raf: (time) => lenis.raf(time * 1000),
    // 0..1 position along the road for the current scroll.
    u: () => mapScroll(lenis.scroll, anchors),
    // Scroll position of a section's middle, to jump to a stop.
    offsetFor: (index) => anchors[index + 1][0],
    stop: () => lenis.stop(),
    start: () => lenis.start(),
    scrollTo: (y, immediate = false) => lenis.scrollTo(y, { immediate, duration: 1.4, easing: (x) => 1 - Math.pow(1 - x, 3) }),
  }
}

// Text slides up and fades in as each block comes into view.
export function setupReveals() {
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    gsap.fromTo(
      el,
      { y: 46, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' } },
    )
  })
  // kolam dividers draw themselves
  gsap.utils.toArray('.divider .kolam-line').forEach((p) => {
    gsap.fromTo(p, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.6, ease: 'power3.out', scrollTrigger: { trigger: p, start: 'top 92%', toggleActions: 'play none none reverse' } })
  })
}
