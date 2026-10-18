import { analyzeHand } from '../engine/hand'
import { DEFAULT_SETTINGS, type Calibration } from '../engine/settings'
import type { Point } from '../engine/types'

export type HandFeed = (cb: (hands: Point[][]) => void) => () => void

const percentile = (values: number[], p: number) => {
  const s = [...values].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.max(0, Math.round((s.length - 1) * p)))]
}
const median = (v: number[]) => percentile(v, 0.5)

// Turns a reach sample and open/pinched samples into a personal calibration.
export function computeCalibration(anchors: Point[], openRatios: number[], pinchRatios: number[]): Calibration | { error: string } {
  if (anchors.length < 30) return { error: 'Not enough hand movement was seen. Keep your hand in view and move it around the edges.' }
  const xs = anchors.map((a) => a.x)
  const ys = anchors.map((a) => a.y)
  let x0 = percentile(xs, 0.05)
  let x1 = percentile(xs, 0.95)
  let y0 = percentile(ys, 0.05)
  let y1 = percentile(ys, 0.95)
  const w = x1 - x0
  const h = y1 - y0
  if (w < 0.12 || h < 0.1) return { error: 'The area was too small. Move your hand a little wider so small movements aren’t too twitchy.' }
  // Pull the edges in slightly so the screen corners are reachable without full stretch.
  x0 += w * 0.07
  x1 -= w * 0.07
  y0 += h * 0.07
  y1 -= h * 0.07
  const open = median(openRatios)
  const closed = median(pinchRatios)
  if (!(open - closed > 0.15)) return { error: 'Couldn’t tell your open hand from your pinch. Try touching thumb and index fingertip firmly.' }
  return {
    box: { x0, y0, x1, y1 },
    pinchOn: Math.min(0.45, closed + (open - closed) * 0.35),
    pinchOff: Math.min(0.6, closed + (open - closed) * 0.55),
  }
}

const STEPS = [
  { id: 'reach', secs: 7, title: 'Show your comfortable reach', body: 'Slowly trace a big rectangle with your hand, as far as feels comfortable. This becomes the whole screen.' },
  { id: 'open', secs: 2.5, title: 'Hold your hand open', body: 'Relax your hand with the fingers apart.' },
  { id: 'pinch', secs: 2.5, title: 'Now pinch and hold', body: 'Touch your thumb to your index fingertip, the way you’ll click.' },
] as const

export function mountCalibration(container: HTMLElement, opts: { feed: HandFeed; current: Calibration; onSave: (c: Calibration) => void }) {
  container.innerHTML = `
    <div class="gx-cal">
      <canvas class="gx-cal-canvas" width="480" height="360" aria-hidden="true"></canvas>
      <div class="gx-cal-copy">
        <ol class="gx-steps">${STEPS.map((s, i) => `<li data-i="${i}">${s.title}</li>`).join('')}</ol>
        <p class="gx-cal-msg" role="status" aria-live="polite">Takes about 15 seconds. Start the camera first.</p>
        <div class="gx-row">
          <button type="button" class="gx-btn" data-cal="start">Start calibration</button>
          <button type="button" class="gx-btn ghost" data-cal="reset">Use defaults</button>
        </div>
        <p class="gx-small" data-cal="state"></p>
      </div>
    </div>`
  const canvas = container.querySelector('canvas')!
  const ctx = canvas.getContext('2d')!
  const msg = container.querySelector('.gx-cal-msg')!
  const state = container.querySelector('[data-cal="state"]')!
  const steps = Array.from(container.querySelectorAll('.gx-steps li'))
  let current = opts.current
  const describe = () => {
    state.textContent = current.box
      ? `Calibrated: reach ${Math.round((current.box.x1 - current.box.x0) * 100)}% × ${Math.round((current.box.y1 - current.box.y0) * 100)}% of the camera, pinch at ${current.pinchOn.toFixed(2)}.`
      : 'Using default reach and pinch.'
  }
  describe()

  let latest: Point[][] = []
  let trail: Point[] = []
  let running = false
  const unsubscribe = opts.feed((hands) => {
    latest = hands
  })

  const draw = () => {
    raf = requestAnimationFrame(draw)
    const { width: w, height: h } = canvas
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(127,127,127,.12)'
    ctx.fillRect(0, 0, w, h)
    const box = current.box
    if (box) {
      ctx.strokeStyle = 'rgba(25,179,125,.9)'
      ctx.setLineDash([6, 6])
      ctx.lineWidth = 2
      ctx.strokeRect(box.x0 * w, box.y0 * h, (box.x1 - box.x0) * w, (box.y1 - box.y0) * h)
      ctx.setLineDash([])
    }
    ctx.fillStyle = 'rgba(91,124,255,.35)'
    for (const p of trail) {
      ctx.beginPath()
      ctx.arc(p.x * w, p.y * h, 3, 0, Math.PI * 2)
      ctx.fill()
    }
    const hand = latest[0]
    if (hand) {
      const a = analyzeHand(hand).anchor
      ctx.fillStyle = '#5b7cff'
      ctx.beginPath()
      ctx.arc(a.x * w, a.y * h, 9, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  let raf = requestAnimationFrame(draw)

  const collect = (secs: number, sample: (hand: Point[]) => void) =>
    new Promise<void>((resolve) => {
      const end = performance.now() + secs * 1000
      const tick = () => {
        const left = end - performance.now()
        if (left <= 0) return resolve()
        if (latest[0]) sample(latest[0])
        setTimeout(tick, 33)
      }
      tick()
    })

  container.querySelector('[data-cal="start"]')!.addEventListener('click', async () => {
    if (running) return
    running = true
    trail = []
    const anchors: Point[] = []
    const open: number[] = []
    const pinch: number[] = []
    for (const [i, step] of STEPS.entries()) {
      steps.forEach((li, k) => li.classList.toggle('on', k === i))
      msg.textContent = `${step.title}. ${step.body}`
      await new Promise((r) => setTimeout(r, i === 0 ? 400 : 900))
      await collect(step.secs, (hand) => {
        const info = analyzeHand(hand)
        if (step.id === 'reach') {
          anchors.push(info.anchor)
          trail.push(info.anchor)
        } else if (step.id === 'open') open.push(info.pinchRatio)
        else pinch.push(info.pinchRatio)
      })
      steps[i].classList.add('done')
    }
    steps.forEach((li) => li.classList.remove('on'))
    const result = computeCalibration(anchors, open, pinch)
    running = false
    if ('error' in result) {
      msg.textContent = result.error
      steps.forEach((li) => li.classList.remove('done'))
      return
    }
    current = result
    opts.onSave(result)
    msg.textContent = 'Done. The cursor now uses your reach and your pinch.'
    describe()
  })

  container.querySelector('[data-cal="reset"]')!.addEventListener('click', () => {
    current = { ...DEFAULT_SETTINGS.calibration }
    trail = []
    opts.onSave(current)
    msg.textContent = 'Back to the default reach and pinch.'
    describe()
  })

  return () => {
    cancelAnimationFrame(raf)
    unsubscribe()
  }
}
