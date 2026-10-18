import { mergeSettings, safeUrl } from '../engine/settings'
import { SETTINGS_KEY, type Message, type Status } from './messages'

// Owns the offscreen camera page and relays gesture frames to whichever tab is in front.
const OFFSCREEN_URL = 'offscreen.html'
let running = false
let lastError: string | null = null
let activeTab: number | null = null

async function loadSettings() {
  const stored = await chrome.storage.local.get(SETTINGS_KEY)
  return mergeSettings(stored[SETTINGS_KEY])
}

async function hasOffscreen() {
  const contexts = await chrome.runtime.getContexts({ contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT] })
  return contexts.length > 0
}

async function refreshActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  const next = tab?.id ?? null
  if (activeTab !== null && activeTab !== next) chrome.tabs.sendMessage(activeTab, { kind: 'hide' } satisfies Message).catch(() => {})
  activeTab = next
}

async function setBadge() {
  await chrome.action.setBadgeText({ text: running ? 'ON' : '' })
  await chrome.action.setBadgeBackgroundColor({ color: '#2f5bea' })
}

async function start(): Promise<Status> {
  lastError = null
  running = true
  if (!(await hasOffscreen())) {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: [chrome.offscreen.Reason.USER_MEDIA],
      justification: 'Reads the webcam on-device to track hand gestures.',
    })
  }
  await refreshActiveTab()
  await setBadge()
  chrome.runtime.sendMessage({ kind: 'offscreen-start', settings: await loadSettings() } satisfies Message).catch(() => {})
  return { running, error: null }
}

async function stop(): Promise<Status> {
  running = false
  if (await hasOffscreen()) await chrome.offscreen.closeDocument()
  if (activeTab !== null) chrome.tabs.sendMessage(activeTab, { kind: 'hide' } satisfies Message).catch(() => {})
  await setBadge()
  return { running, error: lastError }
}

chrome.runtime.onMessage.addListener((msg: Message, sender, reply) => {
  switch (msg.kind) {
    case 'start':
      start().then(reply)
      return true
    case 'stop':
      stop().then(reply)
      return true
    case 'status':
      reply({ running, error: lastError } satisfies Status)
      return false
    case 'offscreen-ready':
      // The offscreen page asks for its start signal once its listener exists, so the first start is never lost.
      if (running) loadSettings().then((settings) => reply({ kind: 'offscreen-start', settings } satisfies Message))
      else reply(null)
      return true
    case 'frame':
      if (running && activeTab !== null) chrome.tabs.sendMessage(activeTab, msg).catch(() => {})
      return false
    case 'offscreen-error':
      lastError = msg.error
      void stop()
      // The camera has to be allowed once from a visible extension page before the offscreen page can use it.
      if (msg.error === 'NotAllowedError') chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html#camera') })
      return false
    case 'tab-action':
      if (sender.tab?.id !== undefined) void tabAction(sender.tab, msg.action, msg.value)
      return false
  }
  return false
})

async function tabAction(tab: chrome.tabs.Tab, action: 'next-tab' | 'prev-tab' | 'zoom' | 'open-url', value?: number | string) {
  if (action === 'zoom' && tab.id !== undefined) {
    const current = await chrome.tabs.getZoom(tab.id)
    await chrome.tabs.setZoom(tab.id, Math.min(3, Math.max(0.3, current * (typeof value === 'number' ? value : 1))))
    return
  }
  if (action === 'open-url') {
    const url = typeof value === 'string' ? safeUrl(value) : null
    if (url) await chrome.tabs.create({ url, index: (tab.index ?? 0) + 1 })
    return
  }
  const tabs = await chrome.tabs.query({ windowId: tab.windowId })
  const i = tabs.findIndex((t) => t.id === tab.id)
  const next = tabs[(i + (action === 'next-tab' ? 1 : -1) + tabs.length) % tabs.length]
  if (next?.id !== undefined) await chrome.tabs.update(next.id, { active: true })
}

chrome.tabs.onActivated.addListener(() => void refreshActiveTab())
chrome.windows.onFocusChanged.addListener(() => void refreshActiveTab())

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'local' && changes[SETTINGS_KEY] && running) {
    chrome.runtime.sendMessage({ kind: 'offscreen-settings', settings: await loadSettings() } satisfies Message).catch(() => {})
  }
})

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-gestureos') void (running ? stop() : start())
})

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') })
})
