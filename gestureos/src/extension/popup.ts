import './ext.css'
import type { Message, Status } from './messages'

const toggle = document.getElementById('toggle') as HTMLButtonElement
const state = document.getElementById('state') as HTMLElement
const note = document.getElementById('note') as HTMLElement

function render(s: Status) {
  toggle.textContent = s.running ? 'Stop GestureOS' : 'Start GestureOS'
  toggle.classList.toggle('stop', s.running)
  state.textContent = s.running ? 'On' : 'Off'
  state.classList.toggle('on', s.running)
  if (s.error === 'NotAllowedError') note.textContent = 'Camera access is needed. A welcome tab has opened so you can allow it.'
  else if (s.error) note.textContent = 'The camera could not start. Close other apps using it and try again.'
}

async function send(msg: Message) {
  return (await chrome.runtime.sendMessage(msg)) as Status
}

toggle.addEventListener('click', async () => {
  toggle.disabled = true
  const current = await send({ kind: 'status' })
  render(await send(current.running ? { kind: 'stop' } : { kind: 'start' }))
  toggle.disabled = false
})

document.getElementById('settings')!.addEventListener('click', () => chrome.runtime.openOptionsPage())

chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
  if (tab?.url && /^(chrome|edge|about|chrome-extension):|chromewebstore\.google\.com/.test(tab.url)) {
    note.textContent = "Browsers don't let extensions run on this page. Switch to a regular website."
  }
})

send({ kind: 'status' }).then(render)
