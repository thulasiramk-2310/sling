export interface Point {
  x: number
  y: number
  z?: number
}

export type Pose =
  | 'none'
  | 'point'
  | 'pinch'
  | 'open'
  | 'fist'
  | 'scroll'
  | 'victory'
  | 'rock'
  | 'thumbsUp'
  | 'unknown'
  | 'smile'
  | `custom:${string}`

export type MacroPose = 'thumbsUp' | 'victory' | 'rock'

export type GestureEvent =
  | { type: 'activate' }
  | { type: 'deactivate' }
  | { type: 'click'; x: number; y: number }
  | { type: 'dragStart'; x: number; y: number }
  | { type: 'dragEnd'; x: number; y: number }
  | { type: 'scroll'; dy: number }
  | { type: 'swipe'; dir: 'left' | 'right' }
  | { type: 'zoom'; factor: number }
  | { type: 'macro'; pose: MacroPose }
  | { type: 'custom'; id: string }
  | { type: 'rightClick'; x: number; y: number }

export type HoldKind = 'activate' | 'deactivate' | 'macro' | 'scroll' | null

// One processed camera frame. Cursor coordinates are normalized to the viewport (0..1).
export interface Frame {
  t: number
  hands: number
  active: boolean
  pose: Pose
  cursor: { x: number; y: number } | null
  pinch: number
  dragging: boolean
  hold: { kind: HoldKind; progress: number }
  events: GestureEvent[]
}
