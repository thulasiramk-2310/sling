import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import type { Object3D } from 'three'

// High-frequency input lives outside React so the render loop never waits on state updates.
export const input = {
  source: 'mouse' as 'mouse' | 'hand',
  x: 0,
  y: 0,
  visible: false,
  down: false,
  zoom: 0,
  dragDX: 0,
  dragDY: 0,
  back: false,
  palmProgress: 0,
  hands: [] as NormalizedLandmark[][],
  simTime: 0,
}

export const registry = new Map<string, { anchor: Object3D; hit: Object3D }>()
