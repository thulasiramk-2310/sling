import { create } from 'zustand'

type Phase = 'intro' | 'explore'
type Tracking = 'off' | 'loading' | 'ready' | 'error'

interface State {
  phase: Phase
  tracking: Tracking
  trackingError: string | null
  hoveredId: string | null
  selectedId: string | null
  gesture: string
  handCount: number
  speed: number
  setPhase: (phase: Phase) => void
  setTracking: (tracking: Tracking, error?: string | null) => void
  setHovered: (id: string | null) => void
  select: (id: string | null) => void
  setGesture: (gesture: string, handCount: number) => void
  setSpeed: (speed: number) => void
}

export const useStore = create<State>((set) => ({
  phase: 'intro',
  tracking: 'off',
  trackingError: null,
  hoveredId: null,
  selectedId: null,
  gesture: '',
  handCount: 0,
  speed: 1,
  setPhase: (phase) => set({ phase }),
  setTracking: (tracking, trackingError = null) => set({ tracking, trackingError }),
  setHovered: (hoveredId) => set({ hoveredId }),
  select: (selectedId) => set({ selectedId }),
  setGesture: (gesture, handCount) => set({ gesture, handCount }),
  setSpeed: (speed) => set({ speed }),
}))
