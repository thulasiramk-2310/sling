import './site.css'
import '../ui/components.css'
import { GestureEngine } from '../engine/engine'
import { FaceEngine, type FaceInput } from '../engine/faceEngine'
import { mountCalibration } from '../ui/calibration'
import { mountStudio } from '../ui/studio'
import { fakeHand, type FakePose } from '../engine/fakeHand'
import { DEFAULT_SETTINGS, MACRO_LABELS, POSE_LABELS, mergeSettings, type MacroAction, type Settings } from '../engine/settings'
import { drawFace, drawHands, startFaceTracker, startTracker, type Tracker } from '../engine/tracker'
import type { Frame, MacroPose, Point } from '../engine/types'
import { Actuator } from '../actuator/actuator'

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector(sel) as T
const $$ = <T extends Element = HTMLElement>(sel: string) => Array.from(document.querySelectorAll(sel)) as T[]

// ---------- Settings ----------
const STORE_KEY = 'gestureos.settings'
function loadSettings(): Settings {
  try {
    return mergeSettings(JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null'))
  } catch {
    return mergeSettings(null)
  }
}
let settings = loadSettings()
function saveSettings(next: Settings) {
  const modeChanged = next.inputMode !== settings.inputMode
  settings = next
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(next))
  } catch {
    // Storage can be blocked (private mode); settings still apply for this visit.
  }
  engine.setSettings(next)
  faceEngine.setSettings(next)
  actuator?.setSettings(next)
  if (modeChanged && tracker) void toggleCamera().then(toggleCamera)
}

// ---------- Engine + camera ----------
const engine = new GestureEngine()
engine.setSettings(settings)
const faceEngine = new FaceEngine()
faceEngine.setSettings(settings)
// Live hand landmarks for the calibration wizard and gesture studio.
const handListeners = new Set<(hands: Point[][]) => void>()
const handFeed = (cb: (hands: Point[][]) => void) => {
  handListeners.add(cb)
  return () => handListeners.delete(cb)
}
let actuator: Actuator | null = null
let tracker: Tracker | null = null

const status = $('#camera-status')
const cameraButtons = $$<HTMLButtonElement>('[data-action="camera"]')

function setCameraLabel(text: string, disabled = false) {
  cameraButtons.forEach((b) => {
    b.textContent = text
    b.disabled = disabled
  })
}

// Explain what the camera is for before the browser's permission prompt; shown until accepted once.
function primed(): Promise<boolean> {
  try {
    if (localStorage.getItem('gestureos.primed')) return Promise.resolve(true)
  } catch {
    // Storage blocked: just ask each time.
  }
  const d = $<HTMLDialogElement>('#prime')
  return new Promise((resolve) => {
    const done = (ok: boolean) => {
      d.close()
      if (ok)
        try {
          localStorage.setItem('gestureos.primed', '1')
        } catch {
          // Fine: we'll explain again next time.
        }
      resolve(ok)
    }
    $('#prime-ok').onclick = () => done(true)
    $('#prime-cancel').onclick = () => done(false)
    d.oncancel = () => resolve(false)
    d.showModal()
  })
}

function showProgress(loaded: number, total: number) {
  $('#load').hidden = false
  const pct = total ? Math.min(100, (loaded / total) * 100) : 0
  $('#load-fill').style.width = `${pct}%`
  const mb = (n: number) => (n / 1048576).toFixed(1)
  $('#load-text').textContent = !total
    ? `Downloading the tracking model · ${mb(loaded)} MB`
    : pct >= 100
      ? 'Starting tracking…'
      : `Downloading the tracking model · ${mb(loaded)} of ${mb(total)} MB`
}

