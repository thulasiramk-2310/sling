import type { Frame, GestureEvent, MacroPose } from '../engine/types'
import { MACRO_LABELS, safeUrl, type MacroAction, type Settings } from '../engine/settings'
import { Overlay } from './overlay'
import type { KeyAction, Keyboard } from './keyboard'

const CLICKABLE =
  'a[href], button, input:not([type=hidden]), select, textarea, summary, label[for], [role=button], [role=link], [role=tab], [role=menuitem], [role=checkbox], [role=switch], [role=option], [onclick], [tabindex]:not([tabindex="-1"])'
const SIZES = { s: 30, m: 42, l: 62 }
const SNAP_RADIUS = 46
const DWELL_STILL_PX = 16
const DWELL_REARM_PX = 34

export interface ActuatorHooks {
  // Return true when the page handled the gesture itself.
  onSwipe?: (dir: 'left' | 'right') => boolean
  onZoom?: (factor: number) => boolean
  onMacro?: (pose: MacroPose, action: MacroAction) => boolean
  onTabAction?: (action: 'next-tab' | 'prev-tab' | 'zoom' | 'open-url', value?: number | string) => void
  onEvent?: (event: GestureEvent | { type: 'dwellClick'; x: number; y: number }) => void
  showPill?: boolean
}

// Applies gesture frames to the current page: moves the visual cursor and dispatches real DOM events.
export class Actuator {
  private overlay: Overlay
  private settings: Settings
  private hooks: ActuatorHooks
  private target = { x: -100, y: -100 }
  private shown = { x: -100, y: -100 }
  private visible = false
  private frame: Frame | null = null
  private raf = 0
  private hoverEl: Element | null = null
  private dragEl: Element | null = null
  private snapEl: Element | null = null
  private candidates: Element[] = []
  private candidatesAt = 0
  private dwell = { x: 0, y: 0, since: 0, locked: false }
  private keyboard: Keyboard
  private editable: HTMLElement | null = null
  private lastClick = { t: 0, x: 0, y: 0 }
  private perf = { last: 0, interval: 33, delay: 0, shownAt: 0 }
  private effort = { activeMs: 0, restMs: 0, last: 0 }

  constructor(settings: Settings, hooks: ActuatorHooks = {}) {
    this.settings = settings
    this.hooks = hooks
    this.overlay = new Overlay(hooks.showPill ?? true)
    this.overlay.setSize(SIZES[settings.cursorSize])
    this.keyboard = this.overlay.attachKeyboard((k) => this.typeKey(k))
    document.addEventListener('focusin', this.onFocus, true)
    this.raf = requestAnimationFrame(this.tick)
  }

  // Remember the last text field so the on-screen keyboard keeps typing into it.
  private onFocus = (e: FocusEvent) => {
    const el = e.target as HTMLElement
    if (isEditable(el)) {
      this.editable = el
      this.keyboard.setContext(textBeforeCaret(el))
    }
  }

  setSettings(settings: Settings) {
    this.settings = settings
    this.overlay.setSize(SIZES[settings.cursorSize])
  }

  setVisible(visible: boolean) {
    this.overlay.setVisible(visible)
    if (!visible) this.overlay.highlight(null)
  }

  toast(text: string) {
    this.overlay.toast(text)
  }

  handle(frame: Frame) {
    this.trackPerformance(frame)
    this.trackEffort(frame)
    this.frame = frame
    this.visible = !!frame.cursor
    if (frame.cursor) {
      this.target.x = frame.cursor.x * window.innerWidth
      this.target.y = frame.cursor.y * window.innerHeight
    }
    const custom = frame.pose.startsWith('custom:') ? this.settings.customGestures.find((g) => `custom:${g.id}` === frame.pose)?.name : undefined
    this.overlay.setStatus(frame.active, frame.pose, custom)
    for (const ev of frame.events) this.apply(ev)
    if (frame.dragging && this.dragEl) this.fireDragMove()
  }

  private trackPerformance(frame: Frame) {
    const now = Date.now()
    const p = this.perf
    if (p.last) p.interval = p.interval * 0.9 + Math.min(1000, frame.capturedAt - p.last) * 0.1
    p.last = frame.capturedAt
    p.delay = p.delay * 0.9 + Math.max(0, now - frame.capturedAt) * 0.1
    if (!this.settings.showPerformance) return this.overlay.setPerformance('', false)
    if (now - p.shownAt < 500) return
    p.shownAt = now
    const fps = Math.round(1000 / Math.max(1, p.interval))
    // Around 100 ms is where people start to feel a pointer lag behind them.
    this.overlay.setPerformance(`${fps} fps · ${Math.round(p.delay + p.interval / 2)} ms`, fps < 15 || p.delay > 100)
  }

