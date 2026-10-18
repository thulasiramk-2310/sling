import { featureDistance, handFeatures } from './features'
import { analyzeHand, type HandInfo } from './hand'
import { OneEuro } from './oneEuro'
import { DEFAULT_SETTINGS, type Settings } from './settings'
import type { Frame, GestureEvent, HoldKind, MacroPose, Point, Pose } from './types'

const PINCH_APPROACH = 0.6
const ACTIVATE_MS = 800
const DEACTIVATE_MS = 800
const MACRO_MS = 650
const MACRO_COOLDOWN_MS = 1200
const CLICK_MAX_MS = 450
const DRAG_START_MOVE = 0.02
const SWIPE_WINDOW_MS = 320
const SWIPE_DISTANCE = 0.2
const SWIPE_COOLDOWN_MS = 900
const STILL_RADIUS = 0.045
const POSE_STABLE_FRAMES = 3

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const MACRO_POSES: readonly Pose[] = ['thumbsUp', 'victory', 'rock']

// Turns per-frame hand landmarks into a cursor and discrete, intent-checked gesture events.
export class GestureEngine {
  private settings: Settings = DEFAULT_SETTINGS
  private fx = new OneEuro()
  private fy = new OneEuro()
  private active = false
  private cursor: Point | null = null
  private pinched: boolean[] = []
  private pinchStart: { t: number; x: number; y: number } | null = null
  private dragging = false
  private zooming = false
  private prevSpread: number | null = null
  private pose: Pose = 'none'
  private candidate: Pose = 'none'
  private candidateFrames = 0
  private poseSince = 0
  private holdAnchor: Point | null = null
  private macroFired = false
  private lastMacroAt = -Infinity
  private lastScrollY: number | null = null
  private swipeTrail: { t: number; x: number; y: number }[] = []
  private lastSwipeAt = -Infinity
  private rightPinched = false

  setSettings(settings: Settings) {
    this.settings = settings
    this.fx.minCutoff = this.fy.minCutoff = 1.6 / settings.smoothing
  }

  isActive() {
    return this.active
  }

  setActive(active: boolean) {
    this.active = active
  }

  update(handsLandmarks: Point[][], t: number): Frame {
    const events: GestureEvent[] = []
    const hands = handsLandmarks.map(analyzeHand)

    if (hands.length === 0) {
      this.releasePinch(events, t, true)
      this.reset()
      return this.frame(t, 0, events, null, 0)
    }

    // Per-hand pinch with hysteresis; hands are ordered by screen x so the index stays stable.
    const { pinchOn, pinchOff } = this.settings.calibration
    const order = hands.map((h, i) => ({ h, i })).sort((a, b) => a.h.palm.x - b.h.palm.x)
    const pinch = order.map(({ h }, k) =>
      h.indexReach < 0.28 ? false : this.pinched[k] ? h.pinchRatio < pinchOff : h.pinchRatio < pinchOn,
    )
    this.pinched = pinch

    if (this.active && order.length >= 2 && pinch[0] && pinch[1]) {
      this.handleZoom(order[0].h, order[1].h, events)
      return this.frame(t, hands.length, events, null, 1)
    }
    this.prevSpread = null
    if (this.zooming && !pinch.some(Boolean)) this.zooming = false

    const k = this.primaryIndex(order.map((o) => o.h))
    const hand = order[k].h
    const isPinched = pinch[k] && !this.zooming
    const pose = this.stablePose(this.classify(hand, isPinched, handsLandmarks[order[k].i]), t)

    let holdKind: HoldKind = null
    let holdProgress = 0

    if (!this.active) {
      if (pose === 'open' && this.isStill(hand.palm, t)) {
        holdKind = 'activate'
        holdProgress = clamp01((t - this.poseSince) / ACTIVATE_MS)
        if (holdProgress >= 1) {
          this.active = true
          this.holdAnchor = null
          events.push({ type: 'activate' })
        }
      } else if (pose !== 'open') this.holdAnchor = null
      this.trackCursor(hand, pose, t)
      return this.frame(t, hands.length, events, { kind: holdKind, progress: holdProgress }, this.pinchStrength(hand))
    }

    if (pose === 'fist') {
      holdKind = 'deactivate'
      holdProgress = clamp01((t - this.poseSince) / DEACTIVATE_MS)
      if (holdProgress >= 1) {
        this.active = false
        this.releasePinch(events, t, true)
        events.push({ type: 'deactivate' })
      }
    }

    const isCustom = pose.startsWith('custom:')
    if (MACRO_POSES.includes(pose) || isCustom) {
      holdKind = 'macro'
      holdProgress = clamp01((t - this.poseSince) / MACRO_MS)
      if (holdProgress >= 1 && !this.macroFired && t - this.lastMacroAt > MACRO_COOLDOWN_MS) {
        this.macroFired = true
        this.lastMacroAt = t
        events.push(isCustom ? { type: 'custom', id: pose.slice(7) } : { type: 'macro', pose: pose as MacroPose })
      }
    }

    // Thumb to middle finger is a right-click, kept apart from the thumb-to-index click.
    const rightNow = !isPinched && hand.index && (this.rightPinched ? hand.middlePinchRatio < pinchOff : hand.middlePinchRatio < pinchOn)
    if (rightNow && !this.rightPinched && this.cursor) events.push({ type: 'rightClick', x: this.cursor.x, y: this.cursor.y })
    this.rightPinched = rightNow

    if (pose === 'scroll') {
      const y = hand.twoFinger.y
      if (this.lastScrollY !== null) {
        const dy = y - this.lastScrollY
        if (Math.abs(dy) > 0.002) events.push({ type: 'scroll', dy: -dy * 2.4 * this.settings.scrollSpeed })
      }
      this.lastScrollY = y
    } else {
      this.lastScrollY = null
      this.trackCursor(hand, pose, t)
    }

    if (pose === 'open') this.detectSwipe(hand.palm, t, events)
    else this.swipeTrail = []

    if (isPinched && !this.pinchStart && this.cursor) {
      this.pinchStart = { t, x: this.cursor.x, y: this.cursor.y }
    } else if (isPinched && this.pinchStart && this.cursor && !this.dragging) {
      const moved = Math.hypot(this.cursor.x - this.pinchStart.x, this.cursor.y - this.pinchStart.y)
      if (moved > DRAG_START_MOVE || t - this.pinchStart.t > CLICK_MAX_MS) {
        this.dragging = true
        events.push({ type: 'dragStart', x: this.pinchStart.x, y: this.pinchStart.y })
      }
    } else if (!isPinched) {
      this.releasePinch(events, t, false)
    }

    return this.frame(t, hands.length, events, { kind: holdKind, progress: holdProgress }, this.pinchStrength(hand))
  }