async function toggleCamera() {
  if (tracker) {
    tracker.stop()
    tracker = null
    actuator?.destroy()
    actuator = null
    engine.setActive(false)
    $('#live').hidden = true
    $('#hero-art').hidden = false
    setCameraLabel('Start camera')
    status.textContent = 'Camera off. Your camera feed stays on this device.'
    return
  }
  if (!(await primed())) return
  setCameraLabel('Starting…', true)
  const head = settings.inputMode === 'head'
  status.textContent = head ? 'Loading the face model (about 4 MB, once)…' : 'Loading the hand model (about 8 MB, once)…'
  try {
    if (head) {
      faceEngine.setActive(true)
      tracker = await startFaceTracker({ assetBase: import.meta.env.BASE_URL, onFrame: onFaceFrame, onProgress: showProgress })
    } else tracker = await startTracker({ assetBase: import.meta.env.BASE_URL, onFrame, onProgress: showProgress })
    $('#load').hidden = true
  } catch (err) {
    $('#load').hidden = true
    setCameraLabel('Start camera')
    const name = err instanceof DOMException ? err.name : ''
    status.textContent =
      name === 'NotAllowedError'
        ? 'Camera access was blocked. Allow it from the camera icon in the address bar, then try again.'
        : name === 'NotFoundError'
          ? 'No camera was found. You can still try the cards with your mouse.'
          : 'The camera could not start. Close other apps using it and try again.'
    return
  }
  actuator = new Actuator(settings, siteHooks)
  const box = $('#live-video')
  box.replaceChildren(tracker.video)
  $('#live').hidden = false
  $('#hero-art').hidden = true
  setCameraLabel('Stop camera')
  status.textContent = head
    ? 'Head mode on. Move your head to steer, open your mouth to click.'
    : 'Camera on. Hold an open palm still to wake GestureOS.'
}
cameraButtons.forEach((b) => b.addEventListener('click', toggleCamera))

const POSE_HINTS: Record<string, string> = {
  none: 'Show your hand to the camera',
  open: 'Open palm · hold still to wake',
  point: 'Point · move the cursor',
  pinch: 'Pinch · click or drag',
  fist: 'Fist · hold to pause',
  scroll: 'Two fingers · scroll',
  victory: 'Peace · macro',
  rock: 'Rock · macro',
  thumbsUp: 'Thumbs up · play / pause',
  smile: 'Smile',
  unknown: 'Tracking…',
}

function poseHint(pose: string) {
  if (pose.startsWith('custom:')) return settings.customGestures.find((g) => `custom:${g.id}` === pose)?.name ?? 'Custom gesture'
  return POSE_HINTS[pose] ?? pose
}

function onFrame(hands: Point[][], t: number) {
  handListeners.forEach((cb) => cb(hands))
  const frame = engine.update(hands, t)
  actuator?.handle(frame)
  drawHands($<HTMLCanvasElement>('#live-canvas'), hands, frame.active ? '#2f5bea' : '#ff8a3d')
  $('#stage-chip').textContent = `${frame.active ? 'Active' : 'Paused'} · ${poseHint(frame.pose)}`
  updateWake(frame)
}

const FACE_HINTS: Record<string, string> = {
  none: 'Face the camera',
  point: 'Steering with your head',
  pinch: 'Mouth open · click or drag',
  scroll: 'Eyebrows up · tilt to scroll',
  smile: 'Smile · hold to right-click',
}
function onFaceFrame(face: FaceInput | null, t: number) {
  const frame = faceEngine.update(face, t)
  actuator?.handle(frame)
  drawFace($<HTMLCanvasElement>('#live-canvas'), face, frame.active ? '#2f5bea' : '#ff8a3d')
  $('#stage-chip').textContent = `${frame.active ? 'Active' : 'Paused'} · ${FACE_HINTS[frame.pose] ?? frame.pose}`
  updateWake(frame)
}

