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
import { detectQuality, hasWebGL } from './scene/quality.js'
import { STOPS } from './scene/stops.js'
import { createScroll, setupReveals } from './scroll.js'
import { transition } from './transition.js'
import { startTyping } from './typing.js'

const $ = (s) => document.querySelector(s)
const $$ = (s) => [...document.querySelectorAll(s)]
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
gsap.defaults({ ease: 'power3.out' })

// ---------- static content ----------
const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
function renderProjects() {
  $('#projects').innerHTML = PROJECTS.map(
    (p, i) => `
    <a class="card" href="${p.href}" target="_blank" rel="noopener" data-cursor="Open">
      <span class="card-top"><span class="card-num mono">0${i + 1}</span><span class="card-tag mono">${escapeHtml(p.tag)}</span></span>
      <h3>${escapeHtml(p.name)}</h3>
      <p>${escapeHtml(p.line[getLang()] ?? p.line.en)}</p>
      <span class="card-link">${escapeHtml(t('projects.view'))} <span aria-hidden="true">↗</span></span>
    </a>`,
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
const cookies = initCookies()
const typing = startTyping($('#role'), () => ROLES[getLang()], { reduced })

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
    duration: 0.25,
    onComplete: () => {
      setLang(next)
      renderProjects()
      renderPersonal()
      paintSound()
      typing.restart()
      scroll.measure()
      gsap.to('main, .hud, .rail', { opacity: 1, duration: 0.5 })
    },
  })
})

// ---------- 3D scene (or a message if WebGL is missing) ----------
const quality = detectQuality()
const webgl = hasWebGL()
let scene = null
let gameOpen = false

async function boot() {
  loader.progress(0.05, t('loader.loading'))
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))])
  loader.progress(0.15)
  if (webgl) {
    try {
      const { createScene } = await import('./scene/index.js')
      scene = await createScene({
        canvas: $('#gl'),
        report: (f, label) => loader.progress(0.15 + f * 0.85, label),
        // credit the authors of any real 3D models in the footer
        onCredits: (credits) => ($('#credits').textContent = credits.length ? '3D models: ' + credits.join(' · ') : ''),
      })
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
  loader.hide()
  document.body.classList.add('started')
  running = true
  scroll.start()
  scroll.measure()
  setupReveals()
  typing.restart()
  gsap.fromTo('[data-intro]', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, stagger: 0.09, delay: 0.5, ease: 'power3.out' })
  gsap.fromTo('.topbar, .rail, .hud', { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 1, delay: 0.9, stagger: 0.1 })
  setTimeout(() => cookies.maybeShow(), 2200)
}

// ---------- jumping between stops (with a page transition) ----------
function goTo(index) {
  audio.sfx.click()
  transition(() => {
    scroll.scrollTo(scroll.offsetFor(index), true)
    scene?.jump(STOPS[index])
    ScrollTrigger.update()
  })
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
  let nearest = 0
  STOPS.forEach((s, i) => Math.abs(s - u) < Math.abs(STOPS[nearest] - u) && (nearest = i))
  const phase = scene ? scene.phase() : 'noon'
  const key = `${nearest}:${phase}:${getLang()}`
  $('.rail-fill').style.transform = `scaleY(${Math.min(1, u)})`
  if (key === lastHud) return
  lastHud = key
  $('.hud-stop').textContent = `${t('hud.stop')} ${nearest + 1}/5 · ${t('nav.' + STOP_IDS[nearest])}`
  $('.hud-phase').textContent = t('phase.' + phase)
  $$('.nav-dot').forEach((d, i) => d.classList.toggle('active', i === nearest))
}
window.addEventListener('langchange', () => {
  lastHud = ''
  apply()
})

// ---------- game ----------
const game = createGame({
  onOpen: () => {
    gameOpen = true
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
  $(id).addEventListener('click', () => {
    if (!audio.isStarted()) audio.unlock()
    audio.sfx.click()
    game.open()
  })

// ---------- mouse parallax ----------
window.addEventListener('pointermove', (e) => scene?.setMouse((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1))
window.addEventListener('resize', () => scene?.resize())

// ---------- one loop for scrolling, the scene and the engine sound ----------
gsap.ticker.lagSmoothing(0)
let running = false
gsap.ticker.add((time, deltaMs) => {
  scroll.raf(time)
  const u = scroll.u()
  // the 3D world only renders once the visitor has pressed Start
  if (scene && running) {
    scene.setTarget(u)
    scene.frame(deltaMs / 1000)
    if (!gameOpen) audio.setEngine(scene.motion().speed)
  }
  updateHud(scene ? scene.position() : u)
})

document.documentElement.classList.toggle('lite', quality.low)
// ?debug exposes the trip position for automated checks
if (new URLSearchParams(location.search).has('debug')) window.__trip = { u: () => scene?.position() ?? 0, y: () => scroll.lenis.scroll }
boot()
