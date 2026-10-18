import type { Frame, GestureEvent, MacroPose } from '../engine/types'
import { MACRO_LABELS, type MacroAction, type Settings } from '../engine/settings'
import { Overlay } from './overlay'

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
  onTabAction?: (action: 'next-tab' | 'prev-tab' | 'zoom', value?: number) => void
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

  constructor(settings: Settings, hooks: ActuatorHooks = {}) {
    this.settings = settings
    this.hooks = hooks
    this.overlay = new Overlay(hooks.showPill ?? true)
    this.overlay.setSize(SIZES[settings.cursorSize])
    this.raf = requestAnimationFrame(this.tick)
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
    this.frame = frame
    this.visible = !!frame.cursor
    if (frame.cursor) {
      this.target.x = frame.cursor.x * window.innerWidth
      this.target.y = frame.cursor.y * window.innerHeight
    }
    this.overlay.setStatus(frame.active, frame.pose)
    for (const ev of frame.events) this.apply(ev)
    if (frame.dragging && this.dragEl) this.fireDragMove()
  }

  destroy() {
    cancelAnimationFrame(this.raf)
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
    if (active && this.visible && !f?.dragging && this.settings.snap) {
      const snapped = this.findSnap(x, y, now)
      if (snapped) {
        this.snapEl = snapped.el
        x += (snapped.cx - x) * snapped.pull
        y += (snapped.cy - y) * snapped.pull
      }
    }
    const highlightEl = this.snapEl ?? (active && this.visible ? this.clickableAt(x, y) : null)
    this.overlay.highlight(highlightEl && !f?.dragging ? highlightEl.getBoundingClientRect() : null)

    let progress = 0
    let color: string | undefined
    if (f?.hold.kind) {
      progress = f.hold.progress
      color = f.hold.kind === 'deactivate' ? '#e5484d' : f.hold.kind === 'activate' ? '#19b37d' : '#ff8a3d'
    } else if (active && this.settings.dwell && this.visible && !f?.dragging) {
      progress = this.updateDwell(x, y, now, !!highlightEl)
      color = '#2f5bea'
    }
    this.overlay.setCursorState({ active, pinch: f?.pinch ?? 0, dragging: !!f?.dragging, progress, progressColor: color })
    this.overlay.moveCursor(x, y, this.visible)
    if (active && this.visible) this.hover(x, y)
  }

  private apply(ev: GestureEvent) {
    this.hooks.onEvent?.(ev)
    switch (ev.type) {
      case 'activate':
        this.overlay.toast('GestureOS on · point to move, pinch to click')
        break
      case 'deactivate':
        this.overlay.toast('Paused · hold an open palm to resume')
        this.endDrag()
        break
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
      case 'swipe':
        if (this.hooks.onSwipe?.(ev.dir)) break
        if (this.settings.swipeNavigation) {
          this.overlay.toast(ev.dir === 'right' ? '← Back' : 'Forward →')
          if (ev.dir === 'right') history.back()
          else history.forward()
        }
        break
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
    const el = this.elementAt(x, y)
    if (!el) return
    this.fire(el, 'pointerdown', x, y, 1)
    this.fire(el, 'mousedown', x, y, 1)
    const focusable = el.closest('input, textarea, select, button, a[href], [tabindex]') as HTMLElement | null
    focusable?.focus({ preventScroll: true })
    this.fire(el, 'pointerup', x, y)
    this.fire(el, 'mouseup', x, y)
    this.fire(el, 'click', x, y)
    this.dwell.locked = true
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
    const m = this.media()
    const needMedia = action.startsWith('media-')
    if (needMedia && !m) {
      this.overlay.toast('No video on this page')
      return
    }
    switch (action) {
      case 'media-toggle':
        if (m!.paused) void m!.play()
        else m!.pause()
        this.overlay.toast(m!.paused ? 'Paused video' : 'Playing video')
        return
      case 'media-mute':
        m!.muted = !m!.muted
        this.overlay.toast(m!.muted ? 'Muted' : 'Unmuted')
        return
      case 'media-forward':
        m!.currentTime += 10
        this.overlay.toast('+10 s')
        return
      case 'media-back':
        m!.currentTime = Math.max(0, m!.currentTime - 10)
        this.overlay.toast('−10 s')
        return
      case 'scroll-top':
        window.scrollTo({ top: 0, behavior: 'smooth' })
        this.overlay.toast('Back to top')
        return
      case 'reload':
        location.reload()
        return
      case 'next-tab':
      case 'prev-tab':
        this.hooks.onTabAction?.(action)
        this.overlay.toast(MACRO_LABELS[action])
        return
    }
  }
}


