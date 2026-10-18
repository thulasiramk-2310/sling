import type { Settings } from '../engine/settings'
import type { Frame } from '../engine/types'

export type Message =
  | { kind: 'start' }
  | { kind: 'stop' }
  | { kind: 'status' }
  | { kind: 'offscreen-ready' }
  | { kind: 'offscreen-start'; settings: Settings }
  | { kind: 'offscreen-settings'; settings: Settings }
  | { kind: 'offscreen-error'; error: string }
  | { kind: 'frame'; frame: Frame }
  | { kind: 'hide' }
  | { kind: 'tab-action'; action: 'next-tab' | 'prev-tab' | 'zoom'; value?: number }

export interface Status {
  running: boolean
  error: string | null
}

export const SETTINGS_KEY = 'settings'
