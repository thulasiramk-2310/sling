import type { Body, Landmark, StageMap } from './body'

// A posable stand-in used when the camera is off, so the fitting room works without anyone in frame.
export const MANNEQUIN_SOURCE = { w: 960, h: 720 }

export function mannequinPose(t: number): Landmark[] {
  const lm: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0 }))
  const sway = Math.sin(t / 1400) * 0.006
  const breathe = Math.sin(t / 900) * 0.003
  const set = (i: number, x: number, y: number) => (lm[i] = { x: x + sway, y, visibility: 0.99 })
  set(0, 0.5, 0.17)
  set(11, 0.6, 0.36 - breathe)
  set(12, 0.4, 0.36 - breathe)
  set(23, 0.565, 0.8)
  set(24, 0.435, 0.8)
  // Every few seconds the mannequin lifts an arm, which shows the sleeve following the elbow and wrist.
  const cycle = (t % 9000) / 9000
  const lift = cycle > 0.55 && cycle < 0.85 ? Math.sin(((cycle - 0.55) / 0.3) * Math.PI) : 0
  set(14, 0.355 - lift * 0.07, 0.56 - lift * 0.17)
  set(16, 0.36 - lift * 0.07, 0.75 - lift * 0.44)
  set(13, 0.645, 0.56)
  set(15, 0.64, 0.75)
  return lm
}

export function drawMannequin(ctx: CanvasRenderingContext2D, body: Body | null, map: StageMap, styles: { backdrop: string; floor: string; skin: string }) {
  const { width: w, height: h } = map
  const g = ctx.createRadialGradient(w / 2, h * 0.38, 0, w / 2, h * 0.45, Math.max(w, h) * 0.75)
  g.addColorStop(0, styles.backdrop)
  g.addColorStop(1, styles.floor)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  if (!body) return

  const sw = Math.hypot(body.shoulderL.x - body.shoulderR.x, body.shoulderL.y - body.shoulderR.y)
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.beginPath()
  ctx.ellipse(w / 2, Math.min(h - 8, body.hipL.y + sw * 1.6), sw * 1.1, sw * 0.12, 0, 0, Math.PI * 2)
  ctx.fill()

  const skin = ctx.createLinearGradient(body.shoulderR.x - sw * 0.4, 0, body.shoulderL.x + sw * 0.4, 0)
  skin.addColorStop(0, shadeHex(styles.skin, -0.18))
  skin.addColorStop(0.5, styles.skin)
  skin.addColorStop(1, shadeHex(styles.skin, -0.22))
  ctx.fillStyle = skin
  ctx.strokeStyle = skin
  ctx.lineCap = 'round'

  // Torso.
  ctx.beginPath()
  ctx.moveTo(body.shoulderR.x, body.shoulderR.y)
  ctx.quadraticCurveTo((body.shoulderL.x + body.shoulderR.x) / 2, body.shoulderR.y - sw * 0.08, body.shoulderL.x, body.shoulderL.y)
  ctx.quadraticCurveTo(body.shoulderL.x - sw * 0.02, (body.shoulderL.y + body.hipL.y) / 2, body.hipL.x + sw * 0.04, body.hipL.y + sw * 0.25)
  ctx.lineTo(body.hipR.x - sw * 0.04, body.hipR.y + sw * 0.25)
  ctx.quadraticCurveTo(body.shoulderR.x + sw * 0.02, (body.shoulderR.y + body.hipR.y) / 2, body.shoulderR.x, body.shoulderR.y)
  ctx.fill()

  // Neck and head.
  const neckX = (body.shoulderL.x + body.shoulderR.x) / 2
  const neckY = (body.shoulderL.y + body.shoulderR.y) / 2
  ctx.lineWidth = sw * 0.24
  ctx.beginPath()
  ctx.moveTo(neckX, neckY)
  ctx.lineTo(neckX, neckY - sw * 0.32)
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(neckX, neckY - sw * 0.6, sw * 0.2, sw * 0.26, 0, 0, Math.PI * 2)
  ctx.fill()

  // Arms.
  for (const [s, e, wr] of [
    [body.shoulderL, body.elbowL, body.wristL],
    [body.shoulderR, body.elbowR, body.wristR],
  ]) {
    ctx.lineWidth = sw * 0.17
    ctx.beginPath()
    ctx.moveTo(s.x, s.y + sw * 0.04)
    ctx.lineTo(e.x, e.y)
    ctx.lineTo(wr.x, wr.y)
    ctx.stroke()
  }
}

function shadeHex(hex: string, amt: number) {
  const n = parseInt(hex.replace('#', ''), 16)
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)))
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`
}