  // Mid-air input tires the shoulder; nudge a rest after a long unbroken stretch.
  private trackEffort(frame: Frame) {
    const now = Date.now()
    const e = this.effort
    const dt = e.last ? Math.min(500, now - e.last) : 0
    e.last = now
    if (frame.active && frame.hands > 0) {
      e.activeMs += dt
      e.restMs = 0
    } else if ((e.restMs += dt) > 60_000) e.activeMs = 0
    if (this.settings.breakReminder && e.activeMs > 20 * 60_000) {
      e.activeMs = 0
      this.overlay.toast('20 minutes of gesturing. Rest your arm for a minute, GestureOS will wait.', 6000)
    }
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    document.removeEventListener('focusin', this.onFocus, true)
    this.overlay.destroy()
  }

  // Interpolates between ~30 fps camera frames so the cursor glides at display rate.
  private tick = (now: number) => {
    this.raf = requestAnimationFrame(this.tick)
    const f = this.frame
    const k = 0.45
    this.shown.x += (this.target.x - this.shown.x) * k
    this.shown.y += (this.target.y - this.shown.y) * k

    const active = !!f?.active
    let x = this.shown.x
    let y = this.shown.y
    this.snapEl = null
    const overKeyboard = this.keyboard.contains(x, y)
    const key = overKeyboard ? this.keyboard.keyAt(x, y) : null
    this.keyboard.hover(active && this.visible ? key : null)
    if (active && this.visible && !f?.dragging && this.settings.snap && !overKeyboard) {
      const snapped = this.findSnap(x, y, now)
      if (snapped) {
        this.snapEl = snapped.el
        x += (snapped.cx - x) * snapped.pull
        y += (snapped.cy - y) * snapped.pull
      }
    }
    const highlightEl = overKeyboard ? null : (this.snapEl ?? (active && this.visible ? this.clickableAt(x, y) : null))
    this.overlay.highlight(highlightEl && !f?.dragging ? highlightEl.getBoundingClientRect() : null)

    let progress = 0
    let color: string | undefined
    if (f?.hold.kind) {
      progress = f.hold.progress
      color = f.hold.kind === 'deactivate' ? '#e5484d' : f.hold.kind === 'activate' ? '#19b37d' : '#ff8a3d'
    } else if (active && this.settings.dwell && this.visible && !f?.dragging) {
      progress = this.updateDwell(x, y, now, !!highlightEl || !!key)
      color = '#2f5bea'
    }
    this.overlay.setCursorState({ active, pinch: f?.pinch ?? 0, dragging: !!f?.dragging, progress, progressColor: color })
    this.overlay.moveCursor(x, y, this.visible)
    if (active && this.visible && !overKeyboard) this.hover(x, y)
  }

  private apply(ev: GestureEvent) {
    this.hooks.onEvent?.(ev)
    switch (ev.type) {
      case 'activate':
        this.overlay.toast(this.settings.inputMode === 'head' ? 'GestureOS on · move your head, open your mouth to click' : 'GestureOS on · point to move, pinch to click')
        break
      case 'deactivate':
        this.overlay.toast(this.settings.inputMode === 'head' ? 'Paused · close your eyes for a moment to resume' : 'Paused · hold an open palm to resume')
        this.endDrag()
        break
      case 'rightClick':
        this.rightClick(this.resolvePoint(ev.x, ev.y))
        break
      case 'custom': {
        const g = this.settings.customGestures.find((c) => c.id === ev.id)
        if (g) this.runAction(g.action, g.param, g.name)
        break
      }
      case 'click':
        this.click(this.resolvePoint(ev.x, ev.y))
        break
      case 'dragStart':
        this.startDrag(this.resolvePoint(ev.x, ev.y))
        break
      case 'dragEnd':
        this.endDrag()
        break
      case 'scroll':
        this.scroll(ev.dy)
        break
      case 'swipe': {
        if (this.hooks.onSwipe?.(ev.dir)) break
        // Swiping over a video scrubs it instead of leaving the page.
        const video = this.elementAt(this.shown.x, this.shown.y)?.closest('video, [class*="player"]')
        const media = video instanceof HTMLVideoElement ? video : (video?.querySelector('video') ?? null)
        if (media) {
          media.currentTime = Math.max(0, media.currentTime + (ev.dir === 'left' ? 10 : -10))
          this.overlay.toast(ev.dir === 'left' ? '+10 s' : '−10 s')
          break
        }
        if (this.settings.swipeNavigation) {
          this.overlay.toast(ev.dir === 'right' ? '← Back' : 'Forward →')
          if (ev.dir === 'right') history.back()
          else history.forward()
        }
        break
      }
      case 'zoom':
        if (this.hooks.onZoom?.(ev.factor)) break
        this.hooks.onTabAction?.('zoom', ev.factor)
        break
      case 'macro':
        this.macro(ev.pose)
        break
    }
  }

