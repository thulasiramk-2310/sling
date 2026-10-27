// Entry point: loads fonts, builds the 3D trip behind the loading screen, then starts everything on "Start".
import '@fontsource-variable/dm-sans'
import '@fontsource-variable/fraunces'
import '@fontsource-variable/noto-sans-tamil'
import './style.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { audio } from './audio.js'
import { AWARDS, JOBS, LINKS, PROJECTS, ROLES, SKILLS, STATS, STOP_IDS } from './content.js'
import { initCookies } from './cookies.js'
import { initCursor, initHover } from './cursor.js'
import { createGame } from './game.js'
import { apply, getLang, initLang, setLang, t } from './i18n.js'
import { kolamSvg } from './kolam.js'
import { createLoader } from './loader.js'
import { detectQuality, hasWebGL, shouldOfferReadable } from './scene/quality.js'
import { STORY_STOPS as STOPS } from './scene/stops.js'
import { chapterAt } from './scene/story.js'
import { createScroll, setupReveals } from './scroll.js'
import { startTyping } from './typing.js'
import { createStopController } from './stop-controller.js'
import { createJourneyUI } from './journey-ui.js'

const $ = (s) => document.querySelector(s)
const $$ = (s) => [...document.querySelectorAll(s)]
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
let reduced = motionPreference.matches
gsap.defaults({ ease: 'power3.out' })

// ---------- static content ----------
const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
function renderProjects() {
  $('#projects').innerHTML = PROJECTS.map(
    (p, i) => `
    <a class="card" href="${p.href}" target="_blank" rel="noopener" data-cursor="Open">
      <span class="card-top"><span class="card-num mono">0${i + 1}</span><span class="card-tag mono">${escapeHtml(p.tag)}${p.draft ? ' · ' + escapeHtml(t('projects.draft')) : ''}</span></span>
      <h3>${escapeHtml(p.name)}</h3>
      <p>${escapeHtml(p.line[getLang()] ?? p.line.en)}</p>
      <span class="card-link">${escapeHtml(t(p.draft ? 'projects.search' : 'projects.view'))} <span aria-hidden="true">↗</span></span>
    </a><button type="button" class="project-open" data-open-project="${i}" aria-label="${escapeHtml(t('story.project') + ': ' + p.name)}">${escapeHtml(t('story.project'))} ↗</button>`,
  ).join('')
}
// About: numbers and skills. Experience: the timeline and awards.
function renderPersonal() {
  const lang = getLang()
  $('#stats').innerHTML = STATS.map((s) => `<div><dt>${escapeHtml(s.value)}</dt><dd>${escapeHtml(s[lang])}</dd></div>`).join('')
  $('#skills').innerHTML = SKILLS.map((s) => `<li>${escapeHtml(s)}</li>`).join('')
  $('#jobs').innerHTML = JOBS.map(
    (j) => `<li class="job">
      <p class="job-dates mono">${escapeHtml(j.dates[lang])}</p>
      <h3>${escapeHtml(j.role[lang])}</h3>
      <p class="job-company">${escapeHtml(j.org)}</p>
      <p>${escapeHtml(j.body[lang])}</p>
    </li>`,
  ).join('')
  $('#awards').innerHTML = AWARDS[lang].map((a) => `<li>${escapeHtml(a)}</li>`).join('')
}
function renderLinks() {
  $('#email-link').href = `mailto:${LINKS.email}`
  $('#email-text').textContent = LINKS.email
  $('#github-link').href = LINKS.github
  $('#linkedin-link').href = LINKS.linkedin
  $('#resume-link').href = LINKS.resume
}
$$('[data-kolam]').forEach((el) => (el.innerHTML = kolamSvg(Number(el.dataset.kolam) || 8)))

initLang()
renderProjects()
renderPersonal()
renderLinks()
initCursor()
initHover()

const loader = createLoader()
const scroll = createScroll()
const cookies = initCookies({ beforeSettings: () => journey.close() })
const typing = startTyping($('#role'), () => ROLES[getLang()], { reduced })

document.addEventListener('click', (event) => {
  const button=event.target.closest('[data-open-project]')
  if(button) journey.openProject(Number(button.dataset.openProject))
})

// ---------- sound button ----------
const soundBtn = $('#sound-btn')
function paintSound() {
  const on = !audio.isMuted()
  soundBtn.setAttribute('aria-pressed', String(on))
  soundBtn.setAttribute('aria-label', t(on ? 'sound.off' : 'sound.on'))
  soundBtn.classList.toggle('muted', !on)
}
soundBtn.addEventListener('click', () => {
  if (!audio.isStarted()) audio.unlock()
  audio.setMuted(!audio.isMuted())
  paintSound()
})
paintSound()

