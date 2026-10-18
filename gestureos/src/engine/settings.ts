import type { MacroPose } from './types'

export type MacroAction =
  | 'none'
  | 'media-toggle'
  | 'media-mute'
  | 'media-forward'
  | 'media-back'
  | 'scroll-top'
  | 'reload'
  | 'next-tab'
  | 'prev-tab'
  | 'history-back'
  | 'history-forward'
  | 'keyboard'
  | 'key'
  | 'url'

export interface Settings {
  sensitivity: number
  smoothing: number
  cursorSize: 's' | 'm' | 'l'
  dwell: boolean
  dwellMs: number
  snap: boolean
  scrollSpeed: number
  swipeNavigation: boolean
  macros: Record<MacroPose, MacroAction>
  customGestures: CustomGesture[]
  calibration: Calibration
  inputMode: 'hands' | 'head'
  headGain: number
}

// A user-recorded static hand pose, stored as a mean feature vector plus how much it may vary.
export interface CustomGesture {
  id: string
  name: string
  template: number[]
  radius: number
  action: MacroAction
  // Key name for 'key' (e.g. "k", "ArrowRight"), address for 'url'.
  param?: string
}

export interface Calibration {
  // Comfortable hand range in mirrored camera coordinates; null uses the sensitivity setting.
  box: { x0: number; y0: number; x1: number; y1: number } | null
  pinchOn: number
  pinchOff: number
}

export const DEFAULT_SETTINGS: Settings = {
  sensitivity: 1,
  smoothing: 1,
  cursorSize: 'm',
  dwell: false,
  dwellMs: 900,
  snap: true,
  scrollSpeed: 1,
  swipeNavigation: true,
  macros: {
    thumbsUp: 'media-toggle',
    victory: 'scroll-top',
    rock: 'media-mute',
  },
  customGestures: [],
  calibration: { box: null, pinchOn: 0.3, pinchOff: 0.45 },
  inputMode: 'hands',
  headGain: 1,
}

export const MACRO_LABELS: Record<MacroAction, string> = {
  none: 'Do nothing',
  'media-toggle': 'Play / pause video',
  'media-mute': 'Mute / unmute video',
  'media-forward': 'Skip video ahead 10 s',
  'media-back': 'Rewind video 10 s',
  'scroll-top': 'Scroll to top',
  reload: 'Reload page',
  'next-tab': 'Next tab (extension)',
  'prev-tab': 'Previous tab (extension)',
  'history-back': 'Go back a page',
  'history-forward': 'Go forward a page',
  keyboard: 'Show / hide keyboard',
  key: 'Press a key…',
  url: 'Open a website…',
}

// Actions that need a parameter can't be bound to the built-in macro poses.
export const MACRO_POSE_ACTIONS = (Object.keys(MACRO_LABELS) as MacroAction[]).filter((a) => a !== 'key' && a !== 'url')

export const POSE_LABELS: Record<MacroPose, string> = {
  thumbsUp: 'Thumbs up',
  victory: 'Peace sign',
  rock: 'Rock sign',
}

// Accepts whatever came out of storage; unknown or missing fields fall back to defaults.
export function mergeSettings(raw: unknown): Settings {
  const partial = (raw && typeof raw === 'object' ? raw : null) as Partial<Settings> | null
  return {
    ...DEFAULT_SETTINGS,
    ...(partial ?? {}),
    macros: { ...DEFAULT_SETTINGS.macros, ...(partial?.macros ?? {}) },
    calibration: { ...DEFAULT_SETTINGS.calibration, ...(partial?.calibration ?? {}) },
    customGestures: Array.isArray(partial?.customGestures) ? partial.customGestures : [],
  }
}

// Only plain web addresses may be opened by a gesture; this blocks javascript: and data: URLs.
export function safeUrl(raw: string): string | null {
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}