  private classify(h: HandInfo, pinched: boolean, lm: Point[]): Pose {
    if (pinched) return 'pinch'
    const custom = this.matchCustom(lm)
    if (custom) return `custom:${custom}`
    const { index, middle, ring, pinky } = h
    if (index && middle && ring && pinky) return 'open'
    if (index && middle && !ring && !pinky) return h.spread < 0.38 ? 'scroll' : 'victory'
    if (index && !middle && !ring && pinky) return 'rock'
    if (index && !middle && !ring && !pinky) return 'point'
    if (!index && !middle && !ring && !pinky) return h.thumbUp ? 'thumbsUp' : 'fist'
    return 'unknown'
  }

  private matchCustom(lm: Point[]) {
    const list = this.settings.customGestures
    if (!list.length) return null
    const f = handFeatures(lm)
    let best: { id: string; d: number } | null = null
    for (const g of list) {
      const d = featureDistance(f, g.template) / g.radius
      if (d < 1 && (!best || d < best.d)) best = { id: g.id, d }
    }
    return best?.id ?? null
  }

  // Poses must hold for a few frames before they count, except pinch which needs to feel instant.
  private stablePose(raw: Pose, t: number): Pose {
    if (raw === 'pinch' || raw === this.pose) {
      this.candidate = raw
      this.candidateFrames = 0
      if (raw !== this.pose) this.setPose(raw, t)
      return this.pose
    }
    if (raw === this.candidate) this.candidateFrames++
    else {
      this.candidate = raw
      this.candidateFrames = 1
    }
    if (this.candidateFrames >= POSE_STABLE_FRAMES) this.setPose(raw, t)
    return this.pose
  }

  private setPose(pose: Pose, t: number) {
    this.pose = pose
    this.poseSince = t
    this.macroFired = false
    this.holdAnchor = null
  }

  // A hold only counts while the hand stays put; moving restarts the timer.
  private isStill(p: Point, t: number) {
    if (!this.holdAnchor) {
      this.holdAnchor = { ...p }
      return true
    }
    if (Math.hypot(p.x - this.holdAnchor.x, p.y - this.holdAnchor.y) > STILL_RADIUS) {
      this.holdAnchor = { ...p }
      this.poseSince = t
      return false
    }
    return true
  }