// ---------- language ----------
$('#lang-btn').addEventListener('click', () => {
  audio.sfx.click()
  const next = getLang() === 'en' ? 'ta' : 'en'
  gsap.to('main, .hud, .rail', {
    opacity: 0,
    duration: reduced ? 0 : 0.25,
    onComplete: () => {
      setLang(next)
      renderProjects()
      renderPersonal()
      paintSound()
      typing.restart()
      scroll.measure()
      gsap.to('main, .hud, .rail', { opacity: 1, duration: reduced ? 0 : 0.5 })
    },
  })
})

// ---------- 3D scene (or a message if WebGL is missing) ----------
const quality = detectQuality()
const webgl = hasWebGL()
let scene = null
let gameOpen = false
const stops=createStopController()
function departStop() {
  const held=stops.state().held,index=held??scroll.readingAt(scene?.position()??scroll.u())
  if(index<0)return
  if(held!==null)stops.release()
  journey.setStop(null)
  scroll.start()
  if(index+1<STOPS.length)goTo(index+1)
  else scroll.scrollTo(document.documentElement.scrollHeight-innerHeight,reduced,4)
}
const journey = createJourneyUI({
  onContinue:departStop,
  onReadable:()=>showReadable(true),
  onOpen: () => { scroll.stop(); scene?.setPaused(true); audio.setEngine(0) },
  onClose: () => {
    if (gameOpen) return false
    scroll.start()
    scene?.setPaused(false)
    return true
  },
})

async function boot() {
  loader.progress(0.05, t('loader.loading'))
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))])
  loader.progress(0.15)
  if (webgl) {
    await loader.preparePreview()
    try {
      const { createScene } = await import('./scene/index.js')
      scene = await createScene({
        canvas: $('#gl'),
        reduced,
        onProject: (index) => journey.openProject(index),
        report: (f, label) => loader.progress(0.15 + f * 0.85, label),
        // credit the authors of any real 3D models in the footer
        onCredits: (credits) => ($('#credits').textContent = credits.length ? '3D models: ' + credits.join(' · ') : ''),
      })
      journey.setWorldMode(true)
    } catch (err) {
      console.error(err)
      scene = null
    }
  }
  if (!scene) {
    document.body.classList.add('no-3d')
    $('.no-webgl').hidden = false
  }
  await loader.ready(t('loader.ready'))
  start()
}

// ---------- after "Start" ----------
async function start() {
  audio.unlock()
  paintSound()
  audio.sfx.start()
  scroll.reset()
  scene?.jump(0)
  scene?.frame(0)
  document.body.classList.add('started')
  await loader.hide()
  running = true
  scroll.start()
  scroll.measure()
  if (!scene) setupReveals()
  typing.restart()
  if (reduced) gsap.set('[data-intro], .topbar, .rail, .hud', { opacity: 1, y: 0 })
  else {
    gsap.fromTo('[data-intro]', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, stagger: 0.09, delay: 0, ease: 'power3.out' })
    gsap.fromTo('.topbar, .rail, .hud', { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 1, delay: 0, stagger: 0.1 })
  }
  setTimeout(() => cookies.maybeShow(), 2200)
}

// ---------- continuous travel between stops ----------
function goTo(index) {
  stops.visit(index,scene?.position()??scroll.u())
  journey.setStop(null)
  scroll.start()
  audio.sfx.click()
  const duration = Math.max(1.8, Math.abs(STOPS[index] - (scene?.position() ?? scroll.u())) / 0.065)
  scroll.scrollTo(scroll.offsetFor(index), reduced, duration)
  if (reduced) scene?.jump(STOPS[index])
  ScrollTrigger.update()
}
$$('[data-nav]').forEach((el) =>
  el.addEventListener('click', (e) => {
    e.preventDefault()
    goTo(Number(el.dataset.nav))
  }),
)

// ---------- HUD: which stop and what time of day ----------
let lastHud = ''
function updateHud(u) {
  const nearest = chapterAt(u)
  const phase = scene ? scene.phase() : 'noon'
  const key = `${nearest}:${phase}:${getLang()}`
  $('.rail-fill').style.transform = `scaleY(${Math.min(1, u)})`
  if (key === lastHud) return
  lastHud = key
  $('.hud-stop').textContent = `${t('hud.stop')} ${nearest + 1}/${STOPS.length} · ${t('nav.' + STOP_IDS[nearest])}`
  $('.hud-phase').textContent = t('phase.' + phase)
  $$('.nav-dot').forEach((d, i) => {
    d.classList.toggle('active', i === nearest)
    if(i===nearest)d.setAttribute('aria-current','step')
    else d.removeAttribute('aria-current')
  })
}
window.addEventListener('langchange', () => {
  lastHud = ''
  apply()
})