// ---------- Hero animation (before the camera starts) ----------
const HERO_SEQUENCE: { pose: FakePose; label: string }[] = [
  { pose: 'open', label: 'Open palm · wake up' },
  { pose: 'point', label: 'Point · move the cursor' },
  { pose: 'pinch', label: 'Pinch · click' },
  { pose: 'scroll', label: 'Two fingers · scroll' },
  { pose: 'thumbsUp', label: 'Thumbs up · play / pause' },
  { pose: 'fist', label: 'Fist · pause' },
]
const heroCanvas = $<HTMLCanvasElement>('#hero-art')
const lerpHand = (a: Point[], b: Point[], k: number) => a.map((p, i) => ({ x: p.x + (b[i].x - p.x) * k, y: p.y + (b[i].y - p.y) * k }))
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
function heroTick(now: number) {
  requestAnimationFrame(heroTick)
  if (tracker || heroCanvas.hidden) return
  const period = 2200
  const i = Math.floor(now / period) % HERO_SEQUENCE.length
  const k = reduceMotion ? 1 : ease(Math.min(1, ((now % period) / period) * 2.5))
  const from = HERO_SEQUENCE[(i + HERO_SEQUENCE.length - 1) % HERO_SEQUENCE.length]
  const to = HERO_SEQUENCE[i]
  const sway = reduceMotion ? 0 : Math.sin(now / 900) * 0.015
  const hand = lerpHand(fakeHand(from.pose, 0.48 + sway, 0.4, 0.3), fakeHand(to.pose, 0.48 + sway, 0.4, 0.3), k)
  drawHands(heroCanvas, [hand], '#2f5bea')
  $('#stage-chip').textContent = to.label
}
requestAnimationFrame(heroTick)

// ---------- Training ground ----------
const done = new Set<string>()
function complete(step: string) {
  if (done.has(step)) return
  done.add(step)
  $(`[data-step="${step}"]`).classList.add('done')
  $('#done-count').textContent = String(done.size)
  $('#progress-fill').style.width = `${(done.size / 7) * 100}%`
}

function updateWake(frame: Frame) {
  const orb = $('#wake-orb')
  orb.classList.toggle('on', frame.active)
  orb.style.setProperty('--hold', String(frame.hold.kind === 'activate' ? frame.hold.progress : frame.active ? 1 : 0))
  orb.querySelector('span')!.textContent = frame.active ? 'Active' : frame.hold.kind === 'activate' ? 'Hold…' : 'Paused'
}

// Click targets
let hot = 0
let hits = 0
const targetButtons = $$<HTMLButtonElement>('.target-btn')
function pickTarget() {
  let next = hot
  while (next === hot) next = Math.floor(Math.random() * targetButtons.length)
  hot = next
  targetButtons.forEach((b, i) => b.classList.toggle('hot', i === hot))
}
targetButtons.forEach((b, i) =>
  b.addEventListener('click', () => {
    if (i !== hot) {
      b.animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], 200)
      return
    }
    hits++
    $('#hits').textContent = String(Math.min(hits, 3))
    if (hits >= 3) complete('click')
    pickTarget()
  }),
)
pickTarget()

// Drag chip into tray (pointer events, so synthetic gesture drags work like a mouse)
const chip = $('#chip')
const tray = $('#tray')
let drag: { x: number; y: number } | null = null
chip.addEventListener('pointerdown', (e) => {
  drag = { x: e.clientX, y: e.clientY }
  chip.classList.add('lifted')
  e.preventDefault()
})
document.addEventListener('pointermove', (e) => {
  if (!drag) return
  chip.style.transform = `translate(${e.clientX - drag.x}px, ${e.clientY - drag.y}px) rotate(-3deg)`
  const r = chip.getBoundingClientRect()
  const t = tray.getBoundingClientRect()
  tray.classList.toggle('over', r.left + r.width / 2 > t.left && r.left + r.width / 2 < t.right && r.top + r.height / 2 > t.top && r.top + r.height / 2 < t.bottom)
})
document.addEventListener('pointerup', () => {
  if (!drag) return
  drag = null
  chip.classList.remove('lifted')
  if (tray.classList.contains('over')) {
    tray.classList.remove('over')
    tray.classList.add('filled')
    tray.textContent = ''
    tray.appendChild(chip)
    chip.style.transform = ''
    complete('drag')
  } else chip.style.transform = ''
})