  private trackCursor(h: HandInfo, pose: Pose, t: number) {
    const s = this.settings.sensitivity
    // A calibrated comfort zone maps the user's own reach to the full screen.
    const box = this.settings.calibration.box ?? { x0: 0.5 - 0.35 / s, x1: 0.5 + 0.35 / s, y0: 0.42 - 0.3 / s, y1: 0.42 + 0.3 / s }
    const tx = clamp01((h.anchor.x - box.x0) / (box.x1 - box.x0))
    const ty = clamp01((h.anchor.y - box.y0) / (box.y1 - box.y0))
    let x = this.fx.filter(tx, t)
    let y = this.fy.filter(ty, t)
    // Smart intent: as the fingers close in for a click, damp motion so the click lands where you aimed.
    if (this.cursor && pose !== 'pinch' && h.pinchRatio < PINCH_APPROACH) {
      x = this.cursor.x + (x - this.cursor.x) * 0.3
      y = this.cursor.y + (y - this.cursor.y) * 0.3
    }
    this.cursor = { x, y }
  }

  private detectSwipe(p: Point, t: number, events: GestureEvent[]) {
    this.swipeTrail.push({ t, x: p.x, y: p.y })
    while (this.swipeTrail.length && t - this.swipeTrail[0].t > SWIPE_WINDOW_MS) this.swipeTrail.shift()
    if (t - this.lastSwipeAt < SWIPE_COOLDOWN_MS || this.swipeTrail.length < 3) return
    const first = this.swipeTrail[0]
    const dx = p.x - first.x
    const dy = p.y - first.y
    if (Math.abs(dx) > SWIPE_DISTANCE && Math.abs(dy) < Math.abs(dx) * 0.5) {
      events.push({ type: 'swipe', dir: dx > 0 ? 'right' : 'left' })
      this.lastSwipeAt = t
      this.swipeTrail = []
      this.poseSince = t
    }
  }

  private handleZoom(a: HandInfo, b: HandInfo, events: GestureEvent[]) {
    this.zooming = true
    if (this.pinchStart && !this.dragging) this.pinchStart = null
    const spread = Math.hypot(b.pinchPoint.x - a.pinchPoint.x, b.pinchPoint.y - a.pinchPoint.y)
    if (this.prevSpread === null) this.prevSpread = spread
    const factor = spread / this.prevSpread
    if (Math.abs(factor - 1) > 0.03) {
      events.push({ type: 'zoom', factor })
      this.prevSpread = spread
    }
  }

  private releasePinch(events: GestureEvent[], t: number, lost: boolean) {
    if (!this.pinchStart) return
    if (this.dragging && this.cursor) events.push({ type: 'dragEnd', x: this.cursor.x, y: this.cursor.y })
    else if (!lost && t - this.pinchStart.t <= CLICK_MAX_MS) events.push({ type: 'click', x: this.pinchStart.x, y: this.pinchStart.y })
    this.pinchStart = null
    this.dragging = false
  }

  private primaryIndex(hands: HandInfo[]) {
    if (hands.length < 2 || !this.cursor) return 0
    const d = hands.map((h) => Math.hypot(h.anchor.x - this.cursor!.x, h.anchor.y - this.cursor!.y))
    return d[0] <= d[1] ? 0 : 1
  }

  private pinchStrength(h: HandInfo) {
    const on = this.settings.calibration.pinchOn
    return clamp01((PINCH_APPROACH - h.pinchRatio) / (PINCH_APPROACH - on))
  }

  private reset() {
    this.fx.reset()
    this.fy.reset()
    this.cursor = null
    this.pinched = []
    this.prevSpread = null
    this.zooming = false
    this.lastScrollY = null
    this.swipeTrail = []
    this.holdAnchor = null
    this.pose = 'none'
    this.candidate = 'none'
    this.candidateFrames = 0
    this.rightPinched = false
  }

  private frame(
    t: number,
    hands: number,
    events: GestureEvent[],
    hold: { kind: HoldKind; progress: number } | null,
    pinch: number,
  ): Frame {
    return {
      t,
      hands,
      active: this.active,
      pose: hands ? (this.zooming ? 'pinch' : this.pose) : 'none',
      cursor: this.cursor,
      pinch,
      dragging: this.dragging,
      hold: hold ?? { kind: null, progress: 0 },
      events,
    }
  }
}