// ---------- game ----------
const game = createGame({
  onOpen: () => {
    gameOpen = true
    journey.close()
    scroll.stop()
    scene?.setPaused(true)
  },
  onClose: () => {
    gameOpen = false
    scroll.start()
    scene?.setPaused(false)
  },
})
for (const id of ['#play-btn', '#play-btn-2'])
  $(id).addEventListener('click', (event) => {
    if (!audio.isStarted()) audio.unlock()
    audio.sfx.click()
    game.open(event.currentTarget)
  })

// ---------- mouse parallax ----------
window.addEventListener('pointermove', (e) => scene?.setMouse((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1))
window.addEventListener('resize', () => scene?.resize())
motionPreference.addEventListener('change', (event) => {
  reduced = event.matches
  scene?.setReducedMotion(reduced)
  typing.setReducedMotion(reduced)
})
function showReadable(requested=false) {
  scene?.setPaused(true)
  scene = null
  audio.setEngine(0)
  journey.setWorldMode(false)
  document.body.classList.remove('clean-journey')
  document.body.classList.add('no-3d')
  scroll.start()
  scroll.measure()
  const notice=$('.no-webgl')
  if(requested){
    for(const [selector,key] of [['strong','readable.title'],['p','readable.body']]){
      const element=notice.querySelector(selector);element.dataset.i18n=key;element.textContent=t(key)
    }
    scroll.scrollTo(0,true)
  }
  notice.hidden=false;notice.tabIndex=-1;notice.focus({preventScroll:true})
}
$('#gl').addEventListener('webglcontextlost', (event) => {
  event.preventDefault()
  showReadable()
})

// ---------- one loop for scrolling, the scene and the engine sound ----------
gsap.ticker.lagSmoothing(0)
let running = false
let qualityCheckedAt=0
gsap.ticker.add((time, deltaMs) => {
  if (document.hidden) return
  scroll.raf(time)
  const u = scroll.u()
  // the 3D world only renders once the visitor has pressed Start
  if (scene && running) {
    const held=stops.state().held
    if(held!==null && scroll.leftStop(held)){stops.release(scroll.directionLeaving(held));journey.setStop(null)}
    scene.setTarget(stops.target(u,scene.position()))
    scene.frame(deltaMs / 1000)
    if(time-qualityCheckedAt>=2){
      qualityCheckedAt=time
      journey.setReadableAvailable(shouldOfferReadable(scene.metrics(),quality.adaptive))
    }
    const arrival=stops.arrive(scene.position())
    if(arrival!==null) {
      scroll.settle(arrival,stops.state().direction)
      scene.jump(STOPS[arrival])
      scene.frame(0)
      journey.setStop(arrival)
      audio.setEngine(0)
    }
    const reading=scroll.readingAt(scene.position())
    journey.setStop(reading<0?null:reading)
    journey.setReadingProgress(reading<0?0:scroll.readingProgress(reading))
    if (!gameOpen) audio.setEngine(scene.motion().speed)
  }
  updateHud(scene ? scene.position() : u)
  journey.update(scene ? scene.position() : u, scene?.story())
})

document.documentElement.classList.toggle('lite', quality.low)
// ?debug exposes the trip position for automated checks
if (new URLSearchParams(location.search).has('debug')) window.__trip = { u: () => scene?.position() ?? 0, profile:()=>scene?.profile(), effects:settings=>scene?.setEffects(settings), y: () => scroll.lenis.scroll, metrics: () => scene?.metrics() ?? null, story: () => scene?.story(), stop:()=>stops.state(), scrollState:()=>scroll.diagnostics(), continue:departStop, exhibits: () => scene?.exhibits(), goTo,
  inspect(u) {
    if (!scene) return false
    running = false
    scroll.stop()
    scene.setPaused(false)
    scene.jump(u)
    scene.frame(0)
    updateHud(u)
    journey.update(u, scene.story())
    return scene.metrics()
  },
  resume() { running = true; scroll.start() },
  sampleFrame(delta) { if(!scene||running)return false;scene.frame(delta);return scene.metrics() },
}
boot()
