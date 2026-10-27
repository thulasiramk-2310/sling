// Smooth scrolling (Lenis) wired into GSAP ScrollTrigger. Also turns scroll position into a place on the road.
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { STOP_IDS } from './content.js'
import { buildStopLayout, journeyRunwayHeight, mapScroll } from './mapping.js'
import { STORY_STOPS as STOPS } from './scene/stops.js'

gsap.registerPlugin(ScrollTrigger)

export function createScroll() {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
  const reduced = preference.matches
  // Gentle wheel steps and heavy smoothing, so a flick of the wheel is a short drive, not a jump.
  let arrivalUntil=0
  const lenis = new Lenis({ lerp: 0.06, wheelMultiplier: 0.55, touchMultiplier: 1.0, smoothWheel: !reduced, syncTouch:true,
    virtualScroll(data) {
      const event=data.event
      if(event.ctrlKey)return // Preserve browser zoom gestures.
      if(performance.now()<arrivalUntil){event.preventDefault();return false}
      // Reduced motion uses native scrolling, so Lenis's virtual delta clamp
      // otherwise has no effect on an oversized physical wheel step. Bound only
      // those steps, immediately, without introducing a smooth animation.
      const nativeDelta=data.deltaY/.55
      if(preference.matches && event.type==='wheel' && document.body.classList.contains('world-first') && !lenis.isStopped && !event.defaultPrevented && !event.lenisStopPropagation && Math.abs(nativeDelta)>180 && Math.abs(data.deltaY)>=Math.abs(data.deltaX)) {
        const nested=event.composedPath().some(node=>node instanceof HTMLElement && node!==document.body && node!==document.documentElement && (node.matches('dialog,[role="dialog"],input,textarea,select') || node.scrollHeight>node.clientHeight+1 && /auto|scroll/.test(getComputedStyle(node).overflowY)))
        if(!nested) {
          event.preventDefault()
          lenis.scrollTo(lenis.scroll+Math.sign(nativeDelta)*180,{immediate:true})
          return false
        }
      }
      data.deltaY=Math.max(-180,Math.min(180,data.deltaY))
    },
  })
  preference.addEventListener('change', () => { lenis.options.smoothWheel = !preference.matches })
  lenis.on('scroll', ScrollTrigger.update)
  lenis.stop() // locked until the visitor presses Start

  const sections = STOP_IDS.map((id) => document.getElementById(id))
  const runway=document.createElement('div')
  runway.className='journey-runway';runway.setAttribute('aria-hidden','true');runway.inert=true
  sections[0].parentElement.append(runway)
  let anchors = [[0, 0]],bands=[]
  const measure = () => {
    const viewport=window.innerHeight
    const baseMax=document.documentElement.scrollHeight-viewport-runway.offsetHeight
    const tail=document.body.classList.contains('world-first')?Math.ceil(journeyRunwayHeight(sections,baseMax,viewport)):0
    runway.style.setProperty('--journey-runway-height',tail+'px')
    const layout=buildStopLayout(sections,STOPS,baseMax+tail,viewport)
    anchors=layout.anchors;bands=layout.bands
    lenis.resize()
    ScrollTrigger.refresh()
  }
  measure()
  window.addEventListener('resize', measure)
  window.addEventListener('load', measure)

  // Cancel the old gesture on arrival; a new scroll explores the reading band.
  const settle=(index,direction=1)=>{
    arrivalUntil=performance.now()+650
    lenis.scrollTo(direction<0?bands[index].end-4:bands[index].start+4,{immediate:true,force:true})
    lenis.start()
  }

  return {
    lenis,
    diagnostics:()=>({y:lenis.scroll,actual:lenis.actualScroll,target:lenis.targetScroll,limit:lenis.limit,requested:mapScroll(lenis.scroll,anchors),stopped:lenis.isStopped,arrivalUntil,now:performance.now(),bands:bands.map(b=>({...b}))}),
    settle,
    reset:()=>lenis.scrollTo(0,{immediate:true,force:true}),
    measure,
    // Call every frame with the time from gsap.ticker.
    raf: (time) => lenis.raf(time * 1000),
    // 0..1 position along the road for the current scroll.
    u: () => mapScroll(lenis.scroll, anchors),
    // Scroll position of a section's middle, to jump to a stop.
    offsetFor: (index) => bands[index].start+4,
    leftStop:(index)=>lenis.scroll>bands[index].end+2 || lenis.scroll<bands[index].start-2,
    directionLeaving:(index)=>lenis.scroll<bands[index].start-2?-1:lenis.scroll>bands[index].end+2?1:0,
    readingAt(position){return bands.findIndex(b=>lenis.scroll>=b.start-2 && lenis.scroll<=b.end+2 && Math.abs(position-b.progress)<.0005)},
    readingProgress(index){const b=bands[index];return Math.max(0,Math.min(1,(lenis.scroll-b.start)/(b.end-b.start)))},
    stop: () => lenis.stop(),
    start: () => lenis.start(),
    scrollTo: (y, immediate = false, duration = 1.4) => lenis.scrollTo(y, { immediate, duration, easing: (x) => x * x * (3 - 2 * x) }),
  }
}

// Text slides up and fades in as each block comes into view.
export function setupReveals() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set('[data-reveal]', { y: 0, opacity: 1 })
    gsap.set('.divider .kolam-line', { strokeDashoffset: 0 })
    return
  }
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
