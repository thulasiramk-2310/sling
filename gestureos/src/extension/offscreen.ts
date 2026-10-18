import { GestureEngine } from '../engine/engine'
import { startTracker, type Tracker } from '../engine/tracker'
import type { Message } from './messages'

// Hidden page that owns the webcam: runs hand tracking + the gesture engine, emits compact frames.
const engine = new GestureEngine()
let tracker: Tracker | null = null
let starting = false

chrome.runtime.onMessage.addListener((msg: Message) => {
  if (msg.kind === 'offscreen-start') void start(msg)
  if (msg.kind === 'offscreen-settings') engine.setSettings(msg.settings)
  return false
})

chrome.runtime.sendMessage({ kind: 'offscreen-ready' } satisfies Message).then((msg: Message | null) => {
  if (msg?.kind === 'offscreen-start') void start(msg)
})

async function start(msg: Extract<Message, { kind: 'offscreen-start' }>) {
  engine.setSettings(msg.settings)
  // Starting from the toolbar is already a deliberate choice, so the cursor is live right away.
  engine.setActive(true)
  if (tracker || starting) return
  starting = true
  try {
    tracker = await startTracker({
      assetBase: './',
      useTimer: true,
      onFrame: (hands, t) => {
        const frame = engine.update(hands, t)
        chrome.runtime.sendMessage({ kind: 'frame', frame } satisfies Message).catch(() => {})
      },
    })
  } catch (err) {
    const error = err instanceof DOMException ? err.name : 'TrackerError'
    chrome.runtime.sendMessage({ kind: 'offscreen-error', error } satisfies Message).catch(() => {})
  } finally {
    starting = false
  }
}
