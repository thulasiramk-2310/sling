import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import type { Point } from './types'

export interface Tracker {
  video: HTMLVideoElement
  stop: () => void
}

export const HAND_CONNECTIONS = HandLandmarker.HAND_CONNECTIONS

async function createLandmarker(assetBase: string) {
  const fileset = await FilesetResolver.forVisionTasks(`${assetBase}mediapipe`)
  const options = (delegate: 'GPU' | 'CPU') => ({
    baseOptions: { modelAssetPath: `${assetBase}models/hand_landmarker.task`, delegate },
    runningMode: 'VIDEO' as const,
    numHands: 2,
    minHandDetectionConfidence: 0.6,
    minHandPresenceConfidence: 0.6,
    minTrackingConfidence: 0.5,
  })
  try {
    return await HandLandmarker.createFromOptions(fileset, options('GPU'))
  } catch {
    return await HandLandmarker.createFromOptions(fileset, options('CPU'))
  }
}

// Opens the webcam and runs hand landmark detection on-device. Video frames never leave the browser.
export async function startTracker(opts: {
  assetBase: string
  onFrame: (hands: Point[][], t: number) => void
  // Hidden documents (the extension's offscreen page) get no animation frames and throttled timers, so a worker paces them.
  useTimer?: boolean
}): Promise<Tracker> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
    audio: false,
  })
  const video = document.createElement('video')
  video.srcObject = stream
  video.muted = true
  video.playsInline = true
  await video.play()

  let landmarker: HandLandmarker
  try {
    landmarker = await createLandmarker(opts.assetBase)
  } catch (err) {
    stream.getTracks().forEach((t) => t.stop())
    throw err
  }

  let stopped = false
  let handle = 0
  let lastVideoTime = -1
  let ticker: Worker | null = null
  let cost = 0
  let lastEnd = 0
  const detect = () => {
    if (stopped || video.readyState < 2 || video.currentTime === lastVideoTime) return
    const t = performance.now()
    // On slow machines, leave the thread idle at least as long as the last detection took so the page stays responsive.
    if (t - lastEnd < cost) return
    lastVideoTime = video.currentTime
    const result = landmarker.detectForVideo(video, t)
    lastEnd = performance.now()
    cost = cost * 0.8 + (lastEnd - t) * 0.2
    opts.onFrame(result.landmarks, t)
  }
  if (opts.useTimer) {
    ticker = new Worker(new URL('./ticker.worker.ts', import.meta.url), { type: 'module' })
    ticker.onmessage = detect
  } else {
    const loop = () => {
      if (stopped) return
      handle = requestAnimationFrame(loop)
      detect()
    }
    handle = requestAnimationFrame(loop)
  }

  return {
    video,
    stop: () => {
      stopped = true
      ticker?.terminate()
      cancelAnimationFrame(handle)
      stream.getTracks().forEach((t) => t.stop())
      landmarker.close()
    },
  }
}

export function drawHands(canvas: HTMLCanvasElement, hands: Point[][], color = '#2f5bea') {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.lineCap = 'round'
  for (const hand of hands) {
    ctx.strokeStyle = color
    ctx.lineWidth = Math.max(2, canvas.width / 160)
    ctx.beginPath()
    for (const { start, end } of HAND_CONNECTIONS) {
      ctx.moveTo(hand[start].x * canvas.width, hand[start].y * canvas.height)
      ctx.lineTo(hand[end].x * canvas.width, hand[end].y * canvas.height)
    }
    ctx.stroke()
    ctx.fillStyle = '#ffffff'
    for (const p of hand) {
      ctx.beginPath()
      ctx.arc(p.x * canvas.width, p.y * canvas.height, Math.max(2, canvas.width / 200), 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
