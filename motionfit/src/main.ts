import './style.css'
import { AirControls, type AirButton } from './airControls'
import { Backdrop, type BackdropMode } from './backdrop'
import { addLine, setQty, totals, FREE_DELIVERY_FROM, type BagLine } from './bag'
import { BodyTracker, coverMap, type Body, type Pt, type StageMap } from './body'
import { canBeInner, canLayer, catalog, completeTheLook, formatPrice, itemById, registerItem, similar, unregisterItem, type Item, type Variant } from './catalog'
import { paintFlatLay, paintSleeve, paintTorso } from './garmentArt'
import { deleteGarment, listGarments, saveGarment, type StoredGarment } from './garmentStore'
import { MANNEQUIN_SOURCE, drawMannequin, mannequinPose } from './mannequin'
import { startPhotoSource, startPoseCamera, type PoseSource } from './pose'
import { GarmentRenderer } from './renderer'
import { SIZES, SIZE_CHART, recommendSize, type Profile, type Size } from './size'
import { buildTextures, uploadThumb, type UploadSpec } from './upload'
import { mountUploadEditor, type NewGarment, type UploadEditor } from './uploadEditor'
import { parseProductLink } from './productLink'

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T
const $$ = <T extends HTMLElement = HTMLElement>(sel: string) => Array.from(document.querySelectorAll(sel)) as T[]
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
const dialog = (id: string) => $<HTMLDialogElement>(id)

// ---------- Persistence ----------
function load<T>(key: string, fallback: T, valid: (v: unknown) => boolean): T {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? 'null')
    return valid(v) ? (v as T) : fallback
  } catch {
    return fallback
  }
}
function store(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private mode or full storage: the state still lasts for this visit.
  }
}

// ---------- State ----------
interface Snap {
  url: string
  item: string
  variant: string
  inner: string | null
}
const state = {
  item: 0,
  variant: 0,
  inner: {} as Record<string, string | null>,
  size: {} as Record<string, Size>,
  camera: null as PoseSource | null,
  saved: load<string[]>('motionfit.saved', [], Array.isArray),
  bag: load<BagLine[]>('motionfit.bag', [], Array.isArray),
  profile: load<Profile | null>('motionfit.profile', null, (v) => !!v && typeof v === 'object'),
  backdrop: 'off' as BackdropMode,
  snaps: [] as Snap[],
  picked: [] as number[],
  bodyRatio: null as number | null,
}
const current = () => {
  const item = catalog[state.item]
  return { item, variant: item.variants[Math.min(state.variant, item.variants.length - 1)] }
}

// ---------- Textures ----------
const textureCache = new Map<string, { torso: HTMLCanvasElement; sleeve: HTMLCanvasElement }>()
function textures(item: Item, variant: Variant, open = false) {
  const key = `${item.id}:${variant.id}:${open}`
  let t = textureCache.get(key)
  if (!t) {
    t = item.upload ? buildTextures(item.upload) : { torso: paintTorso(item, variant, open), sleeve: paintSleeve(item, variant) }
    textureCache.set(key, t)
  }
  return t
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
const backdrop = new Backdrop()
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
  const f = state.camera?.frame
  if (f && f.width) return coverMap(W, H, f.width, f.height)
  return coverMap(W, H, MANNEQUIN_SOURCE.w, MANNEQUIN_SOURCE.h)
}

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()
const hands = [$('#hand-0'), $('#hand-1')]
const guide = $('#guide')

// Shoulder width over torso length, smoothed, for the size advisor. Only measured when hips are really visible.
function trackBuild(body: Body) {
  if (body.hipsEstimated) return
  const sw = Math.hypot(body.shoulderL.x - body.shoulderR.x, body.shoulderL.y - body.shoulderR.y)
  const ms = { x: (body.shoulderL.x + body.shoulderR.x) / 2, y: (body.shoulderL.y + body.shoulderR.y) / 2 }
  const mh = { x: (body.hipL.x + body.hipR.x) / 2, y: (body.hipL.y + body.hipR.y) / 2 }
  const ratio = sw / (Math.hypot(mh.x - ms.x, mh.y - ms.y) || 1)
  state.bodyRatio = state.bodyRatio === null ? ratio : state.bodyRatio * 0.95 + ratio * 0.05
}

// Estimates the room's brightness and colour cast from a tiny copy of the camera image.
const probe = document.createElement('canvas')
probe.width = 24
probe.height = 18
const probeCtx = probe.getContext('2d', { willReadFrequently: true })!
const light = { b: 1, tint: [1, 1, 1] as [number, number, number], frame: 0 }
function updateLighting() {
  const v = state.camera?.frame
  if (!v || !v.width) {
    light.b = 1
    light.tint = [1, 1, 1]
  } else if (light.frame++ % 10 === 0) {
    probeCtx.drawImage(v, 0, 0, probe.width, probe.height)
    const d = probeCtx.getImageData(0, 0, probe.width, probe.height).data
    let r = 0
    let g = 0
    let b = 0
    for (let i = 0; i < d.length; i += 4) {
      r += d[i]
      g += d[i + 1]
      b += d[i + 2]
    }
    const n = (d.length / 4) * 255
    ;[r, g, b] = [r / n, g / n, b / n]
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    const mean = (r + g + b) / 3 || 1
    const target = Math.min(1.12, Math.max(0.62, 0.6 + lum * 0.9))
    const tint: [number, number, number] = [r, g, b].map((c) => 1 + (c / mean - 1) * 0.3) as [number, number, number]
    light.b += (target - light.b) * 0.3
    light.tint = light.tint.map((c, i) => c + (tint[i] - c) * 0.3) as [number, number, number]
  }
  renderer.setLighting(light.b, light.tint)
}