  private resolvePoint(nx: number, ny: number) {
    // A snapped target gets clicked dead-center, which is what the user was aiming at.
    if (this.snapEl) {
      const r = this.snapEl.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    }
    return { x: nx * window.innerWidth, y: ny * window.innerHeight }
  }

  private elementAt(x: number, y: number) {
    return document.elementFromPoint(x, y)
  }

  private clickableAt(x: number, y: number) {
    return this.elementAt(x, y)?.closest(CLICKABLE) ?? null
  }

  private fire(el: Element, type: string, x: number, y: number, buttons = 0) {
    const init = {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: x,
      clientY: y,
      screenX: x,
      screenY: y,
      button: 0,
      buttons,
      view: window,
      detail: type === 'click' ? 1 : 0,
    }
    const ev = type.startsWith('pointer')
      ? new PointerEvent(type, { ...init, pointerId: 1, pointerType: 'mouse', isPrimary: true })
      : new MouseEvent(type, init)
    el.dispatchEvent(ev)
  }

  private click({ x, y }: { x: number; y: number }) {
    const key = this.keyboard.keyAt(x, y)
    if (key) {
      this.keyboard.press(key)
      this.dwell.locked = true
      return
    }
    const el = this.elementAt(x, y)
    if (!el) return
    this.fire(el, 'pointerdown', x, y, 1)
    this.fire(el, 'mousedown', x, y, 1)
    const focusable = el.closest('input, textarea, select, button, a[href], [tabindex]') as HTMLElement | null
    focusable?.focus({ preventScroll: true })
    this.fire(el, 'pointerup', x, y)
    this.fire(el, 'mouseup', x, y)
    this.fire(el, 'click', x, y)
    // Two clicks close together in time and place are a double-click.
    const now = performance.now()
    if (now - this.lastClick.t < 450 && Math.hypot(x - this.lastClick.x, y - this.lastClick.y) < 24) {
      el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, detail: 2, view: window }))
      this.lastClick.t = 0
    } else this.lastClick = { t: now, x, y }
    this.dwell.locked = true
  }

  private rightClick({ x, y }: { x: number; y: number }) {
    const el = this.elementAt(x, y)
    if (!el) return
    const init = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 2, buttons: 2, view: window }
    el.dispatchEvent(new PointerEvent('pointerdown', { ...init, pointerId: 1, pointerType: 'mouse', isPrimary: true }))
    el.dispatchEvent(new MouseEvent('mousedown', init))
    el.dispatchEvent(new PointerEvent('pointerup', { ...init, buttons: 0, pointerId: 1, pointerType: 'mouse', isPrimary: true }))
    el.dispatchEvent(new MouseEvent('mouseup', { ...init, buttons: 0 }))
    el.dispatchEvent(new MouseEvent('contextmenu', init))
    this.overlay.toast('Right-click')
  }

  private typeKey(k: KeyAction) {
    const el = this.editable && document.contains(this.editable) ? this.editable : null
    if (!el) {
      this.overlay.toast('Click a text field first, then type')
      return
    }
    el.focus({ preventScroll: true })
    switch (k.type) {
      case 'char':
        insertText(el, k.value)
        break
      case 'space':
        insertText(el, ' ')
        break
      case 'suggest': {
        const before = textBeforeCaret(el)
        const m = /([a-zA-Z']+)$/.exec(before)
        if (m) deleteBefore(el, m[1].length)
        insertText(el, k.value + ' ')
        break
      }
      case 'backspace':
        deleteBefore(el, 1)
        break
      case 'enter':
        if (el instanceof HTMLTextAreaElement || el.isContentEditable) insertText(el, '\n')
        else {
          el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }))
          ;(el as HTMLInputElement).form?.requestSubmit()
        }
        break
      case 'left':
      case 'right':
        moveCaret(el, k.type === 'left' ? -1 : 1)
        break
    }
    this.keyboard.setContext(textBeforeCaret(el))
  }

  private startDrag({ x, y }: { x: number; y: number }) {
    const el = this.elementAt(x, y)
    if (!el) return
    this.dragEl = el
    this.fire(el, 'pointerdown', x, y, 1)
    this.fire(el, 'mousedown', x, y, 1)
  }

  private fireDragMove() {
    const { x, y } = this.shown
    const el = this.elementAt(x, y) ?? this.dragEl!
    this.fire(el, 'pointermove', x, y, 1)
    this.fire(el, 'mousemove', x, y, 1)
  }

  private endDrag() {
    if (!this.dragEl) return
    const { x, y } = this.shown
    const el = this.elementAt(x, y) ?? this.dragEl
    this.fire(el, 'pointerup', x, y)
    this.fire(el, 'mouseup', x, y)
    this.dragEl = null
  }

  private hover(x: number, y: number) {
    const el = this.elementAt(x, y)
    if (!el) return
    if (el !== this.hoverEl) {
      if (this.hoverEl) {
        this.fire(this.hoverEl, 'pointerout', x, y)
        this.fire(this.hoverEl, 'mouseout', x, y)
      }
      this.fire(el, 'pointerover', x, y)
      this.fire(el, 'mouseover', x, y)
      this.hoverEl = el
    }
    if (!this.dragEl) {
      this.fire(el, 'pointermove', x, y)
      this.fire(el, 'mousemove', x, y)
    }
  }

  private scroll(dy: number) {
    const px = dy * window.innerHeight
    let el: Element | null = this.elementAt(this.shown.x, this.shown.y)
    while (el && el !== document.body && el !== document.documentElement) {
      const style = getComputedStyle(el)
      if (/(auto|scroll|overlay)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 1) {
        el.scrollBy({ top: px })
        return
      }
      el = el.parentElement
    }
    window.scrollBy({ top: px })
  }

  private findSnap(x: number, y: number, now: number) {
    if (now - this.candidatesAt > 500) {
      this.candidatesAt = now
      this.candidates = Array.from(document.querySelectorAll(CLICKABLE))
        .filter((el) => {
          const r = el.getBoundingClientRect()
          return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth && !(el as HTMLButtonElement).disabled
        })
        .slice(0, 800)
    }
    let best: { el: Element; d: number; r: DOMRect } | null = null
    for (const el of this.candidates) {
      const r = el.getBoundingClientRect()
      const dx = Math.max(r.left - x, 0, x - r.right)
      const dy = Math.max(r.top - y, 0, y - r.bottom)
      const d = Math.hypot(dx, dy)
      if (d < SNAP_RADIUS && (!best || d < best.d || (d === 0 && r.width * r.height < best.r.width * best.r.height))) best = { el, d, r }
    }
    if (!best) return null
    // Inside a target the cursor stays put; just outside, it's pulled toward the target's center.
    const pull = best.d === 0 ? 0 : 0.55 * (1 - best.d / SNAP_RADIUS) + 0.2
    return { el: best.el, cx: best.r.left + best.r.width / 2, cy: best.r.top + best.r.height / 2, pull }
  }

  private updateDwell(x: number, y: number, now: number, overTarget: boolean) {
    const d = this.dwell
    const moved = Math.hypot(x - d.x, y - d.y)
    if (d.locked) {
      if (moved > DWELL_REARM_PX) d.locked = false
      else return 0
    }
    if (moved > DWELL_STILL_PX || !overTarget) {
      d.x = x
      d.y = y
      d.since = now
      return 0
    }
    const progress = (now - d.since) / this.settings.dwellMs
    if (progress >= 1) {
      const p = this.snapEl ? this.resolvePoint(0, 0) : { x, y }
      this.click(p)
      this.hooks.onEvent?.({ type: 'dwellClick', x: p.x, y: p.y })
      d.locked = true
      d.x = x
      d.y = y
      return 0
    }
    return progress
  }

  private media(): HTMLMediaElement | null {
    const all = Array.from(document.querySelectorAll('video, audio')) as HTMLMediaElement[]
    let best: HTMLMediaElement | null = null
    let area = -1
    for (const m of all) {
      const r = m.getBoundingClientRect()
      const a = m instanceof HTMLVideoElement ? r.width * r.height : 1
      if (a > area) {
        area = a
        best = m
      }
    }
    return best
  }

  private macro(pose: MacroPose) {
    const action = this.settings.macros[pose]
    if (action === 'none') return
    if (this.hooks.onMacro?.(pose, action)) return
    this.runAction(action)
  }

  runAction(action: MacroAction, param?: string, label?: string) {
    const m = this.media()
    if (action.startsWith('media-') && !m) {
      this.overlay.toast('No video on this page')
      return
    }
    const say = (text: string) => this.overlay.toast(label ? `${label} · ${text}` : text)
    switch (action) {
      case 'none':
        return
      case 'media-toggle':
        if (m!.paused) void m!.play()
        else m!.pause()
        return say(m!.paused ? 'Paused video' : 'Playing video')
      case 'media-mute':
        m!.muted = !m!.muted
        return say(m!.muted ? 'Muted' : 'Unmuted')
      case 'media-forward':
        m!.currentTime += 10
        return say('+10 s')
      case 'media-back':
        m!.currentTime = Math.max(0, m!.currentTime - 10)
        return say('−10 s')
      case 'scroll-top':
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return say('Back to top')
      case 'reload':
        location.reload()
        return
      case 'history-back':
        say('← Back')
        history.back()
        return
      case 'history-forward':
        say('Forward →')
        history.forward()
        return
      case 'keyboard':
        this.keyboard.toggle()
        return say(this.keyboard.visible ? 'Keyboard on' : 'Keyboard hidden')
      case 'key': {
        if (!param) return
        const target = (document.activeElement as HTMLElement | null) ?? document.body
        const init = { key: param, code: codeFor(param), bubbles: true, cancelable: true, composed: true }
        target.dispatchEvent(new KeyboardEvent('keydown', init))
        target.dispatchEvent(new KeyboardEvent('keyup', init))
        return say(`Pressed ${param}`)
      }
      case 'url': {
        const url = param ? safeUrl(param) : null
        if (!url) return say('That address can’t be opened')
        say('Opening…')
        if (this.hooks.onTabAction) this.hooks.onTabAction('open-url', url)
        else window.open(url, '_blank', 'noopener')
        return
      }
      case 'next-tab':
      case 'prev-tab':
        this.hooks.onTabAction?.(action)
        return say(MACRO_LABELS[action])
    }
  }
}



