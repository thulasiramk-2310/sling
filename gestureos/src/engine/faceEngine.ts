import { OneEuro } from './oneEuro'
import { DEFAULT_SETTINGS, type Settings } from './settings'
import type { Frame, GestureEvent, HoldKind, Point, Pose } from './types'

export interface FaceInput {
  landmarks: Point[]
  // MediaPipe blendshape scores, 0..1 (jawOpen, mouthSmileLeft, browInnerUp, eyeBlinkLeft, …).
  blend: Record<string, number>
}

const MOUTH_ON = 0.45
const MOUTH_OFF = 0.28
const CLICK_MAX_MS = 600
const OPEN_FREEZE_MS = 260
const SMILE_ON = 0.6
const SMILE_MS = 500
const BROWS_ON = 0.55
const EYES_ON = 0.55
const EYES_MS = 1200
const BASE_GAIN = 7

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

// Head pointer for people who can't use their hands: the nose steers, the face clicks.
export class FaceEngine {
  private settings: Settings = DEFAULT_SETTINGS
  private fx = new OneEuro(0.8, 3)
  private fy = new OneEuro(0.8, 3)
  private active = true
  private neutral: Point | null = null
  private cursor: Point | null = null
  private mouthOpen = false
  private mouthSince = 0
  private pressAt: Point | null = null
  private dragging = false
  private smileSince: number | null = null
  private smileFired = false
  private eyesSince: number | null = null
  private eyesFired = false

  setSettings(s: Settings) {
    this.settings = s
  }

  setActive(active: boolean) {
    this.active = active
    this.neutral = null
  }

  isActive() {
    return this.active
  }

  // Treat the current head position as straight ahead.
  recenter() {
    this.neutral = null
  }

  update(face: FaceInput | null, t: number): Frame {
    const events: GestureEvent[] = []
    if (!face) {
      if (this.dragging && this.cursor) events.push({ type: 'dragEnd', x: this.cursor.x, y: this.cursor.y })
      this.dragging = false
      this.mouthOpen = false
      this.pressAt = null
      return this.frame(t, 0, 'none', events, null, 0)
    }
    const b = face.blend
    const nose = { x: 1 - face.landmarks[1].x, y: face.landmarks[1].y }
    if (!this.neutral) this.neutral = { ...nose }

    // Eyes closed long enough toggles GestureOS on and off, so the user can rest without the cursor reacting.
    const eyes = Math.min(b.eyeBlinkLeft ?? 0, b.eyeBlinkRight ?? 0) > EYES_ON
    let holdKind: HoldKind = null
    let holdProgress = 0
    if (eyes) {
      this.eyesSince ??= t
      holdKind = this.active ? 'deactivate' : 'activate'
      holdProgress = clamp01((t - this.eyesSince) / EYES_MS)
      if (holdProgress >= 1 && !this.eyesFired) {
        this.eyesFired = true
        this.active = !this.active
        this.neutral = { ...nose }
        events.push({ type: this.active ? 'activate' : 'deactivate' })
      }
      return this.frame(t, 1, 'none', events, { kind: holdKind, progress: holdProgress }, 0)
    }
    this.eyesSince = null
    this.eyesFired = false

    const jaw = b.jawOpen ?? 0
    const smile = ((b.mouthSmileLeft ?? 0) + (b.mouthSmileRight ?? 0)) / 2
    const brows = b.browInnerUp ?? 0
    const gain = BASE_GAIN * this.settings.headGain

    if (this.active && brows > BROWS_ON && !this.mouthOpen) {
      // Raised eyebrows turn head tilt into scrolling, like holding a scroll wheel.
      const dy = nose.y - this.neutral.y
      if (Math.abs(dy) > 0.01) events.push({ type: 'scroll', dy: dy * 0.6 * this.settings.scrollSpeed })
      return this.frame(t, 1, 'scroll', events, { kind: 'scroll', progress: 1 }, 0)
    }

    const freeze = this.mouthOpen && t - this.mouthSince < OPEN_FREEZE_MS
    if (!freeze) {
      const x = this.fx.filter(clamp01(0.5 + (nose.x - this.neutral.x) * gain), t)
      const y = this.fy.filter(clamp01(0.5 + (nose.y - this.neutral.y) * gain * 1.25), t)
      this.cursor = { x, y }
    }

    if (!this.active) return this.frame(t, 1, 'point', events, null, 0)

    const open = this.mouthOpen ? jaw > MOUTH_OFF : jaw > MOUTH_ON
    if (open && !this.mouthOpen && this.cursor) {
      this.mouthSince = t
      this.pressAt = { ...this.cursor }
    } else if (open && this.pressAt && !this.dragging && t - this.mouthSince > CLICK_MAX_MS) {
      this.dragging = true
      events.push({ type: 'dragStart', x: this.pressAt.x, y: this.pressAt.y })
    } else if (!open && this.mouthOpen && this.pressAt) {
      if (this.dragging && this.cursor) events.push({ type: 'dragEnd', x: this.cursor.x, y: this.cursor.y })
      else events.push({ type: 'click', x: this.pressAt.x, y: this.pressAt.y })
      this.dragging = false
      this.pressAt = null
    }
    this.mouthOpen = open

    if (smile > SMILE_ON && !open) {
      this.smileSince ??= t
      holdKind = 'macro'
      holdProgress = clamp01((t - this.smileSince) / SMILE_MS)
      if (holdProgress >= 1 && !this.smileFired && this.cursor) {
        this.smileFired = true
        events.push({ type: 'rightClick', x: this.cursor.x, y: this.cursor.y })
      }
    } else {
      this.smileSince = null
      this.smileFired = false
    }

    const pose: Pose = open ? 'pinch' : smile > SMILE_ON ? 'smile' : 'point'
    return this.frame(t, 1, pose, events, holdKind ? { kind: holdKind, progress: holdProgress } : null, open ? 1 : clamp01(jaw / MOUTH_ON))
  }

  private frame(t: number, hands: number, pose: Pose, events: GestureEvent[], hold: { kind: HoldKind; progress: number } | null, pinch: number): Frame {
    return {
      t,
      hands,
      active: this.active,
      pose,
      cursor: hands ? this.cursor : null,
      pinch,
      dragging: this.dragging,
      hold: hold ?? { kind: null, progress: 0 },
      events,
    }
  }
}
