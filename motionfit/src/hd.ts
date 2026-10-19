// "See it on me in HD": a generative try-on render of the shopper's own photo, shown next to the photo
// with a before/after slider. The live mirror is the quick preview; this is the picture that looks real.

export interface HdJob {
  person: HTMLCanvasElement
  garment: HTMLCanvasElement
  description: string
  title: string
  price: string
  onBag: () => void
}

const STEPS = ['Reading your pose and build', 'Fitting the garment to your shape', 'Rendering fabric, folds and light', 'Finishing details']
const ERRORS: Record<string, string> = {
  'no-provider': 'HD try-on needs an AI key on the server. Set HF_TOKEN (free) or FASHN_API_KEY, then restart npm run dev.',
  'no-server': 'HD try-on runs on the MotionFit server, so it isn’t available in this preview. Run the full app (npm run dev).',
  busy: 'The try-on service is busy right now. Give it a minute and try again.',
  'no-person': 'No full body was found. Use a front-facing photo with your shoulders, arms and hips in view.',
  'bad-key': 'The server’s try-on key was refused. Check FASHN_API_KEY or HF_TOKEN.',
  timeout: 'That took too long. Try again; the first render after a pause is slower.',
  unreachable: 'The try-on service couldn’t be reached.',
  'too-large': 'Those photos are too large to send.',
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
const api = () => `${import.meta.env.BASE_URL}api/tryon`

// Flattens onto white and caps the size: the models expect an opaque photo, and smaller uploads are faster.
export function toJpeg(src: HTMLCanvasElement, maxSide: number) {
  const k = Math.min(1, maxSide / Math.max(src.width, src.height))
  const c = document.createElement('canvas')
  c.width = Math.round(src.width * k)
  c.height = Math.round(src.height * k)
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.drawImage(src, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.9)
}

const cache = new Map<string, string>()
let personKey = 0
const keys = new WeakMap<HTMLCanvasElement, number>()
const keyOf = (c: HTMLCanvasElement) => {
  if (!keys.has(c)) keys.set(c, ++personKey)
  return keys.get(c)!
}

export function openHd(dialog: HTMLDialogElement, job: HdJob) {
  const root = dialog.querySelector<HTMLElement>('#hd')!
  const before = toJpeg(job.person, 1024)
  root.innerHTML = `
    <div class="hd-stage">
      <div class="hd-compare" id="hd-compare" style="--cut: 50%">
        <img class="hd-before" src="${before}" alt="Your photo" />
        <img class="hd-after" id="hd-after" alt="" hidden />
        <div class="hd-shimmer" id="hd-shimmer"></div>
        <input class="hd-range" id="hd-range" type="range" min="0" max="100" value="50" aria-label="Compare your photo with the try-on" hidden />
        <span class="hd-tag mono hd-tag-l" hidden>You</span><span class="hd-tag mono hd-tag-r" hidden>Wearing it</span>
      </div>
    </div>
    <div class="hd-side">
      <p class="mono hd-kicker">HD try-on</p>
      <h3 class="hd-title">${escapeHtml(job.title)}</h3>
      <p class="hd-price">${escapeHtml(job.price)}</p>
      <ol class="hd-steps" id="hd-steps">${STEPS.map((s) => `<li>${s}</li>`).join('')}</ol>
      <p class="hd-time mono" id="hd-time" aria-live="polite"></p>
      <p class="hd-msg" id="hd-msg" role="status"></p>
      <div class="hd-actions" id="hd-actions" hidden>
        <button class="btn" id="hd-bag">Add to bag</button>
        <a class="btn ghost" id="hd-save" download="motionfit-tryon.jpg">Save image</a>
      </div>
      <p class="hd-note">An AI-generated picture of you in this garment. Fit and colour are close, but it isn’t a photo of the real item on you.</p>
    </div>`
  const $ = <T extends HTMLElement>(id: string) => root.querySelector('#' + id) as T
  dialog.showModal()

  const steps = [...root.querySelectorAll<HTMLLIElement>('#hd-steps li')]
  const started = performance.now()
  let open = true
  dialog.addEventListener('close', () => (open = false), { once: true })
  // The model gives no progress, so the steps advance on the typical timeline and hold on the last one.
  const tick = () => {
    if (!open || !$('hd-shimmer') || $('hd-shimmer').hidden) return
    const s = (performance.now() - started) / 1000
    const at = Math.min(STEPS.length - 1, Math.floor(s / 4))
    steps.forEach((li, i) => {
      li.classList.toggle('done', i < at)
      li.classList.toggle('now', i === at)
    })
    $('hd-time').textContent = `${s.toFixed(0)} s · usually 10–30 s`
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)

  const fail = (code: string) => {
    $('hd-shimmer').hidden = true
    $('hd-steps').hidden = true
    $('hd-time').textContent = ''
    $('hd-msg').textContent = ERRORS[code] ?? 'The try-on didn’t work this time. Try another photo or garment.'
    $('hd-msg').classList.add('err')
  }

  const show = (src: string, ms: number) => {
    const after = $<HTMLImageElement>('hd-after')
    after.onload = () => {
      if (!open) return
      $('hd-shimmer').hidden = true
      $('hd-steps').hidden = true
      after.hidden = false
      after.alt = `You wearing ${job.title}`
      $('hd-range').hidden = false
      root.querySelectorAll<HTMLElement>('.hd-tag').forEach((t) => (t.hidden = false))
      $('hd-actions').hidden = false
      $('hd-time').textContent = ms ? `Rendered in ${(ms / 1000).toFixed(1)} s` : 'Saved from earlier'
      // A short sweep shows the comparison is interactive.
      const cmp = $('hd-compare')
      cmp.classList.add('reveal')
      setTimeout(() => cmp.classList.remove('reveal'), 1400)
    }
    after.src = src
    $<HTMLAnchorElement>('hd-save').href = src
  }
  $('hd-range').addEventListener('input', (e) => $('hd-compare').style.setProperty('--cut', `${(e.target as HTMLInputElement).value}%`))
  $('hd-bag').addEventListener('click', () => {
    job.onBag()
    dialog.close()
  })

  const key = `${keyOf(job.person)}:${job.title}:${job.garment.width}x${job.garment.height}`
  const hit = cache.get(key)
  if (hit) return show(hit, 0)

  void (async () => {
    let res: Response
    try {
      res = await fetch(api(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ person: before, garment: toJpeg(job.garment, 1024), description: job.description, category: 'tops' }),
      })
    } catch {
      return fail('no-server')
    }
    if (res.status === 404) return fail('no-server')
    const body = (await res.json().catch(() => ({}))) as { image?: string; ms?: number; error?: string }
    if (!open) return
    if (!res.ok || !body.image) return fail(body.error ?? 'failed')
    cache.set(key, body.image)
    show(body.image, body.ms ?? 0)
  })()
}