function isEditable(el: Element | null): el is HTMLElement {
  if (!el) return false
  if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled
  if (el instanceof HTMLInputElement) return /^(text|search|email|url|tel|password|number|)$/.test(el.type) && !el.readOnly && !el.disabled
  return (el as HTMLElement).isContentEditable
}

function textBeforeCaret(el: HTMLElement) {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el.value.slice(0, el.selectionStart ?? el.value.length)
  const sel = getSelection()
  if (!sel?.rangeCount) return el.textContent ?? ''
  const r = sel.getRangeAt(0).cloneRange()
  r.selectNodeContents(el)
  r.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset)
  return r.toString()
}

// Inserts text the way typing would, so frameworks listening for input events see the change.
function insertText(el: HTMLElement, text: string) {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? start
    try {
      el.setRangeText(text, start, end, 'end')
    } catch {
      el.value += text
    }
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }))
  } else document.execCommand('insertText', false, text)
}

function deleteBefore(el: HTMLElement, n: number) {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? start
    const from = start === end ? Math.max(0, start - n) : start
    try {
      el.setRangeText('', from, end, 'end')
    } catch {
      el.value = el.value.slice(0, -n)
    }
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }))
  } else for (let i = 0; i < n; i++) document.execCommand('delete')
}

function moveCaret(el: HTMLElement, dir: number) {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    try {
      const p = Math.max(0, Math.min(el.value.length, (el.selectionStart ?? 0) + dir))
      el.setSelectionRange(p, p)
    } catch {
      // Some input types (email, number) don't expose a caret.
    }
  } else getSelection()?.modify('move', dir < 0 ? 'backward' : 'forward', 'character')
}

function codeFor(key: string) {
  if (/^[a-z]$/i.test(key)) return `Key${key.toUpperCase()}`
  if (/^[0-9]$/.test(key)) return `Digit${key}`
  return key === ' ' ? 'Space' : key
}
