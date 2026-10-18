import { KEYBOARD_CSS, Keyboard, type KeyAction } from './keyboard'

// The on-page layer: cursor, target highlight, status pill and toasts, isolated in a shadow root
// so host pages can't restyle it and it never intercepts their pointer events.
const CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
.layer { position: fixed; inset: 0; pointer-events: none; z-index: 2147483647; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
.cursor { position: fixed; left: 0; top: 0; width: var(--size); height: var(--size); margin: calc(var(--size) / -2) 0 0 calc(var(--size) / -2); transition: opacity .25s, width .2s, height .2s; will-change: transform; }
.cursor svg { width: 100%; height: 100%; overflow: visible; }
.cursor .halo { fill: none; stroke: rgba(10, 14, 30, .55); stroke-width: 7; }
.cursor .ring { fill: none; stroke: #fff; stroke-width: 3.5; }
.cursor .fill { fill: #2f5bea; transform-origin: 50% 50%; transition: transform .12s, fill .2s; }
.cursor .arc { fill: none; stroke: #ff8a3d; stroke-width: 4; stroke-linecap: round; transform: rotate(-90deg); transform-origin: 50% 50%; }
.cursor .dot { fill: #fff; stroke: rgba(10,14,30,.6); stroke-width: 1.5; }
.cursor.paused .ring { stroke: rgba(255,255,255,.65); stroke-dasharray: 4 6; }
.cursor.paused .fill { fill: transparent; }
.cursor.drag .fill { fill: #19b37d; }
.cursor.hidden { opacity: 0; }
.target { position: fixed; border-radius: 10px; box-shadow: 0 0 0 2px #fff, 0 0 0 4px #2f5bea, 0 8px 30px rgba(47, 91, 234, .35); transition: all .14s ease-out; opacity: 0; }
.target.on { opacity: 1; }
.pill { position: fixed; left: 16px; bottom: 16px; display: flex; align-items: center; gap: 10px; padding: 8px 14px 8px 10px; border-radius: 999px; background: rgba(14, 17, 28, .86); color: #f3f5fb; font-size: 13px; line-height: 1; box-shadow: 0 6px 24px rgba(0,0,0,.25); backdrop-filter: blur(10px); }
.pill .mark { width: 22px; height: 22px; border-radius: 7px; background: #2f5bea; display: grid; place-items: center; color: #fff; font-weight: 700; font-size: 12px; }
.pill .state { font-weight: 600; }
.pill .pose { padding: 4px 8px; border-radius: 999px; background: rgba(255,255,255,.1); font-size: 11px; letter-spacing: .04em; }
.pill .led { width: 8px; height: 8px; border-radius: 50%; background: #8b93a7; }
.pill.on .led { background: #19b37d; box-shadow: 0 0 8px #19b37d; }
.toast { position: fixed; left: 50%; bottom: 32px; transform: translate(-50%, 12px); padding: 12px 18px; border-radius: 12px; background: rgba(14, 17, 28, .92); color: #fff; font-size: 15px; opacity: 0; transition: opacity .25s, transform .25s; max-width: min(520px, calc(100vw - 32px)); text-align: center; }
.toast.on { opacity: 1; transform: translate(-50%, 0); }
@media (prefers-reduced-motion: reduce) { .cursor, .target, .toast { transition: none; } }
.pill .kbtn { pointer-events: auto; border: 0; border-radius: 999px; padding: 4px 9px; background: rgba(255,255,255,.12); color: #fff; font: 600 11px system-ui, sans-serif; cursor: pointer; }
${KEYBOARD_CSS}
`

const POSE_NAMES: Record<string, string> = {
  none: 'No hand',
  point: 'Point',
  pinch: 'Pinch',
  open: 'Open palm',
  fist: 'Fist',
  scroll: 'Scroll',
  victory: 'Peace',
  rock: 'Rock',
  thumbsUp: 'Thumbs up',
  smile: 'Smile',
  unknown: '…',
}

export class Overlay {
  readonly host: HTMLElement
  private cursor: HTMLElement
  private fill: SVGCircleElement
  private arc: SVGCircleElement
  private target: HTMLElement
  private pill: HTMLElement
  private pillState: HTMLElement
  private pillPose: HTMLElement
  private toastEl: HTMLElement
  private toastTimer = 0
  private root: ShadowRoot
  private layer: HTMLElement
  keyboard: Keyboard | null = null
  private readonly circumference = 2 * Math.PI * 22

  constructor(showPill = true) {
    this.host = document.createElement('gestureos-overlay')
    const root = this.host.attachShadow({ mode: 'open' })
    this.root = root
    root.innerHTML = `
      <style>${CSS}</style>
      <div class="layer">
        <div class="target"></div>
        <div class="cursor hidden">
          <svg viewBox="0 0 50 50" aria-hidden="true">
            <circle class="halo" cx="25" cy="25" r="22"></circle>
            <circle class="ring" cx="25" cy="25" r="22"></circle>
            <circle class="fill" cx="25" cy="25" r="22" style="transform: scale(0)"></circle>
            <circle class="arc" cx="25" cy="25" r="22" stroke-dasharray="0 999"></circle>
            <circle class="dot" cx="25" cy="25" r="3"></circle>
          </svg>
        </div>
        <div class="pill" ${showPill ? '' : 'hidden'} role="status" aria-live="polite">
          <span class="mark">G</span><span class="led"></span><span class="state">Paused</span><span class="pose">No hand</span><button class="kbtn" type="button" aria-label="Show or hide the on-screen keyboard">⌨</button>
        </div>
        <div class="toast" role="status" aria-live="polite"></div>
      </div>`
    const q = <T extends Element>(s: string) => root.querySelector(s) as T
    this.cursor = q('.cursor')
    this.fill = q('.fill')
    this.arc = q('.arc')
    this.target = q('.target')
    this.pill = q('.pill')
    this.pillState = q('.state')
    this.pillPose = q('.pose')
    this.toastEl = q('.toast')
    this.layer = q('.layer')
    document.documentElement.appendChild(this.host)
  }

  setSize(px: number) {
    this.cursor.style.setProperty('--size', `${px}px`)
  }

  moveCursor(x: number, y: number, visible: boolean) {
    this.cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`
    this.cursor.classList.toggle('hidden', !visible)
  }

  setCursorState(opts: { active: boolean; pinch: number; dragging: boolean; progress: number; progressColor?: string }) {
    this.cursor.classList.toggle('paused', !opts.active)
    this.cursor.classList.toggle('drag', opts.dragging)
    this.fill.style.transform = `scale(${opts.dragging ? 0.55 : opts.pinch * 0.6})`
    const len = this.circumference * Math.min(1, Math.max(0, opts.progress))
    this.arc.setAttribute('stroke-dasharray', `${len} 999`)
    this.arc.style.stroke = opts.progressColor ?? '#ff8a3d'
  }

  highlight(rect: DOMRect | null) {
    if (!rect) {
      this.target.classList.remove('on')
      return
    }
    const pad = 4
    Object.assign(this.target.style, {
      left: `${rect.left - pad}px`,
      top: `${rect.top - pad}px`,
      width: `${rect.width + pad * 2}px`,
      height: `${rect.height + pad * 2}px`,
    })
    this.target.classList.add('on')
  }

  attachKeyboard(onKey: (k: KeyAction) => void) {
    this.keyboard = new Keyboard(this.root, this.layer, onKey, () => {})
    this.pill.querySelector('.kbtn')!.addEventListener('click', () => this.keyboard?.toggle())
    this.pill.style.pointerEvents = 'auto'
    return this.keyboard
  }

  setStatus(active: boolean, pose: string, customName?: string) {
    this.pill.classList.toggle('on', active)
    this.pillState.textContent = active ? 'Active' : 'Paused'
    this.pillPose.textContent = customName ?? POSE_NAMES[pose] ?? pose
  }

  toast(text: string, ms = 1800) {
    this.toastEl.textContent = text
    this.toastEl.classList.add('on')
    clearTimeout(this.toastTimer)
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('on'), ms)
  }

  setVisible(visible: boolean) {
    this.host.style.display = visible ? '' : 'none'
  }

  destroy() {
    this.host.remove()
  }
}