function loop(t: number) {
  requestAnimationFrame(loop)
  if (!W) return
  const map = stageMap()
  const lm = state.camera ? state.camera.latest() : mannequinPose(t)
  const body = tracker.update(lm, map, t)
  renderer.update(body)
  updateLighting()
  if (state.camera) {
    sctx.clearRect(0, 0, W, H)
    backdrop.draw(sctx, state.camera.frame, state.camera.mask(), state.backdrop, W, H, { a: css('--studio-1'), b: css('--studio-2') })
  } else drawMannequin(sctx, body, map, { backdrop: css('--studio-1'), floor: css('--studio-2'), skin: css('--mannequin') })
  renderer.render()

  guide.hidden = !state.camera || state.camera.still || !!body
  if (state.camera && body) trackBuild(body)
  // Hand controls only make sense live; a still photo has nobody to wave.
  if (state.camera && !state.camera.still && body) {
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
  toastTimer = window.setTimeout(() => el.classList.remove('on'), 1700)
}

function applyGarment() {
  const { item, variant } = current()
  const innerId = canLayer(item) ? state.inner[item.id] : null
  const innerItem = innerId ? itemById.get(innerId) : undefined
  const outer = textures(item, variant, !!innerItem)
  const inner = innerItem ? textures(innerItem, innerItem.variants[0]).torso : null
  renderer.setTextures(outer.torso, outer.sleeve, inner)
}

function select(itemIndex: number, variantIndex = 0) {
  state.item = (itemIndex + catalog.length) % catalog.length
  state.variant = variantIndex
  applyGarment()
  renderPanel()
  const { item, variant } = current()
  $$('.rail-item').forEach((el) => {
    const on = el.dataset.id === item.id
    el.classList.toggle('active', on)
    el.setAttribute('aria-selected', String(on))
  })
  $(`.rail-item[data-id="${item.id}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  $('#caption').innerHTML = `<span>${escapeHtml(item.name)}</span><span class="mono">${escapeHtml(variant.name)} · ${formatPrice(item.price)}</span>`
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
function persist() {
  store('motionfit.saved', state.saved)
  store('motionfit.bag', state.bag)
  $('#saved-count').textContent = String(state.saved.length)
  $('#bag-count').textContent = String(totals(state.bag).count)
}
function toggleSave(key = savedKey()) {
  const i = state.saved.indexOf(key)
  if (i >= 0) state.saved.splice(i, 1)
  else state.saved.unshift(key)
  persist()
  toast(i >= 0 ? 'Removed from saved' : 'Saved')
  renderPanel()
}

// Recommended size for an item, if the shopper has told us their measurements.
function advice(item: Item) {
  return state.profile ? recommendSize(item, state.profile, state.bodyRatio) : null
}
function chosenSize(item: Item): Size | null {
  return state.size[item.id] ?? advice(item)?.size ?? null
}

function addToBag() {
  const { item, variant } = current()
  const size = chosenSize(item)
  if (!size) {
    toast('Choose a size first')
    $('.sizes')?.classList.add('nudge')
    setTimeout(() => $('.sizes')?.classList.remove('nudge'), 600)
    return
  }
  state.bag = addLine(state.bag, { item: item.id, variant: variant.id, size })
  persist()
  toast(`Added ${size} to your bag`)
}

function captureStage(maxSide = 360) {
  const c = document.createElement('canvas')
  const scale = maxSide / Math.max(W, H)
  c.width = Math.round(W * scale)
  c.height = Math.round(H * scale)
  const ctx = c.getContext('2d')!
  ctx.translate(c.width, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(source, 0, 0, c.width, c.height)
  ctx.drawImage(renderer.canvas, 0, 0, c.width, c.height)
  return c
}

function snapshot() {
  const { item, variant } = current()
  state.snaps.unshift({ url: captureStage().toDataURL('image/jpeg', 0.86), item: item.id, variant: variant.id, inner: canLayer(item) ? (state.inner[item.id] ?? null) : null })
  state.snaps = state.snaps.slice(0, 8)
  state.picked = []
  stage.classList.remove('flash')
  void stage.offsetWidth
  stage.classList.add('flash')
  renderTray()
  toast('Snapshot added')
}

// ---------- Camera and photo ----------
const cameraBtn = $<HTMLButtonElement>('#camera-btn')
const status = $('#status')
const IDLE_STATUS = 'Demo mannequin · try camera or photo'

function setSource(src: PoseSource | null) {
  state.camera?.stop()
  state.camera = src
  tracker.reset()
  state.bodyRatio = null
  $('#backdrop-pick').hidden = !src
  cameraBtn.textContent = src && !src.still ? 'Stop camera' : 'Start camera'
  $('#photo-label').textContent = src?.still ? 'Clear my photo' : 'Use my photo'
  if (!src) status.textContent = IDLE_STATUS
}

cameraBtn.addEventListener('click', async () => {
  if (state.camera && !state.camera.still) return setSource(null)
  if (!(await primed())) return
  cameraBtn.disabled = true
  cameraBtn.textContent = 'Starting…'
  status.textContent = 'Getting the fitting room ready…'
  try {
    setSource(await startPoseCamera(import.meta.env.BASE_URL, showProgress))
    status.textContent = 'Live · sweep a hand sideways to change looks'
  } catch (err) {
    const name = err instanceof DOMException ? err.name : ''
    // Inside an embedded preview the page itself may not be allowed a camera, whatever the visitor chooses.
    const policy = (document as Document & { featurePolicy?: { allowsFeature: (f: string) => boolean } }).featurePolicy
    const embeddedBlock = name === 'NotAllowedError' && (policy ? !policy.allowsFeature('camera') : window.self !== window.top)
    status.textContent = embeddedBlock
      ? 'Camera isn’t available in this preview · use a photo, or run the full app'
      : name === 'NotAllowedError'
        ? 'Camera blocked · allow it in the address bar, or use a photo instead'
        : name === 'NotFoundError'
          ? 'No camera found · use a photo of yourself instead'
          : 'Camera could not start · close other apps using it, or use a photo'
    cameraBtn.textContent = 'Start camera'
  } finally {
    cameraBtn.disabled = false
    $('#stage-load').hidden = true
  }
})

// A full-length photo of the shopper: works without a camera, and gives the sharpest result.
const photoFile = $<HTMLInputElement>('#photo-file')
$('#photo-btn').addEventListener('click', () => {
  if (state.camera?.still) return setSource(null)
  photoFile.click()
})
photoFile.addEventListener('change', async () => {
  const file = photoFile.files?.[0]
  photoFile.value = ''
  if (!file) return
  status.textContent = 'Reading your photo…'
  try {
    const bmp = await createImageBitmap(file).catch(() => {
      throw new Error('decode')
    })
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * k)
    c.height = Math.round(bmp.height * k)
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
    bmp.close()
    setSource(await startPhotoSource(import.meta.env.BASE_URL, c, showProgress))
    status.textContent = 'Your photo · pick any look, or add one from a link'
  } catch (err) {
    const code = (err as Error).message
    status.textContent =
      code === 'no-person'
        ? 'No one found · use a front-facing photo with shoulders and arms in view'
        : code === 'decode'
          ? 'That photo couldn’t be read · try a JPEG or PNG'
          : 'The pose model couldn’t load here · run the full app to use photos'
  } finally {
    $('#stage-load').hidden = true
  }
})

function primed(): Promise<boolean> {
  if (load('motionfit.primed', false, (v) => v === true)) return Promise.resolve(true)
  const d = dialog('#prime-dialog')
  return new Promise((resolve) => {
    const done = (ok: boolean) => {
      d.close()
      if (ok) store('motionfit.primed', true)
      resolve(ok)
    }
    $('#prime-ok').onclick = () => done(true)
    $('#prime-cancel').onclick = () => done(false)
    d.oncancel = () => resolve(false)
    d.showModal()
  })
}

function showProgress(loaded: number, total: number) {
  $('#stage-load').hidden = false
  const mb = (n: number) => (n / 1048576).toFixed(1)
  const pct = total ? Math.min(100, (loaded / total) * 100) : 0
  $('#load-fill').style.width = `${pct}%`
  $('#load-text').textContent = !total ? `Downloading · ${mb(loaded)} MB` : pct >= 100 ? 'Almost ready…' : `Downloading the pose model · ${mb(loaded)} of ${mb(total)} MB`
}

$$('[data-bg]').forEach((b) =>
  b.addEventListener('click', () => {
    state.backdrop = b.dataset.bg as BackdropMode
    $$('[data-bg]').forEach((x) => x.setAttribute('aria-checked', String(x === b)))
  }),
)

// ---------- Rail ----------
const thumbs = new Map<string, string>()
function thumb(item: Item, variant: Variant, size = 220) {
  const key = `${item.id}:${variant.id}:${size}`
  if (!thumbs.has(key)) thumbs.set(key, (item.upload ? uploadThumb(item.upload, size) : paintFlatLay(item, variant, size)).toDataURL())
  return thumbs.get(key)!
}

function renderRail() {
  $('#rail-title').textContent = `The edit · ${catalog.length} pieces`
  $('#rail').innerHTML = catalog
    .map(
      (item, i) => `
      <button class="rail-item" role="option" data-i="${i}" data-id="${item.id}" aria-selected="false">
        <img src="${thumb(item, item.variants[0])}" alt="" width="110" height="110" />
        ${item.upload ? '<span class="badge mono">Yours</span>' : ''}
        <span class="rail-name">${escapeHtml(item.name)}</span>
        <span class="rail-meta mono">${formatPrice(item.price)}<span class="dots">${item.variants.map((v) => `<i style="background:${v.base}"></i>`).join('')}</span></span>
      </button>`,
    )
    .join('')
  $$('.rail-item').forEach((el) => el.addEventListener('click', () => select(Number(el.dataset.i))))
}

// ---------- Product panel ----------
function renderPanel() {
  const { item, variant } = current()
  const isSaved = state.saved.includes(savedKey())
  const look = completeTheLook(variant)
  const rec = advice(item)
  const chosen = chosenSize(item)
  const inners = canLayer(item) ? catalog.filter(canBeInner) : []
  const innerId = state.inner[item.id] ?? ''
  $('#panel').innerHTML = `
    <button class="panel-photo" data-act="photos" aria-label="View photos of ${escapeHtml(item.name)}"><img src="${thumb(item, variant, 360)}" alt="" width="180" height="180" /><span class="mono">View photos</span></button>
    <p class="mono cat">${item.upload ? 'Added by you' : item.category}</p>
    <h1>${escapeHtml(item.name)}</h1>
    <p class="price">${formatPrice(item.price)}</p>
    <p class="blurb">${escapeHtml(item.blurb)}</p>
    ${
      item.variants.length > 1
        ? `<div class="swatch-row">
      <span class="mono">Colour · ${escapeHtml(variant.name)}</span>
      <div class="swatches" role="radiogroup" aria-label="Colour">
        ${item.variants.map((v, i) => `<button role="radio" aria-checked="${v.id === variant.id}" aria-label="${escapeHtml(v.name)}" data-v="${i}" style="--a:${v.base};--b:${v.accent}"></button>`).join('')}
      </div>
    </div>`
        : ''
    }
    <div class="size-row">
      <div class="size-head"><span class="mono">Size${chosen ? ` · ${chosen}` : ''}</span><button class="link" data-act="find-size">${state.profile ? 'Size guide · edit my details' : 'Size guide · find my size'}</button></div>
      <div class="sizes" role="radiogroup" aria-label="Size">
        ${SIZES.map((s) => `<button role="radio" aria-checked="${s === chosen}" data-size="${s}" class="${rec?.size === s ? 'rec' : ''}">${s}</button>`).join('')}
      </div>
      ${
        rec
          ? `<p class="size-advice ${rec.confidence}">${rec.confidence === 'good' ? `We recommend <b>${rec.size}</b>.` : betweenText(rec.size, rec.alternative!)}</p>`
          : `<p class="size-advice">Tell us your height and weight and we'll suggest a size.</p>`
      }
    </div>
    ${
      inners.length
        ? `<label class="layer-row"><span class="mono">Wear it</span>
            <select data-act="inner">
              <option value="">Closed</option>
              ${inners.map((i) => `<option value="${i.id}" ${i.id === innerId ? 'selected' : ''}>Open over ${escapeHtml(i.name)}</option>`).join('')}
            </select></label>`
        : ''
    }
    <div class="actions">
      <button class="btn" data-act="bag">Add to bag</button>
      <button class="btn ghost" data-act="save" aria-pressed="${isSaved}">${isSaved ? 'Saved ✓' : 'Save'}</button>
    </div>
    <ul class="assure">
      <li><b>${item.price >= FREE_DELIVERY_FROM ? 'Free delivery' : `Free delivery over ${formatPrice(FREE_DELIVERY_FROM)}`}</b> · arrives by ${deliveryDate()}</li>
      <li><b>Free returns</b> within 30 days</li>
      <li><b>Care</b> · ${careFor(item)}</li>
    </ul>
    <div class="actions secondary">
      <button class="btn ghost small" data-act="snap">Snapshot</button>
      <button class="btn ghost small" data-act="share">Share look</button>
    </div>
    <dl class="facts"><div><dt class="mono">Fabric</dt><dd>${escapeHtml(item.fabric)}</dd></div><div><dt class="mono">Fit</dt><dd>${escapeHtml(item.fit)}</dd></div></dl>
    <h2 class="mono sub">Complete the look</h2>
    <ul class="look">${look.map((l) => `<li><i style="background:${l.color}"></i><span><b>${l.name}</b>${l.why}</span></li>`).join('')}</ul>
    <h2 class="mono sub">You might also like</h2>
    <div class="similar">${similar(item)
      .map((s) => `<button data-item="${s.id}"><img src="${thumb(s, s.variants[0], 120)}" alt="" width="60" height="60" /><span>${escapeHtml(s.name)}<em class="mono">${formatPrice(s.price)}</em></span></button>`)
      .join('')}</div>
    ${item.upload ? `<button class="btn ghost small danger" data-act="remove">Remove this garment</button>` : ''}
    <p class="fit-note">This preview is a 2D approximation for style and colour. Drape and exact fit depend on your measurements, so check the size guide before you buy.</p>`
  $$('#panel [data-v]').forEach((b) => b.addEventListener('click', () => select(state.item, Number(b.dataset.v))))
  $$('#panel [data-size]').forEach((b) =>
    b.addEventListener('click', () => {
      state.size[item.id] = b.dataset.size as Size
      renderPanel()
    }),
  )
  $('#panel [data-act="find-size"]').addEventListener('click', openSizeDialog)
  $('#panel [data-act="photos"]').addEventListener('click', () => openPhotos(item, variant))
  $('#panel [data-act="bag"]').addEventListener('click', addToBag)
  $('#panel [data-act="save"]').addEventListener('click', () => toggleSave())
  $('#panel [data-act="snap"]').addEventListener('click', snapshot)
  $('#panel [data-act="share"]').addEventListener('click', () => openShare(captureStage(900), [{ item, variant, inner: canLayer(item) ? (state.inner[item.id] ?? null) : null }]))
  $('#panel [data-act="inner"]')?.addEventListener('change', (e) => {
    state.inner[item.id] = (e.target as HTMLSelectElement).value || null
    applyGarment()
  })
  $('#panel [data-act="remove"]')?.addEventListener('click', async () => {
    await deleteGarment(item.id.slice(2))
    unregisterItem(item.id)
    state.saved = state.saved.filter((k) => !k.startsWith(item.id + ':'))
    state.bag = state.bag.filter((l) => l.item !== item.id)
    persist()
    renderRail()
    select(0)
    toast('Garment removed')
  })
  $$('#panel [data-item]').forEach((b) => b.addEventListener('click', () => select(catalog.findIndex((c) => c.id === b.dataset.item))))
}

function betweenText(size: Size, alt: Size) {
  const bigger = SIZES.indexOf(alt) > SIZES.indexOf(size)
  const [close, room] = bigger ? [size, alt] : [alt, size]
  return `Between sizes: <b>${close}</b> for a closer fit, <b>${room}</b> for more room. We'd pick <b>${size}</b>.`
}

function deliveryDate() {
  const d = new Date()
  let added = 0
  while (added < 4) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0) added++
  }
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

function careFor(item: Item) {
  if (item.upload) return 'See the label'
  if (item.pattern === 'denim') return 'Wash inside out, cold; line dry'
  if (item.front === 'zip' && item.category === 'Jackets') return 'Wipe clean; reproof yearly'
  if (item.pattern === 'rib' || item.category === 'Knitwear') return 'Gentle wash 30°C; dry flat'
  return 'Machine wash 30°C; line dry'
}

// Larger product views: the full flat-lay plus close-ups of the fabric and collar painted at higher scale.
function openPhotos(item: Item, variant: Variant) {
  const shots: { src: string; label: string }[] = [{ src: thumb(item, variant, 720), label: 'Front' }]
  const t = textures(item, variant)
  const crop = (x: number, y: number, w: number, h: number) => {
    const c = document.createElement('canvas')
    c.width = 480
    c.height = 480
    c.getContext('2d')!.drawImage(t.torso, x, y, w, h, 0, 0, 480, 480)
    return c.toDataURL()
  }
  if (!item.upload) {
    shots.push({ src: crop(176, 30, 160, 160), label: 'Collar' })
    shots.push({ src: crop(150, 300, 120, 120), label: 'Fabric' })
  }
  $('#photos-title').textContent = item.name
  $('#photos').innerHTML = shots.map((s, i) => `<figure class="${i === 0 ? 'main' : ''}"><img src="${s.src}" alt="${escapeHtml(item.name)}, ${s.label.toLowerCase()}" /><figcaption class="mono">${s.label}</figcaption></figure>`).join('')
  dialog('#photos-dialog').showModal()
}

// ---------- Size dialog ----------
function renderSizeResult() {
  const h = Number($<HTMLInputElement>('#p-height').value)
  const w = Number($<HTMLInputElement>('#p-weight').value)
  const fit = ($<HTMLInputElement>('input[name="p-fit"]:checked')?.value ?? 'regular') as Profile['fit']
  const valid = h >= 120 && h <= 220 && w >= 30 && w <= 200
  const { item } = current()
  const rec = valid ? recommendSize(item, { heightCm: h, weightKg: w, fit }, state.bodyRatio) : null
  $('#size-result').innerHTML = rec
    ? `<p class="size-big">${rec.size}${rec.alternative ? ` <span>or ${rec.alternative}</span>` : ''}</p><p class="mono">For ${escapeHtml(item.name)}</p><ul>${rec.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}</ul>`
    : '<p class="mono">Enter your height and weight to see your size.</p>'
  $('#size-chart').innerHTML =
    `<thead><tr><th>Size</th>${SIZES.map((s) => `<th class="${rec?.size === s ? 'on' : ''}">${s}</th>`).join('')}</tr></thead>` +
    `<tbody><tr><td>Chest (cm)</td>${SIZES.map((s) => `<td class="${rec?.size === s ? 'on' : ''}">${SIZE_CHART[s][0]}–${SIZE_CHART[s][1]}</td>`).join('')}</tr></tbody>`
}
function openSizeDialog() {
  const p = state.profile
  $<HTMLInputElement>('#p-height').value = String(p?.heightCm ?? '')
  $<HTMLInputElement>('#p-weight').value = String(p?.weightKg ?? '')
  $$<HTMLInputElement>('input[name="p-fit"]').forEach((r) => (r.checked = r.value === (p?.fit ?? 'regular')))
  renderSizeResult()
  dialog('#size-dialog').showModal()
}
$('#size-form').addEventListener('input', renderSizeResult)
$('#size-form').addEventListener('submit', (e) => {
  e.preventDefault()
  const h = Number($<HTMLInputElement>('#p-height').value)
  const w = Number($<HTMLInputElement>('#p-weight').value)
  if (!(h >= 120 && h <= 220 && w >= 30 && w <= 200)) {
    $('#size-result').innerHTML = '<p class="err">Height should be 120–220 cm and weight 30–200 kg.</p>'
    return
  }
  state.profile = { heightCm: h, weightKg: w, fit: ($<HTMLInputElement>('input[name="p-fit"]:checked')?.value ?? 'regular') as Profile['fit'] }
  state.size = {}
  store('motionfit.profile', state.profile)
  dialog('#size-dialog').close()
  renderPanel()
  toast('Sizes updated for you')
})

// ---------- Bag & checkout ----------
function priceOf(id: string) {
  return itemById.get(id)?.price ?? 0
}
function renderBag(view: 'bag' | 'checkout' | 'done' = 'bag', order?: string) {
  const root = $('#bag')
  const t = totals(state.bag, priceOf)
  if (view === 'done') {
    root.innerHTML = `<div class="done-state"><p class="size-big">Thank you</p><p>Order <b class="mono">${order}</b> is confirmed. This is a demo store, so no payment was taken and nothing will ship.</p><button class="btn" data-close-bag>Keep browsing</button></div>`
    root.querySelector('[data-close-bag]')!.addEventListener('click', () => dialog('#bag-dialog').close())
    return
  }
  if (!state.bag.length) {
    root.innerHTML = '<p class="tray-empty">Your bag is empty. Pick a size and use Add to bag.</p>'
    return
  }
  const lines = state.bag
    .map((l, i) => {
      const item = itemById.get(l.item)
      const variant = item?.variants.find((v) => v.id === l.variant)
      if (!item || !variant) return ''
      return `<li><img src="${thumb(item, variant, 120)}" alt="" width="64" height="64" />
        <span class="bag-info"><b>${escapeHtml(item.name)}</b><em class="mono">${escapeHtml(variant.name)} · ${l.size}</em><em class="mono">${formatPrice(item.price)}</em></span>
        ${view === 'bag' ? `<span class="qty"><button data-q="${i}" data-d="-1" aria-label="One fewer">−</button><span aria-live="polite">${l.qty}</span><button data-q="${i}" data-d="1" aria-label="One more">+</button></span>` : `<span class="mono">× ${l.qty}</span>`}</li>`
    })
    .join('')
  const summary = `<dl class="sum"><div><dt>Subtotal</dt><dd>${formatPrice(t.subtotal)}</dd></div><div><dt>Delivery</dt><dd>${t.delivery ? formatPrice(t.delivery) : 'Free'}</dd></div><div class="tot"><dt>Total</dt><dd>${formatPrice(t.total)}</dd></div></dl>
    ${t.delivery ? `<p class="mono hint">Add ${formatPrice(FREE_DELIVERY_FROM - t.subtotal)} more for free delivery</p>` : ''}`
  if (view === 'bag') {
    root.innerHTML = `<ul class="bag-lines">${lines}</ul>${summary}<button class="btn wide" data-checkout>Checkout</button>`
    root.querySelectorAll<HTMLButtonElement>('[data-q]').forEach((b) =>
      b.addEventListener('click', () => {
        const i = Number(b.dataset.q)
        state.bag = setQty(state.bag, i, state.bag[i].qty + Number(b.dataset.d))
        persist()
        renderBag()
      }),
    )
    root.querySelector('[data-checkout]')!.addEventListener('click', () => renderBag('checkout'))
    return
  }
  root.innerHTML = `<ul class="bag-lines">${lines}</ul>${summary}
    <form class="checkout" novalidate>
      <p class="fit-note">Demo checkout: nothing is charged or shipped.</p>
      <label class="up-field"><span>Full name</span><input name="name" autocomplete="name" required /></label>
      <label class="up-field"><span>Email</span><input name="email" type="email" autocomplete="email" required /></label>
      <label class="up-field"><span>Delivery address</span><textarea name="address" rows="2" autocomplete="street-address" required></textarea></label>
      <div class="up-row"><label class="up-field"><span>PIN code</span><input name="pin" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required /></label>
      <label class="up-field"><span>Phone</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" required /></label></div>
      <p class="err" data-err role="alert"></p>
      <div class="up-row"><button type="button" class="btn ghost" data-back>Back to bag</button><button class="btn" type="submit">Place order · ${formatPrice(t.total)}</button></div>
    </form>`
  root.querySelector('[data-back]')!.addEventListener('click', () => renderBag('bag'))
  root.querySelector('form')!.addEventListener('submit', (e) => {
    e.preventDefault()
    const f = e.target as HTMLFormElement
    const data = new FormData(f)
    const problems: string[] = []
    if (!String(data.get('name') ?? '').trim()) problems.push('your name')
    if (!/^\S+@\S+\.\S+$/.test(String(data.get('email') ?? ''))) problems.push('a valid email')
    if (String(data.get('address') ?? '').trim().length < 8) problems.push('a delivery address')
    if (!/^[1-9][0-9]{5}$/.test(String(data.get('pin') ?? ''))) problems.push('a 6-digit PIN code')
    if (String(data.get('phone') ?? '').replace(/\D/g, '').length < 10) problems.push('a 10-digit phone number')
    if (problems.length) {
      f.querySelector('[data-err]')!.textContent = `Please add ${problems.join(', ')}.`
      return
    }
    const order = `MF-${Date.now().toString(36).toUpperCase().slice(-6)}`
    state.bag = []
    persist()
    renderBag('done', order)
  })
}
$('#bag-btn').addEventListener('click', () => {
  renderBag()
  dialog('#bag-dialog').showModal()
})

// ---------- Share card ----------
function openShare(image: HTMLCanvasElement, looks: { item: Item; variant: Variant; inner: string | null }[]) {
  const card = document.createElement('canvas')
  card.width = 1080
  card.height = 1350
  const ctx = card.getContext('2d')!
  ctx.fillStyle = '#f4f2ec'
  ctx.fillRect(0, 0, 1080, 1350)
  const k = Math.min(1000 / image.width, 960 / image.height)
  const iw = image.width * k
  const ih = image.height * k
  ctx.save()
  ctx.beginPath()
  ctx.roundRect((1080 - iw) / 2, 40, iw, ih, 28)
  ctx.clip()
  ctx.drawImage(image, (1080 - iw) / 2, 40, iw, ih)
  ctx.restore()
  ctx.fillStyle = '#17161a'
  ctx.font = '800 54px Syne, "Avenir Next", sans-serif'
  let y = 40 + ih + 90
  for (const l of looks) {
    ctx.fillText(l.item.name, 60, y)
    ctx.font = '500 32px "DM Mono", monospace'
    ctx.fillStyle = '#57545c'
    const inner = l.inner ? itemById.get(l.inner)?.name : null
    ctx.fillText(`${l.variant.name} · ${formatPrice(l.item.price)}${inner ? ` · over ${inner}` : ''}`, 60, y + 48)
    y += 120
  }
  ctx.fillStyle = '#e39a12'
  ctx.fillRect(60, 1290, 70, 8)
  ctx.fillStyle = '#17161a'
  ctx.font = '800 36px Syne, sans-serif'
  ctx.fillText('MotionFit', 150, 1306)

  const url = card.toDataURL('image/png')
  $('#share').innerHTML = `<img src="${url}" alt="Look card for ${escapeHtml(looks[0].item.name)}" />
    <div class="share-actions"><a class="btn" download="motionfit-look.png" href="${url}">Download image</a><button class="btn ghost" data-native-share hidden>Share…</button></div>`
  const shareBtn = $('[data-native-share]')
  card.toBlob((blob) => {
    if (!blob) return
    const file = new File([blob], 'motionfit-look.png', { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      shareBtn.hidden = false
      shareBtn.addEventListener('click', () => navigator.share({ files: [file], title: 'My MotionFit look' }).catch(() => {}))
    }
  })
  dialog('#share-dialog').showModal()
}

// ---------- Snapshots & compare ----------
function snapLabel(s: Snap) {
  const item = itemById.get(s.item)
  const variant = item?.variants.find((v) => v.id === s.variant)
  return item && variant ? { item, variant } : null
}

function renderTray() {
  const tray = $('#tray')
  if (!state.snaps.length) return
  tray.innerHTML = state.snaps
    .map((s, i) => {
      const l = snapLabel(s)
      if (!l) return ''
      const picked = state.picked.includes(i)
      return `<button class="snap ${picked ? 'picked' : ''}" data-s="${i}" aria-pressed="${picked}" aria-label="${escapeHtml(l.item.name)}, ${escapeHtml(l.variant.name)}">
        <img src="${s.url}" alt="" /><span class="mono">${escapeHtml(l.item.name)}</span></button>`
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
      const l = snapLabel(s)
      if (!l) return ''
      const key = `${l.item.id}:${l.variant.id}`
      return `<figure><img src="${s.url}" alt="${escapeHtml(l.item.name)} in ${escapeHtml(l.variant.name)}" />
        <figcaption><b>${escapeHtml(l.item.name)}</b><span class="mono">${escapeHtml(l.variant.name)} · ${formatPrice(l.item.price)}</span>
        <button class="btn small" data-keep="${key}">${state.saved.includes(key) ? 'Saved ✓' : 'Save this one'}</button></figcaption></figure>`
    })
    .join('')
  $$('#compare [data-keep]').forEach((b) =>
    b.addEventListener('click', () => {
      if (!state.saved.includes(b.dataset.keep!)) toggleSave(b.dataset.keep!)
      b.textContent = 'Saved ✓'
    }),
  )
  dialog('#compare-dialog').showModal()
})

$('#saved-btn').addEventListener('click', () => {
  $('#saved').innerHTML = state.saved.length
    ? state.saved
        .map((key) => {
          const [id, vid] = key.split(':')
          const item = itemById.get(id)
          const variant = item?.variants.find((v) => v.id === vid)
          if (!item || !variant) return ''
          return `<button class="saved-item" data-open="${escapeHtml(key)}"><img src="${thumb(item, variant, 120)}" alt="" width="64" height="64" /><span><b>${escapeHtml(item.name)}</b><em class="mono">${escapeHtml(variant.name)} · ${formatPrice(item.price)}</em></span></button>`
        })
        .join('')
    : '<p class="tray-empty">Nothing saved yet. Hover a hand over <b>Save</b> or use the Save button.</p>'
  $$('#saved [data-open]').forEach((b) =>
    b.addEventListener('click', () => {
      const [id, vid] = b.dataset.open!.split(':')
      const i = catalog.findIndex((c) => c.id === id)
      select(i, Math.max(0, catalog[i].variants.findIndex((v) => v.id === vid)))
      dialog('#saved-dialog').close()
    }),
  )
  dialog('#saved-dialog').showModal()
})
$$('[data-close]').forEach((b) => b.addEventListener('click', () => (b.closest('dialog') as HTMLDialogElement).close()))

// ---------- Retailer uploads ----------
function averageColor(c: HTMLCanvasElement) {
  const s = document.createElement('canvas')
  s.width = s.height = 16
  const x = s.getContext('2d', { willReadFrequently: true })!
  x.drawImage(c, 0, 0, 16, 16)
  const d = x.getImageData(0, 0, 16, 16).data
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (let i = 0; i < d.length; i += 4)
    if (d[i + 3] > 128) {
      r += d[i]
      g += d[i + 1]
      b += d[i + 2]
      n++
    }
  const hex = (v: number) => Math.round(v / Math.max(1, n)).toString(16).padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}`
}

function itemFromUpload(g: Omit<StoredGarment, 'image'>, spec: UploadSpec): Item {
  const base = averageColor(spec.image)
  return {
    id: `u-${g.id}`,
    name: g.name,
    category: g.category,
    price: g.price,
    blurb: 'Added from your own product photo.',
    fabric: 'As listed by the retailer',
    fit: 'Regular fit',
    neck: 'crew',
    sleeves: g.sleeves,
    hem: 0.6,
    pattern: 'solid',
    front: 'plain',
    pockets: 'none',
    variants: [{ id: 'photo', name: 'As photographed', base, accent: base }],
    upload: spec,
  }
}

async function createFromUpload(g: NewGarment) {
  const id = Math.random().toString(36).slice(2, 10)
  const meta = { id, name: g.name, price: g.price, category: g.category, sleeves: g.sleeves, markers: g.markers, createdAt: Date.now() }
  // Show it on the shopper straight away; keeping a copy for next time happens after.
  const item = itemFromUpload(meta, { image: g.image, markers: g.markers, sleeves: g.sleeves })
  registerItem(item)
  renderRail()
  select(catalog.indexOf(item))
  dialog('#upload-dialog').close()
  toast(`Trying on ${g.name}`)
  const blob = await new Promise<Blob | null>((r) => g.image.toBlob(r, 'image/png'))
  const stored = !!blob && (await saveGarment({ ...meta, image: blob }).then(() => true, () => false))
  if (!stored) toast('Added for this visit only (storage unavailable)')
}
// Opens the import dialog. A fresh editor each time, so a new photo never inherits old markers.
let editor: UploadEditor | null = null
function openImport(): UploadEditor {
  const d = dialog('#upload-dialog')
  if (!d.open || !editor) {
    editor = mountUploadEditor($('#upload'), createFromUpload)
    d.showModal()
  }
  return editor
}
$('#upload-btn').addEventListener('click', () => openImport())
$('#link-btn').addEventListener('click', () => {
  openImport()
  $<HTMLInputElement>('#up-link').focus()
})

// Paste or drop anywhere: a copied product photo, a screenshot, or a shared store link.
function importFrom(data: DataTransfer | null) {
  if (!data) return false
  const file = [...data.files].find((f) => f.type.startsWith('image/')) ?? [...data.items].find((i) => i.kind === 'file' && i.type.startsWith('image/'))?.getAsFile()
  if (file) {
    void openImport().loadBlob(file, file.name === 'image.png' ? undefined : file.name)
    return true
  }
  const text = data.getData('text/uri-list') || data.getData('text/plain')
  if (text && parseProductLink(text)) {
    void openImport().loadLink(text)
    return true
  }
  return false
}
document.addEventListener('paste', (e) => {
  const t = e.target as HTMLElement
  // Typing into a field keeps its normal paste, unless it's a picture (fields can't hold those).
  const inField = !!t.closest?.('input, textarea, [contenteditable]')
  const hasImage = [...(e.clipboardData?.items ?? [])].some((i) => i.kind === 'file' && i.type.startsWith('image/'))
  if (inField && !hasImage) return
  if (importFrom(e.clipboardData)) e.preventDefault()
})
const veil = $('#drop-veil')
let dragDepth = 0
document.addEventListener('dragenter', (e) => {
  if (!e.dataTransfer?.types.some((t) => t === 'Files' || t === 'text/uri-list')) return
  dragDepth++
  veil.classList.add('on')
})
document.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1)
  if (!dragDepth) veil.classList.remove('on')
})
document.addEventListener('dragover', (e) => e.preventDefault())
document.addEventListener('drop', (e) => {
  e.preventDefault()
  dragDepth = 0
  veil.classList.remove('on')
  importFrom(e.dataTransfer)
})

async function restoreUploads() {
  for (const g of await listGarments()) {
    try {
      const bmp = await createImageBitmap(g.image)
      const c = document.createElement('canvas')
      c.width = bmp.width
      c.height = bmp.height
      c.getContext('2d')!.drawImage(bmp, 0, 0)
      bmp.close()
      registerItem(itemFromUpload(g, { image: c, markers: g.markers, sleeves: g.sleeves }))
    } catch {
      // A damaged entry shouldn't block the rest of the catalog.
    }
  }
  renderRail()
  select(state.item)
}

window.addEventListener('keydown', (e) => {
  if ((e.target as HTMLElement).closest('input, select, textarea, dialog')) return
  if (e.key === 'ArrowRight') step(1)
  if (e.key === 'ArrowLeft') step(-1)
})

renderRail()
select(0)
persist()
void restoreUploads()
