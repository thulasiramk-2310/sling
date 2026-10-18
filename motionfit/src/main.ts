import './style.css'
import { AirControls, type AirButton } from './airControls'
import { BodyTracker, coverMap, type Pt, type StageMap } from './body'
import { catalog, completeTheLook, formatPrice, itemById, similar, type Item, type Variant } from './catalog'
import { paintFlatLay } from './garmentArt'
import { MANNEQUIN_SOURCE, drawMannequin, mannequinPose } from './mannequin'
import { startPoseCamera, type PoseCamera } from './pose'
import { GarmentRenderer } from './renderer'

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T
const $$ = <T extends HTMLElement = HTMLElement>(sel: string) => Array.from(document.querySelectorAll(sel)) as T[]
const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

// ---------- State ----------
interface Snap {
  url: string
  item: string
  variant: string
}
const SAVED_KEY = 'motionfit.saved'
const loadSaved = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}
const state = {
  item: 0,
  variant: 0,
  camera: null as PoseCamera | null,
  saved: loadSaved(),
  snaps: [] as Snap[],
  picked: [] as number[],
}
const current = () => {
  const item = catalog[state.item]
  return { item, variant: item.variants[state.variant] }
}

// ---------- Stage ----------
const stage = $('#stage')
const mirror = $('#mirror')
const source = document.createElement('canvas')
source.className = 'source'
const sctx = source.getContext('2d')!
const renderer = new GarmentRenderer()
renderer.canvas.className = 'garment'
mirror.append(source, renderer.canvas)
const tracker = new BodyTracker()
const air = new AirControls()
let W = 0
let H = 0
let airButtons: AirButton[] = []

function measure() {
  const r = stage.getBoundingClientRect()
  W = r.width
  H = r.height
  const dpr = Math.min(devicePixelRatio, 2)
  source.width = Math.round(W * dpr)
  source.height = Math.round(H * dpr)
  sctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  renderer.resize(W, H)
  airButtons = $$('[data-air]').map((b) => {
    const br = b.getBoundingClientRect()
    return { id: b.dataset.air!, rect: { left: br.left - r.left, top: br.top - r.top, right: br.right - r.left, bottom: br.bottom - r.top } }
  })
}
new ResizeObserver(measure).observe(stage)

function stageMap(): StageMap {
  const v = state.camera?.video
  if (v && v.videoWidth) return coverMap(W, H, v.videoWidth, v.videoHeight)
  return coverMap(W, H, MANNEQUIN_SOURCE.w, MANNEQUIN_SOURCE.h)
}

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()
const hands = [$('#hand-0'), $('#hand-1')]
const guide = $('#guide')

function loop(t: number) {
  requestAnimationFrame(loop)
  if (!W) return
  const map = stageMap()
  const lm = state.camera ? state.camera.latest() : mannequinPose(t)
  const body = tracker.update(lm, map, t)
  renderer.update(body)
  if (!state.camera) drawMannequin(sctx, body, map, { backdrop: css('--studio-1'), floor: css('--studio-2'), skin: css('--mannequin') })
  renderer.render()

  guide.hidden = !state.camera || !!body
  if (state.camera && body) {
    // The mirror is flipped for display, so screen x is the mirror image of camera x.
    const pts: (Pt | null)[] = [
      body.wristVis.r > 0.5 ? { x: W - body.wristR.x, y: body.wristR.y } : null,
      body.wristVis.l > 0.5 ? { x: W - body.wristL.x, y: body.wristL.y } : null,
    ]
    pts.forEach((p, i) => {
      hands[i].style.opacity = p ? '1' : '0'
      if (p) hands[i].style.transform = `translate(${p.x}px, ${p.y}px)`
    })
    const s = air.update(pts, airButtons, W, t)
    $$('[data-air]').forEach((b) => {
      b.style.setProperty('--p', String(b.dataset.air === s.hover ? s.progress : 0))
      b.classList.toggle('hot', b.dataset.air === s.hover)
    })
    if (s.pressed) runAir(s.pressed)
    if (s.swipe) step(s.swipe === 'left' ? 1 : -1, true)
  } else hands.forEach((h) => (h.style.opacity = '0'))
}
requestAnimationFrame(loop)

