import { detectPhoto, type PersonMask } from './pose'
import { guessGarment, parseProductLink, type Category, type ProductInfo } from './productLink'
import { applyMask, guessMarkers, keepCollarOnly, markersFromPose, removePlainBackground, type Markers, type Pt2 } from './upload'
import type { Landmark } from './body'

export interface NewGarment {
  name: string
  price: number
  category: Category
  sleeves: 'short' | 'long'
  image: HTMLCanvasElement
  markers: Markers
}

export interface UploadEditor {
  loadBlob: (blob: Blob, name?: string) => Promise<void>
  loadLink: (text: string) => Promise<void>
}

const HANDLES: { key: keyof Markers; label: string; color: string }[] = [
  { key: 'shoulderL', label: 'Shoulder', color: '#e39a12' },
  { key: 'shoulderR', label: 'Shoulder', color: '#e39a12' },
  { key: 'hemL', label: 'Hem', color: '#2f9e6a' },
  { key: 'hemR', label: 'Hem', color: '#2f9e6a' },
  { key: 'cuffL', label: 'Cuff', color: '#3b6fe0' },
  { key: 'cuffR', label: 'Cuff', color: '#3b6fe0' },
]
const MAX_SIDE = 1400
const COPY_TIP = 'On the product page, right-click the main photo → Copy image, then press Ctrl+V here (on a phone: save the photo and choose it below).'
const LINK_ERRORS: Record<string, string> = {
  blocked: 'The store showed a robot check instead of the product.',
  unreachable: 'That page couldn’t be reached.',
  'no-images': 'No product photos were found on that page.',
  'bad-link': 'That doesn’t look like a product link.',
  unsupported: 'That link can’t be opened from here.',
  'too-large': 'That page is too large to read.',
  'not-image': 'That link isn’t a photo.',
}

async function toCanvas(blob: Blob) {
  const bitmap = await createImageBitmap(blob)
  const k = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bitmap.width * k)
  c.height = Math.round(bitmap.height * k)
  c.getContext('2d')!.drawImage(bitmap, 0, 0, c.width, c.height)
  bitmap.close()
  return c
}

// Product pages and their images live on other sites, so they go through the fitting room's own server.
const api = (path: string, url: string) => `${import.meta.env.BASE_URL}api/${path}?url=${encodeURIComponent(url)}`

async function fetchImage(url: string) {
  let res = await fetch(api('image', url)).catch(() => null)
  // Without the server (static hosting), try the image directly; some stores allow it.
  if (!res || res.status === 404) res = await fetch(url, { mode: 'cors' }).catch(() => null)
  if (!res?.ok) throw new Error((await res?.json().catch(() => null))?.error ?? 'unreachable')
  return res.blob()
}

