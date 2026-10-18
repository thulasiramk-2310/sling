import './ext.css'
import { MACRO_LABELS, POSE_LABELS, mergeSettings, type MacroAction, type Settings } from '../engine/settings'
import { drawHands, startTracker, type Tracker } from '../engine/tracker'
import type { MacroPose } from '../engine/types'
import { SETTINGS_KEY } from './messages'

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T

// Step 1: granting the camera here (a visible extension page) is what lets the hidden offscreen page use it later.
let tracker: Tracker | null = null
$('grant').addEventListener('click', async () => {
  const status = $('grant-status')
  if (tracker) {
    tracker.stop()
    tracker = null
    $('preview').hidden = true
    $('grant').textContent = 'Test tracking again'
    return
  }
  status.textContent = 'Loading the hand model…'
  try {
    tracker = await startTracker({
      assetBase: './',
      onFrame: (hands) => {
        drawHands($<HTMLCanvasElement>('preview-canvas'), hands, '#5b7cff')
        status.textContent = hands.length ? `Tracking ${hands.length} hand${hands.length > 1 ? 's' : ''}. You're all set.` : 'Camera allowed. Show your hand to test tracking.'
      },
    })
    $('preview-video').replaceChildren(tracker.video)
    $('preview').hidden = false
    $('grant').textContent = 'Stop test'
  } catch (err) {
    const name = err instanceof DOMException ? err.name : ''
    status.textContent =
      name === 'NotAllowedError'
        ? 'Camera was blocked. Click the camera icon in the address bar, choose Allow, then try again.'
        : 'The camera could not start. Close other apps using it and try again.'
  }
})

// Step 3: settings, saved to Chrome sync storage and picked up live by every tab.
type RangeKey = 'sensitivity' | 'smoothing' | 'scrollSpeed' | 'dwellMs'
const RANGES: { key: RangeKey; label: string; min: number; max: number; step: number }[] = [
  { key: 'sensitivity', label: 'Sensitivity', min: 0.6, max: 1.6, step: 0.05 },
  { key: 'smoothing', label: 'Smoothing', min: 0.5, max: 2, step: 0.1 },
  { key: 'scrollSpeed', label: 'Scroll speed', min: 0.4, max: 2.5, step: 0.1 },
  { key: 'dwellMs', label: 'Dwell time', min: 500, max: 2000, step: 100 },
]
const TOGGLES: { key: 'snap' | 'dwell' | 'swipeNavigation'; label: string }[] = [
  { key: 'snap', label: 'Snap to targets' },
  { key: 'dwell', label: 'Dwell to click' },
  { key: 'swipeNavigation', label: 'Swipe to go back / forward' },
]
const fmt = (k: RangeKey, v: number) => (k === 'dwellMs' ? `${(v / 1000).toFixed(1)} s` : `${v.toFixed(2).replace(/\.?0+$/, '')}×`)

const form = $<HTMLFormElement>('form')
form.innerHTML = `
  ${RANGES.map((r) => `<label class="row"><span>${r.label}</span><input type="range" id="${r.key}" min="${r.min}" max="${r.max}" step="${r.step}"><output id="${r.key}-out"></output></label>`).join('')}
  <label class="row"><span>Cursor size</span><select id="cursorSize"><option value="s">Small</option><option value="m">Medium</option><option value="l">Large</option></select><span></span></label>
  ${TOGGLES.map((t) => `<label class="row check"><input type="checkbox" id="${t.key}"><span>${t.label}</span></label>`).join('')}
  <h3>Macros</h3>
  ${(Object.keys(POSE_LABELS) as MacroPose[])
    .map(
      (p) =>
        `<label class="row"><span>${POSE_LABELS[p]}</span><select id="macro-${p}">${(Object.keys(MACRO_LABELS) as MacroAction[])
          .map((a) => `<option value="${a}">${MACRO_LABELS[a].replace(' (extension)', '')}</option>`)
          .join('')}</select><span></span></label>`,
    )
    .join('')}
  <p class="note" id="saved" role="status" aria-live="polite"></p>`

let settings: Settings = mergeSettings(null)
function fill(s: Settings) {
  for (const r of RANGES) {
    $<HTMLInputElement>(r.key).value = String(s[r.key])
    $(`${r.key}-out`).textContent = fmt(r.key, s[r.key])
  }
  for (const t of TOGGLES) $<HTMLInputElement>(t.key).checked = s[t.key]
  $<HTMLSelectElement>('cursorSize').value = s.cursorSize
  for (const p of Object.keys(s.macros) as MacroPose[]) $<HTMLSelectElement>(`macro-${p}`).value = s.macros[p]
  $<HTMLInputElement>('dwellMs').disabled = !s.dwell
}

form.addEventListener('input', async () => {
  const next: Settings = { ...settings, macros: { ...settings.macros } }
  for (const r of RANGES) next[r.key] = Number($<HTMLInputElement>(r.key).value)
  for (const t of TOGGLES) next[t.key] = $<HTMLInputElement>(t.key).checked
  next.cursorSize = $<HTMLSelectElement>('cursorSize').value as Settings['cursorSize']
  for (const p of Object.keys(next.macros) as MacroPose[]) next.macros[p] = $<HTMLSelectElement>(`macro-${p}`).value as MacroAction
  settings = next
  fill(next)
  await chrome.storage.sync.set({ [SETTINGS_KEY]: next })
  $('saved').textContent = 'Saved. Open tabs update right away.'
})
form.addEventListener('submit', (e) => e.preventDefault())

chrome.storage.sync.get(SETTINGS_KEY).then((s) => {
  settings = mergeSettings(s[SETTINGS_KEY])
  fill(settings)
})
