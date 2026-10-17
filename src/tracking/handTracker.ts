import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { input } from '../core/input'
import { useStore } from '../core/store'
import { GestureEngine } from './gestures'

const base = import.meta.env.BASE_URL

export const tracker = {
  video: null as HTMLVideoElement | null,
  stop: null as null | (() => void),
}

async function createLandmarker() {
  const fileset = await FilesetResolver.forVisionTasks(`${base}mediapipe`)
  const options = (delegate: 'GPU' | 'CPU') => ({
    baseOptions: { modelAssetPath: `${base}models/hand_landmarker.task`, delegate },
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

export async function startHandTracking() {
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
    landmarker = await createLandmarker()
  } catch (err) {
    stream.getTracks().forEach((t) => t.stop())
    throw err
  }

  const engine = new GestureEngine()
  let raf = 0
  let lastVideoTime = -1

  const loop = () => {
    raf = requestAnimationFrame(loop)
    if (video.readyState < 2 || video.currentTime === lastVideoTime) return
    lastVideoTime = video.currentTime
    const now = performance.now()
    const result = landmarker.detectForVideo(video, now)
    input.hands = result.landmarks
    const label = engine.update(result.landmarks, now)
    const s = useStore.getState()
    if (label !== s.gesture || result.landmarks.length !== s.handCount) {
      s.setGesture(label, result.landmarks.length)
    }
  }
  raf = requestAnimationFrame(loop)

  tracker.video = video
  tracker.stop = () => {
    cancelAnimationFrame(raf)
    stream.getTracks().forEach((t) => t.stop())
    landmarker.close()
    input.hands = []
    input.visible = false
    input.down = false
    tracker.video = null
    tracker.stop = null
  }
}

export const HAND_CONNECTIONS = HandLandmarker.HAND_CONNECTIONS
