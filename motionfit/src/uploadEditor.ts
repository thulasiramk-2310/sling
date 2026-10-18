import { guessMarkers, removePlainBackground, type Markers, type Pt2 } from './upload'

export interface NewGarment {
  name: string
  price: number
  category: 'Tees' | 'Shirts' | 'Jackets' | 'Knitwear'
  sleeves: 'short' | 'long'
  image: HTMLCanvasElement
  markers: Markers
}

const HANDLES: { key: keyof Markers; label: string; color: string }[] = [
  { key: 'shoulderL', label: 'Shoulder', color: '#e39a12' },
  { key: 'shoulderR', label: 'Shoulder', color: '#e39a12' },
  { key: 'hemL', label: 'Hem', color: '#2f9e6a' },
  { key: 'hemR', label: 'Hem', color: '#2f9e6a' },
  { key: 'cuffL', label: 'Cuff', color: '#3b6fe0' },
  { key: 'cuffR', label: 'Cuff', color: '#3b6fe0' },
]
const MAX_SIDE = 1200

async function loadFile(file: File) {
  const bitmap = await createImageBitmap(file)
  const k = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bitmap.width * k)
  c.height = Math.round(bitmap.height * k)
  c.getContext('2d')!.drawImage(bitmap, 0, 0, c.width, c.height)
  bitmap.close()
  return c
}

// Lets a retailer turn any front-facing product photo into a try-on garment by marking six points.
export function mountUploadEditor(root: HTMLElement, onCreate: (g: NewGarment) => void) {
  root.innerHTML = `
    <div class="up">
      <div class="up-canvas-wrap">
        <label class="up-drop" id="up-drop">
          <input type="file" id="up-file" accept="image/png,image/jpeg,image/webp" />
          <b>Choose a product photo</b>
          <span>Front view, garment laid flat or on a form. A PNG with a transparent or plain background works best.</span>
        </label>
        <canvas id="up-canvas" hidden aria-label="Product photo with markers"></canvas>
      </div>
      <form class="up-form" id="up-form" novalidate>
        <ol class="up-steps">
          <li>Drag the <i style="--c:#e39a12"></i> shoulder points to where the sleeves join.</li>
          <li>Drag the <i style="--c:#2f9e6a"></i> hem points to the bottom corners.</li>
          <li>Drag the <i style="--c:#3b6fe0"></i> cuff points to the sleeve ends.</li>
        </ol>
        <label class="up-field"><span>Name</span><input id="up-name" maxlength="40" required placeholder="Graphic tee" /></label>
        <div class="up-row">
          <label class="up-field"><span>Price (₹)</span><input id="up-price" type="number" min="0" max="999999" step="1" value="1499" /></label>
          <label class="up-field"><span>Category</span><select id="up-cat"><option>Tees</option><option>Shirts</option><option>Jackets</option><option>Knitwear</option></select></label>
        </div>
        <div class="up-row">
          <label class="up-check"><input type="radio" name="up-sleeves" value="short" checked /> Short sleeves</label>
          <label class="up-check"><input type="radio" name="up-sleeves" value="long" /> Long sleeves</label>
        </div>
        <label class="up-check"><input type="checkbox" id="up-bg" checked /> Remove plain background</label>
        <p class="up-msg" id="up-msg" role="status" aria-live="polite"></p>
        <button class="btn" id="up-create" type="submit" disabled>Add to the edit</button>
      </form>
    </div>`
  const $ = <T extends HTMLElement>(id: string) => root.querySelector('#' + id) as T
  const cv = $<HTMLCanvasElement>('up-canvas')
  const ctx = cv.getContext('2d')!
  let original: HTMLCanvasElement | null = null
  let image: HTMLCanvasElement | null = null
  let markers: Markers | null = null
  let scale = 1
  let drag: keyof Markers | null = null

  const sleeves = () => (root.querySelector<HTMLInputElement>('input[name="up-sleeves"]:checked')?.value ?? 'short') as 'short' | 'long'

  const process = () => {
    if (!original) return
    image = $<HTMLInputElement>('up-bg').checked ? removePlainBackground(original) : original
    markers = guessMarkers(image, sleeves())
    const maxW = Math.min(560, root.clientWidth || 560)
    scale = Math.min(maxW / image.width, 520 / image.height)
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

  $<HTMLInputElement>('up-file').addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    try {
      original = await loadFile(file)
    } catch {
      $('up-msg').textContent = 'That file couldn’t be read as an image. Try a PNG or JPEG.'
      return
    }
    $('up-drop').hidden = true
    cv.hidden = false
    $<HTMLButtonElement>('up-create').disabled = false
    if (!$<HTMLInputElement>('up-name').value) $<HTMLInputElement>('up-name').value = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 40)
    process()
    $('up-msg').textContent = 'Check the markers, then add it.'
  })
  $<HTMLInputElement>('up-bg').addEventListener('change', process)
  root.querySelectorAll('input[name="up-sleeves"]').forEach((r) => r.addEventListener('change', process))

  $<HTMLFormElement>('up-form').addEventListener('submit', (e) => {
    e.preventDefault()
    const name = $<HTMLInputElement>('up-name').value.trim()
    const price = Math.max(0, Math.round(Number($<HTMLInputElement>('up-price').value) || 0))
    if (!image || !markers) return void ($('up-msg').textContent = 'Choose a photo first.')
    if (!name) return void ($('up-msg').textContent = 'Give the garment a name.')
    onCreate({ name, price, category: $<HTMLSelectElement>('up-cat').value as NewGarment['category'], sleeves: sleeves(), image, markers: { ...markers } })
  })
}
