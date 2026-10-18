import { fakeHand, type FakePose } from '../engine/fakeHand'
import { buildTemplate, featureDistance, handFeatures } from '../engine/features'
import { MACRO_LABELS, safeUrl, type CustomGesture, type MacroAction, type Settings } from '../engine/settings'
import type { HandFeed } from './calibration'

export const MAX_CUSTOM = 15
const SAMPLES = 36

const BUILT_IN: { pose: FakePose; name: string }[] = [
  { pose: 'open', name: 'Open palm (wake)' },
  { pose: 'fist', name: 'Fist (pause)' },
  { pose: 'point', name: 'Point (move)' },
  { pose: 'scroll', name: 'Two fingers (scroll)' },
  { pose: 'pinch', name: 'Pinch (click)' },
]
const builtInFeatures = BUILT_IN.map((b) => ({ ...b, f: handFeatures(fakeHand(b.pose)) }))

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
const id = () => Math.random().toString(36).slice(2, 10)

// Record your own static hand poses and bind them to actions.
export function mountStudio(
  container: HTMLElement,
  opts: { feed: HandFeed; getSettings: () => Settings; save: (s: Settings) => void; allowTabActions?: boolean },
) {
  const actions = (Object.keys(MACRO_LABELS) as MacroAction[]).filter((a) => a !== 'none' && (opts.allowTabActions || (a !== 'next-tab' && a !== 'prev-tab')))
  container.innerHTML = `
    <div class="gx-studio">
      <form class="gx-new" novalidate>
        <label class="gx-field"><span>Name</span><input id="gx-name" maxlength="24" placeholder="e.g. OK sign" required /></label>
        <label class="gx-field"><span>Action</span><select id="gx-action">${actions.map((a) => `<option value="${a}">${MACRO_LABELS[a]}</option>`).join('')}</select></label>
        <label class="gx-field" id="gx-param-wrap" hidden><span id="gx-param-label">Key</span><input id="gx-param" maxlength="200" /></label>
        <button type="submit" class="gx-btn" id="gx-record">Record gesture</button>
        <p class="gx-small gx-rec-msg" role="status" aria-live="polite">Hold the pose steady in front of the camera for about 2 seconds.</p>
      </form>
      <div class="gx-list-wrap">
        <div class="gx-live mono" aria-live="polite">Live: <b id="gx-live">no hand</b></div>
        <ul class="gx-list" id="gx-list"></ul>
      </div>
    </div>`
  const $ = <T extends HTMLElement>(s: string) => container.querySelector(s) as T
  const actionSel = $<HTMLSelectElement>('#gx-action')
  const paramWrap = $('#gx-param-wrap')
  const param = $<HTMLInputElement>('#gx-param')
  const recMsg = $('.gx-rec-msg')
  let latest: number[] | null = null
  let recording = false

  const syncParam = () => {
    const a = actionSel.value
    paramWrap.hidden = a !== 'key' && a !== 'url'
    $('#gx-param-label').textContent = a === 'key' ? 'Key to press' : 'Website'
    param.placeholder = a === 'key' ? 'k, ArrowRight, Space…' : 'youtube.com'
  }
  actionSel.addEventListener('change', syncParam)
  syncParam()

  const render = () => {
    const list = opts.getSettings().customGestures
    $('#gx-list').innerHTML = list.length
      ? list
          .map(
            (g) =>
              `<li><span><b>${esc(g.name)}</b><em>${MACRO_LABELS[g.action]}${g.param ? `: ${esc(g.param)}` : ''}</em></span><button type="button" class="gx-btn ghost small" data-del="${g.id}" aria-label="Delete ${esc(g.name)}">Delete</button></li>`,
          )
          .join('')
      : `<li class="gx-empty">No custom gestures yet. You can add up to ${MAX_CUSTOM}.</li>`
    container.querySelectorAll<HTMLButtonElement>('[data-del]').forEach((b) =>
      b.addEventListener('click', () => {
        const s = opts.getSettings()
        opts.save({ ...s, customGestures: s.customGestures.filter((g) => g.id !== b.dataset.del) })
        render()
      }),
    )
  }
  render()

  const unsubscribe = opts.feed((hands) => {
    latest = hands[0] ? handFeatures(hands[0]) : null
    if (recording) return
    const live = $('#gx-live')
    if (!latest) {
      live.textContent = 'no hand'
      return
    }
    const list = opts.getSettings().customGestures
    let best: { name: string; d: number } | null = null
    for (const g of list) {
      const d = featureDistance(latest, g.template) / g.radius
      if (d < 1 && (!best || d < best.d)) best = { name: g.name, d }
    }
    live.textContent = best ? best.name : list.length ? 'no custom match' : 'hand seen'
  })

  $<HTMLFormElement>('.gx-new').addEventListener('submit', async (e) => {
    e.preventDefault()
    if (recording) return
    const s = opts.getSettings()
    const name = $<HTMLInputElement>('#gx-name').value.trim()
    const action = actionSel.value as MacroAction
    const p = param.value.trim()
    if (!name) return void (recMsg.textContent = 'Give the gesture a name first.')
    if (s.customGestures.length >= MAX_CUSTOM) return void (recMsg.textContent = `You can keep up to ${MAX_CUSTOM} gestures. Delete one to add another.`)
    if (action === 'key' && !p) return void (recMsg.textContent = 'Type the key to press, like k or ArrowRight.')
    if (action === 'url' && !safeUrl(p)) return void (recMsg.textContent = 'Enter a web address like youtube.com.')

    recording = true
    const btn = $<HTMLButtonElement>('#gx-record')
    btn.disabled = true
    for (const n of [3, 2, 1]) {
      recMsg.textContent = `Get ready… ${n}`
      await new Promise((r) => setTimeout(r, 700))
    }
    recMsg.textContent = 'Recording, hold still…'
    const samples: number[][] = []
    const end = performance.now() + 4000
    while (samples.length < SAMPLES && performance.now() < end) {
      if (latest) samples.push(latest)
      await new Promise((r) => setTimeout(r, 55))
    }
    recording = false
    btn.disabled = false
    if (samples.length < SAMPLES * 0.6) return void (recMsg.textContent = 'Your hand wasn’t visible long enough. Try again with your hand clearly in view.')

    const { template, radius } = buildTemplate(samples)
    const clash = s.customGestures.find((g) => featureDistance(template, g.template) < Math.max(g.radius, radius))
    if (clash) return void (recMsg.textContent = `That looks too much like “${clash.name}”. Try a more distinct pose.`)
    const builtIn = builtInFeatures.find((b) => featureDistance(template, b.f) < radius)
    const gesture: CustomGesture = { id: id(), name, template, radius, action, param: action === 'key' || action === 'url' ? p : undefined }
    opts.save({ ...s, customGestures: [...s.customGestures, gesture] })
    $<HTMLInputElement>('#gx-name').value = ''
    param.value = ''
    recMsg.textContent = builtIn
      ? `Saved. Heads up: it resembles ${builtIn.name}, and your gesture now takes priority over it.`
      : `Saved “${name}”. Hold it for a moment to trigger ${MACRO_LABELS[action].toLowerCase()}.`
    render()
  })

  return unsubscribe
}
