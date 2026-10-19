import { FilesetResolver, PoseLandmarker, type PoseLandmarkerResult } from '@mediapipe/tasks-vision'
import type { Landmark } from './body'
import { loadModel, type Progress } from './assets'

export interface PersonMask {
  data: Float32Array
  width: number
  height: number
}

// Something to try clothes on: the live camera or a still photo of the shopper.
export interface PoseSource {
  // The exact image the latest landmarks were measured on. Drawing this (not the live video)
  // keeps the garment locked to the body instead of trailing a frame behind it.
  frame: HTMLCanvasElement
  latest: () => Landmark[] | null
  // Per-pixel "this is the person" confidence, used to replace the background.
  mask: () => PersonMask | null
  still: boolean
  stop: () => void
}

const MODEL = 'pose_landmarker_lite.task'
let modelBytes: Promise<Uint8Array> | null = null
let fileset: ReturnType<typeof FilesetResolver.forVisionTasks> | null = null
let photoLandmarker: Promise<PoseLandmarker> | null = null

async function create(assetBase: string, mode: 'VIDEO' | 'IMAGE', onProgress?: Progress) {
  modelBytes ??= loadModel(assetBase, MODEL, onProgress).catch((err) => {
    modelBytes = null
    throw err
  })
  fileset ??= FilesetResolver.forVisionTasks(`${assetBase}mediapipe`)
  const [modelAssetBuffer, files] = await Promise.all([modelBytes, fileset])
  const make = (delegate: 'GPU' | 'CPU') =>
    PoseLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetBuffer, delegate },
      runningMode: mode,
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputSegmentationMasks: true,
    })
  return make('GPU').catch(() => make('CPU'))
}

function readMask(result: PoseLandmarkerResult): PersonMask | null {
  const m = result.segmentationMasks?.[0]
  if (!m) return null
  const mask = { data: m.getAsFloat32Array().slice(), width: m.width, height: m.height }
  m.close()
  return mask
}

// Finds a person in a still image (a shopper's photo, or a model wearing a product).
export async function detectPhoto(assetBase: string, image: HTMLCanvasElement, onProgress?: Progress) {
  photoLandmarker ??= create(assetBase, 'IMAGE', onProgress).catch((err) => {
    photoLandmarker = null
    throw err
  })
  const result = (await photoLandmarker).detect(image)
  return { landmarks: (result.landmarks[0] as Landmark[] | undefined) ?? null, mask: readMask(result) }
}

// A shopper's own full-length photo as the fitting room: no camera needed, and the sharpest result.
export async function startPhotoSource(assetBase: string, image: HTMLCanvasElement, onProgress?: Progress): Promise<PoseSource> {
  const { landmarks, mask } = await detectPhoto(assetBase, image, onProgress)
  const shoulders = landmarks && Math.min(landmarks[11].visibility ?? 1, landmarks[12].visibility ?? 1)
  if (!landmarks || (shoulders ?? 0) < 0.5) throw new Error('no-person')
  return { frame: image, latest: () => landmarks, mask: () => mask, still: true, stop: () => {} }
}

// Webcam + on-device pose estimation. Frames are processed locally and never uploaded.
export async function startPoseCamera(assetBase: string, onProgress?: Progress): Promise<PoseSource> {
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
    landmarker = await create(assetBase, 'VIDEO', onProgress)
  } catch (err) {
    stream.getTracks().forEach((t) => t.stop())
    throw err
  }

  const frame = document.createElement('canvas')
  const fctx = frame.getContext('2d')!
  let latest: Landmark[] | null = null
  let mask: PersonMask | null = null
  let lastTime = -1
  let stopped = false
  let handle = 0
  // requestVideoFrameCallback fires once per new camera frame, so no frame is processed twice or skipped waiting for rAF.
  const rvfc = 'requestVideoFrameCallback' in video
  const schedule = () => {
    if (stopped) return
    handle = rvfc ? video.requestVideoFrameCallback(tick) : requestAnimationFrame(tick)
  }
  const tick = () => {
    schedule()
    if (video.readyState < 2 || video.currentTime === lastTime) return
    lastTime = video.currentTime
    const result = landmarker.detectForVideo(video, performance.now())
    // Copy the frame that was just measured, so picture and landmarks always match.
    if (frame.width !== video.videoWidth || frame.height !== video.videoHeight) {
      frame.width = video.videoWidth
      frame.height = video.videoHeight
    }
    fctx.drawImage(video, 0, 0)
    latest = (result.landmarks[0] as Landmark[] | undefined) ?? null
    mask = readMask(result)
  }
  schedule()

  return {
    frame,
    latest: () => latest,
    mask: () => mask,
    still: false,
    stop: () => {
      stopped = true
      if (rvfc) video.cancelVideoFrameCallback(handle)
      else cancelAnimationFrame(handle)
      stream.getTracks().forEach((t) => t.stop())
      landmarker.close()
    },
  }
}
