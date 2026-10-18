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
}

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
  }
}
