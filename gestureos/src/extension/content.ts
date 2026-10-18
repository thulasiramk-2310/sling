import { Actuator } from '../actuator/actuator'
import { mergeSettings, type Settings } from '../engine/settings'
import { SETTINGS_KEY, type Message } from './messages'

// Runs in every page but stays dormant until gesture frames arrive for this tab.
let actuator: Actuator | null = null
let settings: Settings = mergeSettings(null)
let hideTimer = 0

chrome.storage.local.get(SETTINGS_KEY).then((s) => {
  settings = mergeSettings(s[SETTINGS_KEY])
  actuator?.setSettings(settings)
})
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[SETTINGS_KEY]) {
    settings = mergeSettings(changes[SETTINGS_KEY].newValue)
    actuator?.setSettings(settings)
  }
})

function ensureActuator() {
  if (actuator) return actuator
  actuator = new Actuator(settings, {
    onTabAction: (action, value) => {
      chrome.runtime.sendMessage({ kind: 'tab-action', action, value } satisfies Message).catch(() => {})
    },
  })
  return actuator
}

chrome.runtime.onMessage.addListener((msg: Message) => {
  if (msg.kind === 'frame') {
    const a = ensureActuator()
    a.setVisible(true)
    a.handle(msg.frame)
    // If frames stop (tab switched, extension stopped), hide the overlay instead of freezing it on screen.
    clearTimeout(hideTimer)
    hideTimer = window.setTimeout(() => actuator?.setVisible(false), 1500)
  } else if (msg.kind === 'hide') {
    actuator?.setVisible(false)
  }
  return false
})