// ---------- Actions ----------
let toastTimer = 0
function toast(text: string) {
  const el = $('#toast')
  el.textContent = text
  el.classList.add('on')
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => el.classList.remove('on'), 1600)
}

function select(itemIndex: number, variantIndex = 0) {
  state.item = (itemIndex + catalog.length) % catalog.length
  state.variant = variantIndex
  const { item, variant } = current()
  renderer.setGarment(item, variant)
  renderPanel()
  $$('.rail-item').forEach((el, i) => {
    el.classList.toggle('active', i === state.item)
    el.setAttribute('aria-selected', String(i === state.item))
  })
  $(`.rail-item[data-i="${state.item}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  $('#caption').innerHTML = `<span>${escapeHtml(item.name)}</span><span class="mono">${variant.name} · ${formatPrice(item.price)}</span>`
}

function step(dir: number, fromGesture = false) {
  select(state.item + dir)
  if (fromGesture) toast(dir > 0 ? 'Next look' : 'Previous look')
}

function runAir(id: string) {
  if (id === 'prev') step(-1, true)
  if (id === 'next') step(1, true)
  if (id === 'save') toggleSave()
  if (id === 'snap') snapshot()
}
$$('[data-air]').forEach((b) => b.addEventListener('click', () => runAir(b.dataset.air!)))

const savedKey = () => `${current().item.id}:${current().variant.id}`
function persistSaved() {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(state.saved))
  } catch {
    // Private mode: saved looks still last for this visit.
  }
  $('#saved-count').textContent = String(state.saved.length)
}
function toggleSave(key = savedKey()) {
  const i = state.saved.indexOf(key)
  if (i >= 0) state.saved.splice(i, 1)
  else state.saved.unshift(key)
  persistSaved()
  toast(i >= 0 ? 'Removed from saved' : 'Saved')
  renderPanel()
}

function snapshot() {
  const { item, variant } = current()
  const c = document.createElement('canvas')
  const scale = 360 / Math.max(W, H)
  c.width = Math.round(W * scale)
  c.height = Math.round(H * scale)
  const ctx = c.getContext('2d')!
  ctx.translate(c.width, 0)
  ctx.scale(-1, 1)
  const v = state.camera?.video
  if (v) {
    const map = coverMap(c.width, c.height, v.videoWidth, v.videoHeight)
    const o = map.toStage(0, 0)
    const e = map.toStage(1, 1)
    ctx.drawImage(v, o.x, o.y, e.x - o.x, e.y - o.y)
  } else ctx.drawImage(source, 0, 0, c.width, c.height)
  ctx.drawImage(renderer.canvas, 0, 0, c.width, c.height)
  state.snaps.unshift({ url: c.toDataURL('image/jpeg', 0.86), item: item.id, variant: variant.id })
  state.snaps = state.snaps.slice(0, 8)
  state.picked = []
  stage.classList.remove('flash')
  void stage.offsetWidth
  stage.classList.add('flash')
  renderTray()
  toast('Snapshot added')
}

// ---------- Camera ----------
const cameraBtn = $<HTMLButtonElement>('#camera-btn')
const status = $('#status')
cameraBtn.addEventListener('click', async () => {
  if (state.camera) {
    state.camera.stop()
    state.camera.video.remove()
    state.camera = null
    tracker.reset()
    source.hidden = false
    cameraBtn.textContent = 'Start camera'
    status.textContent = 'Demo mannequin · start the camera to try it on'
    return
  }
  cameraBtn.disabled = true
  cameraBtn.textContent = 'Starting…'
  status.textContent = 'Loading the pose model (about 6 MB, once)…'
  try {
    const cam = await startPoseCamera(import.meta.env.BASE_URL)
    cam.video.className = 'source'
    mirror.prepend(cam.video)
    source.hidden = true
    tracker.reset()
    state.camera = cam
    cameraBtn.textContent = 'Stop camera'
    status.textContent = 'Live · sweep a hand sideways to change looks'
  } catch (err) {
    const name = err instanceof DOMException ? err.name : ''
    status.textContent =
      name === 'NotAllowedError'
        ? 'Camera blocked · allow it from the address bar to try clothes on'
        : name === 'NotFoundError'
          ? 'No camera found · the mannequin is modelling for you'
          : 'Camera could not start · close other apps using it'
    cameraBtn.textContent = 'Start camera'
  } finally {
    cameraBtn.disabled = false
  }
})

// ---------- Rendering UI ----------
const thumbs = new Map<string, string>()
function thumb(item: Item, variant: Variant, size = 220) {
  const key = `${item.id}:${variant.id}:${size}`
  if (!thumbs.has(key)) thumbs.set(key, paintFlatLay(item, variant, size).toDataURL())
  return thumbs.get(key)!
}

function renderRail() {
  $('#rail').innerHTML = catalog
    .map(
      (item, i) => `
      <button class="rail-item" role="option" data-i="${i}" aria-selected="false">
        <img src="${thumb(item, item.variants[0])}" alt="" width="110" height="110" />
        <span class="rail-name">${escapeHtml(item.name)}</span>
        <span class="rail-meta mono">${formatPrice(item.price)}<span class="dots">${item.variants.map((v) => `<i style="background:${v.base}"></i>`).join('')}</span></span>
      </button>`,
    )
    .join('')
  $$('.rail-item').forEach((el) => el.addEventListener('click', () => select(Number(el.dataset.i))))
}

function renderPanel() {
  const { item, variant } = current()
  const isSaved = state.saved.includes(savedKey())
  const look = completeTheLook(variant)
  $('#panel').innerHTML = `
    <p class="mono cat">${item.category}</p>
    <h1>${escapeHtml(item.name)}</h1>
    <p class="price">${formatPrice(item.price)}</p>
    <p class="blurb">${escapeHtml(item.blurb)}</p>
    <div class="swatch-row">
      <span class="mono">Colour · ${escapeHtml(variant.name)}</span>
      <div class="swatches" role="radiogroup" aria-label="Colour">
        ${item.variants
          .map(
            (v, i) =>
              `<button role="radio" aria-checked="${i === state.variant}" aria-label="${escapeHtml(v.name)}" data-v="${i}" style="--a:${v.base};--b:${v.accent}"></button>`,
          )
          .join('')}
      </div>
    </div>
    <dl class="facts"><div><dt class="mono">Fabric</dt><dd>${escapeHtml(item.fabric)}</dd></div><div><dt class="mono">Fit</dt><dd>${escapeHtml(item.fit)}</dd></div></dl>
    <div class="actions">
      <button class="btn" data-act="save">${isSaved ? 'Saved ✓' : 'Save look'}</button>
      <button class="btn ghost" data-act="snap">Snapshot</button>
    </div>
    <h2 class="mono sub">Complete the look</h2>
    <ul class="look">${look.map((l) => `<li><i style="background:${l.color}"></i><span><b>${l.name}</b>${l.why}</span></li>`).join('')}</ul>
    <h2 class="mono sub">You might also like</h2>
    <div class="similar">${similar(item)
      .map((s) => `<button data-item="${s.id}"><img src="${thumb(s, s.variants[0], 120)}" alt="" width="60" height="60" /><span>${escapeHtml(s.name)}<em class="mono">${formatPrice(s.price)}</em></span></button>`)
      .join('')}</div>
    <p class="fit-note">This preview is a 2D approximation for style and colour. Drape and exact fit depend on your measurements, so check the size guide before you buy.</p>`
  $$('#panel [data-v]').forEach((b) => b.addEventListener('click', () => select(state.item, Number(b.dataset.v))))
  $('#panel [data-act="save"]').addEventListener('click', () => toggleSave())
  $('#panel [data-act="snap"]').addEventListener('click', snapshot)
  $$('#panel [data-item]').forEach((b) => b.addEventListener('click', () => select(catalog.findIndex((c) => c.id === b.dataset.item))))
}

function snapLabel(s: Snap) {
  const item = itemById.get(s.item)!
  const variant = item.variants.find((v) => v.id === s.variant)!
  return { item, variant }
}

function renderTray() {
  const tray = $('#tray')
  if (!state.snaps.length) return
  tray.innerHTML = state.snaps
    .map((s, i) => {
      const { item, variant } = snapLabel(s)
      const picked = state.picked.includes(i)
      return `<button class="snap ${picked ? 'picked' : ''}" data-s="${i}" aria-pressed="${picked}" aria-label="${escapeHtml(item.name)}, ${escapeHtml(variant.name)}">
        <img src="${s.url}" alt="" /><span class="mono">${escapeHtml(item.name)}</span></button>`
    })
    .join('')
  $$('.snap').forEach((b) =>
    b.addEventListener('click', () => {
      const i = Number(b.dataset.s)
      state.picked = state.picked.includes(i) ? state.picked.filter((x) => x !== i) : [...state.picked, i].slice(-2)
      renderTray()
    }),
  )
  $<HTMLButtonElement>('#compare-btn').disabled = state.picked.length !== 2
}

$('#compare-btn').addEventListener('click', () => {
  $('#compare').innerHTML = state.picked
    .map((i) => {
      const s = state.snaps[i]
      const { item, variant } = snapLabel(s)
      const key = `${item.id}:${variant.id}`
      return `<figure><img src="${s.url}" alt="${escapeHtml(item.name)} in ${escapeHtml(variant.name)}" />
        <figcaption><b>${escapeHtml(item.name)}</b><span class="mono">${escapeHtml(variant.name)} · ${formatPrice(item.price)}</span>
        <button class="btn small" data-keep="${key}">${state.saved.includes(key) ? 'Saved ✓' : 'Save this one'}</button></figcaption></figure>`
    })
    .join('')
  $$('#compare [data-keep]').forEach((b) =>
    b.addEventListener('click', () => {
      if (!state.saved.includes(b.dataset.keep!)) toggleSave(b.dataset.keep!)
      b.textContent = 'Saved ✓'
    }),
  )
  $<HTMLDialogElement>('#compare-dialog').showModal()
})

$('#saved-btn').addEventListener('click', () => {
  $('#saved').innerHTML = state.saved.length
    ? state.saved
        .map((key) => {
          const [id, vid] = key.split(':')
          const item = itemById.get(id)
          const variant = item?.variants.find((v) => v.id === vid)
          if (!item || !variant) return ''
          return `<button class="saved-item" data-open="${key}"><img src="${thumb(item, variant, 120)}" alt="" width="64" height="64" /><span><b>${escapeHtml(item.name)}</b><em class="mono">${escapeHtml(variant.name)} · ${formatPrice(item.price)}</em></span></button>`
        })
        .join('')
    : '<p class="tray-empty">Nothing saved yet. Hover a hand over <b>Save</b> or use the Save look button.</p>'
  $$('#saved [data-open]').forEach((b) =>
    b.addEventListener('click', () => {
      const [id, vid] = b.dataset.open!.split(':')
      const i = catalog.findIndex((c) => c.id === id)
      select(i, catalog[i].variants.findIndex((v) => v.id === vid))
      $<HTMLDialogElement>('#saved-dialog').close()
    }),
  )
  $<HTMLDialogElement>('#saved-dialog').showModal()
})
$$('[data-close]').forEach((b) => b.addEventListener('click', () => (b.closest('dialog') as HTMLDialogElement).close()))

window.addEventListener('keydown', (e) => {
  if ((e.target as HTMLElement).closest('input, select, textarea, dialog')) return
  if (e.key === 'ArrowRight') step(1)
  if (e.key === 'ArrowLeft') step(-1)
})

renderRail()
select(0)
persistSaved()
