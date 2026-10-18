import { GestureEngine } from '../engine/engine'
import { FaceEngine } from '../engine/faceEngine'
import type { Settings } from '../engine/settings'
import { startFaceTracker, startTracker, type Tracker } from '../engine/tracker'
import type { Frame } from '../engine/types'
import type { Message } from './messages'

// Hidden page that owns the webcam: runs hand or head tracking plus the matching engine, emits compact frames.
const hands = new GestureEngine()
const face = new FaceEngine()
let tracker: Tracker | null = null
let mode: Settings['inputMode'] | null = null
let starting = false

const send = (frame: Frame) => chrome.runtime.sendMessage({ kind: 'frame', frame } satisfies Message).catch(() => {})

chrome.runtime.onMessage.addListener((msg: Message) => {
  if (msg.kind === 'offscreen-start') void start(msg.settings)
  if (msg.kind === 'offscreen-settings') {
    hands.setSettings(msg.settings)
    face.setSettings(msg.settings)
    // Switching between hands and head needs a different model, so restart the camera pipeline.
    if (tracker && msg.settings.inputMode !== mode) {
      tracker.stop()
      tracker = null
      void start(msg.settings)
    }
  }
  return false
})

chrome.runtime.sendMessage({ kind: 'offscreen-ready' } satisfies Message).then((msg: Message | null) => {
  if (msg?.kind === 'offscreen-start') void start(msg.settings)
})

async function start(settings: Settings) {
  hands.setSettings(settings)
  face.setSettings(settings)
  // Starting from the toolbar is already a deliberate choice, so the cursor is live right away.
  hands.setActive(true)
  face.setActive(true)
  if (tracker || starting) return
  starting = true
  mode = settings.inputMode
  try {
    tracker =
      mode === 'head'
        ? await startFaceTracker({ assetBase: './', useTimer: true, onFrame: (f, t) => send(face.update(f, t)) })
        : await startTracker({ assetBase: './', useTimer: true, onFrame: (h, t) => send(hands.update(h, t)) })
  } catch (err) {
    const error = err instanceof DOMException ? err.name : 'TrackerError'
    chrome.runtime.sendMessage({ kind: 'offscreen-error', error } satisfies Message).catch(() => {})
  } finally {
    starting = false
  }
}