// Scroll list
const RECIPE = [
  'Preheat the oven to 200 °C.',
  'Halve 600 g of cherry tomatoes.',
  'Slice 4 cloves of garlic thinly.',
  'Toss tomatoes with 3 tbsp olive oil.',
  'Season with salt and black pepper.',
  'Roast for 25 minutes until blistered.',
  'Bring a large pot of water to the boil.',
  'Salt the water generously.',
  'Cook 400 g of spaghetti for 9 minutes.',
  'Save a mug of the pasta water.',
  'Warm the garlic in oil over low heat.',
  'Add a pinch of chili flakes.',
  'Tip in the roasted tomatoes.',
  'Crush half the tomatoes with a fork.',
  'Drain the pasta.',
  'Add pasta to the pan with a splash of water.',
  'Toss until glossy.',
  'Tear in a handful of basil.',
  'Grate over 40 g of parmesan.',
  'Taste and adjust the salt.',
  'Plate in warm bowls.',
  'Finish with a drizzle of oil.',
  'Serve straight away.',
  'You made it to the end. Enjoy!',
]
$('#recipe').innerHTML = RECIPE.map((s) => `<li>${s}</li>`).join('')
const scrollBox = $('#scroll-box')
scrollBox.addEventListener('scroll', () => {
  if (scrollBox.scrollTop + scrollBox.clientHeight >= scrollBox.scrollHeight - 6) complete('scroll')
})

// Carousel
const SLIDES = [
  { title: 'Cooking along', body: 'Pause and scroll recipes with flour on your hands.' },
  { title: 'Presenting', body: 'Flip slides from across the room.' },
  { title: 'Accessibility', body: 'A mouse alternative when gripping is hard.' },
  { title: 'Hygiene', body: 'Shared kiosks and labs without touching anything.' },
]
let slide = 0
$('#slides').innerHTML = SLIDES.map((s, i) => `<div class="slide" data-i="${i}"><h4>${s.title}</h4><p>${s.body}</p></div>`).join('')
$('#dots').innerHTML = SLIDES.map(() => '<span></span>').join('')
function showSlide(i: number) {
  slide = (i + SLIDES.length) % SLIDES.length
  $('#slides').style.transform = `translateX(${-slide * 100}%)`
  $$('#dots span').forEach((d, k) => d.classList.toggle('on', k === slide))
}
$('.arrow.prev').addEventListener('click', () => showSlide(slide - 1))
$('.arrow.next').addEventListener('click', () => showSlide(slide + 1))
showSlide(0)

// Zoomable map
const zoomCanvas = $<HTMLCanvasElement>('#zoom-canvas')
let zoom = 1
function drawMap() {
  const ctx = zoomCanvas.getContext('2d')!
  const { width: w, height: h } = zoomCanvas
  const css = getComputedStyle(document.documentElement)
  ctx.save()
  ctx.fillStyle = css.getPropertyValue('--map-bg').trim() || '#e9eef8'
  ctx.fillRect(0, 0, w, h)
  ctx.translate(w / 2, h / 2)
  ctx.scale(zoom, zoom)
  ctx.translate(-w / 2, -h / 2)
  ctx.fillStyle = css.getPropertyValue('--map-park').trim() || '#cfe9da'
  ctx.beginPath()
  ctx.ellipse(380, 110, 90, 55, 0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = css.getPropertyValue('--map-water').trim() || '#c9d8f5'
  ctx.beginPath()
  ctx.moveTo(0, 230)
  ctx.bezierCurveTo(140, 190, 260, 300, 560, 240)
  ctx.lineTo(560, 300)
  ctx.lineTo(0, 300)
  ctx.fill()
  ctx.strokeStyle = css.getPropertyValue('--map-road').trim() || '#ffffff'
  ctx.lineWidth = 6
  for (let x = 30; x < w; x += 70) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x + 20, h)
    ctx.stroke()
  }
  for (let y = 25; y < h; y += 55) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y - 15)
    ctx.stroke()
  }
  ctx.fillStyle = '#2f5bea'
  ctx.beginPath()
  ctx.arc(w / 2, h / 2 - 8, 9, Math.PI, 0)
  ctx.lineTo(w / 2, h / 2 + 10)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  $('#zoom-level').textContent = `${Math.round(zoom * 100)}%`
}
function setZoom(z: number, fromGesture: boolean) {
  zoom = Math.min(3, Math.max(1, z))
  drawMap()
  if (fromGesture && zoom >= 1.5) complete('zoom')
}
$$<HTMLButtonElement>('[data-zoom]').forEach((b) => b.addEventListener('click', () => setZoom(zoom * (b.dataset.zoom === '1' ? 1.2 : 1 / 1.2), false)))
drawMap()

