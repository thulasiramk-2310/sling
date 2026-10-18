import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
import type { Landmark } from './body'

export interface PoseCamera {
  video: HTMLVideoElement
  latest: () => Landmark[] | null
  stop: () => void
}

// Webcam + on-device pose estimation. Frames are processed locally and never uploaded.
export async function startPoseCamera(assetBase: string): Promise<PoseCamera> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 960 }, height: { ideal: 720 }, facingMode: 'user' },
    audio: false,
  })
  const video = document.createElement('video')
  video.srcObject = stream
  video.muted = true
  video.playsInline = true
  await video.play()

  let landmarker: PoseLandmarker
  try {
    const fileset = await FilesetResolver.forVisionTasks(`${assetBase}mediapipe`)
    const make = (delegate: 'GPU' | 'CPU') =>
      PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: `${assetBase}models/pose_landmarker_lite.task`, delegate },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
    landmarker = await make('GPU').catch(() => make('CPU'))
  } catch (err) {
    stream.getTracks().forEach((t) => t.stop())
    throw err
  }

  let latest: Landmark[] | null = null
  let lastTime = -1
  let raf = 0
  let stopped = false
  const loop = () => {
    if (stopped) return
    raf = requestAnimationFrame(loop)
    if (video.readyState < 2 || video.currentTime === lastTime) return
    lastTime = video.currentTime
    const result = landmarker.detectForVideo(video, performance.now())
    latest = result.landmarks[0] ?? null
  }
  raf = requestAnimationFrame(loop)

  return {
    video,
    latest: () => latest,
    stop: () => {
      stopped = true
      cancelAnimationFrame(raf)
      stream.getTracks().forEach((t) => t.stop())
      landmarker.close()
    },
  }
}