// Turns any front-facing product photo, or a store link, into a try-on garment. Points are placed
// automatically (from the model's pose when someone is wearing it) and can be nudged by hand.
export function mountUploadEditor(root: HTMLElement, onCreate: (g: NewGarment) => void): UploadEditor {
  root.innerHTML = `
    <div class="up">
      <div class="up-canvas-wrap">
        <div class="up-start" id="up-start">
          <form class="up-link" id="up-link-form" novalidate>
            <label for="up-link"><b>Paste a product link</b></label>
            <div class="up-link-row">
              <input id="up-link" type="url" inputmode="url" autocomplete="off" placeholder="amazon.in/… · flipkart.com/… · any store" />
              <button class="btn small" id="up-link-go" type="submit">Get photos</button>
            </div>
            <span class="up-hint">Amazon, Flipkart, Myntra, AJIO and most stores. App share links (amzn.in, fkrt.it) work too.</span>
          </form>
          <div class="up-or"><span>or</span></div>
          <label class="up-drop" id="up-drop">
            <input type="file" id="up-file" accept="image/png,image/jpeg,image/webp,image/avif" />
            <b>Choose, drop or paste a photo</b>
            <span>A product photo, a screenshot, or a picture of someone wearing it. Front view works best.</span>
          </label>
        </div>
        <div class="up-busy" id="up-busy" hidden><i></i><span id="up-busy-text">Reading the page…</span></div>
        <canvas id="up-canvas" hidden aria-label="Product photo with fit points"></canvas>
        <div class="up-gallery" id="up-gallery" hidden aria-label="Photos from the product page"></div>
      </div>
      <form class="up-form" id="up-form" novalidate>
        <p class="up-auto" id="up-auto" hidden></p>
        <ol class="up-steps">
          <li>Drag the <i style="--c:#e39a12"></i> shoulder points to where the sleeves join.</li>
          <li>Drag the <i style="--c:#2f9e6a"></i> hem points to the bottom corners.</li>
          <li>Drag the <i style="--c:#3b6fe0"></i> cuff points to the sleeve ends.</li>
        </ol>
        <label class="up-field"><span>Name</span><input id="up-name" maxlength="60" required placeholder="Graphic tee" /></label>
        <div class="up-row">
          <label class="up-field"><span>Price (₹)</span><input id="up-price" type="number" min="0" max="999999" step="1" value="1499" /></label>
          <label class="up-field"><span>Category</span><select id="up-cat"><option>Tees</option><option>Shirts</option><option>Jackets</option><option>Knitwear</option></select></label>
        </div>
        <div class="up-row">
          <label class="up-check"><input type="radio" name="up-sleeves" value="short" checked /> Short sleeves</label>
          <label class="up-check"><input type="radio" name="up-sleeves" value="long" /> Long sleeves</label>
        </div>
        <label class="up-check"><input type="checkbox" id="up-bg" checked /> <span id="up-bg-label">Remove plain background</span></label>
        <p class="up-msg" id="up-msg" role="status" aria-live="polite"></p>
        <div class="up-actions">
          <button class="btn ghost small" id="up-restart" type="button" hidden>Start over</button>
          <button class="btn" id="up-create" type="submit" disabled>Try it on</button>
        </div>
      </form>
    </div>`
  const $ = <T extends HTMLElement>(id: string) => root.querySelector('#' + id) as T
  const cv = $<HTMLCanvasElement>('up-canvas')
  const ctx = cv.getContext('2d')!
  const msg = (text: string) => ($('up-msg').textContent = text)
  let original: HTMLCanvasElement | null = null
  let image: HTMLCanvasElement | null = null
  let markers: Markers | null = null
  // Set when a person is wearing the garment in the photo.
  let model: { landmarks: Landmark[]; mask: PersonMask | null } | null = null
  let scale = 1
  let drag: keyof Markers | null = null
  let token = 0

  const sleeves = () => (root.querySelector<HTMLInputElement>('input[name="up-sleeves"]:checked')?.value ?? 'short') as 'short' | 'long'
  const setSleeves = (v: 'short' | 'long') => root.querySelectorAll<HTMLInputElement>('input[name="up-sleeves"]').forEach((r) => (r.checked = r.value === v))
  const busy = (text: string | null) => {
    $('up-busy').hidden = text === null
    if (text) $('up-busy-text').textContent = text
  }

  const process = () => {
    if (!original) return
    const cut = $<HTMLInputElement>('up-bg').checked
    const pose = model && markersFromPose(model.landmarks, original.width, original.height, sleeves())
    if (model && pose) {
      markers = pose
      const isolated = cut && model.mask ? applyMask(original, model.mask) : original
      image = keepCollarOnly(isolated, pose)
    } else {
      image = cut ? removePlainBackground(original) : original
      markers = guessMarkers(image, sleeves())
    }
    const maxW = Math.min(560, root.clientWidth || 560)
    scale = Math.min(maxW / image.width, 430 / image.height)
    cv.width = Math.round(image.width * scale)
    cv.height = Math.round(image.height * scale)
    draw()
  }

  const draw = () => {
    if (!image || !markers) return
    const s = 12
    for (let y = 0; y < cv.height; y += s)
      for (let x = 0; x < cv.width; x += s) {
        ctx.fillStyle = (x / s + y / s) % 2 ? '#e7e5e0' : '#f7f6f3'
        ctx.fillRect(x, y, s, s)
      }
    ctx.drawImage(image, 0, 0, cv.width, cv.height)
    const P = (p: Pt2) => [p.x * scale, p.y * scale] as const
    const m = markers
    ctx.strokeStyle = 'rgba(23,22,26,.7)'
    ctx.setLineDash([5, 5])
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(...P(m.shoulderL))
    ctx.lineTo(...P(m.shoulderR))
    ctx.lineTo(...P(m.hemR))
    ctx.lineTo(...P(m.hemL))
    ctx.closePath()
    ctx.moveTo(...P(m.shoulderL))
    ctx.lineTo(...P(m.cuffL))
    ctx.moveTo(...P(m.shoulderR))
    ctx.lineTo(...P(m.cuffR))
    ctx.stroke()
    ctx.setLineDash([])
    for (const h of HANDLES) {
      const [x, y] = P(m[h.key])
      ctx.fillStyle = h.color
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(x, y, drag === h.key ? 11 : 9, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  }

  const toImage = (e: PointerEvent): Pt2 => {
    const r = cv.getBoundingClientRect()
    return { x: ((e.clientX - r.left) * (cv.width / r.width)) / scale, y: ((e.clientY - r.top) * (cv.height / r.height)) / scale }
  }
  cv.addEventListener('pointerdown', (e) => {
    if (!markers) return
    const p = toImage(e)
    let best: keyof Markers | null = null
    let bd = 24 / scale
    for (const h of HANDLES) {
      const d = Math.hypot(markers[h.key].x - p.x, markers[h.key].y - p.y)
      if (d < bd) {
        bd = d
        best = h.key
      }
    }
    drag = best
    if (drag) cv.setPointerCapture(e.pointerId)
    draw()
  })
  cv.addEventListener('pointermove', (e) => {
    if (!drag || !markers || !image) return
    const p = toImage(e)
    markers[drag] = { x: Math.max(0, Math.min(image.width, p.x)), y: Math.max(0, Math.min(image.height, p.y)) }
    draw()
  })
  const end = () => {
    drag = null
    draw()
  }
  cv.addEventListener('pointerup', end)
  cv.addEventListener('pointercancel', end)

  const showStart = (show: boolean) => {
    $('up-start').hidden = !show
    cv.hidden = show
    $('up-restart').hidden = show
    $<HTMLButtonElement>('up-create').disabled = show
    if (show) {
      $('up-gallery').hidden = true
      $('up-auto').hidden = true
    }
  }

  // Shows a photo in the editor and places the fit points.
  const showPhoto = async (c: HTMLCanvasElement, my: number) => {
    original = c
    model = null
    showStart(false)
    busy('Finding the fit…')
    try {
      const found = await detectPhoto(import.meta.env.BASE_URL, c)
      if (my !== token) return
      if (found.landmarks && markersFromPose(found.landmarks, c.width, c.height, sleeves())) model = { landmarks: found.landmarks, mask: found.mask }
    } catch {
      // Offline or no WebGL: fall back to the garment's outline.
    }
    if (my !== token) return
    busy(null)
    $('up-bg-label').textContent = model ? 'Cut out from the model photo' : 'Remove plain background'
    const auto = $('up-auto')
    auto.hidden = false
    auto.textContent = model
      ? 'Fitted from the model’s pose. Check the points, then try it on.'
      : 'Fitted from the garment’s outline. Nudge the points if a sleeve or hem is off.'
    process()
    msg('')
  }

  const loadBlob = async (blob: Blob, name?: string) => {
    const my = ++token
    let c: HTMLCanvasElement
    try {
      c = await toCanvas(blob)
    } catch {
      msg('That file couldn’t be read as an image. Try a PNG, JPEG or WebP.')
      return
    }
    if (name && !$<HTMLInputElement>('up-name').value) $<HTMLInputElement>('up-name').value = name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 60)
    await showPhoto(c, my)
  }

  const loadUrl = async (url: string, my: number) => {
    busy('Loading the photo…')
    try {
      const c = await toCanvas(await fetchImage(url))
      if (my === token) await showPhoto(c, my)
    } catch (err) {
      if (my !== token) return
      busy(null)
      msg(`${LINK_ERRORS[(err as Error).message] ?? 'That photo couldn’t be loaded.'} ${COPY_TIP}`)
    }
  }

  const showGallery = (urls: string[]) => {
    const g = $('up-gallery')
    g.hidden = urls.length < 2
    g.innerHTML = urls
      .map((u, i) => `<button type="button" class="up-thumb${i === 0 ? ' on' : ''}" data-i="${i}" aria-label="Use photo ${i + 1}"><img alt="" loading="lazy" src="${api('image', u).replace(/"/g, '&quot;')}" /></button>`)
      .join('')
    g.querySelectorAll<HTMLButtonElement>('.up-thumb').forEach((b) =>
      b.addEventListener('click', () => {
        g.querySelectorAll('.up-thumb').forEach((x) => x.classList.toggle('on', x === b))
        const next = ++token
        void loadUrl(urls[Number(b.dataset.i)], next)
      }),
    )
  }

  const loadLink = async (text: string) => {
    const link = parseProductLink(text)
    $<HTMLInputElement>('up-link').value = link?.url ?? text
    if (!link) return void msg('Paste a link that starts with https://, from Amazon, Flipkart or another store.')
    const my = ++token
    msg('')
    if (link.image) return loadUrl(link.url, my)
    busy(`Reading the ${link.store === 'other' ? 'product' : link.store[0].toUpperCase() + link.store.slice(1)} page…`)
    $('up-start').hidden = true
    let info: ProductInfo
    try {
      const res = await fetch(api('product', link.url))
      if (res.status === 404) throw new Error('no-server')
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error ?? 'unreachable')
      info = body as ProductInfo
    } catch (err) {
      if (my !== token) return
      busy(null)
      $('up-start').hidden = false
      const code = (err as Error).message
      msg(code === 'no-server' || code === 'Failed to fetch' ? `Links need the MotionFit server (npm run dev). For now: ${COPY_TIP}` : `${LINK_ERRORS[code] ?? 'That page couldn’t be read.'} ${COPY_TIP}`)
      return
    }
    if (my !== token) return
    const guess = guessGarment(info.title)
    if (info.title) $<HTMLInputElement>('up-name').value = info.title.slice(0, 60)
    if (info.price) $<HTMLInputElement>('up-price').value = String(info.price)
    $<HTMLSelectElement>('up-cat').value = guess.category
    setSleeves(guess.sleeves)
    showGallery(info.images)
    await loadUrl(info.images[0], my)
    if (my === token && !guess.wearable) msg('This doesn’t look like a top. MotionFit fits tees, shirts, jackets and knitwear, so the result may be off.')
  }

  $<HTMLFormElement>('up-link-form').addEventListener('submit', (e) => {
    e.preventDefault()
    void loadLink($<HTMLInputElement>('up-link').value)
  })
  // Pasting a link is the whole job; don't make people press the button too.
  $<HTMLInputElement>('up-link').addEventListener('paste', () => setTimeout(() => void loadLink($<HTMLInputElement>('up-link').value), 0))
  $<HTMLInputElement>('up-file').addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) void loadBlob(file, file.name)
  })
  const drop = $('up-drop')
  drop.addEventListener('dragover', (e) => {
    e.preventDefault()
    drop.classList.add('over')
  })
  drop.addEventListener('dragleave', () => drop.classList.remove('over'))
  drop.addEventListener('drop', (e) => {
    e.preventDefault()
    e.stopPropagation()
    drop.classList.remove('over')
    const file = [...(e.dataTransfer?.files ?? [])].find((f) => f.type.startsWith('image/'))
    const text = e.dataTransfer?.getData('text/uri-list') || e.dataTransfer?.getData('text/plain') || ''
    if (file) void loadBlob(file, file.name)
    else if (text) void loadLink(text)
  })
  $('up-restart').addEventListener('click', () => {
    token++
    original = image = markers = null
    model = null
    busy(null)
    msg('')
    showStart(true)
  })
  $<HTMLInputElement>('up-bg').addEventListener('change', process)
  root.querySelectorAll('input[name="up-sleeves"]').forEach((r) => r.addEventListener('change', process))

  $<HTMLFormElement>('up-form').addEventListener('submit', (e) => {
    e.preventDefault()
    const name = $<HTMLInputElement>('up-name').value.trim()
    const price = Math.max(0, Math.round(Number($<HTMLInputElement>('up-price').value) || 0))
    if (!image || !markers) return void msg('Choose a photo first.')
    if (!name) return void msg('Give the garment a name.')
    onCreate({ name, price, category: $<HTMLSelectElement>('up-cat').value as Category, sleeves: sleeves(), image, markers: { ...markers } })
  })

  return { loadBlob, loadLink }
}
