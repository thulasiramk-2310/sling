import { FaceLandmarker, FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import type { FaceInput } from './faceEngine'
import { loadModel, type Progress } from './assets'
import type { Point } from './types'

export interface Tracker {
  video: HTMLVideoElement
  stop: () => void
}

export const HAND_CONNECTIONS = HandLandmarker.HAND_CONNECTIONS

async function createLandmarker(assetBase: string, onProgress?: Progress) {
  const modelAssetBuffer = await loadModel(assetBase, 'hand_landmarker.task', onProgress)
  const fileset = await FilesetResolver.forVisionTasks(`${assetBase}mediapipe`)
  const options = (delegate: 'GPU' | 'CPU') => ({
    baseOptions: { modelAssetBuffer, delegate },
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

async function openCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
    audio: false,
  })
  const video = document.createElement('video')
  video.srcObject = stream
  video.muted = true
  video.playsInline = true
  await video.play()
  return { stream, video }
}

// Paces detection: animation frames for visible pages, a worker for hidden ones (the extension's
// offscreen page gets no animation frames and throttled timers). On slow machines it leaves the
// thread idle at least as long as the last detection took, so the page stays responsive.
function runLoop(video: HTMLVideoElement, detect: (t: number) => void, useTimer?: boolean) {
  let stopped = false
  let handle = 0
  let lastVideoTime = -1
  let cost = 0
  let lastEnd = 0
  let ticker: Worker | null = null
  const step = () => {
    if (stopped || video.readyState < 2 || video.currentTime === lastVideoTime) return
    const t = performance.now()
    if (t - lastEnd < cost) return
    lastVideoTime = video.currentTime
    detect(t)
    lastEnd = performance.now()
    cost = cost * 0.8 + (lastEnd - t) * 0.2
  }
  if (useTimer) {
    ticker = new Worker(new URL('./ticker.worker.ts', import.meta.url), { type: 'module' })
    ticker.onmessage = step
  } else {
    const loop = () => {
      if (stopped) return
      handle = requestAnimationFrame(loop)
      step()
    }
    handle = requestAnimationFrame(loop)
  }
  return () => {
    stopped = true
    ticker?.terminate()
    cancelAnimationFrame(handle)
  }
}

// Opens the webcam and runs hand landmark detection on-device. Video frames never leave the browser.
export async function startTracker(opts: {
  assetBase: string
  onFrame: (hands: Point[][], t: number) => void
  useTimer?: boolean
  onProgress?: Progress
}): Promise<Tracker> {
  const { stream, video } = await openCamera()
  let landmarker: HandLandmarker
  try {
    landmarker = await createLandmarker(opts.assetBase, opts.onProgress)
  } catch (err) {
    stream.getTracks().forEach((t) => t.stop())
    throw err
  }
  const stopLoop = runLoop(video, (t) => opts.onFrame(landmarker.detectForVideo(video, t).landmarks, t), opts.useTimer)
  return {
    video,
    stop: () => {
      stopLoop()
      stream.getTracks().forEach((t) => t.stop())
      landmarker.close()
    },
  }
}

// Same camera pipeline for head-pointer mode, with face landmarks and expression scores.
export async function startFaceTracker(opts: {
  assetBase: string
  onFrame: (face: FaceInput | null, t: number) => void
  useTimer?: boolean
  onProgress?: Progress
}): Promise<Tracker> {
  const { stream, video } = await openCamera()
  let landmarker: FaceLandmarker
  try {
    const modelAssetBuffer = await loadModel(opts.assetBase, 'face_landmarker.task', opts.onProgress)
    const fileset = await FilesetResolver.forVisionTasks(`${opts.assetBase}mediapipe`)
    const make = (delegate: 'GPU' | 'CPU') =>
      FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetBuffer, delegate },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
      })
    landmarker = await make('GPU').catch(() => make('CPU'))
  } catch (err) {
    stream.getTracks().forEach((t) => t.stop())
    throw err
  }
  const stopLoop = runLoop(
    video,
    (t) => {
      const r = landmarker.detectForVideo(video, t)
      const lm = r.faceLandmarks[0]
      if (!lm) return opts.onFrame(null, t)
      const blend: Record<string, number> = {}
      for (const c of r.faceBlendshapes[0]?.categories ?? []) blend[c.categoryName] = c.score
      opts.onFrame({ landmarks: lm, blend }, t)
    },
    opts.useTimer,
  )
  return {
    video,
    stop: () => {
      stopLoop()
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

export function drawFace(canvas: HTMLCanvasElement, face: { landmarks: Point[] } | null, color = '#2f5bea') {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (!face) return
  ctx.fillStyle = color
  for (let i = 0; i < face.landmarks.length; i += 2) {
    const p = face.landmarks[i]
    ctx.fillRect(p.x * canvas.width - 1, p.y * canvas.height - 1, 2, 2)
  }
  const nose = face.landmarks[1]
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(nose.x * canvas.width, nose.y * canvas.height, Math.max(4, canvas.width / 90), 0, Math.PI * 2)
  ctx.fill()
}