// Player
let playing = false
let played = 0
const play = $<HTMLButtonElement>('#play')
function setPlaying(p: boolean) {
  playing = p
  play.setAttribute('aria-label', p ? 'Pause' : 'Play')
  $('#play-icon').setAttribute('d', p ? 'M7 5h4v14H7zM13 5h4v14h-4z' : 'M8 5v14l11-7z')
  $('#player').classList.toggle('playing', p)
}
play.addEventListener('click', () => setPlaying(!playing))
const wave = $<HTMLCanvasElement>('#wave')
let lastWave = performance.now()
function waveTick(now: number) {
  requestAnimationFrame(waveTick)
  const dt = (now - lastWave) / 1000
  lastWave = now
  if (playing) played = (played + dt) % 252
  const ctx = wave.getContext('2d')!
  const { width: w, height: h } = wave
  ctx.clearRect(0, 0, w, h)
  const bars = 90
  const progress = played / 252
  const css = getComputedStyle(document.documentElement)
  for (let i = 0; i < bars; i++) {
    const v = 0.25 + 0.75 * Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.23 + (playing ? now / 400 : 0)))
    const bh = v * h * 0.9
    ctx.fillStyle = i / bars < progress ? '#2f5bea' : css.getPropertyValue('--line-strong').trim() || '#c7cdda'
    ctx.fillRect(i * (w / bars) + 2, (h - bh) / 2, w / bars - 4, bh)
  }
  const s = Math.floor(played)
  $('#player-time').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} / 4:12`
}
requestAnimationFrame(waveTick)

const inView = (el: Element) => {
  const r = el.getBoundingClientRect()
  return r.bottom > 0 && r.top < innerHeight
}

const siteHooks = {
  onEvent: (ev: { type: string }) => {
    if (ev.type === 'activate') complete('wake')
  },
  // On this page swipes flip the demo carousel instead of leaving the site.
  onSwipe: (dir: 'left' | 'right') => {
    if (inView($('#carousel'))) {
      showSlide(slide + (dir === 'left' ? 1 : -1))
      complete('swipe')
    } else actuator?.toast(dir === 'right' ? 'Swipe right · goes back on other sites' : 'Swipe left · goes forward on other sites')
    return true
  },
  onZoom: (factor: number) => {
    if (inView(zoomCanvas)) setZoom(zoom * factor, true)
    else actuator?.toast(`Zoom ${factor > 1 ? 'in' : 'out'} · scroll to the zoom card to try it`)
    return true
  },
  onMacro: (pose: MacroPose, action: MacroAction) => {
    if (action === 'media-toggle') {
      setPlaying(!playing)
      actuator?.toast(playing ? 'Playing' : 'Paused')
    } else if (action === 'scroll-top') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      actuator?.toast('Back to top')
    } else actuator?.toast(`${POSE_LABELS[pose]} · ${MACRO_LABELS[action]}`)
    if (pose === 'thumbsUp') complete('macro')
    return true
  },
}

// ---------- Glossary ----------
const GLOSSARY: { poses: FakePose[]; name: string; action: string; motion?: string }[] = [
  { poses: ['open'], name: 'Open palm, held', action: 'Wake GestureOS' },
  { poses: ['point'], name: 'Point', action: 'Move the cursor' },
  { poses: ['pinch'], name: 'Quick pinch', action: 'Click' },
  { poses: ['pinch'], name: 'Pinch and move', action: 'Drag', motion: '↔' },
  { poses: ['scroll'], name: 'Two fingers up / down', action: 'Scroll', motion: '↕' },
  { poses: ['open'], name: 'Fast sideways sweep', action: 'Back / forward', motion: '⇆' },
  { poses: ['pinch', 'pinch'], name: 'Two-hand pinch, pull apart', action: 'Zoom' },
  { poses: ['fist'], name: 'Fist, held', action: 'Pause' },
  { poses: ['thumbsUp'], name: 'Thumbs up', action: 'Macro · play / pause' },
  { poses: ['victory'], name: 'Peace sign', action: 'Macro · your choice' },
  { poses: ['rock'], name: 'Rock sign', action: 'Macro · your choice' },
]
$('#glossary').innerHTML = GLOSSARY.map(
  (g, i) => `<div class="gloss"><div class="gloss-art"><canvas width="220" height="170" data-g="${i}"></canvas>${g.motion ? `<span class="motion">${g.motion}</span>` : ''}</div><h3>${g.name}</h3><p>${g.action}</p></div>`,
).join('')
$$<HTMLCanvasElement>('#glossary canvas').forEach((c) => {
  const g = GLOSSARY[Number(c.dataset.g)]
  const hands = g.poses.length === 2 ? [fakeHand('pinch', 0.32, 0.4, 0.22), fakeHand('pinch', 0.8, 0.4, 0.22)] : [fakeHand(g.poses[0], 0.56, 0.33, 0.36)]
  drawHands(c, hands, '#2f5bea')
})

// ---------- Settings form ----------
const form = $<HTMLFormElement>('#settings-form')
const ranges = ['sensitivity', 'smoothing', 'scrollSpeed', 'dwellMs', 'headGain'] as const
const toggles = ['snap', 'dwell', 'swipeNavigation', 'lowEffort', 'breakReminder', 'showPerformance'] as const
const fmt = (k: string, v: number) => (k === 'dwellMs' ? `${(v / 1000).toFixed(1)} s` : `${v.toFixed(2).replace(/\.?0+$/, '')}×`)

$('#macros').innerHTML = (Object.keys(POSE_LABELS) as MacroPose[])
  .map(
    (p) =>
      `<label class="macro"><span>${POSE_LABELS[p]}</span><select id="macro-${p}">${(Object.keys(MACRO_LABELS) as MacroAction[])
        .filter((a) => a !== 'next-tab' && a !== 'prev-tab')
        .map((a) => `<option value="${a}">${MACRO_LABELS[a]}</option>`)
        .join('')}</select></label>`,
  )
  .join('')

function fillForm(s: Settings) {
  for (const k of ranges) {
    const input = $<HTMLInputElement>(`#${k}`)
    input.value = String(s[k])
    input.nextElementSibling!.textContent = fmt(k, s[k])
  }
  for (const k of toggles) $<HTMLInputElement>(`#${k}`).checked = s[k]
  $$<HTMLInputElement>('input[name="cursorSize"]').forEach((r) => (r.checked = r.value === s.cursorSize))
  for (const p of Object.keys(s.macros) as MacroPose[]) $<HTMLSelectElement>(`#macro-${p}`).value = s.macros[p]
  $<HTMLInputElement>('#dwellMs').disabled = !s.dwell
}

form.addEventListener('input', () => {
  const next: Settings = { ...settings, macros: { ...settings.macros } }
  for (const k of ranges) next[k] = Number($<HTMLInputElement>(`#${k}`).value)
  for (const k of toggles) next[k] = $<HTMLInputElement>(`#${k}`).checked
  next.cursorSize = ($<HTMLInputElement>('input[name="cursorSize"]:checked')?.value ?? 'm') as Settings['cursorSize']
  for (const p of Object.keys(next.macros) as MacroPose[]) next.macros[p] = $<HTMLSelectElement>(`#macro-${p}`).value as MacroAction
  saveSettings(next)
  fillForm(next)
})
form.addEventListener('submit', (e) => e.preventDefault())
$('#reset-settings').addEventListener('click', () => {
  saveSettings(mergeSettings(DEFAULT_SETTINGS))
  fillForm(settings)
})
fillForm(settings)

// Redraw canvases that read theme colors when the system theme flips.
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', drawMap)

// ---------- Personalize: input mode, calibration, gesture studio ----------
$$<HTMLInputElement>('input[name="inputMode"]').forEach((r) => {
  r.checked = r.value === settings.inputMode
  r.addEventListener('change', () => {
    saveSettings({ ...settings, inputMode: r.value as Settings['inputMode'] })
    $('#mode-note').textContent =
      r.value === 'head' ? 'Head mode: the next camera start uses your face. Calibration and custom gestures apply to hand mode.' : 'Hand mode: the camera tracks your hands.'
  })
})
mountCalibration($('#calibration'), { feed: handFeed, current: settings.calibration, onSave: (c) => saveSettings({ ...settings, calibration: c }) })
mountStudio($('#studio'), { feed: handFeed, getSettings: () => settings, save: saveSettings })
